// API URL для всего приложения
const API_URL = '/api';

// Константы для хранения данных в localStorage
const TOKEN_KEY = 'photoapp_token';
const USER_KEY = 'photoapp_user';

// Отключаем режим разработки для использования реальной аутентификации
const SECURITY_DISABLED = false;

// Функция для получения JWT токена из куки
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
    
    console.log("Getting auth token from cookie:", token ? "Token exists" : "No token found");
    
    // Поддержка обратной совместимости с localStorage
    if (!token) {
        token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            console.log("Token found in localStorage (legacy)");
        }
    }
    
    return token;
}

// Функция для проверки валидности токена
async function validateToken() {
    // Временно считаем все токены валидными
    if (SECURITY_DISABLED) {
        console.log("Security checks disabled - assuming token is valid");
        return true;
    }

    const token = getAuthToken();
    if (!token) {
        console.log("No token to validate");
        return false;
    }

    try {
        const response = await fetch('/api/auth/validate', {
            headers: {
                'Authorization': 'Bearer ' + token
            }
        });
        
        if (response.ok) {
            console.log("Token is valid");
            return true;
        } else {
            console.log("Token validation failed");
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            return false;
        }
    } catch (error) {
        console.error("Token validation error:", error);
        return false;
    }
}

// Функция для добавления заголовка Authorization
function getAuthHeader() {
    if (SECURITY_DISABLED) {
        // Если безопасность отключена, возвращаем фиктивный заголовок
        return { 'Authorization': 'Bearer dev_token_for_testing' };
    }
    
    const token = getAuthToken();
    return token ? { 'Authorization': 'Bearer ' + token } : {};
}

// Функция для проверки авторизации пользователя
function checkAuth(onSuccess, onFailure) {
    // Временно считаем всех пользователей авторизованными
    if (SECURITY_DISABLED) {
        console.log("Security checks disabled - assuming user is authenticated");
        // Используем временного пользователя
        localStorage.setItem(USER_KEY, JSON.stringify(DEV_USER));
        if (onSuccess) onSuccess(DEV_USER);
        return;
    }

    // Проверяем, есть ли токен в localStorage
    const token = getAuthToken();
    
    if (token) {
        console.log("Token found in localStorage, validating");
        
        // Проверяем валидность токена
        $.ajax({
            url: `${API_URL}/auth/validate`,
            type: 'GET',
            headers: getAuthHeader(),
            success: function(response) {
                console.log("Token validation successful:", response);
                // Токен валиден - получаем информацию о пользователе
                const user = JSON.parse(localStorage.getItem(USER_KEY));
                if (onSuccess && user) onSuccess(user);
            },
            error: function(xhr, status, error) {
                console.error("Token validation failed:", status, error);
                // Токен невалиден - удаляем его
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
                
                // Пробуем восстановить сессию
                tryRestoreSession(onSuccess, onFailure);
            }
        });
    } else {
        console.log("No token found in localStorage, trying to restore session");
        tryRestoreSession(onSuccess, onFailure);
    }
}

// Функция для попытки восстановления сессии с сервера
function tryRestoreSession(onSuccess, onFailure) {
    console.log("Trying to restore session from server");
    
    // Попытка восстановить сессию без токена
    $.ajax({
        url: `${API_URL}/auth/session`,
        type: 'GET',
        success: function(response) {
            console.log("Session restored from server:", response);
            
            // Если сервер вернул данные пользователя и токен
            if (response && response.token) {
                localStorage.setItem(TOKEN_KEY, response.token);
                localStorage.setItem(USER_KEY, JSON.stringify({
                    id: response.id,
                    username: response.username,
                    email: response.email,
                    roles: response.roles
                }));
                
                if (onSuccess) onSuccess(response);
            } else {
                console.error("Server returned no user data or token");
                if (onFailure) onFailure();
            }
        },
        error: function(xhr, status, error) {
            console.error("Failed to restore session:", status, error);
            if (onFailure) onFailure();
        }
    });
}

// Функция для выхода из системы
function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    window.location.href = '/';
}

// Функция для обновления UI в зависимости от статуса авторизации
function updateAuthUI() {
    checkAuth(
        function(user) {
            // Пользователь авторизован
            $('.user-links').show();
            $('.guest-links').hide();
            $('.user-only').show();
            
            // Показываем имя пользователя
            $('.username-display').text(user.username);
        },
        function() {
            // Пользователь не авторизован
            $('.user-links').hide();
            $('.guest-links').show();
            $('.user-only').hide();
        }
    );
}

