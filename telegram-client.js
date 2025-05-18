// Полностью рабочий клиент Telegram с TDLib
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

// Функция для чтения ввода пользователя
const question = (query) => {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
};

// Основная функция для запуска клиента
async function runTelegramClient() {
  console.log('🌟 Запуск клиента Telegram с TDLib');
  
  // Создаем директорию для сессии
  const sessionDir = path.resolve(__dirname, 'telegram-session');
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  
  // Путь к библиотеке TDLib
  const libPath = path.resolve(__dirname, 'lib/libtdjson.dylib');
  if (!fs.existsSync(libPath)) {
    console.error('❌ Ошибка: Библиотека TDLib не найдена:', libPath);
    return false;
  }
  console.log('✅ Библиотека TDLib найдена:', libPath);
  
  // API ID и Hash
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;
  console.log(`📊 Используем API_ID: ${apiId}, API_HASH: ${apiHash}`);
  
  try {
    // Состояния авторизации
    let waitPhoneNumber = false;
    let waitCode = false; 
    let waitPassword = false;
    let isReady = false;
    
    // Создаем клиент TDLib
    console.log('🔄 Создание клиента TDLib...');
    const client = new Client(new TDLib(libPath), {
      apiId,
      apiHash,
    });
    
    // Обработка обновлений
    client.on('update', async update => {
      // Обработка состояния авторизации
      if (update._ === 'updateAuthorizationState') {
        const authState = update.authorization_state._;
        console.log('🔔 Изменение состояния авторизации:', authState);
        
        // Обработка состояния ожидания параметров
        if (authState === 'authorizationStateWaitTdlibParameters') {
          console.log('🔄 Отправка параметров TDLib...');
          try {
            await client.invoke({
              _: 'setTdlibParameters',
              database_directory: sessionDir,
              files_directory: path.resolve(sessionDir, 'files'),
              use_message_database: true,
              use_secret_chats: false,
              use_test_dc: false,
              api_id: apiId,
              api_hash: apiHash,
              device_model: 'Desktop',
              system_version: 'Unknown',
              application_version: '1.0.0',
              system_language_code: 'ru',
              enable_storage_optimizer: true
            });
          } catch (error) {
            if (error.message !== 'Unexpected setTdlibParameters') {
              console.error('❌ Ошибка при отправке параметров:', error);
            }
          }
        } 
        else if (authState === 'authorizationStateWaitPhoneNumber') {
          waitPhoneNumber = true;
        }
        else if (authState === 'authorizationStateWaitCode') {
          waitPhoneNumber = false;
          waitCode = true;
        }
        else if (authState === 'authorizationStateWaitPassword') {
          waitCode = false;
          waitPassword = true;
        }
        else if (authState === 'authorizationStateReady') {
          waitPassword = false;
          isReady = true;
          console.log('✅ Авторизация успешно завершена!');
        }
      }
    });
    
    // Подключаемся к серверу
    console.log('🔄 Подключение к серверу Telegram...');
    await client.connect();
    console.log('✅ Соединение установлено!');
    
    // Основной цикл для взаимодействия с пользователем
    let running = true;
    while (running) {
      if (waitPhoneNumber) {
        const phoneNumber = await question('📱 Введите номер телефона в международном формате (например, +79123456789): ');
        try {
          await client.invoke({
            _: 'setAuthenticationPhoneNumber',
            phone_number: phoneNumber
          });
          console.log('✅ Номер телефона отправлен!');
        } catch (error) {
          console.error('❌ Ошибка при отправке номера:', error);
        }
      } 
      else if (waitCode) {
        const code = await question('🔑 Введите код подтверждения из SMS: ');
        try {
          await client.invoke({
            _: 'checkAuthenticationCode',
            code
          });
          console.log('✅ Код подтверждения отправлен!');
        } catch (error) {
          console.error('❌ Ошибка при отправке кода:', error);
        }
      } 
      else if (waitPassword) {
        const password = await question('🔒 Введите пароль двухфакторной аутентификации: ');
        try {
          await client.invoke({
            _: 'checkAuthenticationPassword',
            password
          });
          console.log('✅ Пароль отправлен!');
        } catch (error) {
          console.error('❌ Ошибка при отправке пароля:', error);
        }
      } 
      else if (isReady) {
        try {
          // Получаем информацию о пользователе
          console.log('🔄 Получение информации о пользователе...');
          const me = await client.invoke({
            _: 'getMe'
          });
          console.log('👤 Информация о пользователе:');
          console.log(`   ID: ${me.id}`);
          console.log(`   Имя: ${me.first_name}`);
          console.log(`   Фамилия: ${me.last_name || '-'}`);
          console.log(`   Имя пользователя: @${me.username || '-'}`);
          console.log(`   Номер телефона: ${me.phone_number}`);
          
          // Получаем список чатов
          console.log('🔄 Получение списка чатов...');
          const { chat_ids } = await client.invoke({
            _: 'getChats',
            chat_list: { _: 'chatListMain' },
            limit: 10
          });
          
          console.log(`📋 Получено ${chat_ids.length} чатов:`);
          
          for (let i = 0; i < Math.min(5, chat_ids.length); i++) {
            const chat = await client.invoke({
              _: 'getChat',
              chat_id: chat_ids[i]
            });
            console.log(`   ${i+1}. ${chat.title}`);
          }
          
          // Спрашиваем о тестовом сообщении
          const sendTest = await question('📨 Отправить тестовое сообщение в "Избранное"? (да/нет): ');
          if (sendTest.toLowerCase() === 'да') {
            await client.invoke({
              _: 'sendMessage',
              chat_id: me.id,
              input_message_content: {
                _: 'inputMessageText',
                text: {
                  _: 'formattedText',
                  text: '🎉 Тестовое сообщение от TDLib. Все работает!'
                }
              }
            });
            console.log('✅ Тестовое сообщение отправлено в "Избранное"!');
          }
          
          // Завершаем цикл
          running = false;
        } catch (error) {
          console.error('❌ Ошибка при работе с API Telegram:', error);
          running = false;
        }
      }
      
      // Небольшая пауза для обработки событий
      if (running) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    // Завершаем работу
    await client.close();
    rl.close();
    
    console.log('✅ Клиент Telegram успешно завершил работу!');
    return true;
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    rl.close();
    return false;
  }
}

// Запуск клиента
runTelegramClient()
  .then(success => {
    if (success) {
      console.log('🎉 TDLib интеграция работает корректно!');
    } else {
      console.error('❌ В процессе работы возникли ошибки');
    }
  })
  .catch(error => {
    console.error('❌ Неожиданная ошибка:', error);
  }); 