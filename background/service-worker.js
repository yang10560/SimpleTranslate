/**
 * SimpleTranslate - Background Service Worker
 * Handles cross-origin fetch requests, storage, and context menus.
 */

// ===================== Storage Helpers =====================

async function getStorage(key, defaultValue) {
  return new Promise((resolve) => {
    chrome.storage.local.get(key, (result) => {
      if (key in result) {
        resolve(result[key]);
      } else {
        resolve(defaultValue !== undefined ? defaultValue : null);
      }
    });
  });
}

async function setStorage(key, value) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [key]: value }, resolve);
  });
}

// ===================== Cross-Origin Fetch =====================

async function handleFetch(details) {
  const { method = "GET", url, headers = {}, data, responseType = "text" } = details;

  try {
    const fetchOptions = {
      method,
      headers,
    };

    if (data && method !== "GET") {
      fetchOptions.body = data;
    }

    const response = await fetch(url, fetchOptions);
    const status = response.status;
    let responseText;

    if (responseType === "stream") {
      // For stream responses, return as text (simplified for extension)
      responseText = await response.text();
    } else {
      responseText = await response.text();
    }

    return { status, responseText, success: true };
  } catch (error) {
    return { status: 0, error: error.message, success: false };
  }
}

// ===================== Message Handler =====================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  const { action, payload } = message;

  switch (action) {
    case "fetch":
      handleFetch(payload).then(sendResponse);
      return true; // async response

    case "getStorage":
      getStorage(payload.key, payload.defaultValue).then((value) => {
        sendResponse({ value });
      });
      return true;

    case "setStorage":
      setStorage(payload.key, payload.value).then(() => {
        sendResponse({ success: true });
      });
      return true;

    case "openTab":
      chrome.tabs.create({ url: payload.url, active: payload.active !== false });
      sendResponse({ success: true });
      return false;

    case "getAuthToken":
      // Fetch Microsoft translate auth token
      fetch("https://edge.microsoft.com/translate/auth")
        .then((res) => res.text())
        .then((token) => sendResponse({ token, success: true }))
        .catch((err) => sendResponse({ error: err.message, success: false }));
      return true;

    default:
      sendResponse({ error: "Unknown action" });
      return false;
  }
});

// ===================== Context Menu =====================

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "translateToChinese",
    title: "翻译选中文本 → 中文",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "translateToEnglish",
    title: "翻译选中文本 → 外文",
    contexts: ["selection"],
  });

  chrome.contextMenus.create({
    id: "translatePage",
    title: "翻译整个页面",
    contexts: ["page"],
  });

  chrome.contextMenus.create({
    id: "restorePage",
    title: "还原页面",
    contexts: ["page"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  switch (info.menuItemId) {
    case "translateToChinese":
      chrome.tabs.sendMessage(tab.id, { action: "translateSelection", lang: "zh" });
      break;
    case "translateToEnglish":
      chrome.tabs.sendMessage(tab.id, { action: "translateSelection", lang: "en" });
      break;
    case "translatePage":
      chrome.tabs.sendMessage(tab.id, { action: "translatePage", lang: "zh" });
      break;
    case "restorePage":
      chrome.tabs.sendMessage(tab.id, { action: "restorePage" });
      break;
  }
});

// ===================== Listen for messages from content script =====================

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getAuthToken") {
    fetch("https://edge.microsoft.com/translate/auth")
      .then((res) => res.text())
      .then((token) => sendResponse({ token, success: true }))
      .catch((err) => sendResponse({ error: err.message, success: false }));
    return true;
  }
});
