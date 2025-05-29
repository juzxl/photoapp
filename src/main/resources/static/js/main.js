// Main.js - Common functionality for all pages

// API URL
// const API_URL = '/api';
// Используем API_URL из api.js

// Глобальные переменные
let currentPage = 1;
let totalPages = 1;
let currentSort = 'recent';
let selectedTags = [];

// Логирование модальных окон
const modalLogger = {
    log: function(modalId, action, photoId = 'unknown') {
        console.log(`%c[МОДАЛЬНОЕ ОКНО] ${action}: ${modalId}, ID фото: ${photoId}`, 'color: blue; font-weight: bold');
    }
};

// Логирование избранного
const favoriteLogger = {
    log: function(photoId, status) {
        console.log(`%c[ИЗБРАННОЕ] Фото ${photoId}: ${status}`, 'color: red; font-weight: bold');
    }
};

// Логирование рейтингов
const ratingLogger = {
    log: function(photoId, action, value = null) {
        let message = `%c[РЕЙТИНГ] Фото ${photoId}: ${action}`;
        if (value !== null) message += `, значение: ${value}`;
        console.log(message, 'color: green; font-weight: bold');
    }
};

// Проверка авторизации пользователя
function isLoggedIn() {
    return localStorage.getItem('photoapp_token') !== null;
}

// Вспомогательная функция для обработки ответов fetch
async function handleFetchResponse(response) {
    try {
        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 401) {
                console.log("Получен 401 статус (Не авторизован)");
                
                // Проверяем токен и его валидность
                const token = localStorage.getItem('photoapp_token');
                if (!token) {
                    console.log('Токен отсутствует в localStorage');
                } else {
                    // Проверяем токен напрямую через API
                    try {
                        const validateResponse = await fetch('/api/auth/validate', {
                            headers: { 'Authorization': `Bearer ${token}` }
                        });
                        
                        if (!validateResponse.ok) {
                            console.log('Токен недействителен, удаляем из localStorage');
                            localStorage.removeItem('photoapp_token');
                            localStorage.removeItem('photoapp_user');
                        }
                    } catch (validateError) {
                        console.error('Ошибка при валидации токена:', validateError);
                    }
                }
                
                // Обновляем UI после проверки токена
                if (typeof showUnauthenticatedUI === 'function') {
                    showUnauthenticatedUI();
                }
                
                // Проверяем, находимся ли мы на защищенной странице
                const protectedPages = ['/profile', '/upload', '/favorites', '/albums', '/settings'];
                const currentPath = window.location.pathname;
                
                if (protectedPages.some(page => currentPath.startsWith(page) || 
                                        currentPath.startsWith(page + '.html'))) {
                    console.log('Перенаправляем на страницу входа с защищенной страницы');
                    window.location.href = '/login.html?redirect=' + encodeURIComponent(currentPath);
                    return null;
                }
            }
            throw new Error(data.message || 'Произошла ошибка при выполнении запроса');
        }
        return data;
    } catch (error) {
        console.error('Ошибка при обработке ответа:', error);
        throw error;
    }
}

// Вспомогательная функция для добавления заголовков авторизации
function getAuthHeaders() {
    const token = localStorage.getItem('photoapp_token');
    if (token) {
        console.log('Adding auth token to request headers');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    } else {
        console.log('No auth token available');
        return {
            'Content-Type': 'application/json'
        };
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Проверяем, есть ли параметры поиска в URL
    const urlParams = new URLSearchParams(window.location.search);
    const searchQuery = urlParams.get('search');
    
    if (searchQuery) {
        // Если есть параметр поиска, заполняем поле поиска и выполняем поиск
        document.getElementById('searchInput').value = searchQuery;
        searchPhotos(searchQuery);
    } else {
        // Иначе загружаем обычные фотографии
        loadPhotos();
    }
    
    loadPopularTags();
    setupEventListeners();
    checkUserObject();

    // Добавляем стили для ссылок на авторов при загрузке страницы
    const style = document.createElement('style');
    style.textContent = `
        .comment-author {
            font-weight: bold;
            color: #212529;
            text-decoration: none;
            transition: color 0.2s;
        }
        
        .comment-author:hover {
            color:rgb(255, 0, 0);
            text-decoration: underline;
        }
    `;
    document.head.appendChild(style);
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчик изменения сортировки
    document.getElementById('sortFilter').addEventListener('change', (e) => {
        currentSort = e.target.value;
        currentPage = 1;
        loadPhotos();
    });

    // Обработчик формы поиска
    document.getElementById('searchForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const searchQuery = document.getElementById('searchInput').value;
        searchPhotos(searchQuery);
    });

    // Обработчик клика по фото для открытия модального окна
    document.getElementById('photoGallery').addEventListener('click', (e) => {
        const photoCard = e.target.closest('.photo-card');
        if (photoCard) {
            const photoId = photoCard.dataset.photoId;
            openPhotoModal(photoId);
        }
    });

    // Обработчик формы комментариев
    document.getElementById('commentForm').addEventListener('submit', handleComment);
    
    // Исправление проблемы с aria-hidden
    fixModalAccessibility();
}

// Функция для исправления проблемы с доступностью модальных окон
function fixModalAccessibility() {
    // Находим все модальные окна на странице
    const modals = document.querySelectorAll('.modal');
    
    // Для каждого модального окна добавляем обработчик
    modals.forEach(modal => {
        modal.addEventListener('hide.bs.modal', function() {
            // Снимаем фокус с любых элементов внутри модального окна
            document.activeElement.blur();
            
            // Перемещаем фокус на body
            document.body.focus();
        });
    });
    
    // Также подписываемся на событие создания новых модальных окон
    const observer = new MutationObserver(mutations => {
        mutations.forEach(mutation => {
            mutation.addedNodes.forEach(node => {
                if (node.nodeType === 1 && node.classList && node.classList.contains('modal')) {
                    node.addEventListener('hide.bs.modal', function() {
                        document.activeElement.blur();
                        document.body.focus();
                    });
                }
            });
        });
    });
    
    observer.observe(document.body, { childList: true, subtree: true });
}

// Загрузка фотографий
async function loadPhotos() {
    try {
        const token = localStorage.getItem('photoapp_token');
        console.log('Loading photos, auth state:', token ? 'Authenticated' : 'Not authenticated');
        
        // Для главной страницы по умолчанию загружаем популярные фотографии
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            currentSort = 'popular';
            document.getElementById('sortFilter').value = 'popular';
        }
        
        // Определяем эндпоинт в зависимости от наличия валидного токена
        const endpoint = token ? '/api/photos' : '/api/public/photos';
        console.log('Using endpoint:', endpoint);
        
        const response = await fetch(`${endpoint}?page=${currentPage}&sort=${currentSort}&tags=${selectedTags.join(',')}`, {
            headers: getAuthHeaders()
        });
        
        if (response.status === 401) {
            console.log('Authentication required, switching to public endpoint');
            // Если получили 401, пробуем загрузить публичные фото
            const publicResponse = await fetch(`/api/public/photos?page=${currentPage}&sort=${currentSort}&tags=${selectedTags.join(',')}`, {
                headers: { 'Content-Type': 'application/json' }
            });
            
            const data = await publicResponse.json();
            console.log('Public photos response:', data);
            if (publicResponse.ok) {
                renderPhotos(data.content);
                totalPages = data.totalPages;
                renderPagination();
                
                // Сохраняем фотографии в локальную базу данных
                if (window.localDB && window.localDB.savePhotos && data.content) {
                    window.localDB.savePhotos(data.content)
                        .then(count => console.log(`Сохранено ${count} фотографий в локальную базу`))
                        .catch(err => console.warn('Ошибка при сохранении в локальную базу:', err));
                }
                
                return;
            }
        }
        
        const data = await response.json();
        console.log('Photos response:', data);
        if (response.ok) {
            renderPhotos(data.content);
            totalPages = data.totalPages;
            renderPagination();
            
            // Сохраняем фотографии в локальную базу данных
            if (window.localDB && window.localDB.savePhotos && data.content) {
                window.localDB.savePhotos(data.content)
                    .then(count => console.log(`Сохранено ${count} фотографий в локальную базу`))
                    .catch(err => console.warn('Ошибка при сохранении в локальную базу:', err));
            }
        } else {
            throw new Error(data.message || 'Ошибка при загрузке фотографий');
        }
    } catch (error) {
        console.error('Ошибка при загрузке фотографий:', error);
        // В случае ошибки пробуем загрузить публичные фото
        try {
            const publicResponse = await fetch('/api/public/photos?page=1&sort=recent&tags=', {
                headers: { 'Content-Type': 'application/json' }
            });
            const data = await publicResponse.json();
            console.log('Fallback public photos response:', data);
            if (publicResponse.ok) {
                renderPhotos(data.content);
                totalPages = data.totalPages;
                renderPagination();
                
                // Сохраняем фотографии в локальную базу данных
                if (window.localDB && window.localDB.savePhotos && data.content) {
                    window.localDB.savePhotos(data.content)
                        .then(count => console.log(`Сохранено ${count} фотографий в локальную базу`))
                        .catch(err => console.warn('Ошибка при сохранении в локальную базу:', err));
                }
            } else {
                showError('Не удалось загрузить фотографии');
            }
        } catch (e) {
            showError('Не удалось загрузить фотографии');
        }
    }
}

