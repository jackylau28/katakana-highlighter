# Japanese Highlight to Katakana（Chrome 外掛）

## 功能
- 在任何網頁反白日文文字。
- 顯示浮動泡泡，展示轉換後讀音。
- 支援右鍵選單操作。
- 可快速切換輸出模式：`カタカナ` 或 `平仮名`。
- 泡泡可釘選，並可加筆記。
- 歷史記錄功能，可複製、加筆記、刪除、匯出 CSV。
- 泡泡設定：背景色、顯示位置（下方/上方/頁面底部固定）、自動消失秒數。
- 泡泡內有 🔊 發音按鈕，使用 Gemini 3.1 Flash TTS API 播放日語發音。

## 專案結構

```
├── manifest.json       # Chrome MV3 設定檔
├── background.js       # Service Worker（右鍵選單、API 呼叫、假名轉換、歷史記錄管理）
├── content.js          # 內容腳本（文字選取偵測、泡泡顯示、釘選、筆記）
├── content.css         # 泡泡樣式（深色主題）
├── popup.html/js/css   # 工具列彈窗（模式切換、歷史記錄、Client ID 狀態）
├── options.html/js/css # 設定頁面（Yahoo Client ID、泡泡設定）
├── CLAUDE.md           # 開發者文件
└── .claude/skills/     # Claude Code 技能
```

## 核心函式

### background.js
| 函式 | 說明 |
|------|------|
| `convertReading(text, outputMode)` | 主轉換流程：檢查日文 → 呼叫 Yahoo API → 失敗走 fallback |
| `extractReading(words)` | 從 Yahoo API 巢狀 word/subword 結構提取讀音字串 |
| `toKatakana(text)` | 平假名 → 片假名（Unicode +0x60） |
| `toHiragana(text)` | 片假名 → 平假名（Unicode -0x60） |
| `fallbackConvert(text, outputMode)` | API 不可用時的降級轉換 |
| `normalizeMode(mode)` | 標準化輸出模式（僅 katakana/hiragana） |
| `containsJapanese(text)` | 檢查是否包含日文字元 |
| `uuid()` | 產生隨機唯一 ID |
| `addHistory(...)` | 新增一筆歷史記錄 |
| `getHistory()` | 取得歷史記錄列表 |
| `updateHistoryNote(id, note)` | 更新歷史記錄的筆記 |
| `deleteHistory(id)` | 刪除指定歷史記錄 |
| `clearHistory()` | 清空所有歷史記錄 |
| `synthesizeSpeech(text, apiKey)` | 呼叫 Google Cloud Text-to-Speech API 合成語音，回傳 MP3 data URL |
| `synthesizeSpeechGemini(text, apiKey)` | 呼叫 Gemini 3.1 Flash TTS API 合成語音，回傳 WAV data URL |
| `synthesizeSpeechAzure(text, apiKey, region, voiceName)` | 呼叫 Microsoft Azure TTS API 合成語音，回傳 MP3 data URL |

### content.js
| 函式 | 說明 |
|------|------|
| `showBubble(rect, sourceText, convertedText, outputMode, historyItemId)` | 在選取位置顯示轉換結果泡泡，套用自訂設定（背景色、位置、自動消失） |
| `containsJapanese(text)` | 前端快速檢查日文字元 |
| `hideTransientBubble()` | 隱藏暫存泡泡並清除計時器 |
| `createBubbleElement()` | 建立泡泡 DOM 元素 |
| `clearAutoHideTimer()` | 清除自動消失計時器 |

泡泡含功能按鈕：📌 釘選、📋 複製、🔊 發音（Gemini TTS）。

### popup.js
| 函式 | 說明 |
|------|------|
| `init()` | 載入目前模式與 Client ID 狀態，並讀取歷史記錄 |
| `setMode(mode)` | 切換輸出模式並更新 storage |
| `updateModeUI(mode)` | 更新彈窗 UI 顯示 |
| `loadHistory()` | 讀取並渲染歷史記錄列表 |
| `createHistoryItemHTML(item)` | 產生單筆歷史記錄的 HTML |
| `attachHistoryItemEventListeners()` | 綁定歷史記錄項目的事件（複製/刪除/筆記） |
| `exportHistoryToCSV()` | 匯出歷史記錄為 CSV 檔案 |

