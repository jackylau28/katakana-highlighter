const DEBUG = false;
const clientIdInput = document.getElementById("clientId");
const googleApiKeyInput = document.getElementById("googleApiKey");
const geminiApiKeyInput = document.getElementById("geminiApiKey");
const azureApiKeyInput = document.getElementById("azureApiKey");
const azureRegionInput = document.getElementById("azureRegion");
const azureVoiceSelect = document.getElementById("azureVoice");
const ttsEngineSelect = document.getElementById("ttsEngine");
const bubbleBgColorInput = document.getElementById("bubbleBgColor");
const bubblePositionSelect = document.getElementById("bubblePosition");
const bubbleDurationInput = document.getElementById("bubbleDuration");
const historyOnOffInput = document.getElementById("historyOnOff");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const statusEl = document.getElementById("status");

const DEFAULTS = {
  yahooClientId: "",
  googleApiKey: "",
  geminiApiKey: "",
  azureApiKey: "",
  azureRegion: "japaneast",
  azureVoice: "ja-JP-NanamiNeural",
  ttsEngine: "google",
  bubbleBgColor: "#0f172a",
  bubblePosition: "bottom",
  bubbleDuration: 0,
  historyOnOff: "on"
};

// 載入設定頁時，先讀取已儲存的設定。
init();

// 儲存所有設定。
saveBtn.addEventListener("click", async () => {
  const yahooClientId = clientIdInput.value.trim();
  const googleApiKey = googleApiKeyInput.value.trim();
  const geminiApiKey = geminiApiKeyInput.value.trim();
  const azureApiKey = azureApiKeyInput.value.trim();
  const azureRegion = azureRegionInput.value.trim() || DEFAULTS.azureRegion;
  const azureVoice = azureVoiceSelect.value || DEFAULTS.azureVoice;
  const ttsEngine = ttsEngineSelect.value || DEFAULTS.ttsEngine;
  const bubbleBgColor = bubbleBgColorInput.value || DEFAULTS.bubbleBgColor;
  const bubblePosition = bubblePositionSelect.value || DEFAULTS.bubblePosition;
  const bubbleDuration = Math.max(0, parseInt(bubbleDurationInput.value, 10) || 0);
  const historyOnOff = historyOnOffInput.value || DEFAULTS.historyOnOff;

  await chrome.storage.sync.set({
    yahooClientId,
    googleApiKey,
    geminiApiKey,
    azureApiKey,
    azureRegion,
    azureVoice,
    ttsEngine,
    bubbleBgColor,
    bubblePosition,
    bubbleDuration,
    historyOnOff
  });
  if (DEBUG) console.log("[katakana-highlighter] saved settings:", { bubbleBgColor, bubblePosition, bubbleDuration, historyOnOff });
  statusEl.textContent = "已儲存";
});

// 重置所有設定至預設值。
resetBtn.addEventListener("click", async () => {
  await chrome.storage.sync.set(DEFAULTS);
  if (DEBUG) console.log("[katakana-highlighter] reset to defaults:", DEFAULTS);
  await init();
  statusEl.textContent = "已重置為預設值";
});

// 初始化設定欄位內容。
async function init() {
  const {
    yahooClientId = DEFAULTS.yahooClientId,
    googleApiKey = DEFAULTS.googleApiKey,
    geminiApiKey = DEFAULTS.geminiApiKey,
    azureApiKey = DEFAULTS.azureApiKey,
    azureRegion = DEFAULTS.azureRegion,
    azureVoice = DEFAULTS.azureVoice,
    ttsEngine = DEFAULTS.ttsEngine,
    bubbleBgColor = DEFAULTS.bubbleBgColor,
    bubblePosition = DEFAULTS.bubblePosition,
    bubbleDuration = DEFAULTS.bubbleDuration,
    historyOnOff = DEFAULTS.historyOnOff
  } = await chrome.storage.sync.get([
    "yahooClientId",
    "googleApiKey",
    "geminiApiKey",
    "azureApiKey",
    "azureRegion",
    "azureVoice",
    "ttsEngine",
    "bubbleBgColor",
    "bubblePosition",
    "bubbleDuration",
    "historyOnOff"
  ]);

  clientIdInput.value = yahooClientId;
  googleApiKeyInput.value = googleApiKey;
  geminiApiKeyInput.value = geminiApiKey;
  azureApiKeyInput.value = azureApiKey;
  azureRegionInput.value = azureRegion;
  azureVoiceSelect.value = azureVoice;
  ttsEngineSelect.value = ttsEngine;
  bubbleBgColorInput.value = bubbleBgColor;
  bubblePositionSelect.value = bubblePosition;
  bubbleDurationInput.value = bubbleDuration;
  historyOnOffInput.value = historyOnOff;
}
