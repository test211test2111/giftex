// Упрощенный тест для TDLib
require('dotenv').config();
const { Client } = require('tdl');
const { TDLib } = require('tdl-tdlib-addon');
const path = require('path');
const fs = require('fs');

async function simpleTdlibTest() {
  // Подготовка директории для сессии
  const sessionPath = path.resolve(__dirname, 'simple-test-session');
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  // Определяем путь к библиотеке в зависимости от ОС
  const platform = process.platform;
  let libPath;
  
  if (platform === 'darwin') {
    libPath = path.resolve(__dirname, 'lib/libtdjson.dylib');
  } else if (platform === 'linux') {
    libPath = path.resolve(__dirname, 'lib/libtdjson.so');
    if (!fs.existsSync(libPath)) {
      // Проверяем символическую ссылку для совместимости
      const compatPath = path.resolve(__dirname, 'lib/libtdjson.dylib');
      if (fs.existsSync(compatPath)) {
        libPath = compatPath;
      } else {
        // Проверяем системные пути
        if (fs.existsSync('/usr/local/lib/libtdjson.so')) {
          libPath = '/usr/local/lib/libtdjson.so';
        } else if (fs.existsSync('/usr/lib/libtdjson.so')) {
          libPath = '/usr/lib/libtdjson.so';
        }
      }
    }
  } else if (platform === 'win32') {
    libPath = path.resolve(__dirname, 'lib/tdjson.dll');
  }

  console.log('Библиотека существует:', fs.existsSync(libPath));
  console.log('Путь к библиотеке:', libPath);
  
  // Параметры
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;

  console.log('Используем API_ID:', apiId, 'тип:', typeof apiId);
  console.log('Используем API_HASH:', apiHash);

  // Создаем клиент
  console.log('Создание клиента TDLib...');
  const client = new Client(new TDLib(libPath), {
    apiId,
    apiHash,
  });

  // Обрабатываем события
  client.on('error', error => {
    console.error('Ошибка TDLib:', error);
  });

  client.on('update', update => {
    if (update._ === 'updateAuthorizationState') {
      console.log('Изменение состояния авторизации:', update.authorization_state._);
      
      // Если требуются параметры, отправляем их в новом формате (для TDLib 1.8.6+)
      if (update.authorization_state._ === 'authorizationStateWaitTdlibParameters') {
        console.log('Отправка параметров TDLib (встроенный формат)...');
        client.invoke({
          _: 'setTdlibParameters',
          database_directory: sessionPath,
          use_message_database: true,
          use_secret_chats: false,
          api_id: apiId,
          api_hash: apiHash,
          system_language_code: 'ru',
          device_model: 'Desktop',
          application_version: '1.0',
          system_version: 'Unknown',
          enable_storage_optimizer: true
        });
      }
    }
  });

  // Подключаемся
  try {
    console.log('Подключение к TDLib...');
    await client.connect();
    console.log('Подключение успешно!');
    
    // Ждем некоторое время для получения обновлений
    await new Promise(resolve => setTimeout(resolve, 10000));
    
    // Закрываем клиент
    await client.close();
    console.log('Клиент закрыт');
    return true;
  } catch (error) {
    console.error('Ошибка при подключении:', error);
    return false;
  }
}

simpleTdlibTest()
  .then(success => {
    if (success) {
      console.log('🟢 Тест успешно завершен');
    } else {
      console.log('🔴 Тест завершился с ошибкой');
    }
  }); 