// Шаблон фото-карточки (используется на всех страницах)
function createPhotoCard(photo) {
    // Проверяем наличие необходимых полей
    const photoId = photo.id || 0;
    const photoUrl = `/api/photos/image/${photoId}`;
    const photoTitle = photo.title || 'Без названия';
    const photoRating = photo.rating !== undefined ? photo.rating : 0;
    const photoDate = photo.createdAt || new Date().toISOString();
    
    // Информация об авторе
    const photoAuthor = photo.user ? photo.user.username || 'Неизвестный автор' : 'Неизвестный автор';
    const photoAuthorId = photo.user ? photo.user.id || 0 : 0;
    
    // Создаем элемент карточки
    const cardElement = document.createElement('div');
    cardElement.className = 'col-lg-4 col-md-6 col-sm-6 mb-4';
    
    // Заполняем содержимое карточки
    cardElement.innerHTML = `
        <div class="photo-card" data-photo-id="${photoId}">
            <img src="${photoUrl}" alt="${photoTitle}" class="card-img-top">
            
            <div class="photo-overlay">
                <div class="action-buttons">
                    <button class="action-btn favorite" data-photo-id="${photoId}" title="В избранное">
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
                        <span class="stars">${renderStars(photoRating)}</span>
                    </div>
                    <div class="photo-author">
                        <a href="/profile/${photoAuthorId}" onclick="event.stopPropagation();">${photoAuthor}</a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return cardElement;
}

// Отрисовка фотографий
function renderPhotos(photos) {
    const gallery = document.getElementById('photoGallery');
    
    if (!photos || photos.length === 0) {
        // Проверяем, находимся ли мы на главной странице
        if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
            gallery.innerHTML = `
                <div class="col-12 text-center my-5">
                    <div class="empty-state">
                        <h4 class="mt-3">Галерея пуста</h4>
                        <p class="text-muted">В данный момент нет доступных фотографий</p>
                    </div>
                </div>
            `;
        } else {
            // Для других страниц оставляем стандартное пустое состояние
            gallery.innerHTML = `
                <div class="col-12 text-center my-5">
                    <div class="empty-state">
                        <i class="bi bi-image" style="font-size: 4rem; color: #ccc;"></i>
                        <h4 class="mt-3">У вас еще нет загруженных фото</h4>
                        <p class="text-muted">Загрузите свои первые фотографии, чтобы увидеть их здесь</p>
                        <a href="/upload" class="btn btn-primary mt-3">
                            <i class="bi bi-upload"></i> Загрузить фотографии
                        </a>
                    </div>
                </div>
            `;
        }
        return;
    }
    
    console.log('Rendering photos:', photos);
    
    // Очищаем галерею
    gallery.innerHTML = '';
    
    // Добавляем карточки с фотографиями
    photos.forEach(photo => {
        const photoCard = createPhotoCard(photo);
        gallery.appendChild(photoCard);
        
        // Добавляем обработчики событий
        setupPhotoCardEvents(photoCard, photo);
    });
}

// Настройка обработчиков событий для карточки фото
function setupPhotoCardEvents(cardElement, photo) {
    const photoId = photo.id;
    
    // Клик по карточке открывает модальное окно
    const photoCard = cardElement.querySelector('.photo-card');
    photoCard.addEventListener('click', (e) => {
        // Если клик был не по кнопке действия и не по ссылке автора и не по меню опций
        if (!e.target.closest('.action-btn') && !e.target.closest('.author-link') && !e.target.closest('.option-item') && !e.target.closest('.photo-options-menu')) {
            openPhotoModal(photoId);
        }
    });
    
    // Настраиваем обработчик клика по ссылке автора
    const authorLink = cardElement.querySelector('.author-link');
    if (authorLink && photo.user && photo.user.id) {
        authorLink.addEventListener('click', (e) => {
            e.stopPropagation(); // Предотвращаем всплытие события до карточки
            window.location.href = `/profile/${photo.user.id}`;
        });
    }
    
    // Кнопка "Избранное"
    const favoriteBtn = cardElement.querySelector('.action-btn.favorite');
    favoriteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleFavorite(photoId, favoriteBtn);
    });
    
    // Кнопка "Поделиться"
    const shareBtn = cardElement.querySelector('.action-btn.share');
    shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        sharePhoto(photoId);
    });
    
    // Кнопка "Найти похожие"
    const searchBtn = cardElement.querySelector('.action-btn.search');
    searchBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        findSimilarPhotos(photoId);
    });
    
    // Кнопка "Опции" (три точки)
    const optionsBtn = cardElement.querySelector('.action-btn.options');
    if (optionsBtn) {
        optionsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const optionsMenu = cardElement.querySelector('.photo-options-menu');
            if (optionsMenu) {
                // Закрываем другие открытые меню
                document.querySelectorAll('.photo-options-menu').forEach(menu => {
                    if (menu !== optionsMenu) {
                        menu.style.display = 'none';
                    }
                });
                // Переключаем видимость текущего меню
                optionsMenu.style.display = optionsMenu.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
    
    // Обработчики для пунктов меню опций
    const editPhotoItem = cardElement.querySelector('.option-item.edit-photo');
    if (editPhotoItem) {
        editPhotoItem.addEventListener('click', (e) => {
            e.stopPropagation();
            // Закрываем меню опций
            const optionsMenu = cardElement.querySelector('.photo-options-menu');
            if (optionsMenu) {
                optionsMenu.style.display = 'none';
            }
            // Открываем быстрое редактирование вместо перехода на страницу редактирования
            createQuickEditPopup(photo);
        });
    }
    
    const deletePhotoItem = cardElement.querySelector('.option-item.delete-photo');
    if (deletePhotoItem) {
        deletePhotoItem.addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm('Вы действительно хотите удалить эту фотографию?')) {
                deletePhoto(photoId);
            }
        });
    }
    
    // Проверяем, находится ли фотография в избранном
    checkFavoriteStatus(photoId, favoriteBtn);
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
            $(buttonElement).css('color', '#dc3545'); // Красный цвет для избранного
            favoriteLogger.log(photoId, 'в избранном ✓');
        } else {
            buttonElement.innerHTML = '<i class="far fa-heart"></i>';
            buttonElement.classList.remove('active');
            $(buttonElement).css('color', '');
            favoriteLogger.log(photoId, 'не в избранном ✗');
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
    const isCurrentlyFavorite = $(buttonElement).hasClass('active');
    
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
            // Обновляем иконку в кнопке (делаем сердечко закрашенным)
            $(buttonElement).html('<i class="fas fa-heart"></i>');
            $(buttonElement).addClass('active');
            $(buttonElement).css('color', '#dc3545'); // Делаем красным
            showMessage('Фото добавлено в избранное', 'success');
            favoriteLogger.log(photoId, 'ДОБАВЛЕНО в избранное ✓');
            
            // Обновляем все кнопки избранного для этого фото на странице
            updateAllFavoriteButtons(photoId, true);
        } else {
            // Обновляем иконку в кнопке (делаем сердечко пустым)
            $(buttonElement).html('<i class="far fa-heart"></i>');
            $(buttonElement).removeClass('active');
            $(buttonElement).css('color', ''); // Убираем красный цвет
            showMessage('Фото удалено из избранного', 'success');
            favoriteLogger.log(photoId, 'УДАЛЕНО из избранного ✗');
            
            // Обновляем все кнопки избранного для этого фото на странице
            updateAllFavoriteButtons(photoId, false);
            
            // Если мы на странице избранного, обновляем отображение
            if (isFavoritesPage) {
                if (typeof loadFavorites === 'function') {
                    loadFavorites(); // Перезагружаем список избранного
                } else {
                    // Если функции нет, просто скрываем карточку
                    const photoCard = $(buttonElement).closest('.photo-card');
                    if (photoCard.length) {
                        const cardContainer = photoCard.closest('.col-md-4');
                        if (cardContainer.length) {
                            cardContainer.fadeOut();
                        }
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

// Функция для обновления всех кнопок избранного для данного фото
function updateAllFavoriteButtons(photoId, isFavorite) {
    // Находим все кнопки избранного для этого фото
    const allFavoriteButtons = document.querySelectorAll(`.action-btn.favorite[data-photo-id="${photoId}"], #toggleFavorite[data-photo-id="${photoId}"]`);
    
    allFavoriteButtons.forEach(button => {
        if (isFavorite) {
            $(button).html('<i class="fas fa-heart"></i>');
            $(button).addClass('active');
            $(button).css('color', '#dc3545');
        } else {
            $(button).html('<i class="far fa-heart"></i>');
            $(button).removeClass('active');
            $(button).css('color', '');
        }
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

// Отрисовка пагинации
function renderPagination() {
    const pagination = document.getElementById('pagination');
    let html = '';

    if (currentPage > 1) {
        html += `<li class="page-item">
            <a class="page-link" href="#" data-page="${currentPage - 1}">Назад</a>
        </li>`;
    }

    for (let i = 1; i <= totalPages; i++) {
        if (i === currentPage) {
            html += `<li class="page-item active">
                <span class="page-link">${i}</span>
            </li>`;
        } else {
            html += `<li class="page-item">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>`;
        }
    }

    if (currentPage < totalPages) {
        html += `<li class="page-item">
            <a class="page-link" href="#" data-page="${currentPage + 1}">Вперед</a>
        </li>`;
    }

    pagination.innerHTML = html;

    // Добавляем обработчики для кнопок пагинации
    pagination.querySelectorAll('.page-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(e.target.dataset.page);
            if (page && page !== currentPage) {
                currentPage = page;
                loadPhotos();
            }
        });
    });
}

