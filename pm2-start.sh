#!/bin/bash

# Скрипт для запуска GIFTEX с использованием PM2

# Проверяем наличие PM2
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 не установлен. Устанавливаем..."
    npm install -g pm2
else
    echo "✅ PM2 уже установлен"
fi

# Проверяем наличие файла .env
if [ ! -f ".env" ]; then
    echo "❌ Файл .env не найден. Запустите setup-linux.sh для настройки проекта."
    exit 1
fi

# Останавливаем предыдущий экземпляр, если он запущен
pm2 stop giftex 2>/dev/null
pm2 delete giftex 2>/dev/null

# Компилируем CSS
echo "🎨 Компиляция CSS..."
npm run build:css

# Проверяем наличие библиотеки TDLib
PLATFORM=$(uname -s)
if [ "$PLATFORM" = "Darwin" ]; then
    # macOS
    TDLIB_PATH="./lib/libtdjson.dylib"
elif [ "$PLATFORM" = "Linux" ]; then
    # Linux
    TDLIB_PATH="./lib/libtdjson.so"
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
    echo "🔄 Пожалуйста, запустите соответствующий скрипт установки:"
    if [ "$PLATFORM" = "Darwin" ]; then
        echo "   ./install-tdlib-macos.sh"
    elif [ "$PLATFORM" = "Linux" ]; then
        echo "   ./install-tdlib-linux.sh"
    else
        echo "   Следуйте инструкциям по установке TDLib для вашей ОС"
    fi
    exit 1
fi

# Запускаем приложение с помощью PM2
echo "🚀 Запуск GIFTEX с помощью PM2..."
pm2 start app.js --name giftex --time

# Сохраняем конфигурацию PM2
pm2 save

echo "✅ GIFTEX успешно запущен с помощью PM2"
echo "📊 Для просмотра логов используйте: pm2 logs giftex"
echo "🛑 Для остановки используйте: pm2 stop giftex"
echo "🔄 Для перезапуска используйте: pm2 restart giftex" 