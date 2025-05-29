/**
 * Скрипт для аудит-лога действий пользователей
 */

document.addEventListener('DOMContentLoaded', function() {
    // Проверка аутентификации и прав доступа
    checkUserRoles(['ROLE_ADMIN'], function() {
        // Инициализация страницы
        loadAuditLogs();
        setupEventHandlers();
    });

    // Обработчик кнопки выхода
    document.getElementById('logoutBtn').addEventListener('click', function(event) {
        event.preventDefault();
        logout();
    });
});

/**
 * Настройка обработчиков событий
 */
function setupEventHandlers() {
    // Фильтр по типу действия
    document.getElementById('activityTypeFilter').addEventListener('change', function() {
        loadAuditLogs();
    });

    // Фильтр по типу операции (добавление/удаление)
    document.getElementById('actionTypeFilter').addEventListener('change', function() {
        loadAuditLogs();
    });

    // Фильтр по роли исполнителя
    document.getElementById('actorFilter').addEventListener('change', function() {
        loadAuditLogs();
    });

    // Поиск по имени пользователя
    document.getElementById('userSearch').addEventListener('input', function() {
        // Добавляем задержку, чтобы не делать запрос при каждом нажатии клавиши
        clearTimeout(this.searchTimeout);
        this.searchTimeout = setTimeout(() => {
            loadAuditLogs();
        }, 300);
    });

    // Кнопка обновления
    document.getElementById('refreshBtn').addEventListener('click', function() {
        loadAuditLogs();
    });
}

/**
 * Глобальные переменные для пагинации
 */
let currentPage = 0; // Используем 0-based пагинацию для Spring Data
const pageSize = 25;
let totalItems = 0;
let totalPages = 0;

/**
 * Загрузка аудит-логов с учетом фильтров
 */
