---
name: build
description: Package the Chrome extension into a distributable .zip file for Chrome Web Store or sideloading.
---

# Build Skill — Katakana Highlighter

Packages the Chrome extension into a versioned .zip file ready for distribution.

## Steps

1. Read `manifest.json` to get the current version number.
2. Run: `zip -r "katakana-highlighter-v<VERSION>.zip" . -x ".git/*" ".claude/*" "*.zip" ".DS_Store" "*.swp" "*.swo" ".idea/*" ".vscode/*" "node_modules/*"`
3. Confirm the .zip was created with the expected file list (manifest.json, background.js, content.js, content.css, popup.html, popup.js, popup.css, options.html, options.js, options.css, README.md, and any icon files if present).

## Notes
- Excludes dev-only files (.git, .claude, IDE configs, node_modules).
- The resulting .zip is ready for Chrome Web Store submission or `chrome://extensions` → "Load unpacked" (after unzipping).
