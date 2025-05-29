let currentPage = 1;
let totalPages = 1;
let pageSize = 10;

$(document).ready(function() {
    // Проверяем, авторизован ли пользователь и имеет ли права администратора
    checkAdminAccess();
    
    // Настраиваем обработчики событий
    setupEventListeners();
});

// Проверка прав администратора
function checkAdminAccess() {
    const token = getAuthToken(); // Используем функцию из api.js
    
    if (!token) {
        console.error('Доступ запрещен: отсутствует токен авторизации');
        window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        return;
    }
    
    // Получаем информацию о текущем пользователе через API
    $.ajax({
        url: `${API_URL}/users/me`,
        type: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        success: function(user) {
            console.log("USER", user);
            console.log("USER ROLES", user.roles);
            // Проверяем, есть ли у пользователя роль администратора
            if (user.roles && user.roles.includes('ROLE_ADMIN')) {
                console.log('Пользователь авторизован как администратор');
                $('#username').text(user.username); // Устанавливаем имя пользователя в шапке
                loadUsers(currentPage, pageSize);
            } else {
                console.error('Доступ запрещен: пользователь не является администратором');
                window.location.href = '/';
            }
        },
        error: function(xhr) {
            console.error('Ошибка при проверке прав администратора:', xhr.responseText);
            window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
        }
    });
}

function setupEventListeners() {
    // Обработчики фильтров
    $('#roleFilter, #statusFilter').on('change', function() {
        currentPage = 1;
        loadUsers(currentPage, pageSize);
    });

    // Обработчик поиска
    $('#searchBtn').on('click', function() {
        currentPage = 1;
        loadUsers(currentPage, pageSize);
    });
    
    // Обработчик нажатия Enter в поле поиска
    $('#searchInput').on('keypress', function(e) {
        if (e.which === 13) {
            e.preventDefault();
            currentPage = 1;
            loadUsers(currentPage, pageSize);
        }
    });

    // Обработчик экспорта
    $('#exportUsersBtn').on('click', exportUsers);

    // Обработчик сохранения пользователя
    $('#saveUserBtn').on('click', saveUser);
}

function loadUsers(page, size) {
    const role = $('#roleFilter').val();
    const status = $('#statusFilter').val();
    const search = $('#searchInput').val();
    const token = getAuthToken();

    if (!token) {
        console.error('Не удалось загрузить пользователей: отсутствует токен авторизации');
        return;
    }

    // Показываем индикатор загрузки
    $('#usersTableBody').html('<tr><td colspan="7" class="text-center"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Загрузка...</span></div></td></tr>');

    $.ajax({
        url: `${API_URL}/admin/users`,
        type: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        data: {
            page: page - 1, // API использует индексацию с 0
            size: size,
            role: role,
            status: status,
            search: search
        },
        success: function(response) {
            renderUsers(response.content);
            totalPages = response.totalPages;
            currentPage = page;
            renderPagination();
        },
        error: function(xhr) {
            console.error('Ошибка при загрузке пользователей:', xhr.responseText);
            $('#usersTableBody').html('<tr><td colspan="7" class="text-center text-danger">Ошибка при загрузке пользователей</td></tr>');
            
            // Если ошибка авторизации, перенаправляем на страницу входа
            if (xhr.status === 401 || xhr.status === 403) {
                window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }
        }
    });
}

function renderUsers(users) {
    const tbody = $('#usersTableBody');
    tbody.empty();

    if (!users || users.length === 0) {
        tbody.append('<tr><td colspan="7" class="text-center">Пользователи не найдены</td></tr>');
        return;
    }

    users.forEach(user => {
        tbody.append(`
            <tr>
                <td>${user.id}</td>
                <td>${user.username}</td>
                <td>${user.email}</td>
                <td>${formatRole(user.role || user.roles)}</td>
                <td>${formatStatus(user.status || (user.enabled ? 'active' : 'blocked'))}</td>
                <td>${formatDate(user.registrationDate || user.createdAt)}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary me-1" onclick="editUser(${user.id})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteUser(${user.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `);
    });
}

