"use strict";

const instructions = document.getElementById("installInstructions");
const installButton = document.getElementById("installApp");
const statusMessage = document.getElementById("cacheStatus");
let promptEvent;

function standalone() {
  return matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
}

function updateInstallInstructions() {
  const ua = navigator.userAgent;
  const isApple = /iPhone|iPad|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (standalone()) {
    instructions.textContent = "已从桌面打开。";
  } else if (/MicroMessenger|QQ\/|DingTalk|FBAN\/|Instagram/.test(ua)) {
    instructions.textContent = "请从右上角菜单选择「在浏览器中打开」，再将医学拼写添加到主屏幕。";
  } else if (promptEvent) {
    instructions.textContent = "将医学拼写添加到桌面，以后可以直接打开练习。";
  } else if (isApple) {
    instructions.textContent = "在 Safari 中点「分享」，选择「添加到主屏幕」，再点「添加」。";
  } else {
    instructions.textContent = "打开浏览器菜单，选择「添加到主屏幕」或「安装应用」。";
  }
  installButton.hidden = standalone() || !promptEvent;
}

window.addEventListener("beforeinstallprompt", event => {
  event.preventDefault();
  promptEvent = event;
  updateInstallInstructions();
});
installButton.addEventListener("click", async () => {
  const event = promptEvent;
  if (!event) return;
  promptEvent = null;
  installButton.hidden = true;
  try {
    await event.prompt();
    await event.userChoice;
  } finally {
    updateInstallInstructions();
  }
});
window.addEventListener("appinstalled", () => {
  promptEvent = null;
  updateInstallInstructions();
});
updateInstallInstructions();

if ("serviceWorker" in navigator) {
  const warm = async () => {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage("warm-audio");
  };
  navigator.serviceWorker.addEventListener("message", event => {
    if (event.data?.type === "audio-cache") {
      statusMessage.textContent = event.data.complete
        ? "题库和全部发音已备好，可在此设备离线练习。"
        : "部分发音尚未缓存，下次联网时会继续。";
    }
  });
  window.addEventListener("online", warm);
  navigator.serviceWorker.register("./sw.js").then(warm).catch(() => {
    statusMessage.textContent = "当前浏览器未能启用离线练习，可继续在线使用。";
  });
}
