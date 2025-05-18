// Скрипт для проверки работы TDLib
require('dotenv').config();
const { TelegramClient } = require('./config/telegram');

// Проверка переменных окружения
console.log('Проверка переменных окружения:');
console.log('TELEGRAM_API_ID:', process.env.TELEGRAM_API_ID, 'тип:', typeof process.env.TELEGRAM_API_ID);
console.log('TELEGRAM_API_HASH:', process.env.TELEGRAM_API_HASH ? 'установлен' : 'не установлен');

async function testTDLib() {
  console.log('Тестирование TDLib...');
  
  try {
    // Создаем клиент с тестовым ID сессии
    const client = new TelegramClient('test-session');
    console.log('Клиент TDLib создан успешно!');
    
    // Проверяем соединение
    await client.connect();
    console.log('Соединение с TDLib установлено!');
    
    // Ждем некоторое время для получения всех обновлений
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Получаем состояние авторизации
    const authState = await client.getAuthState();
    console.log('Текущее состояние авторизации:', authState._);
    
    // Закрываем клиент
    await client.close();
    console.log('Тест завершен успешно!');
    
    return true;
  } catch (error) {
    console.error('Ошибка при тестировании TDLib:', error);
    return false;
  }
}

// Запускаем тест
testTDLib()
  .then(success => {
    if (success) {
      console.log('🟢 TDLib работает корректно');
      process.exit(0);
    } else {
      console.log('🔴 Возникли проблемы при работе с TDLib');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Критическая ошибка:', err);
    process.exit(1);
  }); 