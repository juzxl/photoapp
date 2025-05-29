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
    // Обновление списка комментариев
    $('#refreshCommentsBtn').on('click', function() {
        loadComments(currentPage);
    });
    
    // Фильтрация по сортировке
    $('#filterDropdown .dropdown-item').on('click', function(e) {
        e.preventDefault();
        $('#filterDropdown .dropdown-item').removeClass('active');
        $(this).addClass('active');
        
        currentSort = $(this).data('sort');
        loadComments(1);
    });
    
    // Поиск по тексту комментария
    $('#commentSearchBtn').on('click', function() {
        searchText = $('#commentSearchInput').val().trim();
        loadComments(1);
    });
    
    // Поиск по имени пользователя
    $('#userSearchBtn').on('click', function() {
        searchUser = $('#userSearchInput').val().trim();
        loadComments(1);
    });
    
    // Enter в поле поиска по комментариям
    $('#commentSearchInput').on('keypress', function(e) {
        if (e.which === 13) {
            $('#commentSearchBtn').click();
        }
    });
    
    // Enter в поле поиска по пользователям
    $('#userSearchInput').on('keypress', function(e) {
        if (e.which === 13) {
            $('#userSearchBtn').click();
        }
    });
}

// Загрузка комментариев
function loadComments(page = 1) {
    currentPage = page;
    
    let url = `/api/admin/comments?page=${page - 1}&size=10&sort=${currentSort}`;
    if (searchText) url += `&text=${encodeURIComponent(searchText)}`;
    if (searchUser) url += `&user=${encodeURIComponent(searchUser)}`;
    
    $.ajax({
        url: url,
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('jwt_token')
        },
        success: function(data) {
            renderComments(data.content);
            totalPages = data.totalPages;
            renderPagination();
        },
        error: function(xhr) {
            console.error('Ошибка при загрузке комментариев:', xhr.responseText);
            console.error('Ошибка при загрузке комментариев');
        }
    });
}

// Отображение комментариев
function renderComments(comments) {
    const container = $('#commentsTable');
    container.empty();
    
    if (!comments || comments.length === 0) {
        container.html('<p class="text-center text-muted">Комментариев не найдено</p>');
        return;
    }
    
    comments.forEach(comment => {
        const commentItem = $(`
            <div class="comment-item card mb-3">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <div class="user-info">
                        <strong>${comment.username}</strong>
                        <small class="text-muted ms-2">${new Date(comment.createdAt).toLocaleString()}</small>
                    </div>
                    <div class="comment-actions">
                        <button class="btn btn-sm btn-outline-danger" onclick="deleteComment(${comment.id})">
                            <i class="fas fa-trash"></i> Удалить
                        </button>
                    </div>
                </div>
                <div class="card-body">
                    <p class="card-text">${comment.text}</p>
                    <div class="comment-meta">
                        <small class="text-muted">
                            К фото: <a href="/photo?id=${comment.photoId}" target="_blank">Просмотреть фото</a>
                        </small>
                        ${comment.reportCount ? `<span class="badge bg-warning ms-2">Жалобы: ${comment.reportCount}</span>` : ''}
                    </div>
                </div>
            </div>
        `);
        
        container.append(commentItem);
    });
}

// Отображение пагинации
function renderPagination() {
    const pagination = $('#commentsPagination');
    pagination.empty();
    
    // Если страница всего одна, не показываем пагинацию
    if (totalPages <= 1) return;
    
    // Кнопка "Предыдущая"
    const prevBtn = $(`
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" aria-label="Previous" data-page="${currentPage - 1}">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `);
    pagination.append(prevBtn);
    
    // Номера страниц
    const maxPages = 5; // Максимальное количество номеров страниц
    let startPage = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let endPage = Math.min(totalPages, startPage + maxPages - 1);
    
    if (endPage - startPage + 1 < maxPages) {
        startPage = Math.max(1, endPage - maxPages + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageItem = $(`
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `);
        pagination.append(pageItem);
    }
    
    // Кнопка "Следующая"
    const nextBtn = $(`
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" aria-label="Next" data-page="${currentPage + 1}">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `);
    pagination.append(nextBtn);
    
    // Обработчик клика по страницам
    $('.page-link').on('click', function(e) {
        e.preventDefault();
        if ($(this).parent().hasClass('disabled')) return;
        
        const page = parseInt($(this).data('page'));
        loadComments(page);
    });
}

// Удаление комментария
function deleteComment(commentId) {
    if (!confirm('Вы действительно хотите удалить этот комментарий?')) return;
    
    $.ajax({
        url: `/api/admin/comments/${commentId}`,
        type: 'DELETE',
        headers: {
            'Authorization': 'Bearer ' + localStorage.getItem('jwt_token')
        },
        success: function() {
            loadComments(currentPage);
        },
        error: function(xhr) {
            console.error('Ошибка при удалении комментария:', xhr.responseText);
            console.error('Не удалось удалить комментарий');
        }
    });
} 