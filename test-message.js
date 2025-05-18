// Тестовый скрипт для проверки отправки сообщений через TDLib
require('dotenv').config();
const { getClient } = require('./config/telegram');
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

async function testSendMessage() {
  console.log('🧪 Тест отправки сообщения через TDLib');
  
  try {
    // Создание уникальной тестовой сессии
    const sessionId = 'test-message-' + Date.now();
    console.log(`📡 Создание клиента с ID сессии: ${sessionId}`);
    
    // Получаем клиент TDLib
    const client = getClient(sessionId);
    
    // Подключаемся к TDLib
    console.log('🔄 Подключение к TDLib...');
    await client.connect();
    console.log('✅ Подключено к TDLib');
    
    // Получаем текущее состояние авторизации
    const authState = await client.getAuthState();
    console.log('🔐 Текущее состояние авторизации:', authState && authState._ 
                ? authState._ 
                : (authState && authState.authorization_state && authState.authorization_state._ 
                   ? authState.authorization_state._ 
                   : 'неизвестно'));
    
    // Определяем текущее состояние авторизации
    const currentAuthState = authState && authState.authorization_state && authState.authorization_state._ 
                         ? authState.authorization_state._ 
                         : (authState && authState._ ? authState._ : null);
    
    if (currentAuthState === 'authorizationStateWaitPhoneNumber') {
      // Запрашиваем номер телефона
      const phoneNumber = await question('📱 Введите номер телефона в международном формате (например, +79123456789): ');
      console.log('🔄 Отправка номера телефона...');
      await client.sendPhoneNumber(phoneNumber);
      console.log('✅ Номер телефона отправлен');
      
      // Запрашиваем код подтверждения
      const code = await question('🔑 Введите код подтверждения из Telegram: ');
      console.log('🔄 Отправка кода подтверждения...');
      await client.sendCode(code);
      console.log('✅ Код подтверждения отправлен');
      
      // Проверяем, нужен ли пароль
      const newAuthState = await client.getAuthState();
      const newState = newAuthState && newAuthState.authorization_state && newAuthState.authorization_state._ 
                    ? newAuthState.authorization_state._ 
                    : (newAuthState && newAuthState._ ? newAuthState._ : null);
                    
      if (newState === 'authorizationStateWaitPassword') {
        const password = await question('🔒 Введите пароль двухфакторной аутентификации: ');
        console.log('🔄 Отправка пароля...');
        await client.sendPassword(password);
        console.log('✅ Пароль отправлен');
      }
      
      // Ждем завершения авторизации
      const finalAuthState = await client.getAuthState();
      const finalState = finalAuthState && finalAuthState.authorization_state && finalAuthState.authorization_state._ 
                      ? finalAuthState.authorization_state._ 
                      : (finalAuthState && finalAuthState._ ? finalAuthState._ : null);
                      
      if (finalState === 'authorizationStateReady') {
        console.log('🎉 Авторизация успешна!');
      } else {
        console.log('❌ Ошибка: Не удалось авторизоваться. Текущее состояние:', finalState);
        return false;
      }
    } else if (currentAuthState !== 'authorizationStateReady') {
      console.log('❌ Ошибка: Неподдерживаемое состояние авторизации:', currentAuthState);
      return false;
    }
    
    // Получаем информацию о пользователе
    console.log('🔄 Получение информации о пользователе...');
    const me = await client.getMe();
    console.log('👤 Данные пользователя:');
    console.log(`   ID: ${me.id}`);
    console.log(`   Имя: ${me.first_name}`);
    console.log(`   Фамилия: ${me.last_name || '-'}`);
    console.log(`   Имя пользователя: @${me.username || '-'}`);
    console.log(`   Телефон: ${me.phone_number}`);
    
    // Отправляем сообщение в "Избранное"
    console.log('📨 Отправка тестового сообщения в "Избранное"...');
    await client.sendMessage(me.id, '🎉 Тест отправки сообщения успешно пройден! GIFTEX работает корректно.');
    console.log('✅ Сообщение успешно отправлено!');
    
    // Закрываем клиент
    await client.close();
    rl.close();
    return true;
  } catch (error) {
    console.error('❌ Ошибка:', error);
    rl.close();
    return false;
  }
}

// Запускаем тест
testSendMessage()
  .then(success => {
    if (success) {
      console.log('🎉 Тест отправки сообщения успешно пройден!');
    } else {
      console.log('❌ Тест отправки сообщения завершился с ошибкой');
    }
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Критическая ошибка:', error);
    process.exit(1);
  }); 