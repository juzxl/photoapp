// Глобальные переменные
let currentPage = 1;
let totalPages = 1;
let currentSort = 'newest';
let searchText = '';
let searchUser = '';

// Инициализация при загрузке страницы
$(document).ready(function() {
    console.log('Страница модерации комментариев загружена');
    
    // Проверяем права пользователя
    checkUserPermissions();
    
    // Загружаем комментарии
    loadComments();
    
    // Настраиваем обработчики событий
    setupEventListeners();
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
        if (typeof setupInterfaceByRole === 'function') {
            setupInterfaceByRole(isAdmin, isModerator);
        } else {
            // Запасной вариант, если функция не определена
            if (isAdmin) {
                $('.admin-only').show();
                $('.sidebar-admin-links').show();
            } else {
                $('.admin-only').hide();
                $('.sidebar-admin-links').hide();
            }
        }
        
    } catch (error) {
        console.error('Ошибка при проверке прав пользователя:', error);
        console.error('Ошибка аутентификации');
        window.location.href = '/login.html';
    }
}

// Настройка обработчиков событий
function setupEventListeners() {
    // Кнопка обновления списка комментариев
    $('#refreshCommentsBtn').on('click', function() {
        loadComments();
    });
    
    // Фильтр сортировки
    $('.dropdown-item[data-sort]').on('click', function(e) {
        e.preventDefault();
        
        // Обновляем активный фильтр
        $('.dropdown-item').removeClass('active');
        $(this).addClass('active');
        
        // Устанавливаем новый фильтр и загружаем комментарии
        currentSort = $(this).data('sort');
        currentPage = 1;
        loadComments();
    });
    
    // Поиск по содержимому комментария
    $('#commentSearchBtn').on('click', function() {
        searchText = $('#commentSearchInput').val();
        currentPage = 1;
        loadComments();
    });
    
    // Поиск по имени пользователя
    $('#userSearchBtn').on('click', function() {
        searchUser = $('#userSearchInput').val();
        currentPage = 1;
        loadComments();
    });
}

// Загрузка комментариев
function loadComments() {
    $.ajax({
        url: `/api/admin/comments`,
        type: 'GET',
        data: {
            page: currentPage - 1, // API использует 0-индексацию
            size: 20,
            sort: currentSort,
            text: searchText,
            user: searchUser
        },
        headers: {
            'Authorization': `Bearer ${localStorage.getItem('photoapp_token')}`
        },
        success: function(response) {
            renderComments(response.content || []);
            totalPages = response.totalPages || 1;
            renderPagination();
        },
        error: function(xhr) {
            console.error('Ошибка при загрузке комментариев:', xhr.responseText);
            $('#commentsTable').html(`
                <div class="alert alert-danger">
                    Ошибка при загрузке комментариев. Пожалуйста, попробуйте позже.
                </div>
            `);
        }
    });
}

// Отрисовка комментариев
function renderComments(comments) {
    const container = $('#commentsTable');
    
    if (!comments || comments.length === 0) {
        container.html(`
            <div class="alert alert-info">
                <i class="fas fa-info-circle me-2"></i>
                Комментарии не найдены
            </div>
        `);
        return;
    }
    
    let html = `
        <table class="table table-hover">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>Пользователь</th>
                    <th>Комментарий</th>
                    <th>Дата</th>
                    <th>Фото</th>
                    <th>Действия</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    comments.forEach(comment => {
        html += `
            <tr data-comment-id="${comment.id}">
                <td>${comment.id}</td>
                <td>
                    <a href="/profile/${comment.user.id}" target="_blank">
                        ${comment.user.username}
                    </a>
                </td>
                <td class="comment-content">${comment.content}</td>
                <td>${formatDate(comment.createdAt)}</td>
                <td>
                    <a href="#" class="view-photo-link" data-photo-id="${comment.photoId}">
                        <i class="fas fa-image"></i> Просмотр
                    </a>
                </td>
                <td>
                    <button class="btn btn-sm btn-outline-danger delete-comment-btn" title="Удалить комментарий">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.html(html);
    
    // Добавляем обработчики событий
    $('.delete-comment-btn').on('click', function() {
        const commentId = $(this).closest('tr').data('comment-id');
        if (confirm('Вы действительно хотите удалить этот комментарий?')) {
            deleteComment(commentId);
        }
    });
    
    $('.view-photo-link').on('click', function(e) {
        e.preventDefault();
        const photoId = $(this).data('photo-id');
        window.open(`/photo/${photoId}`, '_blank');
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
            // Удаляем комментарий из таблицы
            $(`tr[data-comment-id="${commentId}"]`).fadeOut(300, function() {
                $(this).remove();
                
                // Если комментариев больше нет, показываем сообщение
                if ($('#commentsTable tbody tr').length === 0) {
                    $('#commentsTable').html(`
                        <div class="alert alert-info">
                            <i class="fas fa-info-circle me-2"></i>
                            Комментарии не найдены
                        </div>
                    `);
                }
            });
        },
        error: function(xhr) {
            console.error('Ошибка при удалении комментария:', xhr.responseText);
            alert('Не удалось удалить комментарий');
        }
    });
}

// Отрисовка пагинации
function renderPagination() {
    const pagination = $('#commentsPagination');
    
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
    const maxVisiblePages = 5;
    const halfRange = Math.floor(maxVisiblePages / 2);
    
    let startPage = Math.max(1, currentPage - halfRange);
    let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
    
    if (endPage - startPage < maxVisiblePages - 1) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
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
            loadComments();
            
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