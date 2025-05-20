#!/bin/bash

echo "Установка TDLib для Linux..."

# Устанавливаем зависимости
echo "Устанавливаем необходимые зависимости..."
sudo apt-get update
sudo apt-get install -y build-essential cmake gperf libssl-dev zlib1g-dev

# Создаем директорию для библиотеки
mkdir -p lib

# Клонируем репозиторий TDLib
echo "Клонируем репозиторий TDLib..."
git clone https://github.com/tdlib/td
cd td

# Создаем директорию для сборки
mkdir build
cd build

# Конфигурируем и собираем TDLib
echo "Собираем TDLib (это может занять некоторое время)..."
cmake -DCMAKE_BUILD_TYPE=Release ..
cmake --build . --target install

# Копируем библиотеку в директорию проекта
echo "Копируем библиотеку в директорию проекта..."
sudo cp /usr/local/lib/libtdjson.so* ../../lib/

# Создаем символическую ссылку для совместимости с macOS-версией проекта
cd ../../lib
ln -sf libtdjson.so libtdjson.dylib

echo "TDLib успешно установлен!"
echo "Теперь вы можете запустить приложение с помощью команды 'npm run dev'"

# Делаем файл исполняемым
chmod +x install-tdlib-linux.sh 