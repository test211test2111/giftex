const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const axios = require('axios');

// Функция для проверки данных от Telegram Login Widget
function checkTelegramSignature(data) {
  const { hash, ...userData } = data;
  
  // Сортируем данные в алфавитном порядке
  const dataCheckArray = Object.entries(userData)
    .filter(([_, value]) => value !== undefined)
    .map(([key, value]) => `${key}=${value}`)
    .sort()
    .join('\n');
  
  // Создаем sha256 HMAC с использованием секретного ключа
  const secretKey = crypto.createHash('sha256')
    .update(process.env.TELEGRAM_BOT_TOKEN)
    .digest();
  
  const checkHash = crypto.createHmac('sha256', secretKey)
    .update(dataCheckArray)
    .digest('hex');
  
  return hash === checkHash;
}

// Маршрут для авторизации через Telegram
router.get('/telegram', (req, res) => {
  res.render('login', { 
    title: 'Авторизация через Telegram - Giftex',
    botUsername: process.env.TELEGRAM_BOT_USERNAME 
  });
});

// Обработка колбэка от Telegram Login Widget
router.post('/telegram/callback', (req, res) => {
  const telegramData = req.body;
  
  // Проверяем подпись данных от Telegram
  if (!checkTelegramSignature(telegramData)) {
    return res.status(401).json({ error: 'Неверные данные авторизации' });
  }
  
  // Сохраняем данные пользователя в сессии
  req.session.user = {
    id: telegramData.id,
    firstName: telegramData.first_name,
    lastName: telegramData.last_name || '',
    username: telegramData.username || '',
    photoUrl: telegramData.photo_url || '',
    authDate: telegramData.auth_date,
    hash: telegramData.hash
  };
  
  // Запрещаем повторную отправку сообщений при обновлении страницы
  if (!req.session.messagesSent) {
    req.session.messagesSent = false;
  }
  
  res.json({ success: true, redirectUrl: '/api/spin' });
});

// Выход из системы
router.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

module.exports = router; 