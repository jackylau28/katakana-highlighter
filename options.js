const DEBUG = false;
const clientIdInput = document.getElementById("clientId");
const bubbleBgColorInput = document.getElementById("bubbleBgColor");
const bubblePositionSelect = document.getElementById("bubblePosition");
const bubbleDurationInput = document.getElementById("bubbleDuration");
const historyOnOffInput = document.getElementById("historyOnOff");
const voiceGenderSelect = document.getElementById("voiceGender");
const saveBtn = document.getElementById("saveBtn");
const resetBtn = document.getElementById("resetBtn");
const statusEl = document.getElementById("status");

const DEFAULTS = {
  yahooClientId: "",
  bubbleBgColor: "#0f172a",
  bubblePosition: "bottom",
  bubbleDuration: 0,
  historyOnOff: "on",
  voiceGender: "NEUTRAL"
};

// 載入設定頁時，先讀取已儲存的設定。
init();

// 儲存所有設定。
saveBtn.addEventListener("click", async () => {
  const yahooClientId = clientIdInput.value.trim();
  const bubbleBgColor = bubbleBgColorInput.value || DEFAULTS.bubbleBgColor;
  const bubblePosition = bubblePositionSelect.value || DEFAULTS.bubblePosition;
  const bubbleDuration = Math.max(0, parseInt(bubbleDurationInput.value, 10) || 0);
  const historyOnOff = historyOnOffInput.value || DEFAULTS.historyOnOff;
  const voiceGender = voiceGenderSelect.value || DEFAULTS.voiceGender;

  await chrome.storage.sync.set({
    yahooClientId,
    bubbleBgColor,
    bubblePosition,
    bubbleDuration,
    historyOnOff,
    voiceGender
  });
  if (DEBUG) console.log("[katakana-highlighter] saved settings:", { bubbleBgColor, bubblePosition, bubbleDuration, historyOnOff, voiceGender });
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
    bubbleBgColor = DEFAULTS.bubbleBgColor,
    bubblePosition = DEFAULTS.bubblePosition,
    bubbleDuration = DEFAULTS.bubbleDuration,
    historyOnOff = DEFAULTS.historyOnOff,
    voiceGender = DEFAULTS.voiceGender
  } = await chrome.storage.sync.get([
    "yahooClientId",
    "bubbleBgColor",
    "bubblePosition",
    "bubbleDuration",
    "historyOnOff",
    "voiceGender"
  ]);

  clientIdInput.value = yahooClientId;
  bubbleBgColorInput.value = bubbleBgColor;
  bubblePositionSelect.value = bubblePosition;
  bubbleDurationInput.value = bubbleDuration;
  historyOnOffInput.value = historyOnOff;
  voiceGenderSelect.value = voiceGender;
}
