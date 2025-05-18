// Прямое тестирование tdl без нашего класса-обертки
require('dotenv').config();
const { Client } = require('tdl');
const tdlAddon = require('tdl-tdlib-addon');
const path = require('path');
const fs = require('fs');

async function testDirectTdl() {
  console.log('Прямое тестирование TDLib...');
  
  // Создаем тестовую директорию
  const testDir = path.resolve(__dirname, 'test-direct-tdl');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // Выводим значения переменных
  console.log('TELEGRAM_API_ID:', process.env.TELEGRAM_API_ID, 'тип:', typeof process.env.TELEGRAM_API_ID);
  console.log('TELEGRAM_API_HASH:', process.env.TELEGRAM_API_HASH ? 'установлен' : 'не установлен');
  
  // API ID как число
  const apiId = Number(process.env.TELEGRAM_API_ID);
  console.log('apiId после преобразования:', apiId, 'тип:', typeof apiId);
  
  // Найдем нашу библиотеку
  const localLibPath = path.resolve(__dirname, 'lib/libtdjson.dylib');
  console.log('Проверяем путь к библиотеке:', localLibPath);
  console.log('Библиотека существует:', fs.existsSync(localLibPath));
  
  try {
    // Создаем клиент с явно указанным путем к библиотеке
    const client = new Client(new tdlAddon.TDLib(localLibPath), {
      apiId: apiId,
      apiHash: process.env.TELEGRAM_API_HASH,
      databaseDirectory: testDir,
      filesDirectory: path.resolve(testDir, 'files')
    });
    
    console.log('Клиент TDLib создан успешно!');
    
    // Пробуем подключиться
    console.log('Подключение...');
    await client.connect();
    console.log('Подключено!');
    
    // Получаем состояние авторизации
    const authState = await client.invoke({
      _: 'getAuthorizationState'
    });
    console.log('Текущее состояние авторизации:', authState._);
    
    // Закрываем клиент
    await client.close();
    console.log('Тест завершен успешно!');
    
    return true;
  } catch (error) {
    console.error('Ошибка при прямом тестировании TDLib:', error);
    return false;
  }
}

// Запускаем тест
testDirectTdl()
  .then(success => {
    if (success) {
      console.log('🟢 Прямое тестирование TDLib успешно');
      process.exit(0);
    } else {
      console.log('🔴 Возникли проблемы при прямом тестировании TDLib');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Критическая ошибка:', err);
    process.exit(1);
  }); 