// Auth.js - Handles authentication functionality

// Token key in localStorage
// Поддерживаем те же значения, что и в api.js
// const TOKEN_KEY = 'photoapp_token';
// const USER_KEY = 'photoapp_user';
// Используем константы, объявленные в api.js

// Инициализация основных функций авторизации
function initializeAuth() {
    console.log("Auth.js initializing...");
    
    // Добавляем отладочную информацию
    console.log("Is logged in:", isLoggedIn());
    if (isLoggedIn()) {
        console.log("Token:", getToken());
        console.log("User:", getCurrentUser());
    }
    
    // Перенаправление с .html на URL контроллера
    redirectToControllerUrl();
    
    // Сначала проверяем токен и авторизацию
    checkAuthState();
    
    // Настраиваем обработчики событий
    setupEventListeners();
    
    // Check page access permissions
    checkPageAccess();
}

// Check if user is logged in on page load
$(document).ready(function() {
    console.log("Auth.js loaded");
    
    // Инициализируем систему авторизации
    initializeAuth();
    
    // Добавляем обработчики для всех ссылок на защищенные страницы
    $('.nav-link').each(function() {
        const href = $(this).attr('href');
        if (href && (
            href === '/profile' || href === '/upload' || 
            href === '/albums' || href === '/favorites' || 
            href === '/settings'
        )) {
            $(this).on('click', function(e) {
                e.preventDefault();
                navigateToProtectedPage(href);
            });
        }
    });
});

// Глобальная настройка для всех AJAX запросов
$.ajaxSetup({
    beforeSend: function(xhr, settings) {
        // Не добавляем токен для запросов авторизации
        if (settings.url.includes('/auth/signin') || settings.url.includes('/auth/signup')) {
            return;
        }
        
        // Не добавляем заголовок Authorization, если используем куки
        // Токен будет автоматически отправлен в куке jwt_token
        
        // Для обратной совместимости проверяем наличие токена в localStorage
        const token = localStorage.getItem(TOKEN_KEY);
        if (token && !document.cookie.includes('jwt_token=')) {
            console.log('Adding token from localStorage to request:', settings.url);
            xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }
    },
    complete: function(xhr, status) {
        // Проверяем статус ответа
        if (xhr.status === 401) {
            console.log('Received 401 response, checking if token is valid...');
            
            // Если это не запрос авторизации
            if (!xhr.responseURL.includes('/auth/signin') && !xhr.responseURL.includes('/auth/signup')) {
                // Проверяем валидность токена
                $.ajax({
                    url: `${API_URL}/auth/validate`,
                    type: 'GET',
                    success: function(response) {
                        console.log('Token is still valid');
                    },
                    error: function() {
                        console.log('Token validation failed, clearing authentication...');
                        // Удаляем токен из localStorage
                        localStorage.removeItem(TOKEN_KEY);
                        localStorage.removeItem(USER_KEY);
                        // Удаляем токен из куки
                        document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                        showUnauthenticatedUI();
                        
                        // Показываем только в логах ошибку
                        console.error('Для доступа к этой странице необходима авторизация');
                        window.location.href = '/';
                    }
                });
            }
        }
    }
});

// Перенаправление с .html версий страниц на URL контроллера
function redirectToControllerUrl() {
    const currentPath = window.location.pathname;
    
    // Карта соответствий старых и новых URL
    const urlMap = {
        '/index.html': '/',
        '/profile.html': '/profile',
        '/upload.html': '/upload',
        '/favorites.html': '/favorites',
        '/albums.html': '/albums',
        '/gallery.html': '/gallery',
        '/settings.html': '/settings'
    };
    
    // Если текущий путь есть в карте соответствий, перенаправляем
    if (urlMap[currentPath]) {
        console.log(`Redirecting from ${currentPath} to ${urlMap[currentPath]}`);
        window.location.href = urlMap[currentPath];
        return;
    }
}

// Check if the current page requires authentication
function checkPageAccess() {
    const protectedPages = [
        '/profile', '/upload', '/favorites', '/albums', '/settings',
        '/profile.html', '/upload.html', '/favorites.html', '/albums.html', '/settings.html'
    ];
    const currentPath = window.location.pathname;
    
    console.log("Current path:", currentPath);
    console.log("Is protected page:", protectedPages.includes(currentPath));
    console.log("Is logged in:", isLoggedIn());
    
    if (protectedPages.includes(currentPath) && !isLoggedIn()) {
        // Сохраняем текущий URL для возврата после авторизации
        const returnUrl = encodeURIComponent(currentPath);
        // Redirect to login page if not logged in and trying to access protected page
        console.log("Redirecting to login page - not authenticated");
        window.location.href = '/login.html?redirect=' + returnUrl;
    }
}

