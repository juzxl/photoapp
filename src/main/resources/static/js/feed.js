// feed.js - Реализация ленты фотографий на главной странице

// Глобальные переменные
let feedCurrentPage = 1;
let feedTotalPages = 1;
let feedCurrentSort = 'recent';
let feedSelectedTags = [];
let feedLoaded = false;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    console.log('Feed.js загружен');
    
    // Если мы на главной странице, загружаем ленту
    if (window.location.pathname === '/' || window.location.pathname === '/index.html') {
        // Инициализируем ленту фотографий
        initFeed();
    }
});

// Инициализация ленты фотографий
function initFeed() {
    console.log('Инициализация ленты фотографий');
    
    // Добавляем заголовок для ленты
    if (!document.getElementById('feedTitle')) {
        const welcomeSection = document.querySelector('.welcome-section');
        if (welcomeSection) {
            const feedTitle = document.createElement('h3');
            feedTitle.id = 'feedTitle';
            feedTitle.className = 'mt-4 mb-3 text-center';
            feedTitle.textContent = 'Лента фотографий';
            
            // Добавляем заголовок после welcomeSection
            welcomeSection.parentNode.insertBefore(feedTitle, welcomeSection.nextSibling);
        }
    }
    
    // Настраиваем обработчики событий
    setupFeedEventListeners();
    
    // Загружаем фотографии
    loadFeedPhotos();
}

// Настройка обработчиков событий для ленты
function setupFeedEventListeners() {
    // Обработчик изменения сортировки
    const sortFilter = document.getElementById('sortFilter');
    if (sortFilter) {
        sortFilter.removeEventListener('change', handleSortChange);
        sortFilter.addEventListener('change', handleSortChange);
    }
    
    // Обработчик клика по тегу
    document.addEventListener('click', function(e) {
        if (e.target.classList.contains('tag-badge')) {
            const tag = e.target.textContent.trim();
            toggleTagFilter(tag);
        }
    });
}

// Обработчик изменения сортировки
function handleSortChange(e) {
    feedCurrentSort = e.target.value;
    feedCurrentPage = 1;
    loadFeedPhotos();
}

// Включение/выключение фильтра по тегу
function toggleTagFilter(tag) {
    const tagIndex = feedSelectedTags.indexOf(tag);
    
    if (tagIndex === -1) {
        // Добавляем тег в фильтр
        feedSelectedTags.push(tag);
    } else {
        // Удаляем тег из фильтра
        feedSelectedTags.splice(tagIndex, 1);
    }
    
    // Сбрасываем страницу и перезагружаем фотографии
    feedCurrentPage = 1;
    loadFeedPhotos();
    
    // Обновляем UI выбранных тегов
    updateSelectedTagsUI();
}

// Обновление UI выбранных тегов
function updateSelectedTagsUI() {
    const tagsContainer = document.getElementById('selectedTags');
    
    // Если контейнера нет, создаем его
    if (!tagsContainer) {
        const filterRow = document.querySelector('.row.mb-4');
        if (filterRow) {
            const selectedTagsDiv = document.createElement('div');
            selectedTagsDiv.className = 'col-12 mt-2';
            selectedTagsDiv.innerHTML = `
                <div class="selected-tags-container">
                    <h6 class="d-inline-block me-2">Выбранные теги:</h6>
                    <div id="selectedTags" class="d-inline-block"></div>
                </div>
            `;
            filterRow.parentNode.insertBefore(selectedTagsDiv, filterRow.nextSibling);
        }
    }
    
    // Обновляем содержимое
    const tagsContainerUpdated = document.getElementById('selectedTags');
    if (tagsContainerUpdated) {
        if (feedSelectedTags.length > 0) {
            tagsContainerUpdated.innerHTML = feedSelectedTags.map(tag => 
                `<span class="badge bg-primary me-1 selected-tag" data-tag="${tag}">${tag} <i class="fas fa-times"></i></span>`
            ).join('');
            
            // Добавляем обработчики для удаления тегов
            document.querySelectorAll('.selected-tag').forEach(tagElement => {
                tagElement.addEventListener('click', function() {
                    const tag = this.getAttribute('data-tag');
                    toggleTagFilter(tag);
                });
            });
            
            tagsContainerUpdated.parentElement.style.display = 'block';
        } else {
            tagsContainerUpdated.innerHTML = '<span class="text-muted">Нет выбранных тегов</span>';
            tagsContainerUpdated.parentElement.style.display = 'none';
        }
    }
}