// Загрузка популярных тегов
async function loadPopularTags() {
    try {
        $.ajax({
            url: '/api/tags/popular',
            type: 'GET',
            success: function(tags) {
                renderTags(tags);
            },
            error: function(xhr) {
                console.error('Ошибка при загрузке тегов:', xhr.status, xhr.responseText);
                
                // В случае ошибки, пробуем загрузить из публичного API
                if (xhr.status === 401) {
                    $.ajax({
                        url: '/api/public/tags/popular',
                        type: 'GET',
                        success: function(tags) {
                            renderTags(tags);
                        },
                        error: function() {
                            console.error('Не удалось загрузить теги даже из публичного API');
                        }
                    });
                }
            }
        });
    } catch (error) {
        console.error('Ошибка при загрузке тегов:', error);
    }
}

// Отрисовка тегов
function renderTags(tags) {
    const tagsContainer = document.getElementById('popularTags');
    tagsContainer.innerHTML = tags.map(tag => `
        <a href="#" class="tag" data-tag="${tag.name}">${tag.name}</a>
    `).join('');

    // Добавляем обработчики для тегов
    tagsContainer.querySelectorAll('.tag').forEach(tag => {
        tag.addEventListener('click', (e) => {
            e.preventDefault();
            const tagName = e.target.dataset.tag;
            toggleTag(tagName);
        });
    });
}

// Переключение выбора тега
function toggleTag(tagName) {
    const index = selectedTags.indexOf(tagName);
    if (index === -1) {
        selectedTags.push(tagName);
    } else {
        selectedTags.splice(index, 1);
    }
    
    // Обновляем визуальное отображение
    document.querySelectorAll('.tag').forEach(tag => {
        if (tag.dataset.tag === tagName) {
            tag.classList.toggle('active');
        }
    });
    
    // Перезагружаем фотографии с новыми фильтрами
    currentPage = 1;
    loadPhotos();
}

