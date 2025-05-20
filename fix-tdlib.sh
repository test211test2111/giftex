#!/bin/bash

echo "🔧 Утилита исправления проблем с TDLib"

# Определяем операционную систему
OS=$(uname -s)
if [ "$OS" = "Darwin" ]; then
    echo "📱 Операционная система: macOS"
    LIB_EXT="dylib"
    SYSTEM_LIB_PATH="/usr/local/lib/libtdjson.dylib"
elif [ "$OS" = "Linux" ]; then
    echo "🐧 Операционная система: Linux"
    LIB_EXT="so"
    SYSTEM_LIB_PATH="/usr/local/lib/libtdjson.so"
else
    echo "❌ Неподдерживаемая операционная система: $OS"
    exit 1
fi

# Проверяем наличие библиотеки TDLib в системе
echo "🔍 Проверка наличия библиотеки TDLib в системе..."
if [ -f "$SYSTEM_LIB_PATH" ]; then
    echo "✅ Библиотека TDLib найдена в системе: $SYSTEM_LIB_PATH"
else
    echo "⚠️ Библиотека TDLib не найдена в системе"
    echo "🔄 Установка TDLib..."
    
    if [ "$OS" = "Darwin" ]; then
        ./install-tdlib-macos.sh
    elif [ "$OS" = "Linux" ]; then
        ./install-tdlib-linux.sh
    fi
fi

# Создаем директорию lib, если она не существует
echo "📁 Проверка директории lib..."
mkdir -p lib

# Создаем символические ссылки в директории lib
echo "🔗 Создание символических ссылок..."
if [ "$OS" = "Darwin" ]; then
    ln -sf "$SYSTEM_LIB_PATH" lib/libtdjson.dylib
    echo "✅ Создана символическая ссылка lib/libtdjson.dylib -> $SYSTEM_LIB_PATH"
elif [ "$OS" = "Linux" ]; then
    ln -sf "$SYSTEM_LIB_PATH" lib/libtdjson.so
    echo "✅ Создана символическая ссылка lib/libtdjson.so -> $SYSTEM_LIB_PATH"
    
    # Создаем дополнительную ссылку для совместимости с macOS
    ln -sf "$SYSTEM_LIB_PATH" lib/libtdjson.dylib
    echo "✅ Создана символическая ссылка lib/libtdjson.dylib -> $SYSTEM_LIB_PATH (для совместимости)"
fi

# Проверяем наличие директорий для сессий
echo "📁 Проверка директорий для сессий..."
mkdir -p sessions
mkdir -p telegram-session

# Устанавливаем правильные права доступа
echo "🔒 Установка прав доступа..."
chmod 700 sessions
chmod 700 telegram-session

# Проверяем наличие файла .env
echo "📄 Проверка файла .env..."
if [ ! -f ".env" ]; then
    echo "⚠️ Файл .env не найден. Создаем шаблон..."
    cat > .env << EOF
PORT=3000
NODE_ENV=development
SESSION_SECRET=giftex-secret-key

# Telegram API (получите на https://my.telegram.org/apps)
TELEGRAM_API_ID=
TELEGRAM_API_HASH=

# Учетные данные администратора
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
EOF
    echo "✅ Создан шаблон файла .env. Пожалуйста, заполните его своими данными."
else
    echo "✅ Файл .env существует"
fi

# Проверяем зависимости npm
echo "📦 Проверка зависимостей npm..."
npm list tdl tdl-tdlib-addon > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "⚠️ Некоторые зависимости отсутствуют или устарели"
    echo "🔄 Установка зависимостей..."
    npm install tdl@7.3.0 --save
else
    echo "✅ Зависимости в порядке"
fi

# Запускаем тест TDLib
echo "🧪 Запуск теста TDLib..."
node test-tdlib.js

# Выводим инструкции
echo ""
echo "🎯 Что делать дальше:"
echo "1. Убедитесь, что в файле .env указаны правильные TELEGRAM_API_ID и TELEGRAM_API_HASH"
echo "2. Запустите приложение с помощью одной из команд:"
echo "   - npm run dev (режим разработки)"
echo "   - ./start-server.sh (обычный запуск)"
echo "   - ./pm2-start.sh (запуск с PM2)"
echo ""
echo "✅ Исправление проблем с TDLib завершено" 