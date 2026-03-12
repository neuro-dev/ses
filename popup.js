document.addEventListener('DOMContentLoaded', () => {
  const serverUrlInput = document.getElementById('serverUrl');
  const groupSelect = document.getElementById('groupSelect');
  const saveBtn = document.getElementById('saveBtn');
  const testBtn = document.getElementById('testBtn');
  const status = document.getElementById('status');
  
  // Загрузка сохранённых настроек
  chrome.storage.local.get(['userGroup', 'serverUrl'], (result) => {
    if (result.userGroup) {
      groupSelect.value = result.userGroup;
    }
    if (result.serverUrl) {
      serverUrlInput.value = result.serverUrl;
    } else {
      serverUrlInput.value = 'http://127.0.0.1:49850';
    }
    console.log('[EBS Popup] Загружены настройки:', result);
  });

  // Вспомогательная функция для отображения статуса
  function showStatus(htmlOrMessage, className, isHtml = false) {
    if (isHtml) {
      status.innerHTML = htmlOrMessage;
    } else {
      status.textContent = htmlOrMessage;
    }
    status.className = className;
    
    if (className && className !== 'loading') {
      setTimeout(() => {
        status.style.display = 'none';
        status.className = '';
      }, 5000);
    }
  }
  
  // Проверка соединения с сервером
  testBtn.addEventListener('click', async () => {
    const serverUrl = serverUrlInput.value.trim();
    
    if (!serverUrl) {
      showStatus('❌ Введите адрес сервера', 'error');
      return;
    }
    
    if (!serverUrl.match(/^https?:\/\/.+/)) {
      showStatus('❌ URL должен начинаться с http:// или https://', 'error');
      return;
    }
    
    const cleanUrl = serverUrl.replace(/\/$/, '');
    
    // Показываем статус загрузки
    showStatus('⏳ Подключение к серверу...', 'loading');
    testBtn.disabled = true;
    testBtn.textContent = 'Проверка...';
    
    try {
      // Запрос через background script (обход CORS)
      chrome.runtime.sendMessage(
        { 
          type: 'test_connection', 
          url: `${cleanUrl}/status` 
        },
        (response) => {
          testBtn.disabled = false;
          testBtn.textContent = '🔍 Проверить';
          
          if (chrome.runtime.lastError) {
            showStatus('❌ Ошибка: ' + chrome.runtime.lastError.message, 'error');
            return;
          }
          
          if (response && response.success) {
            const data = response.data;
            let statusHtml = `
              <div class="status-row"><span>✅ Статус:</span> <strong>${data.status}</strong></div>
              <div class="status-row"><span>📦 Всего записей:</span> <strong>${data.total_records}</strong></div>
              <div class="status-row"><span>📁 Группа II:</span> <strong>${data.groups['2g'] || 0}</strong></div>
              <div class="status-row"><span>📁 Группа III:</span> <strong>${data.groups['3g'] || 0}</strong></div>
            `;
            showStatus(statusHtml, 'success', true);
          } else {
            showStatus('❌ Ошибка: ' + (response?.error || 'Сервер не отвечает'), 'error');
          }
        }
      );
    } catch (e) {
      testBtn.disabled = false;
      testBtn.textContent = '🔍 Проверить';
      showStatus('❌ Ошибка соединения: ' + e.message, 'error');
    }
  });
  
  // Сохранение настроек
  saveBtn.addEventListener('click', () => {
    const serverUrl = serverUrlInput.value.trim();
    const selectedGroup = groupSelect.value;
    
    if (!serverUrl) {
      showStatus('❌ Введите адрес сервера', 'error');
      return;
    }
    
    if (!serverUrl.match(/^https?:\/\/.+/)) {
      showStatus('❌ URL должен начинаться с http:// или https://', 'error');
      return;
    }
    
    const cleanUrl = serverUrl.replace(/\/$/, '');
    
    chrome.storage.local.set({ 
      userGroup: selectedGroup,
      serverUrl: cleanUrl
    }, () => {
      showStatus('✅ Настройки сохранены! Обновите страницу (F5)', 'success');
      console.log('[EBS Popup] Сохранены настройки:', { serverUrl: cleanUrl, group: selectedGroup });
    });
  });
});