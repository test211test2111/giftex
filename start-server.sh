#!/bin/bash

# Скрипт для запуска сервера GIFTEX в производственном режиме

# Устанавливаем переменные окружения
export NODE_ENV=production

# Убеждаемся, что все необходимые пакеты установлены
echo "📦 Проверка и установка зависимостей..."
npm install

# Компилируем CSS с Tailwind
echo "🎨 Компиляция CSS..."
npm run build:css

# Создаем директорию для сессий, если она не существует
mkdir -p sessions

# Проверка наличия библиотеки TDLib
TDLIB_PATH="./lib/libtdjson.dylib"
if [ ! -f "$TDLIB_PATH" ]; then
    echo "❌ Ошибка: Библиотека TDLib не найдена по пути $TDLIB_PATH"
    echo "🔄 Пожалуйста, установите TDLib, запустив скрипт install-tdlib-macos.sh"
    exit 1
fi

# Проверка наличия необходимых переменных окружения
if [ -z "$TELEGRAM_API_ID" ] || [ -z "$TELEGRAM_API_HASH" ]; then
    echo "❌ Ошибка: Отсутствуют переменные окружения TELEGRAM_API_ID или TELEGRAM_API_HASH"
    echo "🔄 Пожалуйста, убедитесь, что файл .env настроен правильно"
    exit 1
fi

# Запускаем сервер
echo "🚀 Запуск сервера GIFTEX..."
node app.js 