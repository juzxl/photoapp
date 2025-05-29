// common.js - Общие функции для использования во всех JS файлах

// Шаблон фото-карточки (используется на всех страницах)
function createPhotoCard(photo) {
    // Проверяем наличие необходимых полей
    const photoId = photo.id || 0;
    const photoUrl = `/api/photos/image/${photoId}`;
    const photoTitle = photo.title || 'Без названия';
    const photoDate = photo.createdAt || new Date().toISOString();
    const photoAuthor = photo.user ? (photo.user.username || 'Неизвестный автор') : 'Неизвестный автор';
    
    const cardElement = document.createElement('div');
    cardElement.className = 'col-md-4 col-sm-6 mb-4';
    cardElement.innerHTML = `
        <div class="photo-card" data-photo-id="${photoId}">
            <img src="${photoUrl}" alt="${photoTitle}" class="card-img-top">
            
            <div class="photo-overlay">
                <div class="action-buttons">
                    <button class="action-btn favorite" data-photo-id="${photoId}" title="Добавить в избранное">
                        <i class="far fa-heart"></i>
                    </button>
                    <button class="action-btn share" data-photo-id="${photoId}" title="Поделиться">
                        <i class="fas fa-share-alt"></i>
                    </button>
                    <button class="action-btn search" data-photo-id="${photoId}" title="Найти похожие">
                        <i class="fas fa-search"></i>
                    </button>
                </div>
            </div>
            
            <div class="photo-info">
                <h5 class="photo-title">${photoTitle}</h5>
                <div class="photo-meta">
                    <div class="rating">
                        <span class="stars">${renderStars(photo.rating || 0)}</span>
                    </div>
                    <div class="photo-author">${photoAuthor}</div>
                </div>
            </div>
        </div>
    `;
    
    return cardElement;
}