// Проверка доступа к защищенным страницам
function checkProtectedPage() {
    // Временно отключаем проверку защищенных страниц
    if (SECURITY_DISABLED) {
        console.log("Security checks disabled - allowing access to protected pages");
        return;
    }

    // Страницы, требующие авторизации
    const protectedPages = ['/profile.html', '/upload.html', '/favorites.html', '/albums.html', '/settings.html', 
                           '/profile', '/upload', '/favorites', '/albums', '/settings'];
    
    // Публичные страницы (не требующие авторизации)
    const publicPages = ['/login.html', '/register.html', '/forgot-password.html', '/', '/index.html', '/gallery', '/gallery.html'];
    
    const currentPath = window.location.pathname;
    
    // Если текущая страница публичная, не выполняем проверки
    if (publicPages.includes(currentPath)) {
        console.log('Public page accessed, no auth check needed');
        return;
    }
    
    // Если текущая страница защищенная, проверяем авторизацию
    if (protectedPages.includes(currentPath)) {
        checkAuth(
            function(user) {
                // Пользователь авторизован - можно оставаться на странице
                console.log('Authenticated user accessing protected page');
            },
            function() {
                // Пользователь не авторизован - перенаправляем
                console.log('Unauthenticated user redirected from protected page');
                window.location.href = '/login.html?redirect=' + encodeURIComponent(currentPath);
            }
        );
    }
}

// Добавляем заголовок авторизации ко всем AJAX запросам
$(function() {
    $.ajaxSetup({
        beforeSend: function(xhr, settings) {
            // Пропускаем запросы авторизации и восстановления пароля
            if (settings.url.includes('/api/auth/signin') || 
                settings.url.includes('/api/auth/signup') ||
                settings.url.includes('/api/auth/forgot-password') ||
                settings.url.includes('/api/auth/verify-reset-code') ||
                settings.url.includes('/api/auth/reset-password')) {
                console.log("Skipping auth header for auth endpoints:", settings.url);
                return;
            }
            
            // Добавляем токен только для запросов к нашему API если нет куки
            if (settings.url.startsWith('/api') && !document.cookie.includes('jwt_token=')) {
                const token = getAuthToken();
                if (token) {
                    console.log("Adding token to request:", settings.url);
                    xhr.setRequestHeader('Authorization', 'Bearer ' + token);
                } else {
                    console.log("No token available for request:", settings.url);
                }
            }
        },
        complete: function(xhr, status) {
            // Пропускаем проверки безопасности, если они отключены
            if (SECURITY_DISABLED) {
                return;
            }

            console.log("Request completed:", status, "Status code:", xhr.status);
            // Если получаем 401, значит токен недействителен
            if (xhr.status === 401) {
                console.log("Received 401 response, clearing token");
                console.log("Response:", xhr.responseText);
                localStorage.removeItem(TOKEN_KEY);
                localStorage.removeItem(USER_KEY);
                // Удаляем куку jwt_token
                document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                
                // Перенаправляем на страницу входа, если это не запрос авторизации
                if (xhr.responseURL && !xhr.responseURL.includes('/api/auth/')) {
                    // Не перенаправляем с публичных страниц
                    const publicPages = ['/login.html', '/register.html', '/forgot-password.html'];
                    const currentPath = window.location.pathname;
                    
                    if (!publicPages.includes(currentPath)) {
                        console.log("Redirecting to login page due to 401 response");
                        window.location.href = '/login.html';
                    }
                }
            }
        },
        error: function(xhr, status, error) {
            console.error("Request failed:", {
                status: xhr.status,
                statusText: xhr.statusText,
                responseText: xhr.responseText,
                error: error
            });
        }
    });
    
    // Отключаем автоматическую проверку токена при загрузке страницы
    if (!SECURITY_DISABLED) {
        validateToken().then(isValid => {
            console.log("Token validation result:", isValid);
            if (!isValid && 
                window.location.pathname !== '/login.html' && 
                window.location.pathname !== '/register.html' && 
                window.location.pathname !== '/forgot-password.html') {
                console.log("Invalid token, redirecting to login");
                window.location.href = '/login.html';
            }
        }).catch(error => {
            console.error("Token validation failed:", error);
            if (window.location.pathname !== '/login.html' && 
                window.location.pathname !== '/register.html' && 
                window.location.pathname !== '/forgot-password.html') {
                window.location.href = '/login.html';
            }
        });
    }
});

