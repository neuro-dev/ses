// ============================================
// SES Extension - content.js
// ============================================

// Настройки (будут загружены из storage)
let SERVER_URL = 'http://127.0.0.1:49850'; // Значение по умолчанию
let currentGroup = '2g';
let fuse = null;
let dbData = [];

// ============================================
// Создание UI элементов
// ============================================

// Тултип для показа результата
const tooltipEl = document.createElement('div');
tooltipEl.id = 'ebs-tooltip';
tooltipEl.innerHTML = '<span class="ebs-close" style="position:absolute;top:2px;right:5px;cursor:pointer;color:#999;">✕</span>';
document.body.appendChild(tooltipEl);

// Модальное окно для добавления ответа
const modalOverlay = document.createElement('div');
modalOverlay.id = 'ebs-modal-overlay';
modalOverlay.innerHTML = `
  <div id="ebs-modal">
    <h4 style="margin:0 0 10px 0;">Добавить ответ для:</h4>
    <div id="ebs-q-term" style="font-weight:bold;margin-bottom:10px;color:#0066cc;"></div>
    <textarea id="ebs-answer-input" placeholder="Введите ответ..." style="width:100%;height:80px;padding:8px;border:1px solid #ccc;border-radius:4px;box-sizing:border-box;font-size:14px;"></textarea>
    <button id="ebs-save-btn" style="background:#007bff;color:white;border:none;padding:10px;border-radius:4px;cursor:pointer;width:100%;font-size:14px;margin-top:5px;">Записать</button>
    <button id="ebs-cancel-btn" style="background:#ccc;color:#333;border:none;padding:10px;border-radius:4px;cursor:pointer;width:100%;font-size:14px;margin-top:5px;">Отмена</button>
  </div>
`;
document.body.appendChild(modalOverlay);

// ============================================
// Инициализация
// ============================================

chrome.storage.local.get(['userGroup', 'serverUrl'], (result) => {
  currentGroup = result.userGroup || '2g';
  SERVER_URL = result.serverUrl || 'http://127.0.0.1:49850';
  
  console.log(`[EBS] Инициализация:`);
  console.log(`  • Группа: ${currentGroup}`);
  console.log(`  • Сервер: ${SERVER_URL}`);
  
  loadDataFromServer();
});

// Отслеживание изменений настроек
chrome.storage.onChanged.addListener((changes, namespace) => {
  if (namespace === 'local' && changes.userGroup) {
    currentGroup = changes.userGroup.newValue;
    console.log(`[EBS] Группа изменена на: ${currentGroup}`);
    loadDataFromServer();
  }
});

// ============================================
// Работа с сервером
// ============================================

async function loadDataFromServer() {
  console.log(`[EBS] Загрузка данных: ${SERVER_URL}/get_data/${currentGroup}`);
  
  try {
    const response = await fetch(`${SERVER_URL}/get_data/${currentGroup}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-cache'
    });
    
    console.log(`[EBS] Статус ответа: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.includes("application/json")) {
      throw new Error("Сервер вернул не JSON");
    }
    
    dbData = await response.json();
    console.log(`[EBS] Получено записей: ${dbData.length}`);
    
    // Инициализация Fuse.js
    if (typeof Fuse !== 'undefined') {
      const options = {
        keys: ['term'],
        threshold: 0.4,
        includeScore: true,
        ignoreLocation: true,
        minMatchCharLength: 2
      };
      fuse = new Fuse(dbData, options);
      console.log(`✅ EBS: Fuse.js инициализирован. Загружено ${dbData.length} записей`);
    } else {
      console.warn('⚠️ EBS: Fuse.js не загружен! Проверьте, что fuse.min.js подключен в manifest.json');
    }
    
  } catch (e) {
    console.error('❌ EBS: Ошибка загрузки данных', e);
    console.error('EBS: Тип:', e.name, '| Сообщение:', e.message);
    
    // Дружелюбные сообщения об ошибках
    if (e.name === 'TypeError' && e.message.includes('Failed to fetch')) {
      console.error('EBS: 🔧 Проверьте: 1) Сервер запущен 2) Порт 49850 3) Нет блокировки CORS');
    } else if (e.name === 'AbortError') {
      console.error('EBS: ⏱️ Таймаут запроса - сервер отвечает медленно');
    }
  }
}

