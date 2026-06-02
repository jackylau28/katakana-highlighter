const DEBUG = false;
let transientBubbleEl = null;
let autoHideTimer = null;

// 當選取取消（沒有反白）時，隱藏浮動結果泡泡。
document.addEventListener("selectionchange", () => {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    if (
      transientBubbleEl &&
      (transientBubbleEl.matches(":hover") || transientBubbleEl.contains(document.activeElement))
    ) {
      return;
    }
    hideTransientBubble();
  }
});

// 使用者放開滑鼠後，讀取反白文字並請背景腳本進行轉換。
document.addEventListener("mouseup", async () => {
    
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) {
    return;
  }

  const text = selection.toString().trim();
  if (!text) {
    return;
  }

  if (!containsJapanese(text)) {
    return;
  }

  const range = selection.rangeCount ? selection.getRangeAt(0) : null;
  if (!range) {
    return;
  }

  const rect = range.getBoundingClientRect();

  const response = await chrome.runtime.sendMessage({
    type: "CONVERT_READING",
    text
  });

  if (!response?.ok) {
    return;
  }

  showBubble(rect, text, response.convertedText, response.outputMode);
});

// 接收背景腳本主動回傳（例如右鍵選單觸發）的轉換結果。
chrome.runtime.onMessage.addListener((message) => {
    
  if (message?.type !== "SHOW_READING_RESULT") {
    return;
  }

  const selection = window.getSelection();
  const range = selection && selection.rangeCount ? selection.getRangeAt(0) : null;
  const rect = range ? range.getBoundingClientRect() : { left: 24, top: 24, bottom: 24 };

  showBubble(
    rect,
    message.sourceText || "",
    message.convertedText || "",
    message.outputMode || "katakana"
  );
});