// Загрузка фотографий для ленты
async function loadFeedPhotos() {
    try {
        console.log('Загрузка фотографий для ленты');
        
        // Показываем индикатор загрузки
        const photoGallery = document.getElementById('photoGallery');
        if (photoGallery && !feedLoaded) {
            photoGallery.innerHTML = `
                <div class="col-12 text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Загрузка...</span>
                    </div>
                    <p class="mt-2">Загрузка фотографий...</p>
                </div>
            `;
        }
        
        // Выбираем подходящий API endpoint
        let endpoint = '/api/public/photos';
        const token = localStorage.getItem('photoapp_token');
        const headers = {};
        
        if (token) {
            // Если пользователь авторизован, используем API для получения всех фотографий
            endpoint = '/api/feed';
            headers['Authorization'] = `Bearer ${token}`;
        }
        
        console.log(`Использую endpoint: ${endpoint}`);
        console.log(`Авторизация: ${token ? 'Пользователь авторизован' : 'Анонимный пользователь'}`);
        
        // Формируем URL с параметрами
        const url = new URL(endpoint, window.location.origin);
        url.searchParams.append('page', feedCurrentPage - 1); // API использует 0-индексацию
        url.searchParams.append('size', 12);
        url.searchParams.append('sort', feedCurrentSort);
        
        if (feedSelectedTags.length > 0) {
            url.searchParams.append('tags', feedSelectedTags.join(','));
        }
        
        console.log(`Параметры запроса: page=${feedCurrentPage-1}, size=12, sort=${feedCurrentSort}, tags=${feedSelectedTags.join(',')}`);
        console.log(`Полный URL запроса: ${url.toString()}`);
        
        // Выполняем запрос
        console.log('Отправка запроса с заголовками:', headers);
        const response = await fetch(url, { headers });
        
        // Если получили 401 и пользователь авторизован, пробуем получить публичные фотографии
        if (response.status === 401 && token) {
            console.log('Ошибка авторизации, переключаемся на публичный API');
            return loadPublicPhotos();
        }
        
        // Обрабатываем ответ
        if (response.ok) {
            const data = await response.json();
            console.log('Получены фотографии для ленты:', data);
            
            // Отображаем фотографии
            renderFeedPhotos(data.content || []);
            
            // Обновляем пагинацию
            feedTotalPages = data.totalPages || 1;
            renderFeedPagination();
            
            feedLoaded = true;
        } else {
            // Если возникла ошибка, пробуем загрузить публичные фотографии
            console.error('Ошибка загрузки ленты:', response.status);
            return loadPublicPhotos();
        }
    } catch (error) {
        console.error('Ошибка при загрузке ленты:', error);
        return loadPublicPhotos();
    }
}

// Загрузка публичных фотографий (если основной API недоступен)
async function loadPublicPhotos() {
    try {
        const url = new URL('/api/public/photos', window.location.origin);
        url.searchParams.append('page', feedCurrentPage - 1);
        url.searchParams.append('size', 12);
        url.searchParams.append('sort', feedCurrentSort);
        
        if (feedSelectedTags.length > 0) {
            url.searchParams.append('tags', feedSelectedTags.join(','));
        }
        
        const response = await fetch(url);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Получены публичные фотографии:', data);
            
            renderFeedPhotos(data.content || []);
            feedTotalPages = data.totalPages || 1;
            renderFeedPagination();
            
            feedLoaded = true;
        } else {
            // Если и это не работает, показываем ошибку
            console.error('Ошибка загрузки публичных фотографий:', response.status);
            showFeedError('Не удалось загрузить фотографии. Пожалуйста, попробуйте позже.');
        }
    } catch (error) {
        console.error('Ошибка при загрузке публичных фотографий:', error);
        showFeedError('Ошибка при загрузке фотографий. Проверьте подключение к интернету.');
    }
}