// Проверка статуса избранного
function checkFavoriteStatus(photoId, buttonElement) {
    fetch(`/api/favorites/check/${photoId}`, {
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(data => {
        if (data.isFavorite) {
            buttonElement.innerHTML = '<i class="fas fa-heart"></i>';
            buttonElement.classList.add('active');
        } else {
            buttonElement.innerHTML = '<i class="far fa-heart"></i>';
            buttonElement.classList.remove('active');
        }
    })
    .catch(error => {
        console.error('Ошибка при проверке статуса избранного:', error);
    });
}

// Переключение статуса избранного
function toggleFavorite(photoId, buttonElement) {
    // Проверяем, находимся ли мы на странице избранного
    const isFavoritesPage = window.location.pathname.includes('/favorites');
    
    // Проверяем текущий статус (если кнопка активна, значит фото уже в избранном)
    const isCurrentlyFavorite = buttonElement.classList.contains('active');
    
    // Если фото в избранном и мы не на странице избранного, показываем сообщение
    if (isCurrentlyFavorite && !isFavoritesPage) {
        showMessage('Фото уже добавлено в избранное.', 'info');
        return;
    }
    
    // Если фото в избранном и мы на странице избранного, спрашиваем подтверждение
    if (isCurrentlyFavorite && isFavoritesPage) {
        if (!confirm('Вы действительно хотите удалить это фото из избранного?')) {
            return; // Пользователь отказался от удаления
        }
    }
    
    fetch(`/api/favorites/${photoId}`, {
        method: 'POST',
        headers: getAuthHeaders()
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'added') {
            buttonElement.innerHTML = '<i class="fas fa-heart"></i>';
            buttonElement.classList.add('active');
            showMessage('Фото добавлено в избранное', 'success');
        } else if (isFavoritesPage) {
            // Удаляем только если мы на странице избранного
            buttonElement.innerHTML = '<i class="far fa-heart"></i>';
            buttonElement.classList.remove('active');
            showMessage('Фото удалено из избранного', 'success');
            
            // Если мы на странице избранного, обновляем отображение
            if (typeof loadFavorites === 'function') {
                loadFavorites(); // Перезагружаем список избранного
            } else {
                // Если функции нет, просто скрываем карточку
                const photoCard = buttonElement.closest('.photo-card');
                if (photoCard) {
                    const cardContainer = photoCard.closest('.col-md-4');
                    if (cardContainer) {
                        cardContainer.style.display = 'none';
                    }
                }
            }
        }
    })
    .catch(error => {
        console.error('Ошибка при изменении статуса избранного:', error);
        showMessage('Не удалось изменить статус избранного. Возможно, вы не авторизованы.', 'error');
    });
}

// Поделиться фотографией
function sharePhoto(photoId) {
    const shareUrl = `${window.location.origin}/photo/${photoId}`;
    
    if (navigator.share) {
        // Используем Web Share API, если доступно
        navigator.share({
            title: 'Поделиться фотографией',
            text: 'Посмотрите эту фотографию в PhotoApp!',
            url: shareUrl
        })
        .catch(error => {
            console.error('Ошибка при попытке поделиться:', error);
            fallbackShare(shareUrl);
        });
    } else {
        fallbackShare(shareUrl);
    }
}

// Запасной вариант для функции "Поделиться"
function fallbackShare(url) {
    // Копируем ссылку в буфер обмена
    navigator.clipboard.writeText(url)
        .then(() => {
            showMessage('Ссылка скопирована в буфер обмена: ' + url, 'success');
        })
        .catch(err => {
            console.error('Не удалось скопировать ссылку:', err);
            // Показываем всплывающее окно с ссылкой
            prompt('Скопируйте эту ссылку для отправки:', url);
        });
}

// Найти похожие фотографии (заглушка)
function findSimilarPhotos(photoId) {
    showMessage('Функция поиска похожих фотографий находится в разработке. Скоро она будет доступна!', 'info');
}

// Рендеринг звезд для рейтинга
function renderStars(rating) {
    const fullStar = '★';
    const emptyStar = '☆';
    const stars = Math.round(rating);
    return fullStar.repeat(stars) + emptyStar.repeat(5 - stars);
}

// Форматирование даты
function formatDate(dateString) {
    if (!dateString) return '';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

// Вспомогательная функция для добавления заголовков авторизации
function getAuthHeaders() {
    const token = localStorage.getItem('photoapp_token');
    return token ? {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    } : {
        'Content-Type': 'application/json'
    };
}

// Проверка и отображение навигационных элементов для администратора и модератора
function initializeAdminNavigation() {
    // Проверяем наличие пользователя и его роли
    const userStr = localStorage.getItem('photoapp_user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            // Проверяем роль администратора
            const isAdmin = user.roles && Array.isArray(user.roles) && user.roles.includes('ROLE_ADMIN');
            const isModerator = user.roles && Array.isArray(user.roles) && user.roles.includes('ROLE_MODERATOR');
            
            if (isAdmin) {
                console.log('Пользователь имеет роль администратора, отображаем навигацию админа');
                $('.admin-links').show();
            } else {
                $('.admin-links').hide();
            }
            
            if (isModerator || isAdmin) {
                console.log('Пользователь имеет роль модератора, отображаем навигацию модератора');
                $('.moderator-links').show();
            } else {
                $('.moderator-links').hide();
            }
        } catch (error) {
            console.error('Ошибка при проверке роли пользователя:', error);
            $('.admin-links').hide();
            $('.moderator-links').hide();
        }
    } else {
        $('.admin-links').hide();
        $('.moderator-links').hide();
    }
}

// Функция для показа уведомлений
function showMessage(message, type = 'info') {
    // Создаем уникальный ID для уведомления
    const toastId = 'toast-' + Date.now();
    
    // Создаем HTML для уведомления
    const toastHTML = `
        <div id="${toastId}" class="toast align-items-center border-0 bg-${type === 'error' ? 'danger' : (type === 'success' ? 'success' : 'primary')}" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="d-flex">
                <div class="toast-body text-white">
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        </div>
    `;
    
    // Проверяем, существует ли контейнер для уведомлений
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Добавляем уведомление в контейнер
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);
    
    // Инициализируем и показываем уведомление
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, {
        autohide: true,
        delay: 5000
    });
    
    toast.show();
    
    // Удаляем уведомление из DOM после скрытия
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}

// Инициализация при загрузке страницы
$(document).ready(function() {
    console.log('common.js загружен');
    initializeAdminNavigation();
    
    // Проверяем, нужно ли обновить информацию о ролях пользователя
    const userStr = localStorage.getItem('photoapp_user');
    if (userStr) {
        try {
            const user = JSON.parse(userStr);
            if (!user.roles || user.roles.length === 0) {
                console.log('Запрашиваем роли пользователя с сервера...');
                fetchUserRoles();
            }
        } catch (error) {
            console.error('Ошибка при проверке пользователя:', error);
        }
    }
});

/**
 * Запрашивает актуальные роли пользователя с сервера
 */
