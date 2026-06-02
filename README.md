# Japanese Highlight to Katakana（Chrome 外掛）

## 功能
- 在任何網頁反白日文文字。
- 顯示浮動泡泡，展示轉換後讀音。
- 支援右鍵選單操作。
- 可快速切換輸出模式：`カタカナ` 或 `平仮名`。

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
