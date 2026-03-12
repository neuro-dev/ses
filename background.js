// ============================================
// SES Extension - background.js
// ============================================

// Создаем пункты контекстного меню при установке
chrome.runtime.onInstalled.addListener(() => {
  // Удаляем старые меню на всякий случай (чтобы не дублировались)
  chrome.contextMenus.removeAll(() => {
    // Создаем пункт "SES: Найти"
    chrome.contextMenus.create({
      id: "ebs_find",
      title: "SES: Найти",
      contexts: ["selection"],
      documentUrlPatterns: ["<all_urls>"]
    });
    
    // Создаем пункт "EBS: Добавить ответ"
    chrome.contextMenus.create({
      id: "ebs_add",
      title: "SES: Добавить ответ",
      contexts: ["selection"],
      documentUrlPatterns: ["<all_urls>"]
    });
    
    console.log('[SES] Контекстное меню создано');
  });
});

// Обработка кликов по меню
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (!tab || !tab.id) return;
  
  if (info.menuItemId === "ebs_find") {
    console.log('[SES] Меню: Найти', info.selectionText);
    chrome.tabs.sendMessage(tab.id, { 
      action: "find", 
      text: info.selectionText 
    });
  } 
  else if (info.menuItemId === "ebs_add") {
    console.log('[SES] Меню: Добавить', info.selectionText);
    chrome.tabs.sendMessage(tab.id, { 
      action: "add", 
      text: info.selectionText 
    });
  }
});

// Обработка запросов от content.js и popup.js
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // Запрос данных от content.js
  if (request.type === 'server_request') {
    handleServerRequest(request.url, request.options)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Важно для асинхронного ответа
  }
  
  // Тест соединения от popup.js
  if (request.type === 'test_connection') {
    testConnection(request.url)
      .then(data => sendResponse({ success: true, data }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Функция запроса к серверу
async function handleServerRequest(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}

// Функция теста соединения
async function testConnection(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'Accept': 'application/json'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    return await response.json();
  } catch (e) {
    clearTimeout(timeoutId);
    throw e;
  }
}