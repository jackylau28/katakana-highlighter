const modeKatakanaBtn = document.getElementById("modeKatakana");
const modeHiraganaBtn = document.getElementById("modeHiragana");
const modeStatusEl = document.getElementById("modeStatus");
const clientStatusEl = document.getElementById("clientStatus");
const openOptionsBtn = document.getElementById("openOptions");
const historyListEl = document.getElementById("historyList");
const clearHistoryBtn = document.getElementById("clearHistory");
const exportHistoryBtn = document.getElementById("exportHistory");

init();

modeKatakanaBtn.addEventListener("click", () => setMode("katakana"));
modeHiraganaBtn.addEventListener("click", () => setMode("hiragana"));

openOptionsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

clearHistoryBtn.addEventListener("click", async () => {
  if (confirm("確定清空歷史記錄？")) {
    await chrome.runtime.sendMessage({ type: "CLEAR_HISTORY" });
    await loadHistory();
  }
});

exportHistoryBtn.addEventListener("click", () => {
  exportHistoryToCSV();
});

// 載入目前模式與 Client ID 狀態。
async function init() {
  const { outputMode = "katakana", yahooClientId = "" } = await chrome.storage.sync.get([
    "outputMode",
    "yahooClientId"
  ]);

  updateModeUI(outputMode === "hiragana" ? "hiragana" : "katakana");
  clientStatusEl.textContent = yahooClientId
    ? "Yahoo Client ID：已設定"
    : "Yahoo Client ID：未設定";

  await loadHistory();
}

async function loadHistory() {
  const response = await chrome.runtime.sendMessage({ type: "GET_HISTORY" });
  if (!response?.ok) {
    historyListEl.innerHTML = "<div class='history-empty'>載入失敗</div>";
    return;
  }

  const history = response.history || [];
  if (history.length === 0) {
    historyListEl.innerHTML = "<div class='history-empty'>暫無記錄</div>";
    return;
  }

  historyListEl.innerHTML = history.map(item => createHistoryItemHTML(item)).join("");
  attachHistoryItemEventListeners();
}

function createHistoryItemHTML(item) {
  const date = new Date(item.timestamp);
  const timeStr = date.toLocaleString("zh-TW", {
    year: "2-digit",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
  const noteHTML = item.note
    ? `<div class="history-note"><div class="history-note-text">${escapeHTML(item.note)}</div></div>`
    : "";
  return `
    <div class="history-item" data-id="${item.id}">
      <div class="history-text-row">
        <div class="history-source">${escapeHTML(item.sourceText)}</div>
        <div class="history-arrow">→</div>
        <div class="history-converted">${escapeHTML(item.convertedText)}</div>
      </div>
      <div class="history-meta">
        ${timeStr}${item.url ? ` • ${truncateURL(item.url)}` : ""}
      </div>
      ${noteHTML}
      <div class="history-actions">
        <button class="copy-btn" data-id="${item.id}">📋 複製</button>
        <button class="note-btn" data-id="${item.id}">🗒️ 筆記</button>
        <button class="delete-btn" data-id="${item.id}">🗑️ 刪除</button>
      </div>
    </div>
  `;
}

function attachHistoryItemEventListeners() {
  historyListEl.querySelectorAll(".copy-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const itemEl = historyListEl.querySelector(`[data-id="${id}"]`);
      const convertedText = itemEl.querySelector(".history-converted").textContent;
      try {
        await navigator.clipboard.writeText(convertedText);
        btn.textContent = "✅";
        setTimeout(() => btn.textContent = "📋 複製", 1000);
      } catch (e) {
        console.warn("copy failed", e);
      }
    });
  });

  historyListEl.querySelectorAll(".delete-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      await chrome.runtime.sendMessage({ type: "DELETE_HISTORY", id });
      await loadHistory();
    });
  });

  historyListEl.querySelectorAll(".note-btn").forEach(btn => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      const response = await chrome.runtime.sendMessage({ type: "GET_HISTORY" });
      const history = response.history || [];
      const item = history.find(h => h.id === id);
      if (!item) return;
      const newNote = prompt("加筆記...", item.note || "");
      if (newNote !== null) {
        await chrome.runtime.sendMessage({ type: "UPDATE_NOTE", id, note: newNote });
        await loadHistory();
      }
    });
  });
}

async function exportHistoryToCSV() {
  const response = await chrome.runtime.sendMessage({ type: "GET_HISTORY" });
  const history = response.history || [];
  if (!history.length) return;
  let csv = "ID,時間,原文,假名,筆記,網址\n";
  for (const item of history) {
    const date = new Date(item.timestamp).toLocaleString("zh-TW");
    const row = [
      item.id,
      date,
      item.sourceText.replace(/"/g, '""'),
      item.convertedText.replace(/"/g, '""'),
      (item.note || "").replace(/"/g, '""'),
      item.url
    ];
    csv += row.map(f => `"${f}"`).join(",") + "\n";
  }
  downloadFile(csv, "katakana-history.csv", "text/csv;charset=utf-8");
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 0);
}

function escapeHTML(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncateURL(url) {
  const maxLen = 40;
  if (!url || url.length <= maxLen) return url;
  const protocol = url.startsWith("https://") ? "https://" : url.startsWith("http://") ? "http://" : "";
  const rest = url.slice(protocol.length);
  const hostname = rest.split("/")[0];
  return protocol + hostname + "/...";
}

// 切換模式並即時更新 UI。
async function setMode(mode) {
  const normalized = mode === "hiragana" ? "hiragana" : "katakana";
  await chrome.storage.sync.set({ outputMode: normalized });
  updateModeUI(normalized);
}

function updateModeUI(mode) {
  const isHiragana = mode === "hiragana";
  modeKatakanaBtn.classList.toggle("active", !isHiragana);
  modeHiraganaBtn.classList.toggle("active", isHiragana);
  modeStatusEl.textContent = `目前模式：${isHiragana ? "平仮名" : "カタカナ"}`;
}
