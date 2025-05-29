// moderation.js - Функциональность модерации фотографий

// Глобальные переменные
let currentPage = 1;
let totalPages = 1;
let currentFilter = 'waiting'; // По умолчанию показываем фотографии на модерации

// Инициализация при загрузке страницы
$(document).ready(function() {
    console.log('Страница модерации загружена');
    
    // Загружаем фотографии для модерации
    loadModerationPhotos();
    
    // Настройка обработчиков событий
    setupEventListeners();
    
    // Проверяем права пользователя (должен быть админ или модератор)
    checkUserPermissions();
});

// Проверка прав пользователя
function checkUserPermissions() {
    const userStr = localStorage.getItem('photoapp_user');
    if (!userStr) {
        window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return;
    }
    
    try {
        const user = JSON.parse(userStr);
        const isAdmin = user.roles && user.roles.includes('ROLE_ADMIN');
        const isModerator = user.roles && user.roles.includes('ROLE_MODERATOR');
        
        if (!isAdmin && !isModerator) {
            console.error('У вас нет доступа к этой странице');
            window.location.href = '/';
            return;
        }
        
        // Настраиваем интерфейс в зависимости от роли
        setupInterfaceByRole(isAdmin, isModerator);
        
    } catch (error) {
        console.error('Ошибка при проверке прав пользователя:', error);
        console.error('Ошибка аутентификации');
        window.location.href = '/login.html';
    }
}

