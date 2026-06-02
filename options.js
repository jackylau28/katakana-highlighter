const clientIdInput = document.getElementById("clientId");
const saveBtn = document.getElementById("saveBtn");
const statusEl = document.getElementById("status");

// 載入設定頁時，先讀取已儲存的 Client ID。
init();

// 儲存 Yahoo Client ID，供背景腳本呼叫 API 時使用。
saveBtn.addEventListener("click", async () => {
  const yahooClientId = clientIdInput.value.trim();
  await chrome.storage.sync.set({ yahooClientId });
  statusEl.textContent = "Saved.";
});

// 初始化設定欄位內容。
async function init() {
  const { yahooClientId = "" } = await chrome.storage.sync.get("yahooClientId");
  clientIdInput.value = yahooClientId;
}