async function sendToServer(term, description) {
  console.log(`[EBS] Отправка новой записи в группу ${currentGroup}`);
  
  try {
    const response = await fetch(`${SERVER_URL}/add_data`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      mode: 'cors',
      credentials: 'omit',
      body: JSON.stringify({
        group: currentGroup,
        term: term,
        description: description
      })
    });
    
    console.log(`[EBS] Статус отправки: ${response.status}`);
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }
    
    const result = await response.json();
    console.log('✅ EBS: Запись успешно сохранена', result);
    return { success: true, data: result };
    
  } catch (e) {
    console.error('❌ EBS: Ошибка отправки на сервер', e);
    return { success: false, error: e.message };
  }
}

// ============================================
// Поиск и UI
// ============================================

function performSearch(query) {
  console.log(`[EBS] Поиск: "${query}"`);
  
  if (!fuse) {
    showTooltip("⚠️ База не загружена. Проверьте консоль (F12) для деталей.");
    return;
  }
  
  if (!query || query.trim().length < 2) {
    showTooltip("⚠️ Введите минимум 2 символа для поиска");
    return;
  }
  
  const result = fuse.search(query);
  console.log(`[EBS] Найдено совпадений: ${result.length}`);
  
  if (result.length > 0 && result[0].score <= 0.5) {
    // Успешный поиск
    const item = result[0].item;
    const score = Math.round((1 - result[0].score) * 100);
    const content = `
      <strong style="font-size:14px;color:#0066cc;">${escapeHtml(item.term)}</strong>
      <span style="font-size:11px;color:#999;margin-left:5px;">${score}%</span>
      <br><span style="font-size:14px;color:#333;">${escapeHtml(item.description)}</span>
    `;
    showTooltip(content, false);
  } else {
    // Не найдено
    showTooltip("❌ Не найдено. Используйте <b>ПКМ → EBS: Добавить</b>", true);
  }
}

function showTooltip(htmlContent, isNotFound = false) {
  const selection = window.getSelection();
  
  if (selection.rangeCount > 0) {
    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();
    
    // Размеры тултипа
    const tooltipWidth = 320;
    const tooltipHeight = isNotFound ? 80 : 120;
    
    // Позиционируем СПРАВА от выделения
    let top = rect.top + window.scrollY;
    let left = rect.right + window.scrollX + 15; // 15px отступ справа
    
    // Проверяем, не выходит ли за правый край экрана
    const screenWidth = window.innerWidth;
    const scrollLeft = window.scrollX;
    const maxLeft = scrollLeft + screenWidth - tooltipWidth - 20;
    
    if (left > maxLeft) {
      // Если не помещается справа, показываем СЛЕВА от выделения
      left = rect.left + window.scrollX - tooltipWidth - 15;
      
      // Если и слева не помещается, центрируем по экрану
      if (left < scrollLeft + 10) {
        left = scrollLeft + (screenWidth - tooltipWidth) / 2;
      }
    }
    
    // Проверяем, не выходит ли за нижний край экрана
    const scrollTop = window.scrollY;
    const screenHeight = window.innerHeight;
    const maxTop = scrollTop + screenHeight - tooltipHeight - 20;
    
    if (top > maxTop) {
      // Если не помещается снизу, показываем выше
      top = rect.top + window.scrollY - tooltipHeight - 15;
    }
    
    // Ограничиваем сверху
    if (top < scrollTop + 10) {
      top = scrollTop + 10;
    }
    
    // Применяем позиции
    tooltipEl.style.top = top + 'px';
    tooltipEl.style.left = left + 'px';
    tooltipEl.style.maxWidth = tooltipWidth + 'px';
  }
  
  // Контент тултипа
  tooltipEl.innerHTML = `
    <span class="ebs-close" style="position:absolute;top:5px;right:8px;cursor:pointer;color:#999;font-size:16px;line-height:1;">&times;</span>
    <div style="padding: 10px 35px 10px 12px;">${htmlContent}</div>
  `;
  
  tooltipEl.style.display = 'block';
  tooltipEl.style.position = 'fixed'; // Меняем на fixed для лучшей стабильности
  tooltipEl.style.zIndex = '2147483647';
  tooltipEl.style.pointerEvents = 'auto';
  
  // Обработчик закрытия на крестик
  const closeBtn = tooltipEl.querySelector('.ebs-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      tooltipEl.style.display = 'none';
    });
  }
  
  // Автозакрытие при клике вне тултипа
  const hideOnOutsideClick = (e) => {
    if (!tooltipEl.contains(e.target)) {
      tooltipEl.style.display = 'none';
      document.removeEventListener('mousedown', hideOnOutsideClick);
      document.removeEventListener('contextmenu', hideOnOutsideClick);
    }
  };
  
  setTimeout(() => {
    document.addEventListener('mousedown', hideOnOutsideClick);
    document.addEventListener('contextmenu', hideOnOutsideClick);
  }, 50);
}

