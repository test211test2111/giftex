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

# Определяем операционную систему
OS=$(uname -s)
if [ "$OS" = "Darwin" ]; then
    # macOS
    TDLIB_PATH="./lib/libtdjson.dylib"
elif [ "$OS" = "Linux" ]; then
    # Linux
    TDLIB_PATH="./lib/libtdjson.so"
    # Если файл не найден, проверяем системные пути
    if [ ! -f "$TDLIB_PATH" ]; then
        if [ -f "/usr/local/lib/libtdjson.so" ]; then
            TDLIB_PATH="/usr/local/lib/libtdjson.so"
        elif [ -f "/usr/lib/libtdjson.so" ]; then
            TDLIB_PATH="/usr/lib/libtdjson.so"
        fi
    fi
else
    # Windows или другая ОС
    TDLIB_PATH="./lib/tdjson.dll"
fi

# Проверка наличия библиотеки TDLib
if [ ! -f "$TDLIB_PATH" ]; then
    echo "❌ Ошибка: Библиотека TDLib не найдена по пути $TDLIB_PATH"
    echo "🔄 Пожалуйста, установите TDLib, запустив соответствующий скрипт:"
    if [ "$OS" = "Darwin" ]; then
        echo "   ./install-tdlib-macos.sh"
    elif [ "$OS" = "Linux" ]; then
        echo "   ./install-tdlib-linux.sh"
    else
        echo "   Следуйте инструкциям по установке TDLib для вашей ОС"
    fi
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