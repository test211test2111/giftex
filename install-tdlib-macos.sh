#!/bin/bash

echo "Установка TDLib для macOS..."

# Проверяем наличие Homebrew
if ! command -v brew &> /dev/null; then
    echo "Homebrew не установлен. Устанавливаем..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
else
    echo "Homebrew уже установлен."
fi

# Устанавливаем зависимости
echo "Устанавливаем необходимые зависимости..."
brew update
brew install openssl cmake gperf zlib

# Клонируем репозиторий TDLib
echo "Клонируем репозиторий TDLib..."
git clone https://github.com/tdlib/td
cd td

# Создаем директорию для сборки
mkdir build
cd build

# Конфигурируем и собираем TDLib
echo "Собираем TDLib (это может занять некоторое время)..."
cmake -DCMAKE_BUILD_TYPE=Release -DOPENSSL_ROOT_DIR=/usr/local/opt/openssl ..
cmake --build . --target install

echo "TDLib успешно установлен!"
echo "Теперь вы можете запустить приложение с помощью команды 'npm run dev'" 