// Открытие модального окна с фотографией
async function openPhotoModal(photoId) {
    try {
        console.log('Открытие модального окна для фото с ID:', photoId);
        modalLogger.log('photoModal', 'ОТКРЫТИЕ', photoId);
        
        const response = await fetch(`/api/photos/${photoId}/info`, {
            headers: getAuthHeaders()
        });
        
        const photo = await handleFetchResponse(response);
        
        if (photo) {
            const photoModal = document.getElementById('photoModal');
            
            // Сохраняем ID фото в атрибуты модального окна
            photoModal.setAttribute('data-photo-id', photo.id);
            
            document.getElementById('photoModalLabel').textContent = photo.title || 'Без названия';
            document.getElementById('modalPhoto').src = `/api/photos/image/${photo.id}`;
            
            // Отображаем информацию об авторе и настраиваем переход на его профиль
            const authorElement = document.getElementById('photoAuthor');
            if (authorElement) {
                // Определяем автора фото
                let authorName = 'Неизвестный автор';
                let authorId = 0;
                
                if (photo.user) {
                    authorId = photo.user.id;
                    authorName = photo.user.username;
                    
                    // Проверяем, является ли текущий пользователь автором фото
                    const currentUser = JSON.parse(localStorage.getItem('photoapp_user') || '{}');
                    if (currentUser && currentUser.id === authorId) {
                        authorName += ' (Вы)';
                    }
                    
                    console.log(`Отображаем автора фото: ${authorName} (ID: ${authorId})`);
                } else {
                    console.warn('Фото не имеет информации об авторе!');
                }
                
                // Устанавливаем текст и ссылку на профиль
                authorElement.textContent = authorName;
                if (authorId > 0) {
                    authorElement.href = `/profile/${authorId}`;
                    authorElement.style.cursor = 'pointer';
                    authorElement.setAttribute('data-user-id', authorId);
                    authorElement.addEventListener('click', function(e) {
                        e.preventDefault();
                        window.location.href = `/profile/${authorId}`;
                    });
                } else {
                    authorElement.href = '#';
                    authorElement.style.cursor = 'default';
                }
            }
            
            document.getElementById('photoDescription').textContent = photo.description || 'Описание отсутствует';
            
            // Отображаем рейтинг
            const stars = renderStars(photo.rating || 0);
            document.getElementById('photoRating').innerHTML = stars;
            document.getElementById('ratingCount').textContent = `(${photo.ratingCount || 0} оценок)`;
            
            // Отображаем теги
            const tagsContainer = document.getElementById('photoTags');
            if (tagsContainer) {
                if (photo.tags && photo.tags.length > 0) {
                    tagsContainer.innerHTML = photo.tags.map(tag => 
                        `<span class="badge bg-secondary me-1 tag-badge">${tag}</span>`
                    ).join('');
                } else {
                    tagsContainer.innerHTML = '<span class="text-muted">Нет тегов</span>';
                }
            }
            
            // Проверяем, является ли текущий пользователь владельцем фото
            const currentUser = JSON.parse(localStorage.getItem('photoapp_user') || '{}');
            const isOwner = currentUser && photo.user && photo.user.id === currentUser.id;
            
            // Проверяем, является ли текущий пользователь модератором
            const isModerator = isCurrentUserModerator();
            
            // Показываем кнопки модерации для модераторов
            const moderatorActionsBtn = document.getElementById('moderatorActionsBtn');
            if (moderatorActionsBtn) {
                if (isModerator) {
                    moderatorActionsBtn.style.display = 'block';
                    // Устанавливаем ID фото для кнопок модерации
                    const moderatorDeleteBtn = document.getElementById('moderatorDeletePhotoBtn');
                    if (moderatorDeleteBtn) {
                        moderatorDeleteBtn.setAttribute('data-photo-id', photo.id);
                    }
                } else {
                    moderatorActionsBtn.style.display = 'none';
                }
            }
            
            // Показываем/скрываем кнопки управления для владельца
            const ownerActions = document.querySelector('.photo-owner-actions');
            if (ownerActions) {
                if (isOwner || isModerator) {
                    ownerActions.style.display = 'block';
                    
                    // Настраиваем содержимое меню в зависимости от роли
                    const ownerMenu = ownerActions.querySelector('.dropdown-menu');
                    if (ownerMenu) {
                        // Очищаем текущее меню
                        ownerMenu.innerHTML = '';
                        
                        // Добавляем пункты меню
                        // И владелец, и модератор могут редактировать фото
                        ownerMenu.innerHTML += `<li><a class="dropdown-item" href="#" id="editPhotoBtn"><i class="fas fa-edit me-2"></i>Редактировать фото</a></li>`;
                        
                        // Добавляем разделитель
                        ownerMenu.innerHTML += `<li><hr class="dropdown-divider"></li>`;
                        
                        // И владелец, и модератор могут удалять фото
                        if (isOwner) {
                            ownerMenu.innerHTML += `<li><a class="dropdown-item text-danger" href="#" id="deletePhotoBtn"><i class="fas fa-trash-alt me-2"></i>Удалить фото</a></li>`;
                        } else if (isModerator) {
                            ownerMenu.innerHTML += `<li><a class="dropdown-item text-danger" href="#" id="deletePhotoBtn"><i class="fas fa-trash-alt me-2"></i>Удалить фото (модератор)</a></li>`;
                        }
                    }
                    
                    // Устанавливаем ID фото для кнопок действий
                    const editPhotoBtn = document.getElementById('editPhotoBtn');
                    if (editPhotoBtn) {
                        editPhotoBtn.setAttribute('data-photo-id', photo.id);
                    }
                    
                    const deletePhotoBtn = document.getElementById('deletePhotoBtn');
                    if (deletePhotoBtn) {
                        deletePhotoBtn.setAttribute('data-photo-id', photo.id);
                    }
                } else {
                    ownerActions.style.display = 'none';
                }
            }
            
            // Устанавливаем ID фото для других кнопок действий
            const toggleFavoriteBtn = document.getElementById('toggleFavorite');
            if (toggleFavoriteBtn) {
                toggleFavoriteBtn.setAttribute('data-photo-id', photo.id);
                // Проверяем статус избранного для кнопки в модальном окне
                checkFavoriteStatus(photo.id, toggleFavoriteBtn);
            }
            
            const shareBtn = document.getElementById('shareModalPhoto');
            if (shareBtn) {
                shareBtn.setAttribute('data-photo-id', photo.id);
            }
            
            const rateBtn = document.getElementById('ratePhoto');
            if (rateBtn) {
                rateBtn.setAttribute('data-photo-id', photo.id);
            }
            
            // Загружаем комментарии
            await loadComments(photo.id);
            
            // Добавляем обработчики для кнопок в модальном окне
            setupModalButtonHandlers(photo.id);
            
            // Устанавливаем обработчик для формы комментариев
            const commentForm = document.getElementById('commentForm');
            if (commentForm) {
                // Удаляем предыдущий обработчик, чтобы избежать дублирования
                commentForm.removeEventListener('submit', handleComment);
                commentForm.addEventListener('submit', handleComment);
            }
            
            // Отображаем модальное окно
            const modalInstance = new bootstrap.Modal(photoModal);
            modalInstance.show();
            
            // Добавляем обработчик на закрытие модального окна для логирования
            $(photoModal).on('hidden.bs.modal', function() {
                modalLogger.log('photoModal', 'ЗАКРЫТИЕ', photoId);
            });
            
            console.log('Модальное окно открыто для фото с ID:', photo.id);
        }
    } catch (error) {
        console.error('Ошибка при загрузке информации о фото:', error);
        console.error('Данные ошибки:', error.message);
    }
}

// Настройка обработчиков для кнопок в модальном окне
function setupModalButtonHandlers(photoId) {
    // Кнопка рейтинга
    const ratePhotoBtn = document.getElementById('ratePhoto');
    if (ratePhotoBtn) {
        ratePhotoBtn.onclick = function() {
            handleRating(photoId);
        };
    }
    
    // Кнопка редактирования
    const editBtn = document.getElementById('editPhotoBtn');
    if (editBtn) {
        editBtn.onclick = function() {
            // Получаем информацию о фото
            fetch(`/api/photos/${photoId}/info`, {
                headers: getAuthHeaders()
            })
            .then(response => response.json())
            .then(photo => {
                createQuickEditPopup(photo);
            })
            .catch(error => {
                console.error('Ошибка при получении информации о фото:', error);
                showMessage('Не удалось открыть редактирование фото', 'error');
            });
        };
    }
    
    // Кнопка удаления
    const deleteBtn = document.getElementById('deletePhotoBtn');
    if (deleteBtn) {
        deleteBtn.onclick = function() {
            deletePhoto(photoId);
        };
    }
    
    // Кнопка удаления для модератора
    const moderatorDeleteBtn = document.getElementById('moderatorDeletePhotoBtn');
    if (moderatorDeleteBtn) {
        moderatorDeleteBtn.onclick = function() {
            deletePhotoAsModerator(photoId);
        };
    }
}

// Функция для редактирования фотографии
async function editPhoto(photoId) {
    // Перенаправляем на страницу редактирования фото
    window.location.href = `/edit-photo.html?id=${photoId}`;
}

