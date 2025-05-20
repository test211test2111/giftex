#!/bin/bash

echo "🚀 Настройка проекта GIFTEX для Linux"

# Проверяем наличие необходимых утилит
echo "📋 Проверка необходимых утилит..."
command -v node >/dev/null 2>&1 || { echo "❌ Node.js не установлен. Установите его перед продолжением."; exit 1; }
command -v npm >/dev/null 2>&1 || { echo "❌ npm не установлен. Установите его перед продолжением."; exit 1; }

# Устанавливаем зависимости проекта
echo "📦 Установка зависимостей проекта..."
npm install

# Создаем необходимые директории
echo "📁 Создание необходимых директорий..."
mkdir -p lib
mkdir -p sessions
mkdir -p telegram-session

# Проверяем наличие библиотеки TDLib
echo "🔍 Проверка наличия библиотеки TDLib..."
if [ -f "/usr/local/lib/libtdjson.so" ]; then
    echo "✅ Библиотека TDLib найдена в системе: /usr/local/lib/libtdjson.so"
    # Создаем символическую ссылку для совместимости
    ln -sf /usr/local/lib/libtdjson.so lib/libtdjson.so
    ln -sf /usr/local/lib/libtdjson.so lib/libtdjson.dylib
    echo "✅ Созданы символические ссылки в директории lib/"
else
    echo "⚠️ Библиотека TDLib не найдена в системе."
    echo "🔄 Установка TDLib..."
    
    # Проверяем наличие необходимых пакетов для сборки
    echo "📋 Проверка необходимых пакетов для сборки..."
    sudo apt-get update
    sudo apt-get install -y build-essential cmake gperf libssl-dev zlib1g-dev
    
    # Клонируем репозиторий TDLib
    echo "📥 Клонирование репозитория TDLib..."
    git clone https://github.com/tdlib/td
    cd td
    
    # Создаем директорию для сборки
    mkdir -p build
    cd build
    
    # Конфигурируем и собираем TDLib
    echo "🔨 Сборка TDLib (это может занять некоторое время)..."
    cmake -DCMAKE_BUILD_TYPE=Release ..
    cmake --build . --target install
    cd ../..
    
    # Создаем символические ссылки
    ln -sf /usr/local/lib/libtdjson.so lib/libtdjson.so
    ln -sf /usr/local/lib/libtdjson.so lib/libtdjson.dylib
    echo "✅ TDLib успешно установлен и настроен"
fi

# Компилируем CSS
echo "🎨 Компиляция CSS..."
npm run build:css

# Проверяем наличие файла .env
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
    echo "✅ Файл .env уже существует"
fi

echo "🎉 Настройка завершена! Теперь вы можете запустить проект:"
echo "   npm run dev    - для режима разработки"
echo "   ./start-server.sh - для производственного режима"

# Делаем скрипты исполняемыми
chmod +x start-server.sh
chmod +x install-tdlib-linux.sh

echo "🔐 Не забудьте указать TELEGRAM_API_ID и TELEGRAM_API_HASH в файле .env" 