# CLAUDE.md — Katakana Highlighter

A Chrome extension (Manifest V3) that converts highlighted Japanese text to Katakana or Hiragana readings using the Yahoo Japan Furigana API.

## Architecture

| File | Role |
|------|------|
| `manifest.json` | Extension manifest (MV3), declares permissions, content scripts, service worker, popup, options |
| `background.js` | Service worker — context menus, message routing, Yahoo API calls, kana conversion logic |
| `content.js` | Content script — detects text selection (mouseup), shows floating bubble with reading, handles pinning |
| `content.css` | Bubble styling — dark themed, absolute positioned, pinned state border |
| `popup.html` / `popup.js` / `popup.css` | Toolbar popup — quick toggle between カタカナ / 平仮名 mode, shows Client ID status |
| `options.html` / `options.js` / `options.css` | Options page — set Yahoo Client ID for API access |

## Message Flow

1. **Auto-detect**: User highlights Japanese text → `content.js` sends `CONVERT_READING` → `background.js` calls Yahoo API → returns reading → bubble shown
2. **Context menu**: User right-clicks → `Convert selection` → `background.js` calls API → sends `SHOW_READING_RESULT` → `content.js` shows bubble
3. **Mode switch**: Popup or context menu → `chrome.storage.sync.set({ outputMode })`

## Key Dependencies

- **Yahoo Japan Furigana API** (`jlp.yahooapis.jp/FuriganaService/V2/furigana`) — requires Client ID set in options
- **Fallback**: If API unavailable, uses Unicode offset conversion (±0x60) between hiragana/katakana ranges

## Kana Conversion

- `toKatakana()`: Unicode shift +0x60 (ぁ→ァ)
- `toHiragana()`: Unicode shift -0x60 (ァ→ぁ)
- Ranges: Hiragana U+3040–U+309F, Katakana U+30A0–U+30FF

## Build & Verify

- `/build` — Package extension into a versioned .zip for distribution
- `/verify` — Validate manifest, file references, permissions, and code integrity