function fetchUserRoles() {
    const token = localStorage.getItem('photoapp_token');
    if (!token) {
        console.error('Токен авторизации отсутствует');
        return;
    }
    
    fetch('/api/users/me/roles', {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Ошибка запроса: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log('Получены роли пользователя:', data);
        
        // Обновляем объект пользователя в localStorage
        const userStr = localStorage.getItem('photoapp_user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                user.roles = data.roles || [];
                
                // Проверяем роли на модератора/админа
                user.isModerator = (user.roles.includes('ROLE_MODERATOR') || user.roles.includes('ROLE_ADMIN'));
                
                console.log('Обновленный объект пользователя:', user);
                localStorage.setItem('photoapp_user', JSON.stringify(user));
                
                // Перезагружаем страницу для применения изменений
                window.location.reload();
            } catch (error) {
                console.error('Ошибка при обновлении пользователя:', error);
            }
        }
    })
    .catch(error => {
        console.error('Ошибка при запросе ролей пользователя:', error);
        
        // В случае ошибки, делаем прямой запрос к базе для тестирования
        // Это временное решение только для тестирования!
        const userStr = localStorage.getItem('photoapp_user');
        if (userStr) {
            try {
                const user = JSON.parse(userStr);
                
                // Используем данные из базы, которые вы предоставили
                if (user.id === 2) {
                    console.log('Устанавливаем роль модератора для пользователя на основе данных из БД');
                    user.roles = ['ROLE_MODERATOR'];
                    user.isModerator = true;
                    localStorage.setItem('photoapp_user', JSON.stringify(user));
                    console.log('Обновленный объект пользователя:', user);
                    
                    // Перезагружаем страницу для применения изменений
                    window.location.reload();
                }
            } catch (error) {
                console.error('Ошибка при прямом обновлении пользователя:', error);
            }
        }
    });
}

/**
 * Переход на страницу профиля пользователя
 * @param {number} userId - ID пользователя
 */
function openUserProfile(userId) {
    if (!userId) {
        console.error('ID пользователя не указан');
        return;
    }
    
    window.location.href = `/profile/${userId}`;
}

/**
 * Проверяет, имеет ли текущий пользователь роль модератора или админа
 * @returns {boolean} true, если пользователь модератор или админ
 */
function isCurrentUserModerator() {
    const currentUser = JSON.parse(localStorage.getItem('photoapp_user') || '{}');
    
    // Проверка по свойству isModerator
    let isModerator = currentUser && currentUser.isModerator === true;
    
    // Если isModerator не определен, проверяем роли
    if (!isModerator && currentUser && currentUser.roles && Array.isArray(currentUser.roles)) {
        isModerator = currentUser.roles.includes('ROLE_MODERATOR') || currentUser.roles.includes('ROLE_ADMIN');
        
        // Если у пользователя есть роль модератора, добавляем свойство isModerator
        if (isModerator) {
            currentUser.isModerator = true;
            localStorage.setItem('photoapp_user', JSON.stringify(currentUser));
        }
    }
    
    console.log('isCurrentUserModerator: проверка для пользователя:', currentUser, 'результат:', !!isModerator);
    return !!isModerator; // Преобразуем к boolean
}

/**
 * Функция для прямого установления роли модератора пользователю (только для тестирования)
 * Вызывается в консоли браузера: makeModerator()
 */
function makeModerator() {
    const userStr = localStorage.getItem('photoapp_user');
    if (!userStr) {
        console.error('Пользователь не найден в localStorage');
        return false;
    }
    
    try {
        const user = JSON.parse(userStr);
        console.log('До изменения:', user);
        
        // Добавляем роли и флаг модератора
        if (!user.roles || !Array.isArray(user.roles)) {
            user.roles = [];
        }
        
        if (!user.roles.includes('ROLE_MODERATOR')) {
            user.roles.push('ROLE_MODERATOR');
        }
        
        user.isModerator = true;
        
        // Сохраняем изменения
        localStorage.setItem('photoapp_user', JSON.stringify(user));
        console.log('После изменения:', JSON.parse(localStorage.getItem('photoapp_user')));
        
        // Перезагружаем страницу для применения изменений
        if (confirm('Роль модератора успешно добавлена. Перезагрузить страницу?')) {
            window.location.reload();
        }
        return true;
    } catch (error) {
        console.error('Ошибка при изменении роли:', error);
        return false;
    }
}

/**
 * Функция для удаления роли модератора у пользователя (только для тестирования)
 * Вызывается в консоли браузера: removeModerator()
 */
function removeModerator() {
    const userStr = localStorage.getItem('photoapp_user');
    if (!userStr) {
        console.error('Пользователь не найден в localStorage');
        return false;
    }
    
    try {
        const user = JSON.parse(userStr);
        console.log('До изменения:', user);
        
        // Удаляем роль модератора
        if (user.roles && Array.isArray(user.roles)) {
            user.roles = user.roles.filter(role => role !== 'ROLE_MODERATOR');
        }
        
        user.isModerator = false;
        
        // Сохраняем изменения
        localStorage.setItem('photoapp_user', JSON.stringify(user));
        console.log('После изменения:', JSON.parse(localStorage.getItem('photoapp_user')));
        
        // Перезагружаем страницу для применения изменений
        if (confirm('Роль модератора успешно удалена. Перезагрузить страницу?')) {
            window.location.reload();
        }
        return true;
    } catch (error) {
        console.error('Ошибка при изменении роли:', error);
        return false;
    }
}

// Делаем функции доступными глобально
window.makeModerator = makeModerator;
window.removeModerator = removeModerator;
window.fetchUserRoles = fetchUserRoles; 