// Отображение фотографий в ленте
function renderFeedPhotos(photos) {
    const photoGallery = document.getElementById('photoGallery');
    
    if (!photoGallery) {
        console.error('Контейнер photoGallery не найден');
        return;
    }
    
    console.log('Рендеринг фотографий:', photos);
    console.log('Количество фотографий для отображения:', photos.length);
    
    // Очищаем галерею
    photoGallery.innerHTML = '';
    
    if (!photos || photos.length === 0) {
        photoGallery.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-images fa-4x text-muted mb-3"></i>
                <h5 class="mb-3">Фотографии не найдены</h5>
                <p class="text-muted">Попробуйте изменить параметры поиска или загрузите свои фотографии</p>
            </div>
        `;
        return;
    }
    
    // Создаем карточки для каждой фотографии
    photos.forEach((photo, index) => {
        console.log(`Обработка фото ${index + 1}/${photos.length}:`, photo);
        if (!photo.filePath) {
            console.warn(`Фото ${photo.id} не имеет filePath!`, photo);
        }
        const photoCard = createFeedPhotoCard(photo);
        photoGallery.appendChild(photoCard);
    });
    
    console.log('Фотографии успешно отрендерены');
    
    // Инициализируем обработчики событий для карточек
    setupFeedCardEvents();
}

// Создание карточки фотографии для ленты
function createFeedPhotoCard(photo) {
    // Проверяем наличие данных
    const photoId = photo.id || 0;
    const title = photo.title || 'Без названия';
    const rating = photo.rating || 0;
    const photoUrl = `/api/photos/image/${photoId}`;
    
    // Информация об авторе
    const authorName = photo.user ? (photo.user.username || 'Неизвестный автор') : 'Неизвестный автор';
    const authorId = photo.user ? (photo.user.id || 0) : 0;
    
    // Создаем элемент карточки
    const cardElement = document.createElement('div');
    cardElement.className = 'col-lg-4 col-md-6 col-sm-6 mb-4';
    
    // Заполняем содержимое
    cardElement.innerHTML = `
        <div class="photo-card" data-photo-id="${photoId}">
            <img src="${photoUrl}" alt="${title}" class="card-img-top">
            
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
                <h5 class="photo-title">${title}</h5>
                <div class="photo-meta">
                    <div class="rating">
                        <span class="stars">${renderStars(rating)}</span>
                    </div>
                    <div class="photo-author">
                        <a href="/profile/${authorId}" class="author-link" onclick="event.stopPropagation();">${authorName}</a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    return cardElement;
}

// Настройка обработчиков событий для карточек фотографий
function setupFeedCardEvents() {
    // Обработчик клика по карточке
    document.querySelectorAll('.photo-card').forEach(card => {
        card.addEventListener('click', function(e) {
            // Открываем модальное окно только если клик был не по кнопке действия
            if (!e.target.closest('.action-btn')) {
                const photoId = this.dataset.photoId;
                openPhotoModal(photoId);
            }
        });
    });
    
    // Обработчик клика по кнопке просмотра
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const photoId = this.closest('.photo-card').dataset.photoId;
            openPhotoModal(photoId);
        });
    });
    
    // Обработчик клика по кнопке избранного
    document.querySelectorAll('.favorite').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const photoId = this.closest('.photo-card').dataset.photoId;
            toggleFavorite(photoId, this);
        });
    });
    
    // Обработчик клика по кнопке поделиться
    document.querySelectorAll('.share').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const photoId = this.closest('.photo-card').dataset.photoId;
            sharePhoto(photoId);
        });
    });
    
    // Проверяем статус избранного для всех фотографий
    checkFavoritesStatus();
}

// Проверка статуса избранного для всех фотографий
function checkFavoritesStatus() {
    // Получаем токен авторизации
    const token = localStorage.getItem('photoapp_token');
    if (!token) return;
    
    // Для каждой карточки проверяем, находится ли фото в избранном
    document.querySelectorAll('.photo-card').forEach(card => {
        const photoId = card.dataset.photoId;
        const favoriteBtn = card.querySelector('.favorite');
        
        if (favoriteBtn) {
            checkFavoriteStatus(photoId, favoriteBtn);
        }
    });
}

