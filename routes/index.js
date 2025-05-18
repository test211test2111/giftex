const express = require('express');
const router = express.Router();

// Главная страница с рулеткой
router.get('/', (req, res) => {
  res.render('index', { 
    title: 'GIFTEX - Telegram Gift Roulette',
    user: req.session.user || null
  });
});

// Страница профиля пользователя (требует авторизации)
router.get('/profile', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/tdauth');
  }
  
  res.render('profile', {
    title: 'Ваш профиль',
    user: req.session.user
  });
});

// Страница баланса (требует авторизации)
router.get('/balance', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/tdauth');
  }
  
  // Заглушка для баланса и истории операций
  const mockBalance = {
    amount: 1000,
    currency: 'RUB',
    history: [
      { id: 1, type: 'deposit', amount: 500, date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      { id: 2, type: 'withdraw', amount: -200, date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000) },
      { id: 3, type: 'deposit', amount: 700, date: new Date() }
    ]
  };
  
  res.render('balance', {
    title: 'Ваш баланс',
    user: req.session.user,
    balance: mockBalance
  });
});

module.exports = router; 