// Set up event listeners for auth forms
function setupEventListeners() {
    // Login form submission
    $('#loginForm').on('submit', function(e) {
        e.preventDefault();
        const username = $('#loginUsername').val();
        const password = $('#loginPassword').val();
        login(username, password);
    });

    // Register form submission
    $('#registerForm').on('submit', function(e) {
        e.preventDefault();
        const username = $('#registerUsername').val();
        const email = $('#registerEmail').val();
        const password = $('#registerPassword').val();
        register(username, email, password);
    });

    // Logout button click - используем более надежный селектор
    // Удаляем предыдущие обработчики перед добавлением нового
    $(document).off('click', '#logoutBtn');
    $(document).on('click', '#logoutBtn', function(e) {
        e.preventDefault();
        console.log("Logout button clicked");
        logout();
    });
}

// Check authentication state and update UI
function checkAuthState() {
    console.log("Checking auth state...");
    const token = getToken();
    const user = getCurrentUser();
    
    if (token && user) {
        console.log("Found token and user in localStorage");
        
        // Проверяем валидность токена
        $.ajax({
            url: `${API_URL}/auth/validate`,
            type: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            success: function(response) {
                console.log("Token validation successful:", response);
                showAuthenticatedUI();
                updateUserInfo(user);
                
                // Запрашиваем актуальные данные пользователя с сервера
                refreshUserData();
                
                // Переустанавливаем обработчики событий после обновления UI
                setupEventListeners();
            },
            error: function(xhr) {
                console.error("Token validation failed:", xhr.status, xhr.responseText);
                // Удаляем невалидные данные авторизации
                localStorage.removeItem(TOKEN_KEY);
                document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
                localStorage.removeItem(USER_KEY);
                showUnauthenticatedUI();
                
                // Переустанавливаем обработчики событий после обновления UI
                setupEventListeners();
                
                // Перенаправляем только если мы на защищенной странице
                checkPageAccess();
            }
        });
    } else {
        console.log("No token or user found");
        showUnauthenticatedUI();
        
        // Переустанавливаем обработчики событий после обновления UI
        setupEventListeners();
        
        // Проверяем доступ к текущей странице
        checkPageAccess();
    }
}

// Обновление информации о пользователе
function updateUserInfo(userData) {
    if (userData) {
        localStorage.setItem(USER_KEY, JSON.stringify(userData));
        $('.username-display').text(userData.username || 'Пользователь');
    }
}

// Show UI elements for authenticated users
function showAuthenticatedUI() {
    console.log("Showing authenticated UI");
    $('.guest-links').hide();
    $('.user-links').show();
    $('.user-only').show();
    
    // Display username
    const user = getCurrentUser();
    if (user) {
        $('.username-display').text(user.username);
        
        // Инициализируем навигацию администратора, если определена функция
        if (typeof initializeAdminNavigation === 'function') {
            initializeAdminNavigation();
        } else {
            // Запасной вариант, если функция не определена
            const isAdmin = user.roles && Array.isArray(user.roles) && user.roles.includes('ROLE_ADMIN');
            const isModerator = user.roles && Array.isArray(user.roles) && user.roles.includes('ROLE_MODERATOR');
            
            if (isAdmin) {
                console.log('User has admin role, showing admin links');
                $('.admin-links').show();
            } else {
                $('.admin-links').hide();
            }
            
            if (isModerator || isAdmin) {
                console.log('User has moderator role, showing moderator links');
                $('.moderator-links').show();
            } else {
                $('.moderator-links').hide();
            }
        }
    }
}

// Show UI elements for unauthenticated users
function showUnauthenticatedUI() {
    console.log("Showing unauthenticated UI");
    $('.guest-links').show();
    $('.user-links').hide();
    $('.user-only').hide();
    $('.admin-links').hide();
    $('.moderator-links').hide();
}

// Check if user is logged in
function isLoggedIn() {
    return localStorage.getItem(TOKEN_KEY) !== null;
}