function loadAuditLogs() {
    // Получаем значения фильтров
    const activityType = document.getElementById('activityTypeFilter').value;
    const actionType = document.getElementById('actionTypeFilter').value;
    const actor = document.getElementById('actorFilter').value;
    const userSearch = document.getElementById('userSearch').value.trim();
    
    // Показываем индикатор загрузки
    document.getElementById('auditLogTable').innerHTML = `
        <tr>
            <td colspan="7" class="text-center">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Загрузка...</span>
                </div>
            </td>
        </tr>
    `;

    // Формируем строку запроса
    let queryParams = `?page=${currentPage}&size=${pageSize}`;
    
    if (activityType && activityType !== 'all') {
        queryParams += `&activityType=${encodeURIComponent(activityType)}`;
    }
    
    if (actionType && actionType !== 'all') {
        queryParams += `&actionType=${encodeURIComponent(actionType)}`;
    }
    
    if (actor && actor !== 'all') {
        queryParams += `&actor=${encodeURIComponent(actor)}`;
    }
    
    if (userSearch) {
        queryParams += `&username=${encodeURIComponent(userSearch)}`;
    }
    
    // Отправляем запрос к API
    fetch(`/api/admin/activity${queryParams}`, {
        method: 'GET',
        headers: {
            ...getAuthHeader()
        }
    })
    .then(response => {
        if (!response.ok) {
            throw new Error(`Ошибка HTTP: ${response.status}`);
        }
        return response.json();
    })
    .then(data => {
        console.log("Получены данные аудита:", data);
        
        // Сохраняем информацию о пагинации
        totalItems = data.totalElements;
        totalPages = data.totalPages;
        
        // Отображаем результаты
        renderAuditLogs(data.content);
        renderPagination();
        
        // Показываем уведомление
        showToast('Готово', 'Аудит-логи успешно загружены');
    })
    .catch(error => {
        console.error("Ошибка при загрузке аудит-логов:", error);
        
        // В случае ошибки показываем сообщение
        document.getElementById('auditLogTable').innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                    <p>Ошибка при загрузке данных: ${error.message}</p>
                    <button class="btn btn-outline-primary mt-2" onclick="loadAuditLogs()">
                        <i class="fas fa-sync-alt"></i> Повторить попытку
                    </button>
                </td>
            </tr>
        `;
        
        // Показываем уведомление об ошибке
        showToast('Ошибка', `Не удалось загрузить аудит-логи: ${error.message}`);
    });
}

/**
 * Отрисовка таблицы аудит-логов
 */
function renderAuditLogs(logs) {
    const tableBody = document.getElementById('auditLogTable');
    
    // Очищаем таблицу
    tableBody.innerHTML = '';
    
    if (!logs || logs.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-search fa-3x text-muted mb-3"></i>
                    <p>Нет записей, соответствующих заданным критериям</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Добавляем строки с данными
    logs.forEach(log => {
        const row = document.createElement('tr');
        
        // Форматируем тип действия
        const activityTypeBadge = getActivityTypeBadge(log.activityType);
        
        // Форматируем действие (добавление/удаление)
        const actionIcon = getActionIcon(log.actionType);
        
        // Форматируем исполнителя
        const actorBadge = getActorBadge(log.actor);
        
        // Получаем имя пользователя 
        const username = log.user ? log.user.username : 'Неизвестный пользователь';
        const userId = log.user ? log.user.id : '?';
        
        row.innerHTML = `
            <td>${log.id}</td>
            <td>${formatDateTime(log.timestamp)}</td>
            <td>
                <a href="/admin/users.html?id=${userId}" class="text-decoration-none">
                    ${username}
                </a>
            </td>
            <td>${activityTypeBadge}</td>
            <td>${actionIcon}</td>
            <td>${formatObjectInfo(log)}</td>
            <td>${actorBadge}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

/**
 * Отрисовка элементов пагинации
 */
function renderPagination() {
    const paginationElement = document.getElementById('pagination');
    paginationElement.innerHTML = '';
    
    // Если страниц меньше или равно 1, скрываем пагинацию
    if (totalPages <= 1) {
        return;
    }
    
    // Кнопка "Предыдущая"
    const prevButton = document.createElement('li');
    prevButton.className = `page-item ${currentPage === 0 ? 'disabled' : ''}`;
    prevButton.innerHTML = `
        <a class="page-link" href="#" ${currentPage > 0 ? 'onclick="goToPage(' + (currentPage - 1) + '); return false;"' : ''}>
            <span aria-hidden="true">&laquo;</span>
        </a>
    `;
    paginationElement.appendChild(prevButton);
    
    // Определяем, какие страницы показывать
    let startPage = Math.max(0, currentPage - 2);
    let endPage = Math.min(totalPages - 1, startPage + 4);
    
    // Корректируем, если не хватает страниц в конце
    if (endPage - startPage < 4) {
        startPage = Math.max(0, endPage - 4);
    }
    
    // Кнопки с номерами страниц
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('li');
        pageButton.className = `page-item ${i === currentPage ? 'active' : ''}`;
        pageButton.innerHTML = `
            <a class="page-link" href="#" onclick="goToPage(${i}); return false;">${i + 1}</a>
        `;
        paginationElement.appendChild(pageButton);
    }
    
    // Кнопка "Следующая"
    const nextButton = document.createElement('li');
    nextButton.className = `page-item ${currentPage === totalPages - 1 ? 'disabled' : ''}`;
    nextButton.innerHTML = `
        <a class="page-link" href="#" ${currentPage < totalPages - 1 ? 'onclick="goToPage(' + (currentPage + 1) + '); return false;"' : ''}>
            <span aria-hidden="true">&raquo;</span>
        </a>
    `;
    paginationElement.appendChild(nextButton);
}

/**
 * Переход на указанную страницу
 */
function goToPage(page) {
    currentPage = page;
    loadAuditLogs();
}

/**
 * Получение значка для типа действия
 */
function getActivityTypeBadge(type) {
    const types = {
        'login': '<span class="activity-badge activity-login">Авторизация</span>',
        'photo': '<span class="activity-badge activity-photo">Фото</span>',
        'album': '<span class="activity-badge activity-album">Альбом</span>',
        'comment': '<span class="activity-badge activity-comment">Комментарий</span>',
        'favorite': '<span class="activity-badge activity-favorite">Избранное</span>'
    };
    
    return types[type] || `<span class="activity-badge">${type}</span>`;
}

/**
 * Получение иконки для действия
 */
function getActionIcon(action) {
    const actions = {
        'add': '<i class="fas fa-plus-circle action-add"></i> Добавление',
        'delete': '<i class="fas fa-trash-alt action-delete"></i> Удаление',
        'login': '<i class="fas fa-sign-in-alt"></i> Вход',
        'register': '<i class="fas fa-user-plus"></i> Регистрация'
    };
    
    return actions[action] || action;
}

/**
 * Получение значка для исполнителя
 */
function getActorBadge(actor) {
    const actors = {
        'user': '<span class="badge actor-user">Пользователь</span>',
        'moderator': '<span class="badge actor-moderator">Модератор</span>',
        'admin': '<span class="badge actor-admin">Администратор</span>'
    };
    
    return actors[actor] || actor;
}

/**
 * Форматирование информации об объекте действия
 */
function formatObjectInfo(log) {
    switch (log.activityType) {
        case 'login':
        case 'register':
            return '-';
            
        case 'photo':
            return `ID: ${log.objectId}<br><small>${log.objectName || 'Фото без названия'}</small>`;
            
        case 'album':
            return `ID: ${log.objectId}<br><small>${log.objectName || 'Альбом без названия'}</small>`;
            
        case 'comment':
            return `ID: ${log.objectId}<br><small>К фото №${log.relatedId || '?'}</small>`;
            
        case 'favorite':
            return `Фото ID: ${log.objectId}`;
            
        default:
            return `ID: ${log.objectId || '?'}`;
    }
}

/**
 * Форматирование даты и времени
 */
function formatDateTime(timestamp) {
    if (!timestamp) return 'Н/Д';
    
    // Проверяем формат даты
    let date;
    if (typeof timestamp === 'string') {
        date = new Date(timestamp);
    } else {
        date = timestamp; // Если это уже объект Date
    }
    
    // Проверяем валидность даты
    if (isNaN(date.getTime())) {
        return 'Неверная дата';
    }
    
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

/**
 * Экспорт аудит-логов в CSV
 */
function exportAuditLogs() {
    // Получаем значения фильтров
    const activityType = document.getElementById('activityTypeFilter').value;
    const actionType = document.getElementById('actionTypeFilter').value;
    const actor = document.getElementById('actorFilter').value;
    const userSearch = document.getElementById('userSearch').value.trim();
    
    // Формируем строку запроса
    let queryParams = '';
    
    if (activityType && activityType !== 'all') {
        queryParams += `&activityType=${encodeURIComponent(activityType)}`;
    }
    
    if (actionType && actionType !== 'all') {
        queryParams += `&actionType=${encodeURIComponent(actionType)}`;
    }
    
    if (actor && actor !== 'all') {
        queryParams += `&actor=${encodeURIComponent(actor)}`;
    }
    
    if (userSearch) {
        queryParams += `&username=${encodeURIComponent(userSearch)}`;
    }
    
    // Если есть параметры, добавляем знак вопроса
    if (queryParams) {
        queryParams = '?' + queryParams.substring(1); // Убираем первый & и добавляем ?
    }
    
    // URL для скачивания
    const downloadUrl = `/api/admin/activity/export${queryParams}`;
    
    // Создаем и кликаем по невидимой ссылке для скачивания
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = 'activity_logs.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Экспорт', 'Экспорт аудит-логов запущен');
}

/**
 * Отображение toast-уведомления
 */
function showToast(title, message) {
    document.getElementById('toastTitle').textContent = title;
    document.getElementById('toastMessage').textContent = message;
    
    const toastElement = document.getElementById('toast');
    const toast = new bootstrap.Toast(toastElement);
    toast.show();
}

/**
 * Проверка ролей текущего пользователя
 */
function checkUserRoles(requiredRoles, callback) {
    if (!Array.isArray(requiredRoles)) {
        requiredRoles = [requiredRoles];
    }
    
    // Получаем данные пользователя
    const userStr = localStorage.getItem('photoapp_user');
    if (!userStr) {
        console.error('Пользователь не авторизован');
        window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return;
    }
    
    try {
        const userData = JSON.parse(userStr);
        const userRoles = userData.roles || [];
        
        // Проверяем наличие требуемой роли
        const hasRequiredRole = requiredRoles.some(role => 
            userRoles.includes(role) || userRoles.includes('ROLE_ADMIN')
        );
        
        if (hasRequiredRole) {
            // У пользователя есть необходимая роль
            if (typeof callback === 'function') {
                callback(userData);
            }
            return true;
        } else {
            // У пользователя нет необходимой роли
            console.error('Недостаточно прав для доступа к этой странице');
            window.location.href = '/access-denied.html';
            return false;
        }
    } catch (e) {
        console.error('Ошибка при проверке ролей пользователя', e);
        window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return false;
    }
} 