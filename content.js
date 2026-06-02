let transientBubbleEl = null;

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
function showBubble(rect, sourceText, convertedText, outputMode) {

  if(sourceText== convertedText){
    return;
  }
  // 每次只維持一個「暫存泡泡」；已釘選泡泡會保留在頁面上。
  if (!transientBubbleEl) {
    transientBubbleEl = createBubbleElement();
    transientBubbleEl.dataset.pinned = "false";
    document.body.appendChild(transientBubbleEl);
  }
  transientBubbleEl.innerHTML = "";

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

  const top = window.scrollY + rect.bottom + 8;
  const left = window.scrollX + rect.left;

  transientBubbleEl.classList.remove("pinned");
  transientBubbleEl.style.top = `${top}px`;
  transientBubbleEl.style.left = `${left}px`;
  transientBubbleEl.style.display = "block";
}

// 前端快速檢查：只處理包含日文字元的反白內容。
function containsJapanese(text) {
  return /[\u3040-\u30ff\u3400-\u9fff]/.test(text);
}

// 隱藏已建立的結果泡泡。
function hideTransientBubble() {
  if (transientBubbleEl) {
    transientBubbleEl.style.display = "none";
  }
}

function createBubbleElement() {
  const el = document.createElement("div");
  el.className = "katakana-highlight-bubble";
  return el;
}
