document.addEventListener('DOMContentLoaded', function() {
    // Проверка авторизации и получение информации о пользователе
    checkAuthentication();
    
    // Инициализация форм
    initProfileForm();
    initPasswordForm();
    initNotificationsForm();
    
    // Слушатель для загрузки аватара
    document.getElementById('avatarUpload').addEventListener('change', handleAvatarUpload);
    
    // Инициализация обработчиков кнопок
    document.getElementById('deleteAccountBtn').addEventListener('click', showDeleteAccountModal);
    document.getElementById('confirmDeleteAccount').addEventListener('click', deleteAccount);
});

// Проверка авторизации и загрузка данных профиля
function checkAuthentication() {
    // Используем существующую функцию из api.js
    if (api.isAuthenticated()) {
        // Загружаем информацию о пользователе
        api.get('/api/users/me')
            .then(user => {
                updateUI(user);
                loadUserSettings(user.id);
            })
            .catch(error => {
                console.error('Ошибка загрузки информации о пользователе:', error);
                // Не перенаправляем здесь, т.к. это уже обрабатывается в auth.js
            });
    } else {
        // Перенаправление на страницу входа если пользователь не авторизован
        window.location.href = '/login.html?redirect=/settings';
    }
}

// Обновление UI с данными пользователя
function updateUI(user) {
    if (!user) return;
    
    // Обновляем отображаемое имя пользователя
    const usernameDisplay = document.querySelector('.username-display');
    if (usernameDisplay) {
        usernameDisplay.textContent = user.username;
    }
    
    // Показываем элементы для авторизованных пользователей
    document.querySelectorAll('.user-links').forEach(el => {
        el.style.display = 'block';
    });
    
    // Скрываем элементы для гостей
    document.querySelectorAll('.guest-links').forEach(el => {
        el.style.display = 'none';
    });
    
    // Заполняем поля информации о пользователе
    document.getElementById('username').value = user.username || '';
    document.getElementById('email').value = user.email || '';
    document.getElementById('displayName').value = user.displayName || '';
    document.getElementById('bio').value = user.bio || '';
    document.getElementById('location').value = user.location || '';
    document.getElementById('website').value = user.website || '';
    
    // Устанавливаем аватар пользователя или дефолтный аватар
    const avatarPreview = document.getElementById('avatarPreview');
    if (user.avatarUrl && user.avatarUrl.trim() !== '') {
        avatarPreview.src = user.avatarUrl;
        
        // Проверяем загрузку аватара
        avatarPreview.onerror = function() {
            console.warn('Не удалось загрузить аватар пользователя, используем дефолтный');
            avatarPreview.src = '/api/users/default-avatar';
            // Убираем обработчик ошибки чтобы избежать рекурсию
            avatarPreview.onerror = null;
        };
    } else {
        // Если аватара нет, используем дефолтный
        avatarPreview.src = '/api/users/default-avatar';
    }
}

// Загрузка настроек пользователя
function loadUserSettings(userId) {
    // Запрашиваем настройки пользователя с правильных эндпоинтов
    // Используем эндпоинт /api/users/me, который уже существует в контроллере
    
    // Делаем только один запрос к /api/users/me, т.к. все необходимые данные уже получены в checkAuthentication
    // Если в будущем понадобятся дополнительные настройки, используйте соответствующие эндпоинты:
    // /api/users/me/notifications - для настроек уведомлений
    
    // Настройки по умолчанию, если сервер не предоставил данные
    const defaultSettings = {
        notifications: {
            emailEnabled: false,
            commentsEnabled: true,
            likesEnabled: true,
            systemEnabled: true
        }
    };
    
    // Используем значения по умолчанию
    const settings = defaultSettings;
    console.log('Using default settings:', settings);
    
    // Настройки уведомлений
    if (settings.notifications) {
        document.getElementById('emailNotifications').checked = settings.notifications.emailEnabled || false;
        document.getElementById('notifyComments').checked = settings.notifications.commentsEnabled || false;
        document.getElementById('notifyLikes').checked = settings.notifications.likesEnabled || false;
        document.getElementById('notifySystem').checked = settings.notifications.systemEnabled || false;
    }
}

// Инициализация формы профиля
function initProfileForm() {
    const profileForm = document.getElementById('profileForm');
    if (!profileForm) return;
    
    profileForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const userData = {
            displayName: document.getElementById('displayName').value,
            bio: document.getElementById('bio').value,
            location: document.getElementById('location').value,
            website: document.getElementById('website').value
        };
        
        api.put('/api/users/me', userData)
            .then(response => {
                showSuccess('Информация профиля успешно обновлена');
            })
            .catch(error => {
                console.error('Ошибка обновления профиля:', error);
                
                // Проверяем статус ошибки
                if (error.xhr && error.xhr.status === 401) {
                    showError('Требуется авторизация. Перенаправление на страницу входа...');
                    // Даем пользователю время прочитать сообщение и затем перенаправляем
                    setTimeout(() => {
                        window.location.href = '/login.html?redirect=/settings';
                    }, 2000);
                } else {
                    showError('Не удалось обновить информацию профиля: ' + 
                        (error.xhr && error.xhr.responseText ? JSON.parse(error.xhr.responseText).message : 'Неизвестная ошибка'));
                }
            });
    });
}