// Функция для удаления фотографии
async function deletePhoto(photoId) {
    // Создаем модальное окно для подтверждения удаления
    const confirmModalId = 'confirmDeleteModal-' + Date.now();
    
    const confirmModalHTML = `
    <div class="modal fade" id="${confirmModalId}" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Подтверждение удаления</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
                </div>
                <div class="modal-body">
                    <p>Вы действительно хотите удалить эту фотографию? Это действие нельзя отменить.</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                    <button type="button" class="btn btn-danger" id="confirmDeleteBtn-${photoId}">Удалить</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Добавляем модальное окно на страницу
    document.body.insertAdjacentHTML('beforeend', confirmModalHTML);
    
    // Получаем элементы модального окна
    const confirmModal = document.getElementById(confirmModalId);
    const confirmBtn = document.getElementById(`confirmDeleteBtn-${photoId}`);
    
    // Инициализируем модальное окно Bootstrap
    const modal = new bootstrap.Modal(confirmModal);
    
    // Добавляем обработчик для кнопки подтверждения
    confirmBtn.addEventListener('click', async () => {
        try {
            // Закрываем модальное окно подтверждения
            modal.hide();
            
            const response = await fetch(`/api/photos/${photoId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                // Закрываем модальное окно с фотографией
                bootstrap.Modal.getInstance(document.getElementById('photoModal')).hide();
                
                // Перезагружаем фотографии на странице
                loadPhotos();
                
                // Показываем сообщение об успехе
                showMessage('Фотография успешно удалена', 'success');
            } else {
                throw new Error('Ошибка при удалении фотографии');
            }
        } catch (error) {
            console.error('Ошибка при удалении фотографии:', error);
            showError('Не удалось удалить фотографию');
        } finally {
            // Удаляем модальное окно из DOM после использования
            confirmModal.addEventListener('hidden.bs.modal', () => {
                confirmModal.remove();
            });
        }
    });
    
    // Добавляем обработчик для удаления модального окна из DOM после закрытия
    confirmModal.addEventListener('hidden.bs.modal', () => {
        confirmModal.remove();
    });
    
    // Показываем модальное окно
    modal.show();
}

// Загрузка комментариев
async function loadComments(photoId) {
    try {
        // Проверяем, является ли текущий пользователь модератором
        const isModerator = isCurrentUserModerator();
        
        // Получаем текущего пользователя
        const currentUser = JSON.parse(localStorage.getItem('photoapp_user') || '{}');
        
        // Отладочная информация
        console.log('loadComments: текущий пользователь:', currentUser);
        console.log('loadComments: пользователь модератор?', isModerator);
        
        const response = await fetch(`/api/comments/photo/${photoId}`);
        const comments = await response.json();
        
        if (response.ok) {
            const commentsList = document.getElementById('commentsList');
            
            if (!comments || comments.length === 0) {
                commentsList.innerHTML = `
                    <div class="empty-comments">
                        <i class="fas fa-comments text-muted mb-2" style="font-size: 2rem;"></i>
                        <p>Пока нет комментариев. Будьте первым!</p>
                    </div>
                `;
                return;
            }
            
            console.log('loadComments: получено комментариев:', comments.length);
            
            commentsList.innerHTML = comments.map(comment => {
                const isOwnComment = currentUser && currentUser.id === comment.user.id;
                // Явно преобразуем результат к boolean
                const showDeleteButton = isOwnComment === true || isModerator === true;
                
                // Отладочная информация для каждого комментария
                console.log(`Комментарий ${comment.id} от ${comment.user.username}: собственный=${isOwnComment}, показывать кнопку удаления=${showDeleteButton}`);
                
                return `
                    <div class="comment ${isOwnComment ? 'own-comment' : ''}" data-comment-id="${comment.id}">
                        <div class="comment-header d-flex justify-content-between align-items-center">
                            <div>
                                <a href="/profile/${comment.user.id}" class="comment-author" onclick="event.stopPropagation();">${comment.user.username}</a>
                                <span class="comment-date small text-muted">${formatDate(comment.createdAt)}</span>
                            </div>
                            ${showDeleteButton ? `
                                <button class="btn-delete-comment" style="display: none;" onclick="deleteComment(${comment.id}, ${photoId})">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            ` : ''}
                        </div>
                        <div class="comment-content mt-1">${comment.content}</div>
                    </div>
                `;
            }).join('');
            
            // Добавляем обработчики наведения для комментариев
            const commentElements = document.querySelectorAll('.comment');
            commentElements.forEach(comment => {
                const deleteBtn = comment.querySelector('.btn-delete-comment');
                if (deleteBtn) {
                    comment.addEventListener('mouseenter', function() {
                        deleteBtn.style.display = 'block';
                    });
                    
                    comment.addEventListener('mouseleave', function() {
                        deleteBtn.style.display = 'none';
                    });
                }
            });
            
            // Глобальная функция для удаления комментария
            window.deleteComment = function(commentId, photoId) {
                deleteCommentHandler(commentId, photoId);
            };
        }
    } catch (error) {
        console.error('Ошибка при загрузке комментариев:', error);
        document.getElementById('commentsList').innerHTML = `
            <div class="alert alert-danger">
                Не удалось загрузить комментарии
            </div>
        `;
    }
}

// Функция-обработчик для удаления комментария
async function deleteCommentHandler(commentId, photoId) {
    if (!confirm('Вы уверены, что хотите удалить этот комментарий?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            // Перезагружаем комментарии после успешного удаления
            loadComments(photoId);
            showMessage('Комментарий успешно удален', 'success');
        } else {
            throw new Error('Не удалось удалить комментарий');
        }
    } catch (error) {
        console.error('Ошибка при удалении комментария:', error);
        showError('Не удалось удалить комментарий');
    }
}

// Обработка добавления в избранное
async function handleFavorite() {
    const photoId = getCurrentPhotoId();
    try {
        const response = await fetch(`/api/photos/${photoId}/favorite`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const button = document.getElementById('addToFavorite');
            button.classList.toggle('btn-outline-primary');
            button.classList.toggle('btn-primary');
        }
    } catch (error) {
        console.error('Ошибка при добавлении в избранное:', error);
        showError('Не удалось добавить фото в избранное');
    }
}