// Get authentication token from cookie or localStorage
function getToken() {
    // Получаем токен из куки "jwt_token"
    const cookies = document.cookie.split(';');
    let token = null;
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith('jwt_token=')) {
            token = cookie.substring('jwt_token='.length, cookie.length);
            console.log("Token found in cookie");
            break;
        }
    }
    
    // Поддержка обратной совместимости с localStorage
    if (!token) {
        token = localStorage.getItem(TOKEN_KEY);
        if (token) {
            console.log("Token found in localStorage (legacy)");
        }
    }
    
    return token;
}

// Login function - authenticate user
function login(usernameOrEmail, password) {
    console.log("Attempting to login:", usernameOrEmail);
    
    $.ajax({
        url: `${API_URL}/auth/signin`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            username: usernameOrEmail, 
            password: password
        }),
        success: function(response) {
            console.log("Login successful", response);
            
            // Если сервер не установил куку автоматически, делаем это сами
            if (response.token) {
                // Сохраняем токен в куке (срок жизни 24 часа)
                const expirationDate = new Date();
                expirationDate.setTime(expirationDate.getTime() + (24 * 60 * 60 * 1000));
                document.cookie = `jwt_token=${response.token}; expires=${expirationDate.toUTCString()}; path=/; SameSite=Lax`;
                
                // Сохраняем также в localStorage для обратной совместимости
                localStorage.setItem(TOKEN_KEY, response.token);
            }
            
            // Сохраняем данные пользователя
            const userData = {
                id: response.id,
                username: response.username,
                email: response.email,
                roles: response.roles,
                displayName: response.displayName
            };
            
            localStorage.setItem(USER_KEY, JSON.stringify(userData));
            
            console.log("User data saved, updating UI");
            updateUserInfo(userData);
            showAuthenticatedUI();
            
            // Перенаправляем на запрошенную страницу или на главную
            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get('redirect');
            
            if (redirectUrl && !redirectUrl.includes('/login') && !redirectUrl.includes('/register')) {
                console.log("Redirecting to:", redirectUrl);
                window.location.href = redirectUrl;
            } else {
                console.log("Redirecting to home page");
                window.location.href = '/';
            }
        },
        error: function(xhr, status, error) {
            console.error("Login failed:", xhr.status, xhr.responseText);
            
            let errorMessage = "Ошибка входа. Пожалуйста, проверьте имя пользователя и пароль.";
            try {
                const response = JSON.parse(xhr.responseText);
                if (response.message) {
                    errorMessage = response.message;
                }
            } catch (e) {
                console.error("Could not parse error response:", e);
            }
            
            $('#loginError').text(errorMessage).show();
        }
    });
}

// Register function
function register(username, email, password) {
    $.ajax({
        url: `${API_URL}/auth/signup`,
        type: 'POST',
        contentType: 'application/json',
        data: JSON.stringify({
            username: username,
            email: email,
            password: password
        }),
        success: function(response) {
            console.log("Registration successful, response:", response);
            
            // Закрываем модальное окно регистрации и очищаем форму
            $('#registerModal').modal('hide');
            $('#registerForm')[0].reset();
            $('#registerAlert').hide();
            
            // Автоматически выполняем вход после успешной регистрации
            login(username, password);
        },
        error: function(xhr) {
            console.error("Registration failed:", xhr);
            
            let errorMsg = 'Registration failed. Please try again.';
            if (xhr.responseJSON && xhr.responseJSON.message) {
                errorMsg = xhr.responseJSON.message;
            }
            $('#registerAlert').text(errorMsg).show();
        }
    });
}

// Logout function - remove token and redirect
function logout() {
    console.log("Logging out...");
    
    // Получаем токен перед тем, как удалить его
    const token = getToken();
    
    // Удаляем токен из localStorage (для обратной совместимости)
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    
    // Удаляем куку jwt_token
    document.cookie = "jwt_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    
    // Выполняем запрос на выход с токеном для авторизации
    $.ajax({
        url: `${API_URL}/auth/signout`,
        type: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        success: function() {
            console.log("Logout successful");
            // Очищаем UI
            showUnauthenticatedUI();
            // Перенаправляем на главную страницу
            window.location.href = '/';
        },
        error: function(xhr) {
            console.log("Logout failed on server, status:", xhr.status);
            // Очищаем UI независимо от результата запроса
            showUnauthenticatedUI();
            window.location.href = '/';
        }
    });
}