// Инициализация формы изменения пароля
function initPasswordForm() {
    const passwordForm = document.getElementById('passwordForm');
    if (!passwordForm) return;
    
    passwordForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Проверка совпадения паролей
        if (newPassword !== confirmPassword) {
            showError('Новый пароль и подтверждение не совпадают');
            return;
        }
        
        // Проверка сложности пароля (примерная)
        const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            showError('Пароль должен содержать не менее 8 символов, включая буквы, цифры и специальные символы');
            return;
        }
        
        const passwordData = {
            currentPassword,
            newPassword
        };
        
        api.post('/api/auth/change-password', passwordData)
            .then(response => {
                showSuccess('Пароль успешно изменен');
                passwordForm.reset();
            })
            .catch(error => {
                console.error('Ошибка смены пароля:', error);
                
                // Проверяем статус ошибки
                if (error.xhr && error.xhr.status === 401) {
                    showError('Требуется авторизация. Перенаправление на страницу входа...');
                    // Даем пользователю время прочитать сообщение и затем перенаправляем
                    setTimeout(() => {
                        window.location.href = '/login.html?redirect=/settings';
                    }, 2000);
                } else if (error.xhr && error.xhr.status === 400) {
                    // Неверный текущий пароль
                    showError('Не удалось изменить пароль. Проверьте правильность текущего пароля');
                } else {
                    showError('Не удалось изменить пароль: ' + 
                        (error.xhr && error.xhr.responseText ? JSON.parse(error.xhr.responseText).message : 'Неизвестная ошибка'));
                }
            });
    });
}

// Инициализация формы настроек уведомлений
function initNotificationsForm() {
    const notificationsForm = document.getElementById('notificationsForm');
    if (!notificationsForm) return;
    
    notificationsForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const notificationsData = {
            emailEnabled: document.getElementById('emailNotifications').checked,
            commentsEnabled: document.getElementById('notifyComments').checked, 
            likesEnabled: document.getElementById('notifyLikes').checked,
            systemEnabled: document.getElementById('notifySystem').checked
        };
        
        api.put('/api/users/me/notifications', notificationsData)
            .then(response => {
                showSuccess('Настройки уведомлений успешно сохранены');
            })
            .catch(error => {
                console.error('Ошибка сохранения настроек уведомлений:', error);
                showError('Не удалось обновить настройки уведомлений');
            });
    });
}

// Обработчик загрузки аватара
function handleAvatarUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    // Проверка типа файла
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
        showError('Неподдерживаемый формат файла. Разрешены только JPG, PNG и GIF');
        return;
    }
    
    // Проверка размера файла (макс. 1MB)
    if (file.size > 1024 * 1024) {
        showError('Размер файла превышает 1MB');
        return;
    }
    
    // Отображаем превью загружаемого изображения
    const reader = new FileReader();
    reader.onload = function(e) {
        document.getElementById('avatarPreview').src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    // Загружаем файл на сервер
    const formData = new FormData();
    formData.append('avatar', file);
    
    // Используем метод postFormData из api.js для загрузки файла
    api.postFormData('/api/users/me/avatar', formData)
        .then(response => {
            showSuccess('Аватар успешно обновлен');
            if (response && response.avatarUrl) {
                document.getElementById('avatarPreview').src = response.avatarUrl;
                
                // Обновляем информацию о пользователе в localStorage
                const userStr = localStorage.getItem('photoapp_user');
                if (userStr) {
                    try {
                        const user = JSON.parse(userStr);
                        user.avatarUrl = response.avatarUrl;
                        localStorage.setItem('photoapp_user', JSON.stringify(user));
                        console.log('Информация о пользователе обновлена в localStorage');
                    } catch (error) {
                        console.error('Ошибка обновления пользователя в localStorage:', error);
                    }
                }
            }
        })
        .catch(error => {
            console.error('Ошибка загрузки аватара:', error);
            
            // Восстанавливаем аватар на дефолтный в случае ошибки
            if (error.xhr && error.xhr.status === 401) {
                document.getElementById('avatarPreview').src = '/api/users/default-avatar';
                showError('Не удалось загрузить аватар: требуется авторизация. Пожалуйста, войдите снова.');
                setTimeout(() => {
                    window.location.href = '/login.html?redirect=/settings';
                }, 2000);
            } else {
                showError('Не удалось загрузить аватар: ' + (error.xhr ? error.xhr.statusText : 'Ошибка сети'));
                // Восстанавливаем дефолтную аватарку или предыдущее изображение
                checkAuthentication();
            }
        });
}

// Показать модальное окно подтверждения удаления аккаунта
function showDeleteAccountModal() {
    const modal = new bootstrap.Modal(document.getElementById('deleteAccountModal'));
    modal.show();
}

// Удаление аккаунта
function deleteAccount() {
    const password = document.getElementById('deleteConfirmPassword').value;
    if (!password) {
        showError('Введите пароль для подтверждения');
        return;
    }
    
    api.post('/api/users/me/delete', { password })
        .then(() => {
            showSuccess('Ваш аккаунт был успешно удален');
            setTimeout(() => {
                // Выход и перенаправление на главную страницу
                localStorage.removeItem('auth_token');
                window.location.href = '/';
            }, 2000);
        })
        .catch(error => {
            console.error('Ошибка удаления аккаунта:', error);
            showError('Не удалось удалить аккаунт. Проверьте правильность пароля');
        });
}

// Отображение сообщения об успешном действии
function showSuccess(message) {
    const alert = document.getElementById('successAlert');
    alert.textContent = message;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
}

// Отображение сообщения об ошибке
function showError(message) {
    const alert = document.getElementById('errorAlert');
    alert.textContent = message;
    alert.style.display = 'block';
    
    setTimeout(() => {
        alert.style.display = 'none';
    }, 5000);
} 