function renderPagination() {
    const pagination = $('#pagination');
    pagination.empty();

    // Если всего одна страница, не показываем пагинацию
    if (totalPages <= 1) {
        return;
    }

    // Добавляем кнопку "Предыдущая"
    pagination.append(`
        <li class="page-item ${currentPage <= 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" ${currentPage > 1 ? 'onclick="goToPage(' + (currentPage - 1) + ')"' : ''}>Назад</a>
        </li>
    `);

    // Определяем диапазон отображаемых страниц
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    
    // Корректируем startPage, если недостаточно страниц справа
    startPage = Math.max(1, endPage - 4);

    // Добавляем первую страницу и многоточие, если нужно
    if (startPage > 1) {
        pagination.append(`
            <li class="page-item">
                <a class="page-link" href="#" onclick="goToPage(1)">1</a>
            </li>
        `);
        if (startPage > 2) {
            pagination.append(`
                <li class="page-item disabled">
                    <a class="page-link" href="#">...</a>
                </li>
            `);
        }
    }

    // Добавляем страницы из диапазона
    for (let i = startPage; i <= endPage; i++) {
        pagination.append(`
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" onclick="goToPage(${i})">${i}</a>
            </li>
        `);
    }

    // Добавляем многоточие и последнюю страницу, если нужно
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            pagination.append(`
                <li class="page-item disabled">
                    <a class="page-link" href="#">...</a>
                </li>
            `);
        }
        pagination.append(`
            <li class="page-item">
                <a class="page-link" href="#" onclick="goToPage(${totalPages})">${totalPages}</a>
            </li>
        `);
    }

    // Добавляем кнопку "Следующая"
    pagination.append(`
        <li class="page-item ${currentPage >= totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" ${currentPage < totalPages ? 'onclick="goToPage(' + (currentPage + 1) + ')"' : ''}>Вперед</a>
        </li>
    `);
}

function goToPage(page) {
    if (page < 1 || page > totalPages || page === currentPage) {
        return;
    }
    loadUsers(page, pageSize);
}

function editUser(userId) {
    const token = getAuthToken();
    
    if (!token) {
        console.error('Не удалось загрузить данные пользователя: отсутствует токен авторизации');
        return;
    }

    $.ajax({
        url: `${API_URL}/admin/users/${userId}`,
        type: 'GET',
        headers: { 'Authorization': `Bearer ${token}` },
        success: function(user) {
            $('#editUserId').val(user.id);
            $('#editUsername').val(user.username);
            $('#editEmail').val(user.email);
            $('#editRole').val(user.role || (user.roles && user.roles.length > 0 ? user.roles[0] : 'ROLE_USER'));
            $('#editStatus').val(user.status || (user.enabled ? 'active' : 'blocked'));
            $('#editUserModal').modal('show');
        },
        error: function(xhr) {
            console.error('Ошибка при загрузке данных пользователя:', xhr.responseText);
            alert('Ошибка при загрузке данных пользователя');
            
            // Если ошибка авторизации, перенаправляем на страницу входа
            if (xhr.status === 401 || xhr.status === 403) {
                window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }
        }
    });
}

function saveUser() {
    const token = getAuthToken();
    
    if (!token) {
        console.error('Не удалось сохранить данные пользователя: отсутствует токен авторизации');
        return;
    }

    const userData = {
        id: $('#editUserId').val(),
        username: $('#editUsername').val(),
        email: $('#editEmail').val(),
        role: $('#editRole').val(),
        status: $('#editStatus').val()
    };

    $.ajax({
        url: `${API_URL}/admin/users`,
        type: 'PUT',
        headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        data: JSON.stringify(userData),
        success: function() {
            $('#editUserModal').modal('hide');
            loadUsers(currentPage, pageSize);
        },
        error: function(xhr) {
            console.error('Ошибка при сохранении данных пользователя:', xhr.responseText);
            alert('Ошибка при сохранении данных пользователя');
            
            // Если ошибка авторизации, перенаправляем на страницу входа
            if (xhr.status === 401 || xhr.status === 403) {
                window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }
        }
    });
}