// Настройка интерфейса в зависимости от роли
function setupInterfaceByRole(isAdmin, isModerator) {
    // Общие элементы для обеих ролей
    $('.moderation-common').show();
    
    if (isAdmin) {
        // Элементы, доступные только администраторам
        $('.admin-only').show();
        $('.sidebar-admin-links').show();
    } else {
        $('.admin-only').hide();
        $('.sidebar-admin-links').hide();
    }
    
    if (isModerator) {
        // Элементы, доступные только модераторам
        $('.moderator-only').show();
    } else if (!isAdmin) {
        $('.moderator-only').hide();
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопка обновления списка фотографий
    $('#refreshModerationBtn').on('click', function() {
        loadModerationPhotos();
    });
    
    // Фильтр фотографий
    $('.dropdown-item[data-filter]').on('click', function(e) {
        e.preventDefault();
        
        // Обновляем активный фильтр
        $('.dropdown-item').removeClass('active');
        $(this).addClass('active');
        
        // Устанавливаем новый фильтр и загружаем фотографии
        currentFilter = $(this).data('filter');
        currentPage = 1;
        loadModerationPhotos();
    });
    
    // Кнопка "Одобрить" фотографию
    $('#approvePhotoBtn').on('click', function() {
        const photoId = $('#photoDetailModal').data('photo-id');
        const comment = $('#moderationComment').val();
        
        approvePhoto(photoId, comment);
    });
    
    // Кнопка "Отклонить" фотографию
    $('#rejectPhotoBtn').on('click', function() {
        const photoId = $('#photoDetailModal').data('photo-id');
        const comment = $('#moderationComment').val();
        
        if (!comment.trim()) {
            console.error('При отклонении фотографии необходимо указать причину');
            return;
        }
        
        rejectPhoto(photoId, comment);
    });
    
    // Кнопка "Удалить фото"
    $('#deletePhotoBtn').on('click', function() {
        if (confirm('Вы действительно хотите удалить эту фотографию? Это действие невозможно отменить.')) {
            const photoId = $('#photoDetailModal').data('photo-id');
            deletePhoto(photoId);
        }
    });
    
    // Кнопка "Редактировать описание"
    $('#editDescriptionBtn').on('click', function() {
        const photoId = $('#photoDetailModal').data('photo-id');
        openEditDescriptionModal(photoId);
    });
    
    // Кнопка "Сохранить описание"
    $('#saveDescriptionBtn').on('click', function() {
        const photoId = $('#photoDetailModal').data('photo-id');
        savePhotoDescription(photoId);
    });
    
    // Кнопка "Редактировать теги"
    $('#editTagsBtn').on('click', function() {
        const photoId = $('#photoDetailModal').data('photo-id');
        openEditTagsModal(photoId);
    });
    
    // Кнопка "Сохранить теги"
    $('#saveTagsBtn').on('click', function() {
        const photoId = $('#photoDetailModal').data('photo-id');
        savePhotoTags(photoId);
    });
    
    // Обработчик клика по популярным тегам
    $('#popularTagsList').on('click', '.popular-tag', function() {
        const tag = $(this).text();
        const currentTags = $('#photoTagsInput').val();
        
        if (currentTags) {
            const tagsArray = currentTags.split(',').map(tag => tag.trim());
            if (!tagsArray.includes(tag)) {
                tagsArray.push(tag);
                $('#photoTagsInput').val(tagsArray.join(', '));
            }
        } else {
            $('#photoTagsInput').val(tag);
        }
    });
}

// Загрузка фотографий для модерации
function loadModerationPhotos() {
    $.ajax({
        url: `/api/admin/photos/moderation`,
        type: 'GET',
        data: {
            page: currentPage - 1, // API использует 0-индексацию
            size: 12,
            status: currentFilter
        },
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('photoapp_token')}`
        },
        success: function(response) {
            renderModerationPhotos(response.content || []);
            totalPages = response.totalPages || 1;
            renderPagination();
        },
        error: function(xhr) {
            console.error('Ошибка при загрузке фотографий для модерации:', xhr.responseText);
            $('#moderationPhotos').html(`
                <div class="col-12">
                    <div class="alert alert-danger">
                        Ошибка при загрузке фотографий. Пожалуйста, попробуйте позже.
                    </div>
                </div>
            `);
        }
    });
}

// Отрисовка фотографий для модерации
function renderModerationPhotos(photos) {
    const container = $('#moderationPhotos');
    
    if (!photos || photos.length === 0) {
        container.html(`
            <div class="col-12 text-center my-5">
                <div class="empty-state">
                    <i class="fas fa-images" style="font-size: 4rem; color: #ccc;"></i>
                    <h4 class="mt-3">Нет фотографий для модерации</h4>
                    <p class="text-muted">В данный момент нет фотографий, требующих вашего внимания</p>
                </div>
            </div>
        `);
        return;
    }
    
    let html = '';
    
    photos.forEach(photo => {
        // Определяем статус и цвет бейджа
        let statusBadge = '';
        switch (photo.moderationStatus) {
            case 'WAITING':
                statusBadge = '<span class="badge bg-warning">На модерации</span>';
                break;
            case 'APPROVED':
                statusBadge = '<span class="badge bg-success">Одобрено</span>';
                break;
            case 'REJECTED':
                statusBadge = '<span class="badge bg-danger">Отклонено</span>';
                break;
            default:
                statusBadge = '<span class="badge bg-secondary">Неизвестно</span>';
        }
        
        html += `
            <div class="col-md-3 mb-4">
                <div class="card moderation-card" data-photo-id="${photo.id}">
                    <img src="/api/photos/image/${photo.id}" class="card-img-top" alt="${photo.title}">
                    <div class="card-body">
                        <h5 class="card-title">${photo.title || 'Без названия'}</h5>
                        <p class="card-text text-muted">
                            <small>Автор: ${photo.user ? photo.user.username : 'Неизвестен'}</small>
                        </p>
                        <div class="d-flex justify-content-between align-items-center">
                            ${statusBadge}
                            <button class="btn btn-sm btn-outline-primary view-details-btn">
                                <i class="fas fa-eye"></i> Детали
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    });
    
    container.html(html);
    
    // Добавляем обработчики для кнопок "Детали"
    $('.view-details-btn').on('click', function() {
        const photoId = $(this).closest('.moderation-card').data('photo-id');
        openPhotoDetails(photoId);
    });
}

