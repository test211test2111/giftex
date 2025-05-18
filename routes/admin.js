const express = require('express');
const router = express.Router();
const stats = require('../models/stats');

// Проверка админских прав для доступа к админ-панели
// В реальном проекте следует использовать более надежную систему аутентификации
function checkAdminAuth(req, res, next) {
  // Проверка админской сессии
  if (!req.session.adminAuth) {
    return res.status(401).redirect('/admin/login');
  }
  next();
}

// Главная страница админки (отображение статистики)
router.get('/', checkAdminAuth, (req, res) => {
  res.render('admin/dashboard', { 
    title: 'Панель управления - GIFTEX',
    stats: stats.getStats()
  });
});

// Страница авторизации админа
router.get('/login', (req, res) => {
  // Если админ уже авторизован, перенаправляем на главную страницу админки
  if (req.session.adminAuth) {
    return res.redirect('/admin');
  }
  
  res.render('admin/login', { 
    title: 'Вход в панель управления - GIFTEX',
    error: req.query.error 
  });
});

// Обработка авторизации админа
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // Проверка учетных данных админа
  // В реальном проекте следует использовать хеширование паролей и более надежную систему аутентификации
  if (username === process.env.ADMIN_USERNAME && password === process.env.ADMIN_PASSWORD) {
    req.session.adminAuth = true;
    return res.redirect('/admin');
  } else {
    return res.redirect('/admin/login?error=1');
  }
});

// Выход из админ-панели
router.get('/logout', (req, res) => {
  req.session.adminAuth = false;
  res.redirect('/admin/login');
});

// API для получения статистики
router.get('/api/stats', checkAdminAuth, (req, res) => {
  res.json(stats.getStats());
});

// API для сброса статистики
router.post('/api/stats/reset', checkAdminAuth, (req, res) => {
  stats.resetStats();
  res.json({ success: true, message: 'Статистика сброшена' });
});

// API для получения последних ошибок
router.get('/api/errors', checkAdminAuth, (req, res) => {
  const currentStats = stats.getStats();
  res.json(currentStats.errors);
});

// API для получения последних пользователей
router.get('/api/users', checkAdminAuth, (req, res) => {
  const currentStats = stats.getStats();
  res.json(currentStats.lastUsers);
});

module.exports = router; 