import { app } from "../../scripts/app.js";

const BUTTON_CLASS = "ls-copy-image-button";
const STYLE_ID = "ls-copy-image-button-style";

function installStyle() {
  if (document.getElementById(STYLE_ID)) {
    return;
  }

  const style = document.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
    .${BUTTON_CLASS} {
      align-items: center;
      background: var(--comfy-menu-bg, #2b2b2b);
      border: 1px solid var(--border-color, #555);
      border-radius: 4px;
      color: var(--input-text, #ddd);
      cursor: pointer;
      display: inline-flex;
      font: inherit;
      gap: 6px;
      line-height: 1.2;
      margin-left: 8px;
      min-height: 28px;
      padding: 5px 10px;
      white-space: nowrap;
    }

    .${BUTTON_CLASS}:hover {
      background: var(--comfy-input-bg, #3a3a3a);
      color: var(--input-text, #fff);
    }

    .${BUTTON_CLASS}:disabled {
      cursor: wait;
      opacity: 0.7;
    }
  `;
  document.head.appendChild(style);
}

function isVisible(element) {
  const rect = element.getBoundingClientRect();
  const style = getComputedStyle(element);
  return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
}

function findPreviewRoot(element) {
  return (
    element.closest(".p-dialog, .modal, .comfy-modal, .comfy-image-preview, [role='dialog']") ||
    element.parentElement ||
    document.body
  );
}

function findDownloadControls() {
  const controls = [];
  const elements = document.querySelectorAll("a[download], a[href*='/view?'], button, a");

  for (const element of elements) {
    if (!isVisible(element)) {
      continue;
    }

    const label = `${element.textContent || ""} ${element.title || ""} ${element.ariaLabel || ""}`.toLowerCase();
    const isDownload =
      element.hasAttribute("download") ||
      label.includes("download") ||
      label.includes("下载");

    if (isDownload) {
      controls.push(element);
    }
  }

  return controls;
}

function findPreviewImage(root) {
  const images = [...root.querySelectorAll("img")].filter((image) => {
    const src = image.currentSrc || image.src || "";
    return isVisible(image) && src && image.getBoundingClientRect().width >= 120 && image.getBoundingClientRect().height >= 120;
  });

  images.sort((a, b) => {
    const aRect = a.getBoundingClientRect();
    const bRect = b.getBoundingClientRect();
    return bRect.width * bRect.height - aRect.width * aRect.height;
  });

  return images[0] || null;
}

async function toPngBlob(blob) {
  if (blob.type === "image/png") {
    return blob;
  }

  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;

  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0);
  bitmap.close?.();

  return await new Promise((resolve, reject) => {
    canvas.toBlob((pngBlob) => {
      if (pngBlob) {
        resolve(pngBlob);
      } else {
        reject(new Error("图片转换失败"));
      }
    }, "image/png");
  });
}

async function copyImage(image, button) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") {
    throw new Error("当前浏览器不支持复制图片到剪贴板");
  }

  const previousText = button.textContent;
  button.disabled = true;
  button.textContent = "复制中...";

  try {
    const url = image.currentSrc || image.src;
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`图片读取失败: ${response.status}`);
    }

    const pngBlob = await toPngBlob(await response.blob());
    await navigator.clipboard.write([new ClipboardItem({ "image/png": pngBlob })]);
    button.textContent = "已复制";
    setTimeout(() => {
      button.textContent = previousText;
      button.disabled = false;
    }, 1200);
  } catch (error) {
    button.textContent = "复制失败";
    console.error("[LS Copy Image Button]", error);
    setTimeout(() => {
      button.textContent = previousText;
      button.disabled = false;
    }, 1800);
  }
}

function addCopyButtons() {
  for (const downloadControl of findDownloadControls()) {
    const root = findPreviewRoot(downloadControl);
    if (root.querySelector(`.${BUTTON_CLASS}`)) {
      continue;
    }

    const image = findPreviewImage(root);
    if (!image) {
      continue;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = BUTTON_CLASS;
    button.textContent = "复制图片";
    button.title = "复制当前放大预览图片到剪贴板";
    button.addEventListener("click", () => copyImage(image, button));

    downloadControl.insertAdjacentElement("afterend", button);
  }
}

app.registerExtension({
  name: "LS.CopyImageButton",
  setup() {
    installStyle();
    addCopyButtons();

    const observer = new MutationObserver(() => addCopyButtons());
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  },
});
