// Функции для работы с комментариями в альбоме

// Глобальные переменные
let currentPhotoId = null;

// Обработчик загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    fixModalAccessibility();
    checkUserObject();
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчик открытия фото (должен вызываться после клика на фото в альбоме)
    document.getElementById('photoGallery').addEventListener('click', (e) => {
        const photoCard = e.target.closest('.photo-card');
        if (photoCard) {
            const photoId = photoCard.dataset.photoId;
            openPhotoModal(photoId);
        }
    });

    // Обработчик отправки комментария
    document.getElementById('commentForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleCommentSubmit();
    });
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

// Открытие модального окна с фотографией
async function openPhotoModal(photoId) {
    console.log('album.js: Вызов универсальной функции модального окна из main.js');
    
    // Используем общую функцию из main.js
    if (typeof window.mainOpenPhotoModal === 'function') {
        window.mainOpenPhotoModal(photoId);
    } else {
        console.error('Функция mainOpenPhotoModal не найдена, проверьте порядок загрузки скриптов');
        showMessage('Не удалось открыть фото. Попробуйте обновить страницу.', 'error');
    }
}

// Загрузка комментариев
async function loadComments(photoId) {
    try {
        const response = await fetch(`/api/comments/photo/${photoId}`, {
            headers: getAuthHeaders()
        });
        
        const comments = await handleFetchResponse(response);
        
        // Проверяем, является ли пользователь модератором
        const isModerator = isCurrentUserModerator();
        // Получаем текущего пользователя
        const currentUser = JSON.parse(localStorage.getItem('photoapp_user') || '{}');
        
        // Отладочная информация
        console.log('loadComments: текущий пользователь:', currentUser);
        console.log('loadComments: пользователь модератор?', isModerator);
        
        const commentsList = document.getElementById('commentsList');
        if (comments && comments.length > 0) {
            console.log('loadComments: получено комментариев:', comments.length);
            
            commentsList.innerHTML = comments.map(comment => {
                const isOwnComment = currentUser && currentUser.id === comment.user.id;
                // Явно преобразуем результат к boolean
                const showDeleteButton = isOwnComment === true || isModerator === true;
                
                // Отладочная информация для каждого комментария
                console.log(`Комментарий ${comment.id} от ${comment.user.username}: собственный=${isOwnComment}, показывать кнопку удаления=${showDeleteButton}`);
                
                return `
                    <div class="comment mb-3" data-comment-id="${comment.id}">
                        <div class="comment-header d-flex justify-content-between align-items-center">
                            <div>
                                <a href="/profile/${comment.user.id}" class="comment-author" onclick="event.stopPropagation();">${comment.user.username}</a>
                                <span class="comment-date text-muted small">${formatDate(comment.createdAt)}</span>
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
            
            // Глобальная функция для удаления комментария, если еще не определена
            if (typeof window.deleteComment !== 'function') {
                window.deleteComment = function(commentId, photoId) {
                    deleteCommentHandler(commentId, photoId);
                };
            }
        } else {
            commentsList.innerHTML = '<div class="text-center text-muted my-3">Комментариев пока нет</div>';
        }
    } catch (error) {
        console.error('Ошибка при загрузке комментариев:', error);
        document.getElementById('commentsList').innerHTML = 
            '<div class="alert alert-danger">Не удалось загрузить комментарии</div>';
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

// Отправка комментария
async function handleCommentSubmit() {
    const content = document.getElementById('commentText').value.trim();
    
    if (!content) {
        showError('Пожалуйста, введите текст комментария');
        return;
    }
    
    try {
        const response = await fetch(`/api/comments/photo/${currentPhotoId}`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        await handleFetchResponse(response);
        
        // Очищаем поле ввода
        document.getElementById('commentText').value = '';
        
        // Перезагружаем комментарии
        loadComments(currentPhotoId);
    } catch (error) {
        console.error('Ошибка при отправке комментария:', error);
        showError('Не удалось отправить комментарий');
    }
}

// Вспомогательные функции
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function isCurrentUser(userId) {
    const currentUser = JSON.parse(localStorage.getItem('photoapp_user'));
    return currentUser && currentUser.id === userId;
}

function isCurrentUserModerator() {
    const currentUser = JSON.parse(localStorage.getItem('photoapp_user') || '{}');
    const isModerator = currentUser && currentUser.isModerator;
    console.log('isCurrentUserModerator: проверка для пользователя:', currentUser, 'результат:', isModerator);
    return isModerator;
}

function showError(message) {
    // Можно реализовать показ ошибки через всплывающее уведомление
    console.error(message);
    showMessage(message, 'error');
}

// Вспомогательная функция для обработки ответов fetch
async function handleFetchResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'Произошла ошибка при выполнении запроса');
    }
    
    return data;
}

// Получение заголовков авторизации
function getAuthHeaders() {
    const token = localStorage.getItem('photoapp_token');
    return token ? {
        'Authorization': `Bearer ${token}`
    } : {};
}

// Отображение фотографий в стиле избранного
function renderAlbumPhotos(photos) {
    const container = document.getElementById('albumPhotosContainer');
    
    // Показываем сообщение, если фотографий нет
    if (!photos || photos.length === 0) {
        document.getElementById('noPhotosMessage').style.display = 'block';
        document.getElementById('loadingPhotos').style.display = 'none';
        return;
    }

    // Скрываем сообщение и индикатор загрузки
    document.getElementById('noPhotosMessage').style.display = 'none';
    document.getElementById('loadingPhotos').style.display = 'none';

    // Очищаем контейнер
    container.innerHTML = '';

    // Получаем информацию о текущем пользователе
    const currentUser = JSON.parse(localStorage.getItem('photoapp_user') || '{}');
    const isModerator = isCurrentUserModerator();

    // Отображаем каждую фотографию
    photos.forEach(photo => {
        const isOwnPhoto = currentUser && photo.user && currentUser.id === photo.user.id;
        const showOptions = isOwnPhoto || isModerator;
        
        const col = document.createElement('div');
        col.className = 'col-md-4 col-sm-6';

        col.innerHTML = `
            <div class="photo-card" data-photo-id="${photo.id}">
                <img src="/api/photos/image/${photo.id}" alt="${photo.title || 'Фото'}">
                
                <div class="photo-overlay">
                    <div class="action-buttons">
                        <button class="action-btn favorite ${photo.isFavorite ? 'active' : ''}" data-photo-id="${photo.id}" title="${photo.isFavorite ? 'Удалить из избранного' : 'Добавить в избранное'}">
                            <i class="${photo.isFavorite ? 'fas' : 'far'} fa-heart"></i>
                        </button>
                        <button class="action-btn share" data-photo-id="${photo.id}" title="Поделиться">
                            <i class="fas fa-share-alt"></i>
                        </button>
                        <button class="action-btn search" data-photo-id="${photo.id}" title="Найти похожие">
                            <i class="fas fa-search"></i>
                        </button>
                        ${isOwnPhoto ? `
                        <button class="action-btn cover" data-photo-id="${photo.id}" title="Сделать обложкой альбома">
                            <i class="fas fa-image"></i>
                        </button>` : ''}
                        ${showOptions ? `
                        <button class="action-btn options" data-photo-id="${photo.id}" title="Действия">
                            <i class="fas fa-ellipsis-v"></i>
                        </button>` : ''}
                    </div>
                </div>
                
                <div class="photo-info">
                    <h5 class="photo-title">${photo.title || 'Без названия'}</h5>
                    <div class="photo-meta">
                        <div class="rating">
                            <span class="stars">${renderStars(photo.rating || 0)}</span>
                        </div>
                        <div class="photo-author">
                            <a href="/profile/${photo.user?.id || 0}" class="author-link" data-author-id="${photo.user?.id || 0}" onclick="event.stopPropagation();">${photo.user?.username || 'Неизвестный автор'}</a>
                        </div>
                    </div>
                </div>
                ${showOptions ? `
                <div class="photo-options-menu" style="display: none;">
                    ${isOwnPhoto ? `<div class="option-item edit-photo" data-photo-id="${photo.id}"><i class="fas fa-edit"></i> Редактировать</div>` : ''}
                    <div class="option-item delete-photo" data-photo-id="${photo.id}"><i class="fas fa-trash"></i> ${isModerator && !isOwnPhoto ? 'Удалить (модератор)' : 'Удалить'}</div>
                </div>` : ''}
            </div>
        `;

        container.appendChild(col);
        setupPhotoCardEvents(col, photo);
    });
}

// Настройка обработчиков событий для карточек фотографий
function setupPhotoCardEvents(cardElement, photo) {
    // Клик по карточке открывает модальное окно
    const photoCard = cardElement.querySelector('.photo-card');
    photoCard.addEventListener('click', function(e) {
        // Если клик был не по кнопке действия и не по меню опций
        if (!e.target.closest('.action-btn') && !e.target.closest('.option-item') && !e.target.closest('.photo-options-menu')) {
            openPhotoModal(photo.id);
        }
    });
    
    // Кнопка "Избранное"
    const favoriteBtn = cardElement.querySelector('.action-btn.favorite');
    favoriteBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        toggleFavorite(photo.id, favoriteBtn);
    });
    
    // Кнопка "Поделиться"
    const shareBtn = cardElement.querySelector('.action-btn.share');
    shareBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        sharePhoto(photo.id);
    });
    
    // Кнопка "Найти похожие"
    const searchBtn = cardElement.querySelector('.action-btn.search');
    searchBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        findSimilarPhotos(photo.id);
    });
    
    // Кнопка "Сделать обложкой альбома", если она существует
    const coverBtn = cardElement.querySelector('.action-btn.cover');
    if (coverBtn) {
        coverBtn.addEventListener('click', function(e) {
            e.stopPropagation();
            setAlbumCover(photo.id);
        });
    }
    
    // Кнопка "Опции" (три точки), если она существует
    const optionsBtn = cardElement.querySelector('.action-btn.options');
    if (optionsBtn) {
        optionsBtn.addEventListener('click', function(e) {
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
        editPhotoItem.addEventListener('click', function(e) {
            e.stopPropagation();
            window.location.href = `/edit-photo.html?id=${photo.id}`;
        });
    }
    
    const deletePhotoItem = cardElement.querySelector('.option-item.delete-photo');
    if (deletePhotoItem) {
        deletePhotoItem.addEventListener('click', function(e) {
            e.stopPropagation();
            if (confirm('Вы действительно хотите удалить эту фотографию?')) {
                deletePhoto(photo.id);
            }
        });
    }
}

// Устанавливает фотографию в качестве обложки альбома
function setAlbumCover(photoId) {
    const albumId = getCurrentAlbumId();
    
    if (!albumId) {
        console.error('ID альбома не найден');
        showError('Не удалось определить альбом');
        return;
    }
    
    fetch(`/api/albums/${albumId}/cover`, {
        method: 'PUT',
        headers: {
            ...getAuthHeaders(),
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ photoId })
    })
    .then(response => handleFetchResponse(response))
    .then(data => {
        showSuccess('Обложка альбома успешно обновлена');
        
        // Обновляем изображение обложки в интерфейсе, если нужно
        if (window.location.pathname.includes('/albums.html')) {
            // Если мы на странице списка альбомов, перезагружаем список
            loadUserAlbums();
        }
    })
    .catch(error => {
        console.error('Ошибка при установке обложки альбома:', error);
        showError('Не удалось установить обложку альбома');
    });
}

// Получение текущего ID альбома из URL
function getCurrentAlbumId() {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get('id');
}

// Вспомогательная функция для отображения рейтинга звездами
function renderStars(rating) {
    const fullStar = '★';
    const emptyStar = '☆';
    const stars = Math.round(rating);
    return fullStar.repeat(stars) + emptyStar.repeat(5 - stars);
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
            buttonElement.title = 'Удалить из избранного';
            showMessage('Фото добавлено в избранное', 'success');
        } else if (isFavoritesPage) {
            // Удаляем только если мы на странице избранного
            buttonElement.innerHTML = '<i class="far fa-heart"></i>';
            buttonElement.classList.remove('active');
            buttonElement.title = 'Добавить в избранное';
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
        showError('Не удалось изменить статус избранного');
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

// Вспомогательная функция для отображения сообщения об успехе
function showSuccess(message) {
    const alert = document.getElementById('albumAlert');
    alert.className = 'alert alert-success';
    alert.textContent = message;
    alert.style.display = 'block';
    
    // Скрываем сообщение через 3 секунды
    setTimeout(() => {
        alert.style.display = 'none';
    }, 3000);
}

// Обработчик обновления рейтинга фото
function handleRatingUpdate(photoId, data) {
    // Находим карточку фото на странице и обновляем отображение рейтинга
    const photoCard = document.querySelector(`.photo-card[data-photo-id="${photoId}"]`);
    if (photoCard) {
        const ratingDisplay = photoCard.querySelector('.rating');
        if (ratingDisplay) {
            ratingDisplay.innerHTML = `
                <span class="stars">${renderStars(data.newRating || 0)}</span>
            `;
        }
    }
}

// Настройка обработчиков для кнопок редактирования и удаления
function setupPhotoModalActions() {
    // Кнопка редактирования фото
    document.getElementById('editPhotoBtn').onclick = function() {
        const photoId = this.getAttribute('data-photo-id');
        openEditPhotoModal(photoId);
    };
    
    // Кнопка удаления фото
    document.getElementById('deletePhotoBtn').onclick = function() {
        const photoId = this.getAttribute('data-photo-id');
        openDeletePhotoModal(photoId);
    };
    
    // Кнопка установки обложки альбома
    document.getElementById('setAlbumCoverBtn').onclick = function() {
        const photoId = this.getAttribute('data-photo-id');
        setAlbumCover(photoId);
    };
    
    // Кнопка удаления для модератора
    const moderatorDeleteBtn = document.getElementById('moderatorDeletePhotoBtn');
    if (moderatorDeleteBtn) {
        moderatorDeleteBtn.onclick = function() {
            const photoId = this.getAttribute('data-photo-id');
            deletePhotoAsModerator(photoId);
        };
    }
}

// Открытие модального окна редактирования фото
async function openEditPhotoModal(photoId) {
    try {
        const response = await fetch(`/api/photos/${photoId}/info`, {
            headers: getAuthHeaders()
        });
        
        const photo = await handleFetchResponse(response);
        
        // Заполняем форму данными фотографии
        document.getElementById('editPhotoId').value = photo.id;
        document.getElementById('editPhotoTitle').value = photo.title || '';
        document.getElementById('editPhotoDescription').value = photo.description || '';
        
        // Заполняем поле тегов, если они есть
        if (photo.tags && Array.isArray(photo.tags)) {
            document.getElementById('editPhotoTags').value = photo.tags.join(', ');
        } else {
            document.getElementById('editPhotoTags').value = '';
        }
        
        // Закрываем модальное окно с фото и открываем окно редактирования
        bootstrap.Modal.getInstance(document.getElementById('photoModal')).hide();
        const editModal = new bootstrap.Modal(document.getElementById('editPhotoModal'));
        editModal.show();
    } catch (error) {
        console.error('Ошибка при загрузке данных фотографии:', error);
        showError('Не удалось загрузить данные фотографии для редактирования');
    }
}

// Сохранение изменений в фотографии
async function savePhotoChanges() {
    const photoId = document.getElementById('editPhotoId').value;
    const title = document.getElementById('editPhotoTitle').value.trim();
    const description = document.getElementById('editPhotoDescription').value.trim();
    const tagsInput = document.getElementById('editPhotoTags').value;
    
    // Преобразуем строку с тегами в массив
    let tags = [];
    if (tagsInput && tagsInput.trim()) {
        tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    }
    
    const photoData = {
        title: title,
        description: description,
        tags: tags
    };
    
    try {
        const response = await fetch(`/api/photos/${photoId}`, {
            method: 'PUT',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(photoData)
        });
        
        await handleFetchResponse(response);
        
        // Закрываем модальное окно редактирования
        bootstrap.Modal.getInstance(document.getElementById('editPhotoModal')).hide();
        
        // Перезагружаем страницу альбома, чтобы обновить информацию
        // Можно оптимизировать, перезагружая только нужные данные
        window.location.reload();
    } catch (error) {
        console.error('Ошибка при сохранении изменений:', error);
        document.getElementById('editPhotoAlert').textContent = 'Не удалось сохранить изменения';
        document.getElementById('editPhotoAlert').style.display = 'block';
    }
}

// Открытие модального окна подтверждения удаления фото
function openDeletePhotoModal(photoId) {
    document.getElementById('confirmDeletePhotoBtn').dataset.photoId = photoId;
    
    // Закрываем модальное окно с фото и открываем окно подтверждения удаления
    bootstrap.Modal.getInstance(document.getElementById('photoModal')).hide();
    const deleteModal = new bootstrap.Modal(document.getElementById('deletePhotoModal'));
    deleteModal.show();
}

// Удаление фотографии модератором
async function deletePhotoAsModerator(photoId) {
    if (!confirm('Вы уверены, что хотите удалить эту фотографию как модератор? Это действие нельзя отменить.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/photos/${photoId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        await handleFetchResponse(response);
        
        // Закрываем модальное окно
        const photoModal = document.getElementById('photoModal');
        bootstrap.Modal.getInstance(photoModal).hide();
        
        // Перезагружаем фотографии альбома
        window.location.reload();
        
        // Показываем сообщение об успехе
        showSuccess('Фотография успешно удалена модератором');
    } catch (error) {
        console.error('Ошибка при удалении фотографии:', error);
        showError('Не удалось удалить фотографию');
    }
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