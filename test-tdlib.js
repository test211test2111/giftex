// Скрипт для проверки работы TDLib
require('dotenv').config();
const { Client } = require('tdl');
const { TDLib } = require('tdl-tdlib-addon');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Функция для определения пути к библиотеке TDLib
function findTdLibPath() {
  const platform = process.platform;
  let libPath;
  
  // Проверяем локальную директорию
  if (platform === 'darwin') {
    libPath = path.resolve(__dirname, 'lib/libtdjson.dylib');
  } else if (platform === 'linux') {
    libPath = path.resolve(__dirname, 'lib/libtdjson.so');
    if (!fs.existsSync(libPath)) {
      // Проверяем символическую ссылку для совместимости
      const compatPath = path.resolve(__dirname, 'lib/libtdjson.dylib');
      if (fs.existsSync(compatPath)) {
        libPath = compatPath;
      }
    }
  } else if (platform === 'win32') {
    libPath = path.resolve(__dirname, 'lib/tdjson.dll');
  }
  
  // Если не нашли в локальной директории, проверяем системные пути
  if (!libPath || !fs.existsSync(libPath)) {
    const systemPaths = [];
    
    if (platform === 'darwin') {
      systemPaths.push(
        '/usr/local/lib/libtdjson.dylib',
        '/opt/homebrew/lib/libtdjson.dylib'
      );
    } else if (platform === 'linux') {
      systemPaths.push(
        '/usr/local/lib/libtdjson.so',
        '/usr/lib/libtdjson.so',
        '/usr/lib/x86_64-linux-gnu/libtdjson.so'
      );
    } else if (platform === 'win32') {
      systemPaths.push(
        'C:\\Program Files\\TDLib\\bin\\tdjson.dll',
        'C:\\Program Files (x86)\\TDLib\\bin\\tdjson.dll'
      );
    }
    
    for (const p of systemPaths) {
      if (fs.existsSync(p)) {
        libPath = p;
        break;
      }
    }
  }
  
  return libPath;
}

async function testTDLib() {
  console.log('🔍 Проверка TDLib...');
  console.log(`💻 Операционная система: ${os.platform()} ${os.release()}`);
  
  // Находим путь к библиотеке
  const libPath = findTdLibPath();
  if (!libPath || !fs.existsSync(libPath)) {
    console.error('❌ Ошибка: Библиотека TDLib не найдена');
    console.log('Пожалуйста, установите TDLib, используя соответствующий скрипт установки');
    return false;
  }
  
  console.log(`✅ Библиотека TDLib найдена: ${libPath}`);
  
  try {
    // Создаем тестовую директорию для сессии
    const testDir = path.resolve(__dirname, 'test-session');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Проверяем API ID и Hash
    const apiId = Number(process.env.TELEGRAM_API_ID);
    const apiHash = process.env.TELEGRAM_API_HASH;
    
    if (!apiId || !apiHash) {
      console.error('❌ Ошибка: Отсутствуют TELEGRAM_API_ID или TELEGRAM_API_HASH в .env файле');
      return false;
    }
    
    console.log(`📊 API ID: ${apiId}, API Hash: ${apiHash}`);
    
    // Создаем клиент TDLib
    console.log('🔄 Создание клиента TDLib...');
    const client = new Client(new TDLib(libPath), {
      apiId,
      apiHash
    });
    
    // Обработка ошибок
    client.on('error', error => {
      console.error('❌ Ошибка TDLib:', error);
    });
    
    // Подключаемся к TDLib
    console.log('🔄 Подключение к TDLib...');
    await client.connect();
    console.log('✅ Подключение установлено');
    
    // Получаем версию TDLib
    const version = await client.invoke({
      _: 'getOption',
      name: 'version'
    });
    console.log(`📋 Версия TDLib: ${version.value}`);
    
    // Получаем текущее состояние авторизации
    const authState = await client.invoke({
      _: 'getAuthorizationState'
    });
    console.log(`🔑 Текущее состояние авторизации: ${authState._}`);
    
    // Закрываем клиент
    console.log('🔄 Закрытие клиента...');
    await client.close();
    console.log('✅ Клиент закрыт');
    
    console.log('✅ Тест TDLib успешно завершен');
    return true;
  } catch (error) {
    console.error('❌ Ошибка при тестировании TDLib:', error);
    return false;
  }
}

// Запускаем тест
testTDLib()
  .then(success => {
    if (success) {
      console.log('🎉 TDLib работает корректно');
      process.exit(0);
    } else {
      console.error('❌ Тест TDLib завершился с ошибкой');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('❌ Необработанная ошибка:', error);
    process.exit(1);
  }); 