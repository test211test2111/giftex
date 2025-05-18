// Финальный тест для проверки TDLib
require('dotenv').config();
const { TelegramClient } = require('./config/telegram');
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
  console.log('🚀 Запуск финального теста TDLib с классом TelegramClient');
  
  try {
    // Создаем клиент
    console.log('🔄 Создание клиента TDLib...');
    const client = new TelegramClient('final-test');
    
    // Подключаемся к TDLib
    console.log('🔄 Подключение к TDLib...');
    await client.connect();
    console.log('✅ Подключение успешно!');
    
    // Проверяем состояние авторизации
    const authState = await client.getAuthState();
    console.log('📋 Состояние авторизации:', authState._);
    
    // Проверяем, нужно ли ввести номер телефона
    if (authState._ === 'authorizationStateWaitPhoneNumber') {
      const phoneNumber = await question('📱 Введите номер телефона: ');
      console.log('🔄 Отправка номера телефона...');
      await client.sendPhoneNumber(phoneNumber);
      console.log('✅ Номер телефона отправлен!');
      
      // Ждем код подтверждения
      await new Promise(resolve => setTimeout(resolve, 2000));
      const code = await question('🔑 Введите код подтверждения: ');
      console.log('🔄 Отправка кода подтверждения...');
      await client.sendCode(code);
      console.log('✅ Код подтверждения отправлен!');
      
      // Проверяем, нужно ли ввести пароль
      await new Promise(resolve => setTimeout(resolve, 2000));
      const newAuthState = await client.getAuthState();
      if (newAuthState._ === 'authorizationStateWaitPassword') {
        const password = await question('🔒 Введите пароль: ');
        console.log('🔄 Отправка пароля...');
        await client.sendPassword(password);
        console.log('✅ Пароль отправлен!');
      }
      
      // Ждем завершения авторизации
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    // Проверяем авторизацию
    const finalAuthState = await client.getAuthState();
    if (finalAuthState._ === 'authorizationStateReady') {
      console.log('✅ Авторизация успешна!');
      
      // Получаем информацию о пользователе
      console.log('🔄 Получение информации о пользователе...');
      const me = await client.getMe();
      console.log('👤 Информация о пользователе:');
      console.log(`  ID: ${me.id}`);
      console.log(`  Имя: ${me.first_name}`);
      console.log(`  Фамилия: ${me.last_name || '-'}`);
      console.log(`  Имя пользователя: ${me.username || '-'}`);
      
      // Отправляем тестовое сообщение
      const sendTest = await question('📨 Отправить тестовое сообщение в "Избранное"? (да/нет): ');
      if (sendTest.toLowerCase() === 'да') {
        console.log('🔄 Отправка тестового сообщения...');
        await client.sendMessage(me.id, '✅ TDLib работает корректно! Тест успешно пройден.');
        console.log('✅ Тестовое сообщение отправлено!');
      }
    } else {
      console.log('❌ Не удалось завершить авторизацию. Состояние:', finalAuthState._);
    }
    
    // Закрываем клиент
    await client.close();
    rl.close();
    console.log('✅ Тест завершен!');
    return true;
  } catch (error) {
    console.error('❌ Ошибка:', error);
    rl.close();
    return false;
  }
}

// Запускаем тест
runTest()
  .then(success => {
    if (success) {
      console.log('🎉 TDLib работает корректно!');
      process.exit(0);
    } else {
      console.log('❌ Возникли проблемы с TDLib');
      process.exit(1);
    }
  }); 