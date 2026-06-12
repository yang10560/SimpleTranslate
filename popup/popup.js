/**
 * SimpleTranslate - Popup Script
 */

// Send message to active tab
function sendToTab(action, payload = {}) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { action, ...payload });
    }
  });
}

// Get storage value
function getValue(key, defaultValue) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      resolve(key in result ? result[key] : defaultValue);
    });
  });
}

// Set storage value
function setValue(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

// Initialize popup
async function init() {
  // Load current settings
  const isDoubleShow = await getValue("isDoubleShow", true);
  const isHighlight = await getValue("isHighlight", true);
  const englishAutoTranslate = await getValue("englishAutoTranslate", false);
  const leftSelectMode = await getValue("leftSelectMode", false);
  const switchIndex = await getValue("switchIndex", 0);

  // Set toggle states
  document.getElementById("toggleDoubleShow").checked = isDoubleShow;
  document.getElementById("toggleHighlight").checked = isHighlight;
  document.getElementById("toggleAutoTranslate").checked = englishAutoTranslate;
  document.getElementById("toggleSelectMode").checked = leftSelectMode;

  // Set engine
  const engineSelect = document.getElementById("engineSelect");
  engineSelect.value = switchIndex;
  const engineNames = [
    '微软', '谷歌', '腾讯交互', '有道手机', '百度', '有道', '讯飞',
    '搜狗', '词霸', '沪江小D', '彩云', 'Alibaba', 'Papago',
    '百度手机', 'worldlinGO', 'DeepL', '易翻通', 'Yandex', '福昕', 'CNKI', '金山快译'
  ];
  document.getElementById("currentEngineName").textContent = engineNames[switchIndex] || '微软';
}

// ==================== Event Listeners ====================

// Translate buttons
document.getElementById("translateToZh").addEventListener("click", () => {
  sendToTab("translatePage", { lang: "zh" });
  window.close();
});

document.getElementById("translateToEn").addEventListener("click", () => {
  sendToTab("translatePage", { lang: "en" });
  window.close();
});

document.getElementById("restoreBtn").addEventListener("click", () => {
  sendToTab("restorePage");
  window.close();
});

// Toggle: double show
document.getElementById("toggleDoubleShow").addEventListener("change", async (e) => {
  await setValue("isDoubleShow", e.target.checked);
  sendToTab("updateSettings");
});

// Toggle: highlight
document.getElementById("toggleHighlight").addEventListener("change", async (e) => {
  await setValue("isHighlight", e.target.checked);
  sendToTab("updateSettings");
});

// Toggle: auto translate
document.getElementById("toggleAutoTranslate").addEventListener("change", async (e) => {
  await setValue("englishAutoTranslate", e.target.checked);
});

// Toggle: select mode
document.getElementById("toggleSelectMode").addEventListener("change", async (e) => {
  await setValue("leftSelectMode", e.target.checked);
});

// Engine selection
document.getElementById("engineSelect").addEventListener("change", async (e) => {
  const idx = parseInt(e.target.value);
  await setValue("switchIndex", idx);
  const engineNames = [
    '微软', '谷歌', '腾讯交互', '有道手机', '百度', '有道', '讯飞',
    '搜狗', '词霸', '沪江小D', '彩云', 'Alibaba', 'Papago',
    '百度手机', 'worldlinGO', 'DeepL', '易翻通', 'Yandex', '福昕', 'CNKI', '金山快译'
  ];
  document.getElementById("currentEngineName").textContent = engineNames[idx] || '微软';
  sendToTab("switchEngine", { index: idx });
});

// Initialize
init();