// Обработка оценки фото
async function handleRating(photoId) {
    // Если photoId не передан, пытаемся получить его из модального окна
    if (!photoId) {
        photoId = document.querySelector('#photoModal').dataset.photoId;
    }
    
    ratingLogger.log(photoId, 'открытие модального окна рейтинга');
    
    // Создаем модальное окно для выбора рейтинга
    const ratingModalId = 'ratingModal-' + Date.now();
    modalLogger.log(ratingModalId, 'СОЗДАНИЕ', photoId);
    
    const ratingModalHTML = `
    <div class="modal fade" id="${ratingModalId}" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Оценить фото</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
                </div>
                <div class="modal-body text-center">
                    <div class="rating-stars mb-3">
                        <i class="far fa-star star-rating star-1" data-value="1" style="font-size: 1.8rem; cursor: pointer; color: #ccc;"></i>
                        <i class="far fa-star star-rating star-2" data-value="2" style="font-size: 1.8rem; cursor: pointer; color: #ccc;"></i>
                        <i class="far fa-star star-rating star-3" data-value="3" style="font-size: 1.8rem; cursor: pointer; color: #ccc;"></i>
                        <i class="far fa-star star-rating star-4" data-value="4" style="font-size: 1.8rem; cursor: pointer; color: #ccc;"></i>
                        <i class="far fa-star star-rating star-5" data-value="5" style="font-size: 1.8rem; cursor: pointer; color: #ccc;"></i>
                    </div>
                    <p class="rating-text">Выберите оценку</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                    <button type="button" class="btn btn-primary" id="submitRatingBtn" disabled>Оценить</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Добавляем модальное окно на страницу
    document.body.insertAdjacentHTML('beforeend', ratingModalHTML);
    
    // Получаем элементы модального окна
    const ratingModal = document.getElementById(ratingModalId);
    const stars = ratingModal.querySelectorAll('.star-rating');
    const ratingText = ratingModal.querySelector('.rating-text');
    const submitBtn = document.getElementById('submitRatingBtn');
    
    // Инициализируем модальное окно Bootstrap
    const modal = new bootstrap.Modal(ratingModal);
    
    // Выбранный рейтинг
    let selectedRating = 0;
    
    // Добавляем обработчики событий для звезд
    stars.forEach(star => {
        // При наведении подсвечиваем звезды
        star.addEventListener('mouseenter', () => {
            const value = parseInt(star.dataset.value);
            stars.forEach(s => {
                const sValue = parseInt(s.dataset.value);
                if (sValue <= value) {
                    s.classList.remove('far');
                    s.classList.add('fas');
                    s.style.color = '#ffc107'; // Золотой цвет для активных звезд
                } else {
                    s.classList.remove('fas');
                    s.classList.add('far');
                    s.style.color = '#ccc'; // Серый цвет для неактивных звезд
                }
            });
        });
        
        // При уходе мыши возвращаем состояние звезд
        star.closest('.rating-stars').addEventListener('mouseleave', () => {
            stars.forEach(s => {
                const sValue = parseInt(s.dataset.value);
                if (sValue <= selectedRating) {
                    s.classList.remove('far');
                    s.classList.add('fas');
                    s.style.color = '#ffc107';
                } else {
                    s.classList.remove('fas');
                    s.classList.add('far');
                    s.style.color = '#ccc';
                }
            });
        });
        
        // При клике выбираем рейтинг
        star.addEventListener('click', () => {
            selectedRating = parseInt(star.dataset.value);
            ratingText.textContent = `Ваша оценка: ${selectedRating} ${selectedRating === 1 ? 'звезда' : (selectedRating < 5 ? 'звезды' : 'звезд')}`;
            submitBtn.disabled = false;
            
            ratingLogger.log(photoId, 'выбрана оценка', selectedRating);
            
            // Визуально отмечаем выбранные звезды
            stars.forEach(s => {
                const sValue = parseInt(s.dataset.value);
                if (sValue <= selectedRating) {
                    s.classList.remove('far');
                    s.classList.add('fas');
                    s.style.color = '#ffc107';
                } else {
                    s.classList.remove('fas');
                    s.classList.add('far');
                    s.style.color = '#ccc';
                }
            });
        });
    });
    
    // Открываем модальное окно
    modal.show();
    modalLogger.log(ratingModalId, 'ОТКРЫТО', photoId);
    
    // Добавляем обработчик для кнопки отправки рейтинга
    submitBtn.addEventListener('click', async () => {
        if (selectedRating > 0) {
            try {
                // Закрываем модальное окно рейтинга
                modal.hide();
                modalLogger.log(ratingModalId, 'ЗАКРЫТО', photoId);
                
                ratingLogger.log(photoId, 'отправка оценки', selectedRating);
                
                const response = await fetch(`/api/photos/${photoId}/rate`, {
                    method: 'POST',
                    headers: {
                        ...getAuthHeaders(),
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ value: selectedRating })
                });
                
                if (response.ok) {
                    const data = await response.json();
                    
                    ratingLogger.log(photoId, 'оценка принята, новый рейтинг', data.newRating);
                    
                    // Обновляем рейтинг в модальном окне фото
                    const photoRatingElement = document.getElementById('photoRating');
                    const ratingCountElement = document.getElementById('ratingCount');
                    
                    if (photoRatingElement && ratingCountElement) {
                        photoRatingElement.innerHTML = renderStars(data.newRating);
                        ratingCountElement.textContent = `(${data.ratingCount} оценок)`;
                    }
                    
                    showMessage('Ваша оценка учтена!', 'success');
                    console.log('Рейтинг успешно обновлен');
                    
                    // Обновляем также рейтинг в карточке фотографии, если она есть на странице
                    const photoCard = document.querySelector(`.photo-card[data-photo-id="${photoId}"]`);
                    if (photoCard) {
                        const starsElement = photoCard.querySelector('.stars');
                        const countElement = photoCard.querySelector('.count');
                        if (starsElement) {
                            starsElement.innerHTML = renderStars(data.newRating);
                        }
                        if (countElement) {
                            countElement.textContent = `(${data.ratingCount})`;
                        }
                    }
                } else {
                    throw new Error('Ошибка при оценке фото');
                }
            } catch (error) {
                console.error('Ошибка при оценке фото:', error);
                ratingLogger.log(photoId, 'ошибка оценки', error.message);
                showMessage('Не удалось отправить оценку', 'error');
            } finally {
                // Удаляем модальное окно из DOM после использования
                ratingModal.addEventListener('hidden.bs.modal', () => {
                    ratingModal.remove();
                });
            }
        }
    });
    
    // Добавляем обработчик для удаления модального окна из DOM после закрытия
    ratingModal.addEventListener('hidden.bs.modal', () => {
        ratingModal.remove();
    });
}

// Обработка отправки комментария
async function handleComment(e) {
    e.preventDefault();
    
    // Получаем ID фотографии из атрибута модального окна
    const photoModal = document.getElementById('photoModal');
    const photoId = photoModal.getAttribute('data-photo-id');
    
    console.log('Отправка комментария для фото с ID:', photoId);
    
    const content = document.getElementById('commentText').value;
    
    if (!content.trim() || !photoId) {
        console.error('Не удалось получить ID фотографии или текст комментария пуст');
        return;
    }
    
    try {
        document.getElementById('commentText').disabled = true;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Отправка...';
        submitBtn.disabled = true;
        
        const response = await fetch(`/api/comments/photo/${photoId}`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        if (response.ok) {
            document.getElementById('commentText').value = '';
            loadComments(photoId);
            console.log('Комментарий успешно отправлен');
        } else {
            throw new Error('Ошибка при отправке комментария');
        }
    } catch (error) {
        console.error('Ошибка при отправке комментария:', error);
    } finally {
        document.getElementById('commentText').disabled = false;
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.innerHTML = 'Отправить';
        submitBtn.disabled = false;
    }
}

// Вспомогательные функции
function renderStars(rating) {
    const fullStar = '★';
    const emptyStar = '☆';
    const stars = Math.round(rating);
    return fullStar.repeat(stars) + emptyStar.repeat(5 - stars);
}

function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    });
}

function showError(message) {
    // Просто логируем ошибку в консоль без показа alert
    console.error(message);
}

// Функция поиска фотографий
async function searchPhotos(searchQuery) {
    if (!searchQuery || searchQuery.trim() === '') {
        // Если поисковый запрос пустой, загружаем обычные фотографии
        loadPhotos();
        return;
    }
    
    console.log('Поиск фотографий по запросу:', searchQuery);
    
    // Показываем индикатор загрузки
    const photoGallery = document.getElementById('photoGallery');
    photoGallery.innerHTML = `
        <div class="col-12 text-center my-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Загрузка...</span>
            </div>
            <p class="mt-3">Поиск фотографий...</p>
        </div>
    `;
    
    try {
        // Проверяем, доступна ли локальная база данных
        if (window.localDB && window.localDB.search) {
            try {
                console.log('Пытаемся найти фото в локальной базе данных...');
                const localResults = await window.localDB.search(searchQuery);
                
                if (localResults && localResults.length > 0) {
                    console.log('Найдено в локальной базе:', localResults.length, 'фотографий');
                    renderPhotos(localResults);
                    totalPages = 1; // Локальный поиск возвращает все результаты сразу
                    renderPagination();
                    
                    // Обновляем URL для возможности поделиться результатами поиска
                    const searchParams = new URLSearchParams(window.location.search);
                    searchParams.set('search', searchQuery);
                    const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
                    window.history.pushState({ path: newUrl }, '', newUrl);
                    
                    // Показываем информацию о результатах поиска
                    showSearchResults(searchQuery, localResults.length);
                    
                    // Выполнили поиск локально, но все равно запрашиваем с сервера для обновления кэша
                    fetchAndUpdateCache(searchQuery);
                    return;
                } else {
                    console.log('В локальной базе не найдено результатов, запрашиваем с сервера');
                }
            } catch (localError) {
                console.warn('Ошибка при локальном поиске:', localError);
                // Продолжаем и делаем запрос к серверу
            }
        }
        
        // Определяем эндпоинт в зависимости от авторизации
        const token = localStorage.getItem('photoapp_token');
        const endpoint = token ? '/api/photos/search' : '/api/photos/search';
        
        // Отправляем запрос на поиск
        const response = await fetch(`${endpoint}?keyword=${encodeURIComponent(searchQuery)}&page=0&size=20`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка поиска: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Результаты поиска с сервера:', data);
        
        // Если результаты найдены, отображаем их и кэшируем
        if (data.content && data.content.length > 0) {
            // Сохраняем в локальную базу данных, если она доступна
            if (window.localDB && window.localDB.savePhotos) {
                window.localDB.savePhotos(data.content)
                    .then(count => console.log(`Сохранено ${count} фотографий в локальную базу`))
                    .catch(err => console.warn('Ошибка при сохранении в локальную базу:', err));
            }
            
            renderPhotos(data.content);
            totalPages = data.totalPages;
            renderPagination();
            
            // Обновляем URL для возможности поделиться результатами поиска
            const searchParams = new URLSearchParams(window.location.search);
            searchParams.set('search', searchQuery);
            const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
            window.history.pushState({ path: newUrl }, '', newUrl);
            
            // Добавляем информацию о результатах поиска на страницу
            photoGallery.dataset.searchQuery = searchQuery;
            
            // Показываем информацию о результатах поиска
            showSearchResults(searchQuery, data.totalElements);
        } else {
            // Если результаты не найдены, показываем соответствующее сообщение
            photoGallery.innerHTML = `
                <div class="col-12 text-center my-5">
                    <div class="empty-state">
                        <i class="fas fa-search" style="font-size: 4rem; color: #ccc;"></i>
                        <h4 class="mt-3">Ничего не найдено</h4>
                        <p class="text-muted">По запросу "${searchQuery}" ничего не найдено. Попробуйте изменить запрос.</p>
                        <button class="btn btn-outline-primary mt-3" onclick="clearSearch()">
                            <i class="fas fa-undo"></i> Вернуться к галерее
                        </button>
                    </div>
                </div>
            `;
            
            totalPages = 0;
            renderPagination();
        }
    } catch (error) {
        console.error('Ошибка при поиске фотографий:', error);
        
        // В случае ошибки показываем сообщение и предлагаем вернуться к галерее
        photoGallery.innerHTML = `
            <div class="col-12 text-center my-5">
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle" style="font-size: 4rem; color: #dc3545;"></i>
                    <h4 class="mt-3">Ошибка поиска</h4>
                    <p class="text-muted">Произошла ошибка при поиске. Пожалуйста, попробуйте позже.</p>
                    <p class="text-muted small">${error.message}</p>
                    <button class="btn btn-outline-primary mt-3" onclick="clearSearch()">
                        <i class="fas fa-undo"></i> Вернуться к галерее
                    </button>
                </div>
            </div>
        `;
        
        totalPages = 0;
        renderPagination();
    }
}

// Функция для фонового обновления кэша
async function fetchAndUpdateCache(searchQuery) {
    try {
        // Определяем эндпоинт в зависимости от авторизации
        const token = localStorage.getItem('photoapp_token');
        const endpoint = token ? '/api/photos/search' : '/api/photos/search';
        
        // Отправляем запрос на поиск
        const response = await fetch(`${endpoint}?keyword=${encodeURIComponent(searchQuery)}&page=0&size=50`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error(`Ошибка обновления кэша: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Получены данные для обновления кэша:', data.content?.length || 0, 'фотографий');
        
        // Сохраняем в локальную базу данных, если она доступна
        if (window.localDB && window.localDB.savePhotos && data.content) {
            window.localDB.savePhotos(data.content)
                .then(count => console.log(`Обновлен кэш: сохранено ${count} фотографий в локальную базу`))
                .catch(err => console.warn('Ошибка при обновлении кэша:', err));
        }
    } catch (error) {
        console.warn('Ошибка при фоновом обновлении кэша:', error);
    }
}