// API методы для работы с запросами
const api = {
    // Базовый метод для GET запросов
    get: function(url) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: url,
                type: 'GET',
                headers: getAuthHeader(),
                success: function(response) {
                    resolve(response);
                },
                error: function(xhr, status, error) {
                    reject({ xhr, status, error });
                }
            });
        });
    },
    
    // Базовый метод для POST запросов с JSON данными
    post: function(url, data) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: url,
                type: 'POST',
                headers: {
                    ...getAuthHeader(),
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(data),
                success: function(response) {
                    resolve(response);
                },
                error: function(xhr, status, error) {
                    reject({ xhr, status, error });
                }
            });
        });
    },
    
    // Базовый метод для PUT запросов с JSON данными
    put: function(url, data) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: url,
                type: 'PUT',
                headers: {
                    ...getAuthHeader(),
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(data),
                success: function(response) {
                    resolve(response);
                },
                error: function(xhr, status, error) {
                    reject({ xhr, status, error });
                }
            });
        });
    },
    
    // Базовый метод для DELETE запросов
    delete: function(url) {
        return new Promise((resolve, reject) => {
            $.ajax({
                url: url,
                type: 'DELETE',
                headers: getAuthHeader(),
                success: function(response) {
                    resolve(response);
                },
                error: function(xhr, status, error) {
                    reject({ xhr, status, error });
                }
            });
        });
    },
    
    // Метод для отправки FormData (для загрузки файлов)
    postFormData: function(url, formData) {
        return new Promise((resolve, reject) => {
            console.log("Sending FormData to:", url);
            
            // Получаем авторизационный токен
            const token = getAuthToken();
            
            console.log("Using token for request:", token ? "Token found" : "No token");
            
            // Отправляем запрос
            $.ajax({
                url: url,
                type: 'POST',
                headers: token ? { 'Authorization': 'Bearer ' + token } : {},
                contentType: false, // Необходимо для FormData
                processData: false, // Необходимо для FormData
                data: formData,
                success: function(response) {
                    console.log("FormData upload successful:", response);
                    resolve(response);
                },
                error: function(xhr, status, error) {
                    console.error("FormData upload failed:", {
                        status: xhr.status,
                        statusText: xhr.statusText,
                        responseText: xhr.responseText,
                        error: error
                    });
                    
                    // Обработка 401 ошибки (Unauthorized)
                    if (xhr.status === 401) {
                        console.log("Received 401 response, clearing token");
                        localStorage.removeItem(TOKEN_KEY);
                        localStorage.removeItem(USER_KEY);
                        // Удаляем куку jwt_token
                        document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                    }
                    
                    reject({ xhr, status, error });
                },
                complete: function(xhr, status) {
                    // Только логируем результат завершения запроса
                    console.log("Request completed:", status, "Status code:", xhr.status);
                }
            });
        });
    },
    
    // Проверка, авторизован ли пользователь
    isAuthenticated: function() {
        if (SECURITY_DISABLED) {
            return true;
        }
        return !!localStorage.getItem(TOKEN_KEY);
    },
    
    // Получение текущего пользователя из localStorage
    getCurrentUser: function() {
        if (SECURITY_DISABLED) {
            return DEV_USER;
        }
        const userJson = localStorage.getItem(USER_KEY);
        return userJson ? JSON.parse(userJson) : null;
    }
}; 

// Функция для исправления проблемы с modal-backdrop при закрытии модального окна
function fixModalBackdropIssue() {
    // Добавляем обработчик события для всех модальных окон
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('hidden.bs.modal', function () {
            // Удаляем все оставшиеся backdrop элементы
            const backdrops = document.querySelectorAll('.modal-backdrop');
            backdrops.forEach(backdrop => {
                backdrop.remove();
            });
            // Убираем класс modal-open с body
            document.body.classList.remove('modal-open');
            // Удаляем inline стили, добавленные Bootstrap
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        });
    });
    
    console.log("Modal backdrop fix initialized");
}

// Функция для отображения модального окна с сообщением вместо alert()
function showMessage(message, type = 'info', title = null) {
    // Создаем ID для модального окна (уникальный)
    const modalId = 'messageModal-' + Date.now();
    
    // Определяем заголовок окна в зависимости от типа сообщения
    let modalTitle = title;
    if (!modalTitle) {
        switch (type) {
            case 'success':
                modalTitle = 'Успешно';
                break;
            case 'error':
                modalTitle = 'Ошибка';
                break;
            case 'warning':
                modalTitle = 'Предупреждение';
                break;
            default:
                modalTitle = 'Информация';
        }
    }
    
    // Определяем иконку в зависимости от типа сообщения
    let icon;
    switch (type) {
        case 'success':
            icon = '<i class="bi bi-check-circle-fill text-success me-2"></i>';
            break;
        case 'error':
            icon = '<i class="bi bi-exclamation-triangle-fill text-danger me-2"></i>';
            break;
        case 'warning':
            icon = '<i class="bi bi-exclamation-triangle-fill text-warning me-2"></i>';
            break;
        default:
            icon = '<i class="bi bi-info-circle-fill text-primary me-2"></i>';
    }
    
    // Создаем HTML модального окна
    const modalHTML = `
    <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}-label" aria-hidden="true">
        <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title" id="${modalId}-label">${modalTitle}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
                </div>
                <div class="modal-body">
                    <div class="d-flex align-items-center">
                        ${icon}
                        <div>${message}</div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-primary" data-bs-dismiss="modal">OK</button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    // Добавляем модальное окно в конец body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Получаем созданный элемент модального окна
    const modalElement = document.getElementById(modalId);
    
    // Инициализируем модальное окно Bootstrap
    const modal = new bootstrap.Modal(modalElement);
    
    // Добавляем обработчик события для удаления модального окна после закрытия
    modalElement.addEventListener('hidden.bs.modal', function () {
        modalElement.remove();
    });
    
    // Показываем модальное окно
    modal.show();
    
    // Возвращаем объект модального окна
    return modal;
}

// Заменяем стандартный alert на нашу функцию showMessage
window.customAlert = window.alert;
window.alert = function(message) {
    showMessage(message);
};

// Инициализация исправления modal-backdrop при загрузке документа
$(document).ready(function() {
    // Запускаем фикс для модальных окон
    fixModalBackdropIssue();
}); 