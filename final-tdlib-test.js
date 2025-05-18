// Финальный тест для проверки работы TDLib
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

async function runTest() {
  console.log('🚀 Запуск финального теста TDLib');
  
  // Создаем директорию для сессии
  const sessionDir = path.resolve(__dirname, 'final-test-session');
  if (!fs.existsSync(sessionDir)) {
    fs.mkdirSync(sessionDir, { recursive: true });
  }
  
  // Проверяем наличие библиотеки
  const libPath = path.resolve(__dirname, 'lib/libtdjson.dylib');
  if (!fs.existsSync(libPath)) {
    console.error('❌ Библиотека TDLib не найдена по пути:', libPath);
    return false;
  }
  console.log('✅ Библиотека TDLib найдена:', libPath);
  
  // Получаем API ID и Hash
  const apiId = Number(process.env.TELEGRAM_API_ID);
  const apiHash = process.env.TELEGRAM_API_HASH;
  console.log('📋 Используем API_ID:', apiId);
  console.log('📋 Используем API_HASH:', apiHash);
  
  try {
    // Создаем клиент TDLib
    console.log('🔄 Создание клиента TDLib...');
    const client = new Client(new TDLib(libPath), {
      apiId,
      apiHash
    });
    
    // Состояние авторизации
    let waitPhoneNumber = false;
    let waitCode = false;
    let waitPassword = false;
    let isReady = false;
    
    // Добавляем обработчики событий
    client.on('error', error => {
      console.error('❌ Ошибка TDLib:', error);
    });
    
    client.on('update', async update => {
      // Отслеживаем состояние авторизации
      if (update._ === 'updateAuthorizationState') {
        const authState = update.authorization_state._;
        console.log('🔔 Изменение статуса авторизации:', authState);
        
        // Обрабатываем различные состояния авторизации
        switch (authState) {
          case 'authorizationStateWaitTdlibParameters':
            console.log('🔄 Отправка параметров TDLib...');
            
            await client.invoke({
              _: 'setTdlibParameters',
              database_directory: sessionDir,
              files_directory: path.resolve(sessionDir, 'files'),
              api_id: apiId,
              api_hash: apiHash,
              system_language_code: 'ru',
              device_model: 'Desktop',
              system_version: 'Unknown',
              application_version: '1.0',
              use_message_database: true,
              use_secret_chats: false,
              enable_storage_optimizer: true
            });
            break;
            
          case 'authorizationStateWaitPhoneNumber':
            waitPhoneNumber = true;
            console.log('📱 Ожидание ввода номера телефона...');
            break;
            
          case 'authorizationStateWaitCode':
            waitPhoneNumber = false;
            waitCode = true;
            console.log('🔑 Ожидание ввода кода подтверждения...');
            break;
            
          case 'authorizationStateWaitPassword':
            waitCode = false;
            waitPassword = true;
            console.log('🔒 Ожидание ввода пароля...');
            break;
            
          case 'authorizationStateReady':
            waitPassword = false;
            isReady = true;
            console.log('✅ Авторизация успешно завершена!');
            break;
            
          default:
            console.log(`🔔 Получено состояние авторизации: ${authState}`);
        }
      }
    });
    
    // Подключаемся к TDLib
    console.log('🔄 Подключение к TDLib...');
    await client.connect();
    console.log('✅ Подключение к TDLib успешно!');
    
    // Основной цикл авторизации
    while (!isReady) {
      if (waitPhoneNumber) {
        const phoneNumber = await question('📱 Введите номер телефона в международном формате (например, +79123456789): ');
        try {
          await client.invoke({
            _: 'setAuthenticationPhoneNumber',
            phone_number: phoneNumber
          });
          console.log('✅ Номер телефона отправлен!');
        } catch (error) {
          console.error('❌ Ошибка при отправке номера телефона:', error);
        }
      } else if (waitCode) {
        const code = await question('🔑 Введите код подтверждения из SMS: ');
        try {
          await client.invoke({
            _: 'checkAuthenticationCode',
            code
          });
          console.log('✅ Код подтверждения отправлен!');
        } catch (error) {
          console.error('❌ Ошибка при отправке кода подтверждения:', error);
        }
      } else if (waitPassword) {
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
      } else if (!isReady) {
        console.log('⏳ Ожидание изменения состояния авторизации...');
      }
      
      // Ждем небольшую паузу
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Если успешно авторизовались, получаем информацию о себе
    if (isReady) {
      try {
        console.log('🔄 Получение информации о пользователе...');
        const me = await client.invoke({
          _: 'getMe'
        });
        
        console.log('✅ Информация о пользователе успешно получена:');
        console.log('👤 ID:', me.id);
        console.log('👤 Имя:', me.first_name);
        console.log('👤 Фамилия:', me.last_name || '-');
        console.log('👤 Имя пользователя:', me.username || '-');
        console.log('👤 Номер телефона:', me.phone_number || '-');
      } catch (error) {
        console.error('❌ Ошибка при получении информации о пользователе:', error);
      }
      
      // Проверяем отправку сообщения
      try {
        console.log('🔄 Получение списка чатов...');
        const chats = await client.invoke({
          _: 'getChats',
          chat_list: { _: 'chatListMain' },
          limit: 10
        });
        
        console.log('✅ Получено чатов:', chats.chat_ids.length);
        
        if (chats.chat_ids.length > 0) {
          const sendTestMessage = await question('📨 Хотите отправить тестовое сообщение в "Избранное"? (да/нет): ');
          
          if (sendTestMessage.toLowerCase() === 'да') {
            try {
              // Получаем информацию о себе для ID
              const me = await client.invoke({
                _: 'getMe'
              });
              
              // Отправляем сообщение в "Избранное"
              await client.invoke({
                _: 'sendMessage',
                chat_id: me.id,
                input_message_content: {
                  _: 'inputMessageText',
                  text: {
                    _: 'formattedText',
                    text: '🎉 Тестовое сообщение от TDLib. Авторизация работает!'
                  }
                }
              });
              console.log('✅ Тестовое сообщение успешно отправлено в "Избранное"!');
            } catch (error) {
              console.error('❌ Ошибка при отправке тестового сообщения:', error);
            }
          }
        }
      } catch (error) {
        console.error('❌ Ошибка при получении списка чатов:', error);
      }
    }
    
    // Закрываем клиент
    await client.close();
    rl.close();
    
    return true;
  } catch (error) {
    console.error('❌ Критическая ошибка:', error);
    rl.close();
    return false;
  }
}

// Запускаем тест
runTest()
  .then(success => {
    if (success) {
      console.log('🎉 Тест успешно завершен! TDLib работает корректно.');
    } else {
      console.error('❌ Тест завершился с ошибкой.');
    }
  })
  .catch(error => {
    console.error('❌ Критическая ошибка при выполнении теста:', error);
  }); 