// 在反白位置附近顯示轉換結果泡泡。
async function showBubble(rect, sourceText, convertedText, outputMode) {

  if(sourceText== convertedText){
    return;
  }

  // 讀取使用者自訂的泡泡設定。
  let bubbleBgColor = "#0f172a";
  let bubblePosition = "bottom";
  let bubbleDuration = 0;

  try {
    const settings = await chrome.storage.sync.get([
      "bubbleBgColor",
      "bubblePosition",
      "bubbleDuration"
    ]);
    if (DEBUG) console.log("[katakana-highlighter] loaded settings:", settings);
    if (settings.bubbleBgColor) bubbleBgColor = settings.bubbleBgColor;
    if (settings.bubblePosition) bubblePosition = settings.bubblePosition;
    if (typeof settings.bubbleDuration === "number") bubbleDuration = settings.bubbleDuration;
  } catch (err) {
    if (DEBUG) console.warn("[katakana-highlighter] failed to load settings, using defaults:", err);
  }

  // 每次只維持一個「暫存泡泡」；已釘選泡泡會保留在頁面上。
  if (!transientBubbleEl) {
    transientBubbleEl = createBubbleElement();
    transientBubbleEl.dataset.pinned = "false";
    document.body.appendChild(transientBubbleEl);
  }
  transientBubbleEl.innerHTML = "";

  // 清除之前的自動消失計時器。
  clearAutoHideTimer();

  // 套用背景色（使用 background 簡寫確保完全覆蓋 CSS）。
  transientBubbleEl.style.background = bubbleBgColor;

  // 泡泡工具列：提供釘選切換，避免取消反白後自動消失。
  const tools = document.createElement("div");
  tools.className = "khb-tools";
  tools.addEventListener("mousedown", (event) => {
    // 點工具按鈕時避免選取被清掉，導致泡泡先被隱藏。
    event.preventDefault();
  });

  const pinBtn = document.createElement("button");
  pinBtn.className = "khb-pin-btn";
  pinBtn.type = "button";
  pinBtn.title = "釘選泡泡";
  pinBtn.textContent = "📌 釘選";
  const currentBubbleEl = transientBubbleEl;
  pinBtn.addEventListener("click", () => {
    if (!currentBubbleEl) {
      return;
    }

    const isPinned = currentBubbleEl.dataset.pinned === "true";

    // 允許切換釘選狀態：可釘選，也可取消釘選。
    if (isPinned) {
      currentBubbleEl.classList.remove("pinned");
      currentBubbleEl.dataset.pinned = "false";
      pinBtn.title = "釘選泡泡";
      pinBtn.textContent = "📌 釘選";

      // 取消釘選後，將此泡泡收回為唯一暫存泡泡，讓「清除反白」可自動隱藏。
      if (transientBubbleEl && transientBubbleEl !== currentBubbleEl) {
        transientBubbleEl.style.display = "none";
      }
      transientBubbleEl = currentBubbleEl;
      return;
    }

    // 釘選後把當前暫存泡泡轉為固定泡泡，下一次反白會建立新的暫存泡泡。
    currentBubbleEl.classList.add("pinned");
    currentBubbleEl.dataset.pinned = "true";
    pinBtn.title = "取消釘選";
    pinBtn.textContent = "📌 已釘選";
    if (transientBubbleEl === currentBubbleEl) {
      transientBubbleEl = null;
    }
  });
  tools.appendChild(pinBtn);

  const src = document.createElement("div");
  src.className = "khb-source";
  src.textContent = sourceText;

  const arrow = document.createElement("div");
  arrow.className = "khb-arrow";
  arrow.textContent = "→";

  const label = document.createElement("div");
  label.className = "khb-label";
  label.textContent = outputMode === "hiragana" ? "平仮名" : "カタカナ";

  const kata = document.createElement("div");
  kata.className = "khb-katakana";
  kata.textContent = convertedText;

//   bubbleEl.appendChild(src);
//   bubbleEl.appendChild(arrow);
//   bubbleEl.appendChild(label);
  transientBubbleEl.appendChild(kata);
  transientBubbleEl.appendChild(tools);

  transientBubbleEl.classList.remove("pinned");

  // 根據位置設定計算定位。
  if (bubblePosition === "fixed-bottom") {
    // 固定在頁面底部，80% 寬居中，不隨捲動移動。
    transientBubbleEl.style.position = "fixed";
    transientBubbleEl.style.bottom = "0";
    transientBubbleEl.style.top = "";
    transientBubbleEl.style.left = "10vw";
    transientBubbleEl.style.right = "";
    transientBubbleEl.style.maxWidth = "80vw";
    transientBubbleEl.style.borderRadius = "10px";
    transientBubbleEl.style.display = "block";
  } else {
    // absolute 定位：先設定水平位置再測量高度。
    transientBubbleEl.style.position = "absolute";
    transientBubbleEl.style.bottom = "";
    transientBubbleEl.style.right = "";
    transientBubbleEl.style.maxWidth = "";
    transientBubbleEl.style.borderRadius = "";

    const left = window.scrollX + rect.left;
    transientBubbleEl.style.left = `${left}px`;

    // 暫時顯示以測量實際高度，但保持不可見避免閃爍。
    transientBubbleEl.style.visibility = "hidden";
    transientBubbleEl.style.display = "block";
    const bubbleHeight = transientBubbleEl.offsetHeight;
    transientBubbleEl.style.visibility = "";

    let top;
    if (bubblePosition === "top") {
      top = window.scrollY + rect.top - bubbleHeight - 8;
      if (top < window.scrollY) {
        top = window.scrollY + rect.bottom + 8; // 上方空間不足時改放下方
      }
    } else {
      top = window.scrollY + rect.bottom + 8;
    }

    transientBubbleEl.style.top = `${top}px`;
  }

  // 自動消失計時器（僅對非釘選泡泡生效）。
  if (bubbleDuration > 0) {
    autoHideTimer = setTimeout(() => {
      if (transientBubbleEl && transientBubbleEl.dataset.pinned !== "true") {
        hideTransientBubble();
      }
    }, bubbleDuration * 1000);
  }
}

// 前端快速檢查：只處理包含日文字元的反白內容。
function containsJapanese(text) {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(text);
}

// 清除自動消失計時器。
function clearAutoHideTimer() {
  if (autoHideTimer) {
    clearTimeout(autoHideTimer);
    autoHideTimer = null;
  }
}

// 隱藏已建立的結果泡泡。
function hideTransientBubble() {
  clearAutoHideTimer();
  if (transientBubbleEl) {
    transientBubbleEl.style.display = "none";
  }
}

function createBubbleElement() {
  const el = document.createElement("div");
  el.className = "katakana-highlight-bubble";
  return el;
}