// Get current user from localStorage
function getCurrentUser() {
    const userStr = localStorage.getItem(USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
}

// Проверка статуса аутентификации
async function checkAuth(successCallback) {
    const token = localStorage.getItem(TOKEN_KEY);
    const user = getCurrentUser();
    
    if (!token || !user) {
        // Если нет токена или данных пользователя, считаем не авторизованным
        console.log("No token or user found, not authenticated");
        return false;
    }
    
    try {
        // Проверка токена на сервере
        const response = await fetch('/api/auth/validate', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        if (response.ok) {
            console.log("Token validation successful, user is authenticated");
            if (typeof successCallback === 'function') {
                successCallback(user);
            }
            return true;
        } else {
            console.log("Token validation failed, clearing authentication");
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            return false;
        }
    } catch (error) {
        console.error('Error during authentication check:', error);
        return false;
    }
}

// Показать меню пользователя
function showUserMenu(user) {
    const userMenu = document.querySelector('.user-menu');
    const username = document.getElementById('username');
    
    if (userMenu && username && user) {
        username.textContent = user.username;
        userMenu.classList.remove('d-none');
    }
}

// Скрыть меню пользователя
function hideUserMenu() {
    const userMenu = document.querySelector('.user-menu');
    if (userMenu) {
        userMenu.classList.add('d-none');
    }
}

// Показать кнопки авторизации
function showAuthButtons() {
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons) {
        authButtons.classList.remove('d-none');
    }
}

// Скрыть кнопки авторизации
function hideAuthButtons() {
    const authButtons = document.querySelector('.auth-buttons');
    if (authButtons) {
        authButtons.classList.add('d-none');
    }
}

// Обновление счетчика уведомлений
async function updateNotificationCount() {
    try {
        const response = await fetch('/api/notifications/unread/count');
        const data = await response.json();
        
        if (response.ok) {
            const badge = document.getElementById('notificationCount');
            if (badge) {
                badge.textContent = data.count;
                badge.style.display = data.count > 0 ? 'inline' : 'none';
            }
        }
    } catch (error) {
        console.error('Ошибка при получении количества уведомлений:', error);
    }
}

// Периодическое обновление счетчика уведомлений, только если элемент существует
const notificationCountElement = document.getElementById('notificationCount');
if (notificationCountElement) {
    setInterval(updateNotificationCount, 60000); // Обновляем каждую минуту
}

// Функция для отображения сообщения об ошибке
function showError(message) {
    // Проверяем наличие элемента для отображения ошибки
    const errorAlert = document.getElementById('errorAlert');
    if (errorAlert) {
        errorAlert.textContent = message;
        errorAlert.style.display = 'block';
        
        // Автоматически скрываем сообщение через 5 секунд
        setTimeout(() => {
            errorAlert.style.display = 'none';
        }, 5000);
    } else {
        // Если нет специального элемента, показываем модальное окно
        console.error(message);
        showMessage(message, 'error');
    }
}

// Функция для обновления данных пользователя с сервера
function refreshUserData() {
    console.log("Refreshing user data...");
    const token = getToken();
    
    if (token) {
        $.ajax({
            url: `${API_URL}/users/me`,
            type: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            success: function(userData) {
                console.log("User data refreshed:", userData);
                
                // Сохраняем обновленную информацию о пользователе
                const updatedUserData = {
                    id: userData.id,
                    username: userData.username,
                    email: userData.email,
                    roles: userData.roles || [],
                    avatarUrl: userData.avatarUrl
                };
                
                console.log("Updated user data with avatar:", updatedUserData);
                
                // Обновляем данные в localStorage
                updateUserInfo(updatedUserData);
                
                // Обновляем UI после получения актуальных данных
                showAuthenticatedUI();
            },
            error: function(xhr) {
                console.error("Failed to refresh user data:", xhr.status, xhr.responseText);
                
                if (xhr.status === 401) {
                    // Если токен стал недействительным
                    localStorage.removeItem(TOKEN_KEY);
                    localStorage.removeItem(USER_KEY);
                    showUnauthenticatedUI();
                }
            }
        });
    }
}

// Функция для перехода на защищенные страницы с проверкой авторизации
function navigateToProtectedPage(url) {
    console.log("Attempting to navigate to protected page:", url);
    
    // Проверяем наличие токена
    const token = getToken();
    if (!token) {
        console.log("No token found, redirecting to login");
        window.location.href = '/login.html?redirect=' + encodeURIComponent(url);
        return;
    }
    
    // Используем AJAX для проверки доступа перед переходом
    $.ajax({
        url: '/api/auth/validate',
        headers: {
            'Authorization': `Bearer ${token}`
        },
        success: function() {
            // Токен валиден, переходим на страницу
            console.log("Token is valid, navigating to:", url);
            window.location.href = url;
        },
        error: function() {
            // Токен невалиден, перенаправляем на страницу логина
            console.log("Token is invalid, redirecting to login");
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            window.location.href = '/login.html?redirect=' + encodeURIComponent(url);
        }
    });
}

function showMessage(message) {
    // Использую console.log вместо рекурсивного вызова
    console.log(message);
}

// Обновляем UI для авторизованного пользователя
function updateAuthUI() {
    const token = localStorage.getItem('photoapp_token');
    const userStr = localStorage.getItem('photoapp_user');
    
    if (token && userStr) {
        try {
            const user = JSON.parse(userStr);
            
            // Показываем элементы для авторизованных пользователей
            document.querySelectorAll('.user-links').forEach(el => {
                el.style.display = 'block';
            });
            
            // Скрываем элементы для гостей
            document.querySelectorAll('.guest-links').forEach(el => {
                el.style.display = 'none';
            });
            
            // Обновляем имя пользователя в шапке
            const usernameDisplay = document.querySelector('.username-display');
            if (usernameDisplay) {
                usernameDisplay.textContent = user.username;
            }
            
            // Обновляем аватар пользователя в меню, если элемент существует
            const userMenuAvatar = document.querySelector('.user-menu-avatar');
            if (userMenuAvatar && user.avatarUrl && user.avatarUrl.trim() !== '') {
                console.log("Setting avatar in menu to:", user.avatarUrl);
                userMenuAvatar.src = user.avatarUrl;
                userMenuAvatar.style.display = 'inline-block';
                
                // Скрываем иконку, если она есть
                const userMenuIcon = userMenuAvatar.parentElement.querySelector('.fas.fa-user');
                if (userMenuIcon) {
                    userMenuIcon.style.display = 'none';
                }
                
                // Обработка ошибки загрузки аватара
                userMenuAvatar.onerror = function() {
                    console.error("Failed to load avatar in menu");
                    // Если аватар не загрузился, показываем иконку
                    userMenuAvatar.style.display = 'none';
                    if (userMenuIcon) {
                        userMenuIcon.style.display = 'inline-block';
                    }
                };
            } else {
                console.log("No avatar URL found for menu or avatar URL is empty");
                if (userMenuAvatar) {
                    if (!user.avatarUrl) {
                        console.log("User has no avatarUrl property");
                    } else if (user.avatarUrl.trim() === '') {
                        console.log("User avatarUrl is empty string");
                    }
                }
            }
            
            // Проверяем, есть ли у пользователя роль модератора или админа
            if (user.roles) {
                const isAdmin = user.roles.includes('ROLE_ADMIN');
                const isModerator = user.roles.includes('ROLE_MODERATOR');
                
                // Показываем элементы администрирования для админов
                document.querySelectorAll('.admin-only').forEach(el => {
                    el.style.display = isAdmin ? 'block' : 'none';
                });
                
                // Показываем элементы модерации для модераторов и админов
                document.querySelectorAll('.moderation-common').forEach(el => {
                    el.style.display = (isAdmin || isModerator) ? 'block' : 'none';
                });
            }
            
        } catch (error) {
            console.error('Ошибка при обновлении UI для авторизованного пользователя:', error);
        }
    } else {
        // Скрываем элементы для авторизованных пользователей
        document.querySelectorAll('.user-links').forEach(el => {
            el.style.display = 'none';
        });
        
        // Показываем элементы для гостей
        document.querySelectorAll('.guest-links').forEach(el => {
            el.style.display = 'block';
        });
        
        // Скрываем элементы администрирования
        document.querySelectorAll('.admin-only, .moderation-common').forEach(el => {
            el.style.display = 'none';
        });
    }
} 