const MENU_CONVERT_ID = "convert-selection-reading";
const MENU_MODE_PARENT_ID = "reading-output-mode";
const MENU_MODE_KATAKANA_ID = "mode-katakana";
const MENU_MODE_HIRAGANA_ID = "mode-hiragana";
const DEFAULT_OUTPUT_MODE = "katakana";
const MAX_HISTORY = 100;

// 生成简单 UUID
function uuid() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 获取历史记录
async function getHistory() {
  const { history = [] } = await chrome.storage.local.get("history");
  return history;
}

// 添加历史记录
async function addHistory(sourceText, convertedText, outputMode, url) {
  const history = await getHistory();
  const newItem = {
    id: uuid(),
    sourceText,
    convertedText,
    outputMode,
    timestamp: Date.now(),
    url: url || "",
    note: ""
  };
  history.unshift(newItem);
  if (history.length > MAX_HISTORY) {
    history.pop();
  }
  await chrome.storage.local.set({ history });
  return newItem;
}

// 更新历史记录的笔记
async function updateHistoryNote(id, note) {
  const history = await getHistory();
  const item = history.find(item => item.id === id);
  if (item) {
    item.note = note;
    await chrome.storage.local.set({ history });
  }
}

// 删除单条历史记录
async function deleteHistory(id) {
  const history = await getHistory();
  const filtered = history.filter(item => item.id !== id);
  await chrome.storage.local.set({ history: filtered });
}

// 清空历史记录
async function clearHistory() {
  await chrome.storage.local.set({ history: [] });
}

// 安裝外掛時建立右鍵選單，並依照已儲存模式勾選預設值。
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get("outputMode", ({ outputMode }) => {
    const initialMode = normalizeMode(outputMode);

    chrome.contextMenus.removeAll(() => {
      chrome.contextMenus.create({
        id: MENU_CONVERT_ID,
        title: "Convert selection",
        contexts: ["selection"]
      });

      chrome.contextMenus.create({
        id: MENU_MODE_PARENT_ID,
        title: "Output mode",
        contexts: ["selection"]
      });

      chrome.contextMenus.create({
        id: MENU_MODE_KATAKANA_ID,
        parentId: MENU_MODE_PARENT_ID,
        title: "カタカナ",
        type: "radio",
        checked: initialMode === "katakana",
        contexts: ["selection"]
      });

      chrome.contextMenus.create({
        id: MENU_MODE_HIRAGANA_ID,
        parentId: MENU_MODE_PARENT_ID,
        title: "平仮名",
        type: "radio",
        checked: initialMode === "hiragana",
        contexts: ["selection"]
      });
    });
  });
});

// 處理右鍵選單點擊：切換輸出模式或執行選取文字轉換。
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === MENU_MODE_KATAKANA_ID) {
    await chrome.storage.sync.set({ outputMode: "katakana" });
    return;
  }

  if (info.menuItemId === MENU_MODE_HIRAGANA_ID) {
    await chrome.storage.sync.set({ outputMode: "hiragana" });
    return;
  }

  if (info.menuItemId !== MENU_CONVERT_ID || !tab?.id || !info.selectionText) {
    return;
  }

  if (!containsJapanese(info.selectionText)) {
    return;
  }

  const { outputMode = DEFAULT_OUTPUT_MODE } = await chrome.storage.sync.get("outputMode");
  const normalizedMode = normalizeMode(outputMode);
  const convertedText = await convertReading(info.selectionText, normalizedMode);
  await chrome.tabs.sendMessage(tab.id, {
    type: "SHOW_READING_RESULT",
    sourceText: info.selectionText,
    convertedText,
    outputMode: normalizedMode,
    fromContextMenu: true,
    url: tab.url
  });
});

