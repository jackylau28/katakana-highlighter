---
name: verify
description: Verify the Chrome extension manifest, file integrity, and basic code checks before loading into Chrome.
---

# Verify Skill — Katakana Highlighter

Validates the Chrome extension is complete and well-formed before loading it into Chrome.

## Checks Performed

1. **manifest.json validity** — Parse JSON, confirm `manifest_version: 3`, verify all referenced files exist:
   - `background.service_worker` → `background.js`
   - `content_scripts[].js` → `content.js`
   - `content_scripts[].css` → `content.css`
   - `action.default_popup` → `popup.html`
   - `options_page` → `options.html`

2. **Permissions review** — Confirm permissions are minimal and match what the code uses:
   - `storage` — used for outputMode and yahooClientId ✅
   - `contextMenus` — used for right-click convert and mode switching ✅
   - `host_permissions: https://jlp.yahooapis.jp/*` — used for Furigana API ✅

3. **Cross-file reference check** — Verify:
   - `popup.html` references `popup.js` and `popup.css`
   - `options.html` references `options.js` and `options.css`
   - `chrome.runtime.sendMessage` type strings match between `content.js` and `background.js`
   - `chrome.runtime.onMessage` handlers cover all message types

4. **Content Security** — Check no inline scripts in HTML files, no `eval()` usage.

5. **Japanese regex coverage** — Confirm `containsJapanese()` regex matches hiragana, katakana, and kanji ranges.

## Run
```bash
node -e "JSON.parse(require('fs').readFileSync('manifest.json','utf8'))" && echo "✅ manifest.json valid"
```
Then manually verify each point above against the current codebase.