// Открытие модального окна с деталями фотографии
function openPhotoDetails(photoId) {
    $.ajax({
        url: `/api/admin/photos/${photoId}`,
        type: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('photoapp_token')}`
        },
        success: function(photo) {
            // Заполняем данные в модальном окне
            $('#modalPhotoTitle').text(photo.title || 'Без названия');
            $('#modalPhotoImage').attr('src', `/api/photos/image/${photo.id}`);
            $('#modalPhotoAuthor').text(photo.user ? photo.user.username : 'Неизвестен');
            $('#modalPhotoDate').text(formatDate(photo.createdAt));
            $('#modalPhotoDescription').text(photo.description || 'Описание отсутствует');
            $('#modalPhotoRating').html(renderStars(photo.rating || 0));
            $('#modalPhotoRatingCount').text(`(${photo.ratingCount || 0})`);
            
            // Отображаем теги
            const tagsHtml = photo.tags ? photo.tags.map(tag => 
                `<span class="badge bg-light text-dark me-1">${tag.name}</span>`
            ).join('') : 'Нет тегов';
            $('#modalPhotoTags').html(tagsHtml);
            
            // Устанавливаем статус модерации
            let statusClass = 'bg-warning';
            let statusText = 'На модерации';
            
            switch (photo.moderationStatus) {
                case 'APPROVED':
                    statusClass = 'bg-success';
                    statusText = 'Одобрено';
                    break;
                case 'REJECTED':
                    statusClass = 'bg-danger';
                    statusText = 'Отклонено';
                    break;
            }
            
            $('#modalPhotoStatus').attr('class', `badge ${statusClass}`).text(statusText);
            
            // Комментарий модератора
            $('#moderationComment').val(photo.moderationComment || '');
            
            // Сохраняем ID фото в модальном окне
            $('#photoDetailModal').data('photo-id', photo.id);
            
            // Загружаем комментарии к фото
            loadPhotoComments(photo.id);
            
            // Показываем модальное окно
            const modal = new bootstrap.Modal(document.getElementById('photoDetailModal'));
            modal.show();
        },
        error: function(xhr) {
            console.error('Ошибка при загрузке деталей фотографии:', xhr.responseText);
            console.error('Не удалось загрузить детали фотографии');
        }
    });
}

// Одобрение фотографии
function approvePhoto(photoId, comment) {
    $.ajax({
        url: `/api/admin/photos/${photoId}/moderate`,
        type: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('photoapp_token')}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({
            status: 'APPROVED',
            comment: comment
        }),
        success: function() {
            // Закрываем модальное окно
            const modal = bootstrap.Modal.getInstance(document.getElementById('photoDetailModal'));
            modal.hide();
            
            // Обновляем список фотографий
            loadModerationPhotos();
            
            // Показываем уведомление
            console.error('Фотография успешно одобрена');
        },
        error: function(xhr) {
            console.error('Ошибка при одобрении фотографии:', xhr.responseText);
            console.error('Не удалось одобрить фотографию. Пожалуйста, попробуйте позже.');
        }
    });
}

// Отклонение фотографии
function rejectPhoto(photoId, comment) {
    $.ajax({
        url: `/api/admin/photos/${photoId}/moderate`,
        type: 'POST',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('photoapp_token')}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({
            status: 'REJECTED',
            comment: comment
        }),
        success: function() {
            // Закрываем модальное окно
            const modal = bootstrap.Modal.getInstance(document.getElementById('photoDetailModal'));
            modal.hide();
            
            // Обновляем список фотографий
            loadModerationPhotos();
            
            // Показываем уведомление
            console.error('Фотография отклонена');
        },
        error: function(xhr) {
            console.error('Ошибка при отклонении фотографии:', xhr.responseText);
            console.error('Не удалось отклонить фотографию. Пожалуйста, попробуйте позже.');
        }
    });
}

// Отрисовка пагинации
function renderPagination() {
    const pagination = $('#moderationPagination');
    
    if (totalPages <= 1) {
        pagination.empty();
        return;
    }
    
    let html = '';
    
    // Кнопка "Назад"
    if (currentPage > 1) {
        html += `
            <li class="page-item">
                <a class="page-link" href="#" data-page="${currentPage - 1}">
                    <i class="fas fa-chevron-left"></i>
                </a>
            </li>
        `;
    } else {
        html += `
            <li class="page-item disabled">
                <span class="page-link">
                    <i class="fas fa-chevron-left"></i>
                </span>
            </li>
        `;
    }
    
    // Номера страниц
    const maxPages = 5;
    const startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    const endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    // Если текущая страница близка к концу, сдвигаем начало
    const shift = Math.max(0, endPage - startPage - maxPages + 1);
    const newStartPage = Math.max(1, startPage - shift);
    
    // Первая страница (если не отображается в диапазоне)
    if (newStartPage > 1) {
        html += `
            <li class="page-item">
                <a class="page-link" href="#" data-page="1">1</a>
            </li>
        `;
        
        if (newStartPage > 2) {
            html += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>
            `;
        }
    }
    
    // Страницы в диапазоне
    for (let i = newStartPage; i <= endPage; i++) {
        if (i === currentPage) {
            html += `
                <li class="page-item active">
                    <span class="page-link">${i}</span>
                </li>
            `;
        } else {
            html += `
                <li class="page-item">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }
    }
    
    // Последняя страница (если не отображается в диапазоне)
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            html += `
                <li class="page-item disabled">
                    <span class="page-link">...</span>
                </li>
            `;
        }
        
        html += `
            <li class="page-item">
                <a class="page-link" href="#" data-page="${totalPages}">${totalPages}</a>
            </li>
        `;
    }
    
    // Кнопка "Вперед"
    if (currentPage < totalPages) {
        html += `
            <li class="page-item">
                <a class="page-link" href="#" data-page="${currentPage + 1}">
                    <i class="fas fa-chevron-right"></i>
                </a>
            </li>
        `;
    } else {
        html += `
            <li class="page-item disabled">
                <span class="page-link">
                    <i class="fas fa-chevron-right"></i>
                </span>
            </li>
        `;
    }
    
    pagination.html(html);
    
    // Добавляем обработчики для кнопок пагинации
    $('.page-link[data-page]').on('click', function(e) {
        e.preventDefault();
        const page = parseInt($(this).data('page'));
        if (page !== currentPage) {
            currentPage = page;
            loadModerationPhotos();
            
            // Прокручиваем страницу наверх
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    });
}

// Форматирование даты
function formatDate(dateString) {
    if (!dateString) return 'Неизвестно';
    
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Загрузка комментариев к фотографии
function loadPhotoComments(photoId) {
    $.ajax({
        url: `/api/comments/photo/${photoId}`,
        type: 'GET',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('photoapp_token')}`
        },
        success: function(comments) {
            renderPhotoComments(comments);
        },
        error: function(xhr) {
            console.error('Ошибка при загрузке комментариев:', xhr.responseText);
            $('#photoComments').html(`
                <div class="alert alert-danger">
                    Не удалось загрузить комментарии к фотографии
                </div>
            `);
        }
    });
}

