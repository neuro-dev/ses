# ses
search for electrical safety

ebs-extension/
├── manifest.json          # Конфигурация расширения
├── content.js             # Скрипт, работающий на страницах (поиск, UI)
├── fuse.min.js            # Библиотека для нечеткого поиска (скачать отдельно)
├── background.js          # Фоновый скрипт (меню, шорткаты)
├── popup.html             # Окно настроек
├── popup.js               # Логика настроек
├── styles.css             # Стили для подсказок
└── server/                # Папка для серверной части
    ├── app.py             # Сервер на Python
    └── data_2g.json       # Файл данных (создать пустым [])
    └── data_3g.json       # Файл данных (создать пустым [])