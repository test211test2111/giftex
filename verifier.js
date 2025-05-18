// Скрипт для проверки API_ID и API_HASH
require('dotenv').config();
const { Client } = require('tdl');
const tdlAddon = require('tdl-tdlib-addon');
const path = require('path');
const fs = require('fs');

async function verifyApiCredentials() {
  console.log('Проверка API_ID и API_HASH...');
  
  // Создаем директорию для теста
  const testDir = path.resolve(__dirname, 'verify-test');
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir, { recursive: true });
  }
  
  // API ID и Hash
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;
  
  console.log('API_ID:', apiId, 'тип:', typeof apiId);
  console.log('API_HASH:', apiHash);
  
  // Путь к библиотеке
  const libPath = path.resolve(__dirname, 'lib/libtdjson.dylib');
  console.log('Путь к библиотеке:', libPath);
  
  try {
    // Создаем клиент
    const client = new Client(new tdlAddon.TDLib(libPath), {
      apiId,
      apiHash,
      databaseDirectory: testDir,
      filesDirectory: path.resolve(testDir, 'files'),
    });
    
    console.log('Клиент создан успешно');
    
    // Подключаемся
    console.log('Попытка подключения...');
    await client.connect();
    console.log('Подключение успешно');
    
    // Обработчик ошибок
    let errorReceived = false;
    client.on('error', error => {
      console.error('Ошибка:', error);
      errorReceived = true;
    });
    
    // Отправляем команду для получения состояния авторизации
    console.log('Запрос состояния авторизации...');
    const authState = await client.invoke({
      _: 'getAuthorizationState'
    });
    console.log('Состояние авторизации:', authState._);
    
    // Если нужно установить параметры TDLib
    if (authState._ === 'authorizationStateWaitTdlibParameters') {
      console.log('Устанавливаем параметры TDLib...');
      try {
        const result = await client.invoke({
          _: 'setTdlibParameters',
          use_message_database: true,
          use_secret_chats: false,
          system_language_code: 'ru',
          database_directory: testDir,
          files_directory: path.resolve(testDir, 'files'),
          api_id: apiId,
          api_hash: apiHash,
          device_model: 'Web Client',
          system_version: 'Unknown',
          application_version: '1.0.0',
          enable_storage_optimizer: true
        });
        console.log('Параметры установлены:', result);
      } catch (error) {
        console.error('Ошибка при установке параметров:', error);
        await client.close();
        return false;
      }
    }
    
    // Ждем немного, чтобы увидеть обновления
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Закрываем клиент
    await client.close();
    console.log('Клиент закрыт');
    
    return !errorReceived;
  } catch (error) {
    console.error('Ошибка в процессе проверки:', error);
    return false;
  }
}

// Запускаем проверку
verifyApiCredentials()
  .then(success => {
    if (success) {
      console.log('🟢 API_ID и API_HASH прошли проверку успешно');
      process.exit(0);
    } else {
      console.log('🔴 Проверка API_ID и API_HASH не удалась');
      process.exit(1);
    }
  })
  .catch(err => {
    console.error('Критическая ошибка:', err);
    process.exit(1);
  }); 