// Экранирование HTML для безопасности
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// Обработчики событий
// ============================================

// Шорткат: Shift + Alt + X
document.addEventListener('keydown', (e) => {
  if (e.shiftKey && e.altKey && e.code === 'KeyX') {
    e.preventDefault();
    e.stopPropagation();
    
    const selection = window.getSelection().toString().trim();
    if (selection) {
      console.log('[EBS] Шорткат активирован, выделено:', selection);
      performSearch(selection);
    } else {
      showTooltip("⚠️ Выделите текст для поиска");
    }
  }
});

// Сообщения от background.js (контекстное меню)
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[EBS] Получено сообщение:', request.action);
  
  if (request.action === 'find' && request.text) {
    performSearch(request.text);
  } 
  else if (request.action === 'add' && request.text) {
    openAddModal(request.text);
  }
  
  sendResponse({ status: 'ok' });
  return true; // Для асинхронного ответа
});

// ============================================
// Модальное окно добавления
// ============================================

function openAddModal(term) {
  console.log('[EBS] Открытие модального окна для:', term);
  
  document.getElementById('ebs-q-term').textContent = term;
  document.getElementById('ebs-answer-input').value = '';
  modalOverlay.style.display = 'flex';
  
  // Фокус на поле ввода
  setTimeout(() => {
    const input = document.getElementById('ebs-answer-input');
    if (input) {
      input.focus();
      input.select();
    }
  }, 100);
}

// Кнопка "Записать"
document.getElementById('ebs-save-btn')?.addEventListener('click', async () => {
  const term = document.getElementById('ebs-q-term')?.textContent;
  const description = document.getElementById('ebs-answer-input')?.value.trim();
  
  if (!description) {
    alert("⚠️ Введите ответ в поле");
    return;
  }
  
  // Блокируем кнопку на время отправки
  const btn = document.getElementById('ebs-save-btn');
  const originalText = btn.textContent;
  btn.textContent = 'Сохранение...';
  btn.disabled = true;
  
  try {
    const result = await sendToServer(term, description);
    
    if (result.success) {
      alert("✅ Ответ успешно сохранен!");
      modalOverlay.style.display = 'none';
      // Перезагружаем базу, чтобы новый ответ сразу искался
      loadDataFromServer();
    } else {
      alert("❌ Ошибка: " + result.error);
    }
  } catch (e) {
    alert("❌ Ошибка соединения: " + e.message);
  } finally {
    btn.textContent = originalText;
    btn.disabled = false;
  }
});

// Кнопка "Отмена" и клик по оверлею
document.getElementById('ebs-cancel-btn')?.addEventListener('click', () => {
  modalOverlay.style.display = 'none';
});

modalOverlay.addEventListener('click', (e) => {
  if (e.target === modalOverlay) {
    modalOverlay.style.display = 'none';
  }
});

// Закрытие модального окна по Escape
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && modalOverlay.style.display === 'flex') {
    modalOverlay.style.display = 'none';
  }
});

// ============================================
// Отладка: проверка готовности
// ============================================

console.log('✅ EBS content.js загружен');
console.log('EBS: Server URL:', SERVER_URL);
console.log('EBS: Fuse.js доступен:', typeof Fuse !== 'undefined');

// Авто-тест подключения при загрузке страницы
setTimeout(() => {
  if (!dbData.length && fuse) {
    console.log('🔄 EBS: Попытка повторной загрузки данных...');
    loadDataFromServer();
  }
}, 2000);