// Функция для очистки поиска и возврата к обычной галерее
function clearSearch() {
    // Очищаем поле поиска
    document.getElementById('searchInput').value = '';
    
    // Удаляем параметр поиска из URL
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.delete('search');
    const newUrl = window.location.pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '');
    window.history.pushState({ path: newUrl }, '', newUrl);
    
    // Загружаем обычные фотографии
    loadPhotos();
}

// Функция для отображения информации о результатах поиска
function showSearchResults(query, totalResults) {
    // Проверяем, существует ли уже блок с результатами поиска
    let searchResultsInfo = document.getElementById('searchResultsInfo');
    
    if (!searchResultsInfo) {
        // Если блока нет, создаем его
        searchResultsInfo = document.createElement('div');
        searchResultsInfo.id = 'searchResultsInfo';
        searchResultsInfo.className = 'alert alert-info mb-4';
        
        // Вставляем блок перед галереей
        const photoGallery = document.getElementById('photoGallery');
        photoGallery.parentNode.insertBefore(searchResultsInfo, photoGallery);
    }
    
    // Формируем текст о результатах поиска
    const resultsText = totalResults === 1 
        ? 'Найдена 1 фотография' 
        : `Найдено ${totalResults} фотографий`;
    
    // Обновляем содержимое блока
    searchResultsInfo.innerHTML = `
        <div class="d-flex justify-content-between align-items-center">
            <div>
                <strong>Результаты поиска:</strong> ${resultsText} по запросу "${query}"
            </div>
            <button class="btn btn-sm btn-outline-secondary" onclick="clearSearch()">
                <i class="fas fa-times"></i> Очистить
            </button>
        </div>
    `;
}

// Экспортируем функцию в глобальную область видимости для использования в других скриптах
window.mainOpenPhotoModal = openPhotoModal;