// Проверка статуса избранного для отдельной фотографии
function checkFavoriteStatus(photoId, buttonElement) {
    const token = localStorage.getItem('photoapp_token');
    if (!token) return;
    
    fetch(`/api/favorites/check/${photoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        if (data.isFavorite) {
            buttonElement.querySelector('i').classList.remove('far');
            buttonElement.querySelector('i').classList.add('fas');
            buttonElement.classList.add('active');
        }
    })
    .catch(error => console.error('Ошибка при проверке статуса избранного:', error));
}

// Отрисовка звездочек рейтинга
function renderStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    let starsHtml = '';
    
    // Заполненные звезды
    for (let i = 0; i < fullStars; i++) {
        starsHtml += '<i class="fas fa-star text-warning"></i>';
    }
    
    // Половина звезды
    if (halfStar) {
        starsHtml += '<i class="fas fa-star-half-alt text-warning"></i>';
    }
    
    // Пустые звезды
    for (let i = 0; i < emptyStars; i++) {
        starsHtml += '<i class="far fa-star text-warning"></i>';
    }
    
    return starsHtml;
}

// Отображение пагинации
function renderFeedPagination() {
    const pagination = document.getElementById('pagination');
    
    if (!pagination) return;
    
    pagination.innerHTML = '';
    
    if (feedTotalPages <= 1) return;
    
    // Создаем кнопки пагинации
    const prevDisabled = feedCurrentPage === 1;
    const nextDisabled = feedCurrentPage === feedTotalPages;
    
    // Кнопка "Предыдущая"
    const prevButton = document.createElement('li');
    prevButton.className = `page-item ${prevDisabled ? 'disabled' : ''}`;
    prevButton.innerHTML = `<a class="page-link" href="#" aria-label="Previous" ${prevDisabled ? 'tabindex="-1" aria-disabled="true"' : ''}>
        <span aria-hidden="true">&laquo;</span>
    </a>`;
    
    if (!prevDisabled) {
        prevButton.addEventListener('click', (e) => {
            e.preventDefault();
            changePage(feedCurrentPage - 1);
        });
    }
    
    pagination.appendChild(prevButton);
    
    // Номера страниц
    const maxVisiblePages = 5;
    let startPage = Math.max(1, feedCurrentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(feedTotalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageItem = document.createElement('li');
        pageItem.className = `page-item ${i === feedCurrentPage ? 'active' : ''}`;
        pageItem.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        
        pageItem.addEventListener('click', (e) => {
            e.preventDefault();
            changePage(i);
        });
        
        pagination.appendChild(pageItem);
    }
    
    // Кнопка "Следующая"
    const nextButton = document.createElement('li');
    nextButton.className = `page-item ${nextDisabled ? 'disabled' : ''}`;
    nextButton.innerHTML = `<a class="page-link" href="#" aria-label="Next" ${nextDisabled ? 'tabindex="-1" aria-disabled="true"' : ''}>
        <span aria-hidden="true">&raquo;</span>
    </a>`;
    
    if (!nextDisabled) {
        nextButton.addEventListener('click', (e) => {
            e.preventDefault();
            changePage(feedCurrentPage + 1);
        });
    }
    
    pagination.appendChild(nextButton);
}

// Изменение страницы
function changePage(page) {
    if (page < 1 || page > feedTotalPages || page === feedCurrentPage) return;
    
    feedCurrentPage = page;
    loadFeedPhotos();
    
    // Прокручиваем страницу вверх
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// Отображение ошибки
function showFeedError(message) {
    const photoGallery = document.getElementById('photoGallery');
    
    if (photoGallery) {
        photoGallery.innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger" role="alert">
                    <i class="fas fa-exclamation-triangle me-2"></i> ${message}
                </div>
            </div>
        `;
    }
}