### options.js
| 函式 | 說明 |
|------|------|
| `init()` | 載入已儲存的所有設定（Client ID、泡泡設定） |
| `saveBtn` handler | 儲存所有設定至 chrome.storage.sync |
| `resetBtn` handler | 重置所有設定為預設值 |

## 訊息流程

1. **自動偵測**：反白日文 → content.js 發送 `CONVERT_READING` → background.js 呼叫 API → 回傳結果 → 顯示泡泡
2. **右鍵選單**：右鍵 → `Convert selection` → background.js 呼叫 API → 發送 `SHOW_READING_RESULT` → content.js 顯示泡泡
3. **模式切換**：popup 或右鍵選單 → `chrome.storage.sync.set({ outputMode })`
4. **發音**：點擊 🔊 → content.js 發送 `SYNTHESIZE_SPEECH` → background.js 依 `ttsEngine` 設定呼叫對應 API（Google / Gemini / Azure TTS）→ 回傳 audio data URL → content.js 播放

## 設定選項

在外掛設定頁（Options）可自訂以下泡泡行為：

| 設定 | 預設值 | 說明 |
|------|--------|------|
| `googleApiKey` | `""` | Google Cloud API Key（用於 🔊 Google Cloud TTS 發音） |
| `geminiApiKey` | `""` | Gemini API Key（用於 🔊 Gemini TTS 發音） |
| `azureApiKey` | `""` | Azure API Key（用於 🔊 Azure TTS 發音） |
| `azureRegion` | `"japaneast"` | Azure 區域（如 japaneast、eastasia、eastus） |
| `azureVoice` | `"ja-JP-NanamiNeural"` | Azure 聲音名稱（Nanami/Keita/Aoi 等） |
| `ttsEngine` | `"google"` | 發音引擎：`google`（Google Cloud TTS）/ `gemini`（Gemini TTS）/ `azure`（Azure TTS） |
| `bubbleBgColor` | `#0f172a` | 泡泡背景色 |
| `bubblePosition` | `bottom` | 泡泡顯示位置：`bottom`（選取下方）/ `top`（選取上方）/ `fixed-bottom`（頁面底部固定） |
| `bubbleDuration` | `0` | 自動消失秒數，`0` = 永不自動消失 |

設定頁有「重置預設」按鈕可一鍵還原所有設定。

## 注意事項
- 漢字轉讀音使用 `Yahoo Japan Furigana API`。
- 需要先設定 Yahoo Developer 的 `Client ID`。
- 發音功能支援三種引擎：`Google Cloud TTS`、`Gemini 3.1 Flash TTS`、`Azure TTS`，可在設定頁選擇。
- 使用 Google Cloud TTS 需在 GCP 主控台啟用 Cloud Text-to-Speech API。
- 使用 Gemini TTS 需在 [Google AI Studio](https://aistudio.google.com/apikey) 取得 API Key。
- 使用 Azure TTS 需在 Azure 入口建立 Speech 資源，取得 API Key 和區域。

## 安裝步驟
1. 打開 `chrome://extensions`。
2. 開啟 **Developer mode（開發人員模式）**。
3. 點擊 **Load unpacked（載入未封裝項目）**。
4. 選擇資料夾：`katakana-highlighter`。
5. 打開外掛設定頁，貼上你的 Yahoo `Client ID` 和 `Google Cloud API Key`（如需發音功能）。

## 使用方式
1. 在網頁上反白日文文字。
2. 可按網址列旁外掛 icon，在 popup 快速切換 `カタカナ` / `平仮名`。
3. 或右鍵 -> `Output mode` -> 選擇 `カタカナ` 或 `平仮名`。
4. 轉換結果會顯示在泡泡中。
5. 也可右鍵已反白文字，點 `Convert selection` 手動觸發轉換。
6. 泡泡上的 `📌 釘選` 可固定顯示；取消釘選後，清除反白時會自動隱藏。
7. 泡泡上的 `📋 複製` 可一鍵複製假名。
8. 泡泡上的 `🔊 發音` 可使用 Gemini TTS 聽發音，點擊播放，再次點擊停止。
9. 釘選泡泡後可加筆記，筆記會自動保存到歷史記錄。
10. popup 可檢視歷史記錄，支持複製、加/改筆記、刪除、匯出 CSV。