function deleteUser(userId) {
    if (!confirm('Вы уверены, что хотите удалить этого пользователя?')) {
        return;
    }
    
    const token = getAuthToken();
    
    if (!token) {
        console.error('Не удалось удалить пользователя: отсутствует токен авторизации');
        return;
    }

    $.ajax({
        url: `${API_URL}/admin/users/${userId}`,
        type: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
        success: function() {
            loadUsers(currentPage, pageSize);
        },
        error: function(xhr) {
            console.error('Ошибка при удалении пользователя:', xhr.responseText);
            alert('Ошибка при удалении пользователя');
            
            // Если ошибка авторизации, перенаправляем на страницу входа
            if (xhr.status === 401 || xhr.status === 403) {
                window.location.href = '/login.html?redirect=' + encodeURIComponent(window.location.pathname);
            }
        }
    });
}

function exportUsers() {
    const token = getAuthToken();
    
    if (!token) {
        console.error('Не удалось экспортировать пользователей: отсутствует токен авторизации');
        return;
    }
    
    const role = $('#roleFilter').val();
    const status = $('#statusFilter').val();
    const search = $('#searchInput').val();

    // Создаем ссылку с токеном в заголовке и открываем в новом окне
    const exportUrl = `${API_URL}/admin/users/export?role=${role}&status=${status}&search=${search}`;
    
    // Создаем временный iframe для загрузки файла с авторизацией
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    
    // Получаем документ iframe
    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
    
    // Создаем форму для отправки запроса с токеном
    const form = iframeDoc.createElement('form');
    form.method = 'GET';
    form.action = exportUrl;
    
    // Создаем скрытое поле для токена
    const tokenInput = iframeDoc.createElement('input');
    tokenInput.type = 'hidden';
    tokenInput.name = 'Authorization';
    tokenInput.value = `Bearer ${token}`;
    form.appendChild(tokenInput);
    
    // Добавляем форму в iframe и отправляем
    iframeDoc.body.appendChild(form);
    form.submit();
    
    // Удаляем iframe через некоторое время
    setTimeout(() => {
        document.body.removeChild(iframe);
    }, 5000);
}

function formatRole(role) {
    // Если role - это массив объектов Role
    if (Array.isArray(role)) {
        if (role.length === 0) return 'Без роли';
        
        // Берем первую роль из массива
        const firstRole = role[0];
        // Если это объект с полем name, извлекаем имя роли
        if (typeof firstRole === 'object' && firstRole !== null) {
            if (firstRole.name) {
                return formatRoleName(firstRole.name);
            }
        }
        
        // Если в массиве строки, берем первую
        return formatRoleName(firstRole.toString());
    }
    
    // Если role - это объект Role
    if (typeof role === 'object' && role !== null) {
        if (role.name) {
            return formatRoleName(role.name);
        }
        return 'Роль не определена';
    }
    
    // Если role - это строка
    return formatRoleName(role);
}

// Вспомогательная функция для форматирования имени роли
function formatRoleName(roleName) {
    const roles = {
        'ROLE_USER': 'Пользователь',
        'ROLE_MODERATOR': 'Модератор',
        'ROLE_ADMIN': 'Администратор'
    };
    return roles[roleName] || roleName;
}

function formatStatus(status) {
    const statuses = {
        'active': '<span class="status-badge status-approved">Активный</span>',
        'blocked': '<span class="status-badge status-rejected">Заблокирован</span>',
        'unverified': '<span class="status-badge status-pending">Не подтвержден</span>'
    };
    return statuses[status] || status;
}

function formatDate(date) {
    if (!date) return 'Н/Д';
    return new Date(date).toLocaleString('ru-RU');
}

// Получение JWT токена из cookie или localStorage (взято из api.js)
function getAuthToken() {
    // Получаем токен из куки "jwt_token"
    const cookies = document.cookie.split(';');
    let token = null;
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith('jwt_token=')) {
            token = cookie.substring('jwt_token='.length, cookie.length);
            break;
        }
    }
    
    // Поддержка обратной совместимости с localStorage
    if (!token) {
        token = localStorage.getItem(TOKEN_KEY);
    }
    
    return token;
} 