// Функция для удаления фотографии модератором
async function deletePhotoAsModerator(photoId) {
    // Создаем модальное окно для подтверждения модераторского удаления
    const confirmModalId = 'confirmModeratorDeleteModal-' + Date.now();
    
    const confirmModalHTML = `
    <div class="modal fade" id="${confirmModalId}" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Подтверждение модераторского удаления</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
                </div>
                <div class="modal-body">
                    <div class="alert alert-warning">
                        <i class="fas fa-exclamation-triangle me-2"></i>
                        <strong>Внимание!</strong> Вы собираетесь удалить фотографию как модератор.
                    </div>
                    <p>Это действие удалит фотографию из системы и всех альбомов, где она используется.</p>
                    <p>Вы уверены, что хотите удалить эту фотографию?</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                    <button type="button" class="btn btn-danger" id="confirmModeratorDeleteBtn-${photoId}">
                        <i class="fas fa-trash-alt me-2"></i>Удалить как модератор
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Добавляем модальное окно на страницу
    document.body.insertAdjacentHTML('beforeend', confirmModalHTML);
    
    // Получаем элементы модального окна
    const confirmModal = document.getElementById(confirmModalId);
    const confirmBtn = document.getElementById(`confirmModeratorDeleteBtn-${photoId}`);
    
    // Инициализируем модальное окно Bootstrap
    const modal = new bootstrap.Modal(confirmModal);
    
    // Добавляем обработчик для кнопки подтверждения
    confirmBtn.addEventListener('click', async () => {
        try {
            // Закрываем модальное окно подтверждения
            modal.hide();
            
            // Отправляем запрос на удаление фотографии (для модератора используем тот же эндпоинт)
            const response = await fetch(`/api/photos/${photoId}`, {
                method: 'DELETE',
                headers: getAuthHeaders()
            });
            
            if (response.ok) {
                // Закрываем модальное окно с фотографией
                const photoModal = document.getElementById('photoModal');
                if (photoModal) {
                    bootstrap.Modal.getInstance(photoModal).hide();
                }
                
                // Перезагружаем фотографии на странице
                loadPhotos();
                
                // Показываем сообщение об успехе
                showMessage('Фотография успешно удалена модератором', 'success');
            } else {
                throw new Error('Ошибка при удалении фотографии');
            }
        } catch (error) {
            console.error('Ошибка при удалении фотографии:', error);
            showError('Не удалось удалить фотографию');
        } finally {
            // Удаляем модальное окно из DOM после использования
            confirmModal.addEventListener('hidden.bs.modal', () => {
                confirmModal.remove();
            });
        }
    });
    
    // Добавляем обработчик для удаления модального окна из DOM после закрытия
    confirmModal.addEventListener('hidden.bs.modal', () => {
        confirmModal.remove();
    });
    
    // Показываем модальное окно
    modal.show();
}

// Функция для проверки объекта пользователя
function checkUserObject() {
    const userStr = localStorage.getItem('photoapp_user');
    if (!userStr) {
        console.log('checkUserObject: объект пользователя отсутствует в localStorage');
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        console.log('checkUserObject: объект пользователя в localStorage:', user);
        
        // Проверяем наличие свойства isModerator
        if (user.isModerator === undefined) {
            console.warn('checkUserObject: свойство isModerator отсутствует у пользователя');
            
            // Проверяем, есть ли роли у пользователя
            if (user.roles && Array.isArray(user.roles)) {
                console.log('checkUserObject: роли пользователя:', user.roles);
                
                // Если есть роли, добавляем свойство isModerator
                const isModerator = user.roles.includes('ROLE_MODERATOR') || user.roles.includes('ROLE_ADMIN');
                user.isModerator = isModerator;
                console.log('checkUserObject: установлено свойство isModerator =', isModerator);
                
                // Сохраняем обновленный объект пользователя
                localStorage.setItem('photoapp_user', JSON.stringify(user));
            }
        }
    } catch (error) {
        console.error('checkUserObject: ошибка при обработке объекта пользователя:', error);
    }
}

// Создание всплывающего окна для быстрого редактирования фото
function createQuickEditPopup(photo) {
    // Проверяем права доступа пользователя
    const currentUser = JSON.parse(localStorage.getItem('photoapp_user') || '{}');
    const isOwner = currentUser && photo.user && currentUser.id === photo.user.id;
    const isModerator = isCurrentUserModerator();
    
    if (!isOwner && !isModerator) {
        console.error('Недостаточно прав для редактирования этого фото');
        showMessage('У вас нет прав для редактирования этого фото', 'error');
        return;
    }
    
    console.log(`Редактирование фото ${photo.id}: собственное=${isOwner}, модератор=${isModerator}`);
    
    // Генерируем уникальный ID для модального окна
    const modalId = `quickEditModal-${Date.now()}`;
    
    const modalHTML = `
    <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Редактирование фото</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
                </div>
                <div class="modal-body">
                    <form id="quickEditForm-${photo.id}">
                        <div class="mb-3">
                            <label for="editTitle-${photo.id}" class="form-label">Название</label>
                            <input type="text" class="form-control" id="editTitle-${photo.id}" value="${photo.title || ''}">
                        </div>
                        <div class="mb-3">
                            <label for="editDescription-${photo.id}" class="form-label">Описание</label>
                            <textarea class="form-control" id="editDescription-${photo.id}" rows="3">${photo.description || ''}</textarea>
                        </div>
                    </form>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                    <button type="button" class="btn btn-primary" id="saveQuickEdit-${photo.id}">Сохранить</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Добавляем модальное окно на страницу
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Получаем ссылки на элементы
    const modalElement = document.getElementById(modalId);
    const saveBtn = document.getElementById(`saveQuickEdit-${photo.id}`);
    const titleInput = document.getElementById(`editTitle-${photo.id}`);
    const descriptionInput = document.getElementById(`editDescription-${photo.id}`);
    
    // Добавляем автоматическое сохранение при вводе текста
    let originalTitle = photo.title || '';
    let originalDescription = photo.description || '';
    
    // Отслеживаем изменения для визуальной индикации
    titleInput.addEventListener('input', () => {
        const changed = titleInput.value !== originalTitle;
        titleInput.classList.toggle('is-changed', changed);
        updateSaveButtonState();
    });
    
    descriptionInput.addEventListener('input', () => {
        const changed = descriptionInput.value !== originalDescription;
        descriptionInput.classList.toggle('is-changed', changed);
        updateSaveButtonState();
    });
    
    // Функция обновления состояния кнопки Сохранить
    function updateSaveButtonState() {
        const titleChanged = titleInput.value !== originalTitle;
        const descriptionChanged = descriptionInput.value !== originalDescription;
        saveBtn.disabled = !titleChanged && !descriptionChanged;
    }
    
    // Начальное состояние кнопки
    updateSaveButtonState();
    
    // Создаем модальное окно Bootstrap
    const modal = new bootstrap.Modal(modalElement);
    
    // Добавляем обработчики событий
    saveBtn.addEventListener('click', async () => {
        const newTitle = titleInput.value;
        const newDescription = descriptionInput.value;
        
        // Показываем индикатор загрузки
        saveBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Сохранение...';
        saveBtn.disabled = true;
        
        try {
            const response = await fetch(`/api/photos/${photo.id}`, {
                method: 'PUT',
                headers: {
                    ...getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    title: newTitle,
                    description: newDescription
                })
            });
            
            if (response.ok) {
                const updatedPhoto = await response.json();
                console.log('Фото обновлено:', updatedPhoto);
                
                // Запоминаем новые значения
                originalTitle = newTitle;
                originalDescription = newDescription;
                photo.title = newTitle;
                photo.description = newDescription;
                
                // Обновляем информацию в модальном окне фото, если оно открыто
                const photoModal = document.getElementById('photoModal');
                if (photoModal && photoModal.classList.contains('show')) {
                    const photoId = photoModal.getAttribute('data-photo-id');
                    if (photoId === photo.id.toString()) {
                        document.getElementById('photoModalLabel').textContent = newTitle || 'Без названия';
                        document.getElementById('photoDescription').textContent = newDescription || 'Описание отсутствует';
                    }
                }
                
                // Обновляем карточку фото на странице
                const photoCard = document.querySelector(`.photo-card[data-photo-id="${photo.id}"]`);
                if (photoCard) {
                    const titleElement = photoCard.querySelector('.photo-title');
                    if (titleElement) {
                        titleElement.textContent = newTitle || 'Без названия';
                    }
                }
                
                // Закрываем модальное окно
                modal.hide();
                
                // Показываем сообщение об успешном обновлении
                showMessage('Фото успешно обновлено', 'success');
                
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Ошибка при обновлении фото');
            }
        } catch (error) {
            console.error('Ошибка при обновлении фото:', error);
            showMessage(`Не удалось обновить фото: ${error.message}`, 'error');
            
            // Восстанавливаем кнопку
            saveBtn.innerHTML = 'Сохранить';
            saveBtn.disabled = false;
        }
    });
    
    // Добавляем обработчик клавиш (Ctrl+Enter для сохранения)
    modalElement.addEventListener('keydown', (e) => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (!saveBtn.disabled) {
                saveBtn.click();
            }
        }
    });
    
    // Добавляем стили для индикации изменений
    const style = document.createElement('style');
    style.textContent = `
        .is-changed {
            background-color: #f8f9fa;
            border-color: #0d6efd;
        }
    `;
    document.head.appendChild(style);
    
    // Удаляем модальное окно из DOM после закрытия
    modalElement.addEventListener('hidden.bs.modal', () => {
        modalElement.remove();
        style.remove();
    });
    
    // Отображаем модальное окно
    modal.show();
    
    return modal;
}