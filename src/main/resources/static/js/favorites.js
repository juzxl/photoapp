// Глобальные переменные
let currentPage = 1;
let totalPages = 1;
let currentSort = 'createdAt';
let currentDirection = 'desc';
let isGridView = true;

// Инициализация при загрузке страницы
$(document).ready(function() {
    console.log("Favorites.js loaded");
    
    // Проверяем авторизацию
    updateAuthUI();
    
    // Защищаем страницу от неавторизованных пользователей
    // checkProtectedPage - комментируем, теперь это в api.js с учетом SECURITY_DISABLED
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Загружаем избранное
    loadFavorites();
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Переключение вида (сетка/список)
    $('#gridViewBtn').on('click', function() {
        if (!isGridView) {
            isGridView = true;
            $('#gridViewBtn').addClass('active');
            $('#listViewBtn').removeClass('active');
            loadFavorites();
        }
    });
    
    $('#listViewBtn').on('click', function() {
        if (isGridView) {
            isGridView = false;
            $('#listViewBtn').addClass('active');
            $('#gridViewBtn').removeClass('active');
            loadFavorites();
        }
    });
    
    // Фильтрация по дате
    $('#dateFilter').on('change', function() {
        // В зависимости от выбранной опции устанавливаем фильтр
        const selectedOption = $(this).val();
        currentPage = 1;
        loadFavorites();
    });
    
    // Сортировка
    $('#sortFilter').on('change', function() {
        const sortOption = $(this).val();
        currentPage = 1;
        
        // Определяем параметры сортировки
        switch (sortOption) {
            case 'newest':
                currentSort = 'createdAt';
                currentDirection = 'desc';
                break;
            case 'oldest':
                currentSort = 'createdAt';
                currentDirection = 'asc';
                break;
            case 'rating':
                currentSort = 'photo.rating';
                currentDirection = 'desc';
                break;
        }
        
        loadFavorites();
    });
    
    // Выход из системы
    $('#logoutBtn').on('click', function(e) {
        e.preventDefault();
        logout();
    });
    
    // Форма отправки комментария
    $('#commentForm').on('submit', function(e) {
        e.preventDefault();
        const photoId = $('#photoModal').data('photo-id');
        const content = $('#commentText').val().trim();
        
        if (content) {
            submitComment(photoId, content);
        }
    });
}

// Загрузка избранных фотографий
function loadFavorites() {
    // Показываем индикатор загрузки
    $('#favoritesGallery').html('<div class="col-12 text-center my-5"><div class="spinner-border" role="status"></div></div>');
    
    // Формируем URL запроса с параметрами
    const url = `/api/favorites?page=${currentPage - 1}&size=12&sort=${currentSort}&direction=${currentDirection}`;
    
    $.ajax({
        url: url,
        type: 'GET',
        headers: getAuthHeader(),
        success: function(response) {
            // Рендерим фотографии
            renderFavorites(response.content);
            
            // Обновляем пагинацию
            totalPages = response.totalPages;
            renderPagination();
        },
        error: function(xhr, status, error) {
            console.error('Ошибка при загрузке избранного:', error);
            $('#favoritesGallery').html(`
                <div class="col-12 text-center my-5">
                    <div class="alert alert-danger">
                        Произошла ошибка при загрузке избранных фотографий.
                        <button class="btn btn-link" onclick="loadFavorites()">Попробовать снова</button>
                    </div>
                </div>
            `);
        }
    });
}

// Отрисовка избранных фотографий
function renderFavorites(favorites) {
    const gallery = $('#favoritesGallery');
    
    // Если список пуст
    if (!favorites || favorites.length === 0) {
        gallery.html(`
            <div class="col-12 text-center my-5">
                <div class="empty-state">
                    <i class="fas fa-heart" style="font-size: 4rem; color: #ccc;"></i>
                    <h4 class="mt-3">У вас еще нет избранных фото</h4>
                    <p class="text-muted">Добавляйте фотографии в избранное, чтобы быстро находить их позже</p>
                    <a href="/gallery" class="btn btn-primary mt-3">
                        <i class="fas fa-images"></i> Перейти в галерею
                    </a>
                </div>
            </div>
        `);
        return;
    }
    
    // Очищаем галерею
    gallery.empty();
    
    // Отрисовываем фотографии в зависимости от выбранного вида
    if (isGridView) {
        // Сетка с использованием единого шаблона карточек
        favorites.forEach(function(favorite) {
            const photo = favorite.photo;
            
            // Используем функцию создания карточки из main.js
            const photoCard = createPhotoCard(photo);
            gallery.append(photoCard);
            
            // Устанавливаем обработчики событий
            setupFavoriteCardEvents($(photoCard), photo, favorite.createdAt);
        });
    } else {
        // Список
        const table = $(`
            <div class="col-12">
                <div class="table-responsive">
                    <table class="table table-hover">
                        <thead>
                            <tr>
                                <th style="width: 80px">Превью</th>
                                <th>Название</th>
                                <th>Дата добавления</th>
                                <th>Рейтинг</th>
                                <th>Действия</th>
                            </tr>
                        </thead>
                        <tbody id="favoritesTableBody">
                        </tbody>
                    </table>
                </div>
            </div>
        `);
        
        gallery.append(table);
        
        const tableBody = $('#favoritesTableBody');
        
        favorites.forEach(function(favorite) {
            const photo = favorite.photo;
            const row = $(`
                <tr>
                    <td>
                        <img src="/api/photos/image/${photo.id}" class="img-thumbnail" style="width: 60px; height: 60px; object-fit: cover;" alt="${photo.title || 'Фото'}">
                    </td>
                    <td>${photo.title || 'Без названия'}</td>
                    <td>${formatDate(favorite.createdAt)}</td>
                    <td><i class="fas fa-star"></i> ${photo.rating ? photo.rating.toFixed(1) : '0.0'}</td>
                    <td>
                        <div class="d-flex gap-2">
                            <button class="modal-action-btn view-photo" data-photo-id="${photo.id}" title="Просмотреть">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="modal-action-btn favorite active remove-favorite" data-photo-id="${photo.id}" title="Удалить из избранного">
                                <i class="fas fa-heart"></i>
                            </button>
                            <button class="modal-action-btn share share-photo" data-photo-id="${photo.id}" title="Поделиться">
                                <i class="fas fa-share-alt"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `);
            
            tableBody.append(row);
        });
        
        // Добавляем обработчики событий для кнопок в табличном виде
        $('.view-photo').on('click', function() {
            const photoId = $(this).data('photo-id');
            openPhotoModal(photoId);
        });
        
        $('.remove-favorite').on('click', function() {
            const photoId = $(this).data('photo-id');
            removeFavorite(photoId);
        });
        
        $('.share-photo').on('click', function() {
            const photoId = $(this).data('photo-id');
            sharePhoto(photoId);
        });
    }
}

// Установка обработчиков событий для карточки в избранном
function setupFavoriteCardEvents(cardElement, photo, createdAt) {
    const photoId = photo.id;
    
    // Элементы карточки
    const photoCard = cardElement.find('.photo-card');
    const favoriteBtn = cardElement.find('.action-btn.favorite');
    const shareBtn = cardElement.find('.action-btn.share');
    const searchBtn = cardElement.find('.action-btn.search');
    
    // Клик по карточке открывает модальное окно
    photoCard.on('click', function(e) {
        // Если клик был не по кнопке действия
        if (!$(e.target).closest('.action-btn').length) {
            openPhotoModal(photoId);
        }
    });
    
    // Кнопка "Избранное" (всегда активна на странице избранного)
    favoriteBtn.html('<i class="fas fa-heart"></i>');
    favoriteBtn.addClass('active');
    favoriteBtn.on('click', function(e) {
        e.stopPropagation();
        removeFavorite(photoId);
    });
    
    // Кнопка "Поделиться"
    shareBtn.on('click', function(e) {
        e.stopPropagation();
        sharePhoto(photoId);
    });
    
    // Кнопка "Найти похожие"
    searchBtn.on('click', function(e) {
        e.stopPropagation();
        findSimilarPhotos(photoId);
    });
    
    // Добавляем дату добавления в избранное
    const photoInfo = cardElement.find('.photo-info');
    photoInfo.append(`
        <div class="favorite-date mt-2">
            <small class="text-muted">Добавлено: ${formatDate(createdAt)}</small>
        </div>
    `);
}

// Удаление из избранного
function removeFavorite(photoId) {
    if (confirm('Вы уверены, что хотите удалить фотографию из избранного?')) {
        $.ajax({
            url: `/api/favorites/${photoId}`,
            type: 'POST',
            headers: getAuthHeader(),
            success: function(response) {
                // Обновляем список избранного
                loadFavorites();
            },
            error: function(xhr) {
                console.error('Ошибка при удалении фото из избранного:', xhr);
                showMessage('Не удалось удалить фотографию из избранного.', 'error');
            }
        });
    }
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
    const pagination = $('#pagination');
    pagination.empty();
    
    // Если нет страниц, не отображаем пагинацию
    if (totalPages <= 1) {
        return;
    }
    
    // Кнопка "Предыдущая"
    const prevBtn = $(`
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" aria-label="Previous">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `);
    
    prevBtn.on('click', function(e) {
        e.preventDefault();
        if (currentPage > 1) {
            currentPage--;
            loadFavorites();
        }
    });
    
    pagination.append(prevBtn);
    
    // Кнопки страниц
    const maxVisiblePages = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    // Корректируем начальную страницу, если конечная страница упирается в максимум
    if (endPage === totalPages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = $(`
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#">${i}</a>
            </li>
        `);
        
        pageBtn.on('click', function(e) {
            e.preventDefault();
            currentPage = i;
            loadFavorites();
        });
        
        pagination.append(pageBtn);
    }
    
    // Кнопка "Следующая"
    const nextBtn = $(`
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" aria-label="Next">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `);
    
    nextBtn.on('click', function(e) {
        e.preventDefault();
        if (currentPage < totalPages) {
            currentPage++;
            loadFavorites();
        }
    });
    
    pagination.append(nextBtn);
}

// Открытие модального окна с фотографией
function openPhotoModal(photoId) {
    console.log('favorites.js: Вызов универсальной функции модального окна из main.js');
    
    // Используем общую функцию из main.js
    if (typeof window.mainOpenPhotoModal === 'function') {
        window.mainOpenPhotoModal(photoId);
    } else {
        console.error('Функция mainOpenPhotoModal не найдена, проверьте порядок загрузки скриптов');
        showMessage('Не удалось открыть фото. Попробуйте обновить страницу.', 'error');
    }
}

// Загрузка комментариев к фотографии
function loadComments(photoId) {
    $.ajax({
        url: `/api/comments/photo/${photoId}`,
        type: 'GET',
        headers: getAuthHeader(),
        success: function(comments) {
            const commentsList = $('#commentsList');
            commentsList.empty();
            
            if (!comments || comments.length === 0) {
                commentsList.html(`
                    <div class="empty-comments">
                        <i class="fas fa-comments text-muted mb-2" style="font-size: 2rem;"></i>
                        <p>Пока нет комментариев. Будьте первым!</p>
                    </div>
                `);
                return;
            }
            
            // Получаем текущего пользователя из токена
            const token = localStorage.getItem('photoapp_token');
            let currentUser = null;
            
            if (token && token.includes('.') && token.split('.').length === 3) {
                try {
                    // Это похоже на JWT - пробуем декодировать
                    currentUser = JSON.parse(atob(token.split('.')[1])).id;
                } catch (e) {
                    console.log('Ошибка декодирования токена, возможно это dev_token');
                    // Для dev_token устанавливаем ID пользователя вручную
                    currentUser = 7; // ID для DEV_USER в режиме разработки
                }
            } else if (token === 'dev_token_for_testing') {
                // Для режима разработки устанавливаем фиксированный ID пользователя
                currentUser = 7;
            }
            
            comments.forEach(function(comment) {
                const isOwnComment = currentUser && currentUser === comment.user.id;
                const commentItem = $(`
                    <div class="comment ${isOwnComment ? 'own-comment' : ''}">
                        <div class="comment-header">
                            <span class="comment-author">${comment.user.username}</span>
                            <span class="comment-date">${formatDate(comment.createdAt)}</span>
                        </div>
                        <div class="comment-content">${comment.content}</div>
                        ${isOwnComment ? `
                            <div class="comment-actions mt-1 text-end">
                                <button class="btn btn-sm text-danger p-0 delete-comment" data-comment-id="${comment.id}">
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        ` : ''}
                    </div>
                `);
                
                commentsList.append(commentItem);
            });
            
            // Добавляем обработчик для кнопок удаления комментариев
            $('.delete-comment').on('click', function() {
                const commentId = $(this).data('comment-id');
                deleteComment(commentId, photoId);
            });
        },
        error: function(xhr, status, error) {
            console.error('Ошибка при загрузке комментариев:', error);
            $('#commentsList').html(`
                <div class="alert alert-danger">
                    Не удалось загрузить комментарии
                </div>
            `);
        }
    });
}

// Удаление комментария
function deleteComment(commentId, photoId) {
    if (confirm('Вы действительно хотите удалить этот комментарий?')) {
        $.ajax({
            url: `/api/comments/${commentId}`,
            type: 'DELETE',
            headers: getAuthHeader(),
            success: function() {
                // Перезагружаем комментарии
                loadComments(photoId);
            },
            error: function(xhr, status, error) {
                console.error('Ошибка при удалении комментария:', error);
                showMessage('Не удалось удалить комментарий', 'error');
            }
        });
    }
}

// Переключение статуса избранного
function toggleFavorite(photoId) {
    $.ajax({
        url: `/api/favorites/${photoId}`,
        type: 'POST',
        headers: getAuthHeader(),
        success: function(response) {
            const favoriteBtn = $('#toggleFavorite');
            
            if (response.status === 'added') {
                favoriteBtn.html('<i class="fas fa-heart"></i>');
                favoriteBtn.removeClass('btn-outline-danger').addClass('btn-danger');
            } else {
                favoriteBtn.html('<i class="far fa-heart"></i>');
                favoriteBtn.removeClass('btn-danger').addClass('btn-outline-danger');
                
                // Если мы на странице избранного, обновляем список
                loadFavorites();
            }
        },
        error: function(xhr, status, error) {
            console.error('Ошибка при изменении статуса избранного:', error);
            showMessage('Не удалось изменить статус избранного.', 'error');
        }
    });
}

// Отправка комментария
function submitComment(photoId, content) {
    const textarea = $('#commentText');
    const submitBtn = $('#commentForm button[type="submit"]');
    const originalText = submitBtn.html();
    
    // Блокируем форму на время отправки
    textarea.prop('disabled', true);
    submitBtn.html('<i class="fas fa-spinner fa-spin"></i> Отправка...');
    submitBtn.prop('disabled', true);
    
    $.ajax({
        url: `/api/comments/photo/${photoId}`,
        type: 'POST',
        headers: {
            ...getAuthHeader(),
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({ content }),
        success: function() {
            // Очищаем поле ввода
            textarea.val('');
            
            // Перезагружаем комментарии
            loadComments(photoId);
        },
        error: function(xhr, status, error) {
            console.error('Ошибка при отправке комментария:', error);
            
            // Показываем сообщение об ошибке
            const errorMessage = $('<div class="alert alert-danger alert-dismissible fade show mt-2" role="alert">')
                .text('Не удалось отправить комментарий. Попробуйте позже.')
                .append('<button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>');
            
            $('#commentForm').append(errorMessage);
            
            // Показываем модальное окно с ошибкой вместо алерта
            showMessage('Не удалось отправить комментарий. Попробуйте позже.', 'error');
            
            // Автоматически скрываем сообщение через 5 секунд
            setTimeout(() => {
                errorMessage.alert('close');
            }, 5000);
        },
        complete: function() {
            // В любом случае разблокируем форму
            textarea.prop('disabled', false);
            submitBtn.html(originalText);
            submitBtn.prop('disabled', false);
            textarea.focus();
        }
    });
}

// Форматирование даты
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
} 