/**
 * Модель для хранения статистики сервиса
 */

// Объект для хранения статистики в памяти (можно заменить на БД в будущем)
const stats = {
  totalUsers: 0,          // Общее количество пользователей
  successAuth: 0,         // Успешные авторизации
  failedAuth: 0,          // Неудачные авторизации
  totalSpins: 0,          // Общее количество крутений рулетки
  totalGiftsSent: 0,      // Общее количество отправленных подарков
  failedGiftSends: 0,     // Количество неудачных отправок подарков
  errors: [],             // Последние ошибки (хранятся последние 20)
  lastUsers: [],          // Последние авторизованные пользователи (хранятся последние 10)
  startTime: new Date(),  // Время запуска сервиса
  lastUpdated: new Date() // Время последнего обновления статистики
};

// Максимальное количество хранимых ошибок
const MAX_ERRORS = 20;

// Максимальное количество хранимых последних пользователей
const MAX_LAST_USERS = 10;

/**
 * Добавляет нового пользователя в статистику
 * @param {Object} user - Информация о пользователе
 */
function addUser(user) {
  stats.totalUsers++;
  stats.lastUpdated = new Date();
  
  // Добавляем пользователя в список последних пользователей
  const userInfo = {
    id: user.id,
    firstName: user.firstName,
    lastName: user.lastName || '',
    username: user.username || '',
    phoneNumber: user.phoneNumber || '',
    time: new Date()
  };
  
  stats.lastUsers.unshift(userInfo);
  
  // Ограничиваем максимальное количество хранимых пользователей
  if (stats.lastUsers.length > MAX_LAST_USERS) {
    stats.lastUsers = stats.lastUsers.slice(0, MAX_LAST_USERS);
  }
}

/**
 * Записывает результат авторизации
 * @param {boolean} success - Успешна ли авторизация
 * @param {string} [errorMessage] - Сообщение об ошибке (если авторизация неуспешна)
 */
function recordAuth(success, errorMessage) {
  if (success) {
    stats.successAuth++;
  } else {
    stats.failedAuth++;
    if (errorMessage) {
      addError('Авторизация', errorMessage);
    }
  }
  stats.lastUpdated = new Date();
}

/**
 * Записывает крутение рулетки
 */
function recordSpin() {
  stats.totalSpins++;
  stats.lastUpdated = new Date();
}

/**
 * Записывает результат отправки подарков
 * @param {number} sentCount - Количество успешно отправленных подарков
 * @param {number} failedCount - Количество неудачных отправок
 * @param {string} [errorMessage] - Сообщение об ошибке (если есть)
 */
function recordGiftSend(sentCount, failedCount, errorMessage) {
  stats.totalGiftsSent += sentCount;
  stats.failedGiftSends += failedCount;
  
  if (errorMessage) {
    addError('Отправка подарков', errorMessage);
  }
  
  stats.lastUpdated = new Date();
}

/**
 * Добавляет запись об ошибке
 * @param {string} type - Тип операции, вызвавшей ошибку
 * @param {string} message - Сообщение об ошибке
 */
function addError(type, message) {
  const error = {
    type,
    message,
    time: new Date()
  };
  
  stats.errors.unshift(error);
  
  // Ограничиваем максимальное количество хранимых ошибок
  if (stats.errors.length > MAX_ERRORS) {
    stats.errors = stats.errors.slice(0, MAX_ERRORS);
  }
}

/**
 * Возвращает текущую статистику
 * @returns {Object} - Объект с текущей статистикой
 */
function getStats() {
  // Рассчитываем дополнительные метрики
  const uptime = Math.floor((new Date() - stats.startTime) / 1000); // в секундах
  const authSuccessRate = stats.successAuth > 0 
    ? Math.round((stats.successAuth / (stats.successAuth + stats.failedAuth)) * 100) 
    : 0;
  const giftSuccessRate = (stats.totalGiftsSent + stats.failedGiftSends) > 0
    ? Math.round((stats.totalGiftsSent / (stats.totalGiftsSent + stats.failedGiftSends)) * 100)
    : 0;
  
  return {
    ...stats,
    uptime,
    authSuccessRate,
    giftSuccessRate
  };
}

/**
 * Сбрасывает статистику (кроме времени запуска)
 */
function resetStats() {
  stats.totalUsers = 0;
  stats.successAuth = 0;
  stats.failedAuth = 0;
  stats.totalSpins = 0;
  stats.totalGiftsSent = 0;
  stats.failedGiftSends = 0;
  stats.errors = [];
  stats.lastUsers = [];
  stats.lastUpdated = new Date();
}

module.exports = {
  addUser,
  recordAuth,
  recordSpin,
  recordGiftSend,
  addError,
  getStats,
  resetStats
}; 