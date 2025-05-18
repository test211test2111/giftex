// Общие функции для всего приложения

document.addEventListener('DOMContentLoaded', function() {
  // Функция для плавного появления элементов
  function fadeIn(element, duration = 300) {
    element.style.opacity = 0;
    element.style.display = 'block';
    
    let start = null;
    
    function animate(timestamp) {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const opacity = Math.min(progress / duration, 1);
      
      element.style.opacity = opacity;
      
      if (progress < duration) {
        window.requestAnimationFrame(animate);
      }
    }
    
    window.requestAnimationFrame(animate);
  }
  
  // Функция для плавного исчезновения элементов
  function fadeOut(element, duration = 300) {
    element.style.opacity = 1;
    
    let start = null;
    
    function animate(timestamp) {
      if (!start) start = timestamp;
      const progress = timestamp - start;
      const opacity = Math.max(1 - (progress / duration), 0);
      
      element.style.opacity = opacity;
      
      if (progress < duration) {
        window.requestAnimationFrame(animate);
      } else {
        element.style.display = 'none';
      }
    }
    
    window.requestAnimationFrame(animate);
  }
  
  // Экспортируем утилиты в глобальный объект
  window.utils = {
    fadeIn,
    fadeOut
  };
  
  // Инициализируем всплывающие подсказки
  const tooltips = document.querySelectorAll('[data-tooltip]');
  
  tooltips.forEach(tooltip => {
    const tooltipEl = document.createElement('div');
    tooltipEl.className = 'tooltip opacity-0 absolute bg-gray-800 text-white text-sm rounded py-1 px-2 -mt-12 transition-opacity duration-200';
    tooltipEl.textContent = tooltip.getAttribute('data-tooltip');
    tooltipEl.style.display = 'none';
    tooltip.appendChild(tooltipEl);
    
    tooltip.addEventListener('mouseenter', () => fadeIn(tooltipEl, 200));
    tooltip.addEventListener('mouseleave', () => fadeOut(tooltipEl, 200));
  });
  
  // Инициализация рулетки
  initializeRoulette();
});

// Инициализация рулетки
function initializeRoulette() {
  const spinButton = document.getElementById('spin-button');
  if (!spinButton) return; // Кнопка не найдена, пользователь не авторизован
  
  spinButton.addEventListener('click', function() {
    // Отключаем кнопку на время вращения
    spinButton.disabled = true;
    spinButton.classList.add('opacity-50', 'cursor-not-allowed');
    spinButton.textContent = 'Крутим рулетку...';
    
    // Запускаем анимацию вращения рулетки
    const gifts = document.querySelectorAll('.gift');
    gifts.forEach(gift => {
      gift.style.animationDuration = '0.2s';
      gift.style.animationIterationCount = 'infinite';
    });
    
    // Отправляем запрос на сервер
    fetch('/api/spin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    .then(response => response.json())
    .then(data => {
      // Останавливаем анимацию
      setTimeout(() => {
        gifts.forEach(gift => {
          gift.style.animationIterationCount = '1';
        });
        
        // Отображаем результат
        if (data.success) {
          showModal('Поздравляем!', data.message);
        } else {
          showModal('Упс!', data.message || 'Что-то пошло не так');
        }
        
        // Восстанавливаем кнопку
        spinButton.disabled = false;
        spinButton.classList.remove('opacity-50', 'cursor-not-allowed');
        spinButton.innerHTML = '<span class="mr-2">🎁</span> Крутить бесплатно';
      }, 3000);
    })
    .catch(error => {
      console.error('Ошибка:', error);
      showModal('Ошибка', 'Не удалось связаться с сервером');
      
      // Восстанавливаем кнопку
      spinButton.disabled = false;
      spinButton.classList.remove('opacity-50', 'cursor-not-allowed');
      spinButton.innerHTML = '<span class="mr-2">🎁</span> Крутить бесплатно';
    });
  });
}

// Функция для отображения модального окна
function showModal(title, message) {
  // Создаем модальное окно, если его еще нет
  let modal = document.getElementById('result-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'result-modal';
    modal.className = 'fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50';
    modal.style.display = 'none';
    
    const modalContent = document.createElement('div');
    modalContent.className = 'bg-white rounded-lg p-8 max-w-md w-full shadow-xl transform transition-all';
    
    const modalTitle = document.createElement('h3');
    modalTitle.id = 'modal-title';
    modalTitle.className = 'text-xl font-bold text-gray-900 mb-4';
    
    const modalMessage = document.createElement('p');
    modalMessage.id = 'modal-message';
    modalMessage.className = 'text-gray-700 mb-6';
    
    const modalButton = document.createElement('button');
    modalButton.className = 'bg-telegram-blue hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none';
    modalButton.textContent = 'Закрыть';
    modalButton.onclick = () => fadeOut(modal);
    
    modalContent.appendChild(modalTitle);
    modalContent.appendChild(modalMessage);
    modalContent.appendChild(modalButton);
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
  }
  
  // Обновляем содержимое и отображаем модальное окно
  document.getElementById('modal-title').textContent = title;
  document.getElementById('modal-message').textContent = message;
  fadeIn(modal);
} 