// Рабочий тест TDLib с авторизацией по номеру телефона
require('dotenv').config();
const { Client } = require('tdl');
const { TDLib } = require('tdl-tdlib-addon');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Создаем интерфейс для чтения ввода пользователя
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Путь к библиотеке TDLib
const libPath = path.resolve(__dirname, 'lib/libtdjson.dylib');

// Функция для чтения ввода пользователя
const question = (query) => {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
};

async function tdlibTest() {
  // Создаем директорию для сессии
  const sessionDir = path.resolve(__dirname, 'working-test-session');
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  
  // Параметры для TDLib
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;
  
  console.log('Проверка TDLib...');
  console.log(`API_ID: ${apiId}, API_HASH: ${apiHash}`);
  console.log(`Путь к библиотеке: ${libPath} (существует: ${fs.existsSync(libPath)})`);
  
  // Создаем клиент
  const client = new Client(new TDLib(libPath), {
    apiId,
    apiHash,
  });
  
  // Отслеживаем процесс авторизации
  let waitingPhoneNumber = false;
  let waitingCode = false;
  let waitingPassword = false;
  
  // Обработка обновлений
  client.on('update', async update => {
    if (update._ === 'updateAuthorizationState') {
      console.log(`Состояние авторизации: ${update.authorization_state._}`);
      
      // Шаг 1: Установка параметров TDLib
      if (update.authorization_state._ === 'authorizationStateWaitTdlibParameters') {
        console.log('🔄 Отправка параметров TDLib...');
        await client.invoke({
          _: 'setTdlibParameters',
          database_directory: sessionDir,
          files_directory: path.resolve(sessionDir, 'files'),
          use_message_database: true,
          use_secret_chats: false,
          use_test_dc: false,
          system_language_code: 'ru',
          device_model: 'Desktop',
          system_version: 'Unknown',
          application_version: '1.0.0',
          api_id: apiId,
          api_hash: apiHash,
          enable_storage_optimizer: true
        });
      }
      
      // Шаг 2: Запрос номера телефона
      else if (update.authorization_state._ === 'authorizationStateWaitPhoneNumber') {
        waitingPhoneNumber = true;
        console.log('📱 Требуется номер телефона в международном формате (например, +79123456789)');
      }
      
      // Шаг 3: Запрос кода подтверждения
      else if (update.authorization_state._ === 'authorizationStateWaitCode') {
        waitingPhoneNumber = false;
        waitingCode = true;
        console.log('🔑 Требуется код подтверждения, отправленный на ваш телефон');
      }
      
      // Шаг 4: Запрос пароля (если установлен)
      else if (update.authorization_state._ === 'authorizationStateWaitPassword') {
        waitingCode = false;
        waitingPassword = true;
        console.log('🔒 Требуется пароль от аккаунта');
      }
      
      // Успешная авторизация
      else if (update.authorization_state._ === 'authorizationStateReady') {
        waitingPassword = false;
        console.log('✅ Авторизация успешно завершена!');
      }
    }
  });
  
  // Обработка ошибок
  client.on('error', error => {
    console.error('❌ Ошибка TDLib:', error);
  });
  
  // Подключаемся
  try {
    console.log('🔄 Подключение к TDLib...');
    await client.connect();
    console.log('✅ Подключено к TDLib успешно');
    
    // Основной цикл для взаимодействия с пользователем
    let running = true;
    while (running) {
      // Запрос номера телефона
      if (waitingPhoneNumber) {
        const phoneNumber = await question('Введите номер телефона: ');
        await client.invoke({
          _: 'setAuthenticationPhoneNumber',
          phone_number: phoneNumber
        });
      }
      
      // Запрос кода
      else if (waitingCode) {
        const code = await question('Введите код из SMS: ');
        await client.invoke({
          _: 'checkAuthenticationCode',
          code
        });
      }
      
      // Запрос пароля
      else if (waitingPassword) {
        const password = await question('Введите пароль: ');
        await client.invoke({
          _: 'checkAuthenticationPassword',
          password
        });
      }
      
      // Если все готово, получаем информацию о пользователе
      else if (!waitingPhoneNumber && !waitingCode && !waitingPassword) {
        try {
          const me = await client.invoke({
            _: 'getMe'
          });
          console.log('📊 Информация о пользователе:', JSON.stringify(me, null, 2));
          running = false;
        } catch (error) {
          console.error('❌ Ошибка при получении информации о пользователе:', error);
          running = false;
        }
      }
      
      // Небольшая пауза перед следующей итерацией
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Закрываем клиент
    await client.close();
    rl.close();
    console.log('✅ Тест успешно завершен!');
    return true;
  } catch (error) {
    console.error('❌ Ошибка:', error);
    rl.close();
    return false;
  }
}

// Запускаем тест
tdlibTest()
  .then(success => {
    if (success) {
      console.log('🎉 TDLib работает корректно!');
      process.exit(0);
    } else {
      console.log('❌ Возникли проблемы с TDLib');
      process.exit(1);
    }
  }); 