// Добавление/удаление из избранного
function toggleFavorite(photoId, buttonElement) {
    // Проверяем, находимся ли мы на странице избранного
    const isFavoritesPage = window.location.pathname.includes('/favorites');
    
    // Проверяем текущий статус (если кнопка активна, значит фото уже в избранном)
    const isCurrentlyFavorite = buttonElement.classList.contains('active');
    
    // Если фото в избранном и мы не на странице избранного, показываем сообщение
    if (isCurrentlyFavorite && !isFavoritesPage) {
        // Используем showMessage, если она доступна, или alert в качестве запасного варианта
        if (typeof showMessage === 'function') {
            showMessage('Фото уже добавлено в избранное.', 'info');
        } else {
            alert('Фото уже добавлено в избранное.');
        }
        return;
    }
    
    // Если фото в избранном и мы на странице избранного, спрашиваем подтверждение
    if (isCurrentlyFavorite && isFavoritesPage) {
        if (!confirm('Вы действительно хотите удалить это фото из избранного?')) {
            return; // Пользователь отказался от удаления
        }
    }
    
    const token = localStorage.getItem('photoapp_token');
    
    if (!token) {
        // Если пользователь не авторизован, перенаправляем на страницу входа
        window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return;
    }
    
    fetch(`/api/favorites/${photoId}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    })
    .then(response => response.json())
    .then(data => {
        if (data.status === 'added') {
            buttonElement.querySelector('i').classList.remove('far');
            buttonElement.querySelector('i').classList.add('fas');
            buttonElement.classList.add('active');
            
            // Используем showMessage, если она доступна
            if (typeof showMessage === 'function') {
                showMessage('Фото добавлено в избранное', 'success');
            }
        } else if (isFavoritesPage) {
            // Удаляем только если мы на странице избранного
            buttonElement.querySelector('i').classList.remove('fas');
            buttonElement.querySelector('i').classList.add('far');
            buttonElement.classList.remove('active');
            
            // Используем showMessage, если она доступна
            if (typeof showMessage === 'function') {
                showMessage('Фото удалено из избранного', 'success');
            }
            
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
        
        // Используем showMessage, если она доступна
        if (typeof showMessage === 'function') {
            showMessage('Не удалось изменить статус избранного. Возможно, вы не авторизованы.', 'error');
        }
    });
}

// Функция для открытия модального окна фотографии
function openPhotoModal(photoId) {
    console.log('openPhotoModal в feed.js: обращение к функции в main.js');
    
    // Проверяем, существует ли функция в глобальном контексте
    // и отличается ли она от текущей функции
    if (typeof window.mainOpenPhotoModal === 'function') {
        window.mainOpenPhotoModal(photoId);
    } else if (typeof openPhotoModalFromMain === 'function') {
        openPhotoModalFromMain(photoId);
    } else {
        // Если глобальной функции нет, обращаемся напрямую к модальному окну
        console.warn('Функция для открытия модального окна не найдена в глобальном контексте');
        
        // Получаем элемент модального окна
        const photoModal = document.getElementById('photoModal');
        if (photoModal) {
            // Пытаемся загрузить данные фото
            fetch(`/api/photos/${photoId}/info`, {
                headers: getAuthHeaders ? getAuthHeaders() : {}
            })
            .then(response => response.json())
            .then(photo => {
                // Заполняем данные в модальном окне
                document.getElementById('modalPhoto').src = `/api/photos/image/${photoId}`;
                document.getElementById('photoModalLabel').textContent = photo.title || 'Без названия';
                
                // Открываем модальное окно
                const modal = new bootstrap.Modal(photoModal);
                modal.show();
            })
            .catch(error => {
                console.error('Ошибка при загрузке данных фото:', error);
            });
        }
    }
}

// Функция для шаринга фотографии
function sharePhoto(photoId) {
    const shareUrl = `${window.location.origin}/photo.html?id=${photoId}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Поделиться фотографией',
            text: 'Посмотрите эту фотографию в PhotoApp!',
            url: shareUrl
        })
        .catch(error => console.error('Ошибка при шаринге:', error));
    } else {
        // Запасной вариант - копирование в буфер обмена
        navigator.clipboard.writeText(shareUrl)
            .then(() => alert('Ссылка скопирована в буфер обмена'))
            .catch(err => {
                console.error('Не удалось скопировать ссылку:', err);
                // Показываем окно с текстом для копирования
                prompt('Скопируйте эту ссылку для отправки:', shareUrl);
            });
    }
} 