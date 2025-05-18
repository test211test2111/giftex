require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const uuid = require('uuid').v4;
const app = express();

// Настройка шаблонизатора EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Настройка сессий
app.use(session({
  secret: process.env.SESSION_SECRET || 'giftex-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 },
  genid: () => uuid() // Генерация уникального ID для сессии
}));

// Импорт маршрутов
const indexRouter = require('./routes/index');
const tdauthRouter = require('./routes/tdauth'); // Новый маршрутизатор для TDLib
const apiRouter = require('./routes/api');
const adminRouter = require('./routes/admin'); // Маршрутизатор для админ-панели

// Проверка, установлены ли необходимые переменные окружения
if (!process.env.TELEGRAM_API_ID || !process.env.TELEGRAM_API_HASH) {
  console.error('ОШИБКА: API_ID и API_HASH должны быть указаны в файле .env');
  console.error('Получите эти значения на https://my.telegram.org/apps');
  process.exit(1);
}

// Проверка, установлены ли учетные данные администратора
if (!process.env.ADMIN_USERNAME || !process.env.ADMIN_PASSWORD) {
  console.warn('ПРЕДУПРЕЖДЕНИЕ: ADMIN_USERNAME и ADMIN_PASSWORD не указаны в файле .env');
  console.warn('Админ-панель будет использовать значения по умолчанию (admin/admin)');
  
  // Устанавливаем временные значения для разработки
  process.env.ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
  process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
}

// Использование маршрутов
app.use('/', indexRouter);
app.use('/tdauth', tdauthRouter); // Новый маршрут для TDLib авторизации
app.use('/api', apiRouter);
app.use('/admin', adminRouter); // Маршрут для админ-панели

// Обработка ошибок
app.use((req, res) => {
  res.status(404).render('error', { 
    title: 'Страница не найдена',
    message: 'Запрошенная страница не существует' 
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('error', { 
    title: 'Ошибка сервера',
    message: process.env.NODE_ENV === 'production' ? 'Что-то пошло не так' : err.message 
  });
});

// Запуск сервера
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Сервер запущен на порту ${PORT}`);
  console.log(`Админ-панель доступна по адресу: http://localhost:${PORT}/admin`);
}); 