// 接收內容腳本要求，回傳目前模式下的轉換結果。
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type === "CONVERT_READING") {
    (async () => {
      try {
        const { outputMode = DEFAULT_OUTPUT_MODE } = await chrome.storage.sync.get("outputMode");
        const {historyOnOff = "on"} = await chrome.storage.sync.get("historyOnOff");
        const normalizedMode = normalizeMode(outputMode);
        const convertedText = await convertReading(message.text || "", normalizedMode);
        if (historyOnOff === "on") {
            const newHistoryItem = await addHistory(
            message.text,
            convertedText,
            normalizedMode,
            sender.url || ""
            );
            sendResponse({ ok: true, convertedText, outputMode: normalizedMode, historyItemId: newHistoryItem.id });
        }     else {
            sendResponse({ ok: true, convertedText, outputMode: normalizedMode, historyItemId: null });
        }   
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }

  if (message?.type === "GET_HISTORY") {
    (async () => {
      const history = await getHistory();
      sendResponse({ ok: true, history });
    })();
    return true;
  }

  if (message?.type === "UPDATE_NOTE") {
    (async () => {
      await updateHistoryNote(message.id, message.note);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === "DELETE_HISTORY") {
    (async () => {
      await deleteHistory(message.id);
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === "CLEAR_HISTORY") {
    (async () => {
      await clearHistory();
      sendResponse({ ok: true });
    })();
    return true;
  }

  if (message?.type === "SYNTHESIZE_SPEECH") {
    (async () => {
      try {
        const { googleApiKey = "", voiceGender = "NEUTRAL" } = await chrome.storage.sync.get([
          "googleApiKey", "voiceGender"
        ]);
        if (!googleApiKey) {
          sendResponse({ ok: false, error: "Google API Key not set" });
          return;
        }
        const audioData = await synthesizeSpeech(message.text, googleApiKey, voiceGender);
        sendResponse({ ok: true, audioContent: audioData });
      } catch (err) {
        sendResponse({ ok: false, error: String(err) });
      }
    })();
    return true;
  }
});

// 主要轉換流程：先檢查日文，再呼叫 Yahoo API，失敗時走本地 fallback。
async function convertReading(text, outputMode) {
  const input = (text || "").trim();
  if (!input) {
    return "";
  }

  if (!containsJapanese(input)) {
    return "";
  }

  const { yahooClientId = "" } = await chrome.storage.sync.get("yahooClientId");
  if (!yahooClientId) {
    return fallbackConvert(input, outputMode);
  }

  let response;
  try {
    response = await fetch(
      `https://jlp.yahooapis.jp/FuriganaService/V2/furigana?appid=${encodeURIComponent(yahooClientId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          id: "katakana-highlighter",
          jsonrpc: "2.0",
          method: "jlp.furiganaservice.furigana",
          params: {
            q: input,
            grade: 1
          }
        })
      }
    );
  } catch (_error) {
    return fallbackConvert(input, outputMode);
  }

  if (!response.ok) {
    return fallbackConvert(input, outputMode);
  }

  let json;
  try {
    json = await response.json();
  } catch (_error) {
    return fallbackConvert(input, outputMode);
  }

  const reading = extractReading(json?.result?.word);
  if (!reading) {
    return fallbackConvert(input, outputMode);
  }

  return outputMode === "hiragana" ? toHiragana(reading) : toKatakana(reading);
}

// 從 Yahoo API 的巢狀 word/subword 結構提取完整讀音字串。
function extractReading(words) {
  if (!Array.isArray(words)) {
    return "";
  }

  let reading = "";
  for (const item of words) {
    if (!item || typeof item !== "object") {
      continue;
    }

    if (Array.isArray(item.subword) && item.subword.length > 0) {
      reading += extractReading(item.subword);
      continue;
    }

    if (typeof item.furigana === "string" && item.furigana.length > 0) {
      reading += item.furigana;
      continue;
    }

    if (typeof item.surface === "string") {
      reading += item.surface;
    }
  }

  return reading;
}

// 將平假名轉成片假名（Unicode 偏移轉換）。
function toKatakana(text) {
  return (text || "").replace(/[ぁ-ゖ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) + 0x60)
  );
}

// 將片假名轉成平假名（Unicode 偏移轉換）。
function toHiragana(text) {
  return (text || "").replace(/[ァ-ヶ]/g, (char) =>
    String.fromCharCode(char.charCodeAt(0) - 0x60)
  );
}

// API 無法使用時的降級策略：只做假名類型轉換。
function fallbackConvert(text, outputMode) {
  return outputMode === "hiragana" ? toHiragana(text) : toKatakana(text);
}

// 標準化輸出模式，確保只會是 hiragana 或 katakana。
function normalizeMode(mode) {
  return mode === "hiragana" ? "hiragana" : DEFAULT_OUTPUT_MODE;
}

// 檢查字串是否包含日文（平假名/片假名/漢字）。
function containsJapanese(text) {
  return /[぀-ヿ㐀-鿿]/.test(text || "");
}

// 使用 Google Cloud Text-to-Speech API 合成日文語音。
async function synthesizeSpeech(text, apiKey, voiceGender) {
  const response = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: {
          languageCode: "ja-JP",
          name: "ja-JP-Standard-A",
          ssmlGender: voiceGender || "NEUTRAL"
        },
        audioConfig: { audioEncoding: "MP3" }
      })
    }
  );

  if (!response.ok) {
    const errText = await response.text().catch(() => "Unknown error");
    throw new Error(`TTS API error (${response.status}): ${errText}`);
  }

  const json = await response.json();
  return json.audioContent; // base64-encoded MP3
}
