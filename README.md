# Japanese Highlight to Katakana（Chrome 外掛）

## 功能
- 在任何網頁反白日文文字。
- 顯示浮動泡泡，展示轉換後讀音。
- 支援右鍵選單操作。
- 可快速切換輸出模式：`カタカナ` 或 `平仮名`。

## 專案結構

```
├── manifest.json       # Chrome MV3 設定檔
├── background.js       # Service Worker（右鍵選單、API 呼叫、假名轉換）
├── content.js          # 內容腳本（文字選取偵測、泡泡顯示、釘選）
├── content.css         # 泡泡樣式（深色主題）
├── popup.html/js/css   # 工具列彈窗（模式切換、Client ID 狀態）
├── options.html/js/css # 設定頁面（Yahoo Client ID）
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

### content.js
| 函式 | 說明 |
|------|------|
| `showBubble(rect, sourceText, convertedText, outputMode)` | 在選取位置顯示轉換結果泡泡 |
| `containsJapanese(text)` | 前端快速檢查日文字元 |
| `hideTransientBubble()` | 隱藏暫存泡泡 |
| `createBubbleElement()` | 建立泡泡 DOM 元素 |

### popup.js
| 函式 | 說明 |
|------|------|
| `init()` | 載入目前模式與 Client ID 狀態 |
| `setMode(mode)` | 切換輸出模式並更新 storage |
| `updateModeUI(mode)` | 更新彈窗 UI 顯示 |

### options.js
| 函式 | 說明 |
|------|------|
| `init()` | 載入已儲存的 Client ID 並填入欄位 |

## 訊息流程

1. **自動偵測**：反白日文 → content.js 發送 `CONVERT_READING` → background.js 呼叫 API → 回傳結果 → 顯示泡泡
2. **右鍵選單**：右鍵 → `Convert selection` → background.js 呼叫 API → 發送 `SHOW_READING_RESULT` → content.js 顯示泡泡
3. **模式切換**：popup 或右鍵選單 → `chrome.storage.sync.set({ outputMode })`

## 注意事項
- 漢字轉讀音使用 `Yahoo Japan Furigana API`。
- 需要先設定 Yahoo Developer 的 `Client ID`。

## 安裝步驟
1. 打開 `chrome://extensions`。
2. 開啟 **Developer mode（開發人員模式）**。
3. 點擊 **Load unpacked（載入未封裝項目）**。
4. 選擇資料夾：`katakana-highlighter`。
5. 打開外掛設定頁，貼上你的 Yahoo `Client ID`。

## 使用方式
1. 在網頁上反白日文文字。
2. 可按網址列旁外掛 icon，在 popup 快速切換 `カタカナ` / `平仮名`。
3. 或右鍵 -> `Output mode` -> 選擇 `カタカナ` 或 `平仮名`。
4. 轉換結果會顯示在反白位置下方的泡泡。
5. 也可右鍵已反白文字，點 `Convert selection` 手動觸發轉換。
6. 泡泡上的 `📌 釘選` 可固定顯示；取消釘選後，清除反白時會自動隱藏。