// Отрисовка комментариев к фотографии
function renderPhotoComments(comments) {
    const container = $('#photoComments');
    
    if (!comments || comments.length === 0) {
        container.html(`
            <p class="text-muted">Нет комментариев</p>
        `);
        return;
    }
    
    let html = '';
    
    comments.forEach(comment => {
        html += `
            <div class="comment mb-3 p-3 bg-light rounded" data-comment-id="${comment.id}">
                <div class="d-flex justify-content-between mb-1">
                    <div>
                        <strong>${comment.user ? comment.user.username : 'Неизвестный пользователь'}</strong>
                        <small class="text-muted ms-2">${formatDate(comment.createdAt)}</small>
                    </div>
                    <div>
                        <button class="btn btn-sm btn-outline-danger delete-comment-btn" title="Удалить комментарий">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                </div>
                <div class="comment-content">
                    ${comment.content}
                </div>
            </div>
        `;
    });
    
    container.html(html);
    
    // Добавляем обработчики событий для удаления комментариев
    $('.delete-comment-btn').on('click', function() {
        const commentId = $(this).closest('.comment').data('comment-id');
        if (confirm('Вы действительно хотите удалить этот комментарий?')) {
            deleteComment(commentId);
        }
    });
}

// Удаление комментария
function deleteComment(commentId) {
    $.ajax({
        url: `/api/admin/comments/${commentId}`,
        type: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('photoapp_token')}`
        },
        success: function() {
            // Удаляем комментарий из DOM
            $(`.comment[data-comment-id="${commentId}"]`).fadeOut(300, function() {
                $(this).remove();
                
                // Если комментариев больше нет, показываем сообщение
                if ($('.comment').length === 0) {
                    $('#photoComments').html(`
                        <p class="text-muted">Нет комментариев</p>
                    `);
                }
            });
        },
        error: function(xhr) {
            console.error('Ошибка при удалении комментария:', xhr.responseText);
            console.error('Не удалось удалить комментарий');
        }
    });
}

// Открытие модального окна редактирования описания
function openEditDescriptionModal(photoId) {
    // Получаем текущие значения
    const title = $('#modalPhotoTitle').text();
    const description = $('#modalPhotoDescription').text();
    
    // Заполняем форму
    $('#photoTitle').val(title !== 'Без названия' ? title : '');
    $('#photoDescription').val(description !== 'Описание отсутствует' ? description : '');
    
    // Показываем модальное окно
    const modal = new bootstrap.Modal(document.getElementById('editDescriptionModal'));
    modal.show();
}

// Сохранение описания фотографии
function savePhotoDescription(photoId) {
    const title = $('#photoTitle').val();
    const description = $('#photoDescription').val();
    
    $.ajax({
        url: `/api/admin/photos/${photoId}/edit`,
        type: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('photoapp_token')}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify({
            title: title,
            description: description
        }),
        success: function() {
            // Обновляем данные в модальном окне
            $('#modalPhotoTitle').text(title || 'Без названия');
            $('#modalPhotoDescription').text(description || 'Описание отсутствует');
            
            // Закрываем модальное окно редактирования
            const modal = bootstrap.Modal.getInstance(document.getElementById('editDescriptionModal'));
            modal.hide();
            
            // Показываем сообщение об успешном сохранении
            console.error('Описание успешно обновлено');
        },
        error: function(xhr) {
            console.error('Ошибка при обновлении описания:', xhr.responseText);
            console.error('Не удалось обновить описание фотографии');
        }
    });
}

// Открытие модального окна редактирования тегов
function openEditTagsModal(photoId) {
    // Получаем текущие теги
    const tagElements = $('#modalPhotoTags .badge');
    const tags = [];
    
    tagElements.each(function() {
        tags.push($(this).text());
    });
    
    // Заполняем поле ввода
    $('#photoTagsInput').val(tags.join(', '));
    
    // Загружаем популярные теги
    loadPopularTags();
    
    // Показываем модальное окно
    const modal = new bootstrap.Modal(document.getElementById('editTagsModal'));
    modal.show();
}

// Загрузка популярных тегов
function loadPopularTags() {
    $.ajax({
        url: '/api/tags/popular',
        type: 'GET',
        success: function(tags) {
            const container = $('#popularTagsList');
            
            if (!tags || tags.length === 0) {
                container.html('<p class="text-muted">Нет популярных тегов</p>');
                return;
            }
            
            let html = '';
            tags.forEach(tag => {
                html += `<span class="badge bg-secondary me-1 mb-1 popular-tag">${tag.name}</span>`;
            });
            
            container.html(html);
        },
        error: function(xhr) {
            console.error('Ошибка при загрузке популярных тегов:', xhr.responseText);
            $('#popularTagsList').html('<p class="text-danger">Не удалось загрузить популярные теги</p>');
        }
    });
}

// Сохранение тегов фотографии
function savePhotoTags(photoId) {
    const tagsInput = $('#photoTagsInput').val();
    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0);
    
    $.ajax({
        url: `/api/admin/photos/${photoId}/tags`,
        type: 'PUT',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('photoapp_token')}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(tags),
        success: function() {
            // Обновляем теги в модальном окне
            const tagsHtml = tags.length > 0 ? 
                tags.map(tag => `<span class="badge bg-light text-dark me-1">${tag}</span>`).join('') : 
                'Нет тегов';
            $('#modalPhotoTags').html(tagsHtml);
            
            // Закрываем модальное окно редактирования
            const modal = bootstrap.Modal.getInstance(document.getElementById('editTagsModal'));
            modal.hide();
            
            // Показываем сообщение об успешном сохранении
            console.error('Теги успешно обновлены');
        },
        error: function(xhr) {
            console.error('Ошибка при обновлении тегов:', xhr.responseText);
            console.error('Не удалось обновить теги фотографии');
        }
    });
}

// Удаление фотографии
function deletePhoto(photoId) {
    $.ajax({
        url: `/api/admin/photos/${photoId}`,
        type: 'DELETE',
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('photoapp_token')}`
        },
        success: function() {
            // Закрываем модальное окно
            const modal = bootstrap.Modal.getInstance(document.getElementById('photoDetailModal'));
            modal.hide();
            
            // Обновляем список фотографий
            loadModerationPhotos();
            
            // Показываем сообщение об успешном удалении
            console.error('Фотография успешно удалена');
        },
        error: function(xhr) {
            console.error('Ошибка при удалении фотографии:', xhr.responseText);
            console.error('Не удалось удалить фотографию');
        }
    });
} 