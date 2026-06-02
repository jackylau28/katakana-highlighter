const modeKatakanaBtn = document.getElementById("modeKatakana");
const modeHiraganaBtn = document.getElementById("modeHiragana");
const modeStatusEl = document.getElementById("modeStatus");
const clientStatusEl = document.getElementById("clientStatus");
const openOptionsBtn = document.getElementById("openOptions");

init();

modeKatakanaBtn.addEventListener("click", () => setMode("katakana"));
modeHiraganaBtn.addEventListener("click", () => setMode("hiragana"));

openOptionsBtn.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
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
