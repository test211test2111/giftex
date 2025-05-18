// Скрипт для проверки интерфейса tdl-tdlib-addon
const tdlAddon = require('tdl-tdlib-addon');

console.log('Доступные функции tdl-tdlib-addon:');
console.log(Object.keys(tdlAddon));

// Проверяем какой интерфейс у tdl-tdlib-addon
if (typeof tdlAddon.getPath === 'function') {
  console.log('Использует getPath()');
  try {
    console.log('Path:', tdlAddon.getPath());
  } catch (e) {
    console.error('Ошибка при вызове getPath():', e);
  }
} else if (typeof tdlAddon.getTdjson === 'function') {
  console.log('Использует getTdjson()');
  try {
    console.log('Path:', tdlAddon.getTdjson());
  } catch (e) {
    console.error('Ошибка при вызове getTdjson():', e);
  }
} else {
  console.log('Не найдены методы для получения пути к библиотеке');
} 