// =========== LOGIN PAGE ===========
const loginPageScripts = {
    
    setup: function() {
        $(document).ready(function() {
            const urlParams = new URLSearchParams(window.location.search);
            
            if (urlParams.has('error')) {
                $('#error-message').text('Неверное имя пользователя или пароль').show();
            }
            
            if (urlParams.has('redirect')) {
                const redirectUrl = urlParams.get('redirect');
                $('#redirect').val(redirectUrl);
                
                $('#loginForm').attr('action', '/api/auth/login?redirect=' + encodeURIComponent(redirectUrl));
            }
            
            updateAuthUI();
            
            $('#loginForm').on('submit', function(e) {
                e.preventDefault();
                
                const username = $('#username').val();
                const password = $('#password').val();
                
                console.log("Calling login with:", username, password);
                $.ajax({
                    url: '/api/auth/signin',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        usernameOrEmail: username,
                        password: password
                    }),
                    success: function(response) {
                        console.log("Login successful, raw response:", response);
                        
                        const token = response.accessToken || response.token;
                        
                        console.log("Received token:", token);
                        console.log("Using key:", 'photoapp_token');
                        
                        if (!token) {
                            console.error("No token received in response! Response fields:", Object.keys(response));
                            $('#error-message').text('Ошибка получения токена').show();
                            return;
                        }
                        
                        localStorage.setItem('photoapp_token', token);
                        localStorage.setItem('photoapp_user', JSON.stringify({
                            id: response.id,
                            username: response.username,
                            email: response.email,
                            roles: response.roles
                        }));
                        
                        console.log("Token saved:", localStorage.getItem('photoapp_token'));
                        console.log("User saved:", localStorage.getItem('photoapp_user'));
                        
                        const redirectUrl = $('#redirect').val() || '/';
                        window.location.href = redirectUrl;
                    },
                    error: function(xhr) {
                        console.error("Login failed:", xhr);
                        let errorMsg = 'Ошибка входа. Пожалуйста, попробуйте снова.';
                        if (xhr.status === 401) {
                            errorMsg = 'Неверное имя пользователя или пароль';
                        } else if (xhr.responseJSON && xhr.responseJSON.message) {
                            errorMsg = xhr.responseJSON.message;
                        }
                        $('#error-message').text(errorMsg).show();
                    }
                });
            });
        });
    }
};

// =========== UPLOAD PAGE ===========
const uploadPageScripts = {
    // Глобальное определение API_URL для страницы загрузки
    setup: function() {
        console.log('Upload page scripts setup');
        // Глобальное определение API_URL, чтобы оно гарантированно было доступно
        window.API_URL = '/api';
        
        // Глобальная функция для создания альбома
        window.createNewAlbum = function() {
            console.log('Вызвана функция createNewAlbum()');
            
            const name = $('#albumName').val().trim();
            const description = $('#albumDescription').val().trim();
            const privacyLevel = $('input[name="albumPrivacyLevel"]:checked').val();
            
            if (!name) {
                showError('Название альбома обязательно.', '#albumAlert');
                return false;
            }
            
            const albumData = {
                name: name,
                description: description,
                privacyLevel: privacyLevel
            };
            
            console.log('Отправка запроса на создание альбома:', albumData);
            console.log('API URL:', window.API_URL);
            
            $.ajax({
                url: window.API_URL + '/albums',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(albumData),
                success: function(response) {
                    console.log('Альбом успешно создан:', response);
                    
                    // Закрываем модальное окно
                    $('#createAlbumModal').modal('hide');
                    
                    // Очищаем форму
                    // $('#createAlbumForm')[0].reset();
                    
                    // Обновляем список альбомов
                    loadAlbums();
                    
                    // Выбираем новый альбом
                    setTimeout(function() {
                        $('#albumId').val(response.id);
                    }, 500);
                },
                error: function(xhr, status, error) {
                    console.error('Ошибка создания альбома:', status, error);
                    console.error('Ответ сервера:', xhr.responseText);
                    
                    let errorMsg = 'Не удалось создать альбом. Пожалуйста, попробуйте еще раз.';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMsg = xhr.responseJSON.message;
                    }
                    showError(errorMsg, '#albumAlert');
                }
            });
            
            return false;
        };
        
        // Глобальная функция для создания категории
        window.createNewCategory = function() {
            console.log('Вызвана функция createNewCategory()');
            
            const name = $('#categoryName').val().trim();
            const description = $('#categoryDescription').val().trim();
            
            if (!name) {
                showError('Название категории обязательно.', '#categoryAlert');
                return false;
            }
            
            const categoryData = {
                name: name,
                description: description
            };
            
            console.log('Отправка запроса на создание категории:', categoryData);
            console.log('API URL:', window.API_URL);
            
            $.ajax({
                url: window.API_URL + '/categories',
                type: 'POST',
                contentType: 'application/json',
                data: JSON.stringify(categoryData),
                success: function(response) {
                    console.log('Категория успешно создана:', response);
                    
                    // Закрываем модальное окно
                    $('#createCategoryModal').modal('hide');
                    
                    // Очищаем форму
                    $('#createCategoryForm')[0].reset();
                    
                    // Обновляем список категорий
                    loadCategories();
                    
                    // Добавляем новую категорию в выбранные
                    setTimeout(function() {
                        const selectedCategories = $('#photoCategories').val() || [];
                        selectedCategories.push(response.id.toString());
                        $('#photoCategories').val(selectedCategories);
                    }, 500);
                },
                error: function(xhr, status, error) {
                    console.error('Ошибка создания категории:', status, error);
                    console.error('Ответ сервера:', xhr.responseText);
                    
                    let errorMsg = 'Не удалось создать категорию. Пожалуйста, попробуйте еще раз.';
                    if (xhr.responseJSON && xhr.responseJSON.message) {
                        errorMsg = xhr.responseJSON.message;
                    }
                    showError(errorMsg, '#categoryAlert');
                }
            });
            
            return false;
        };
        
        // Глобальная функция для показа ошибок
        window.showError = function(message, container) {
            $(container).removeClass('alert-success alert-info').addClass('alert-danger')
                .text(message).show();
        };

        // $('#createAlbumForm').on('submit', function(e) {
        //     e.preventDefault();
        //     createNewAlbum();
        //     return false;
        // });
    },
    
    // Инициализация формы загрузки
    initUploadForm: function() {
        $(document).ready(function() {
            // Проверяем авторизацию
            checkAuthState();
            
            // Проверяем доступ к защищенной странице
            checkProtectedPage();
            
            // Обновляем UI для авторизованного пользователя
            updateAuthUI();
            
            // Загружаем категории
            loadCategories();
            
            // Загружаем альбомы пользователя
            loadAlbums();
            
            // Предпросмотр изображения при выборе файла
            $('#photoFile').on('change', function(e) {
                const file = e.target.files[0];
                if (file) {
                    // Проверка типа файла
                    if (!file.type.match('image.*')) {
                        showError('Пожалуйста, выберите изображение.', '#uploadAlert');
                        this.value = ''; // Очищаем поле
                        $('#imagePreview').hide();
                        return;
                    }
                    
                    // Проверка размера файла (10MB максимум)
                    if (file.size > 10 * 1024 * 1024) {
                        showError('Размер файла превышает 10MB.', '#uploadAlert');
                        this.value = ''; // Очищаем поле
                        $('#imagePreview').hide();
                        return;
                    }
                    
                    // Показываем предпросмотр
                    const reader = new FileReader();
                    reader.onload = function(e) {
                        $('#imagePreview').attr('src', e.target.result).show();
                    };
                    reader.readAsDataURL(file);
                } else {
                    $('#imagePreview').hide();
                }
            });
            
            // Отправка формы
            $('#uploadForm').on('submit', function(e) {
                e.preventDefault();
                
                const title = $('#photoTitle').val().trim();
                const description = $('#photoDescription').val().trim();
                const fileInput = $('#photoFile')[0];
                const albumId = $('#albumId').val();
                const categoryIds = $('#photoCategories').val() || [];
                const tags = $('#photoTags').val().trim();
                const privacyLevel = $('input[name="privacyLevel"]:checked').val();
                
                if (!title || !fileInput.files[0]) {
                    showError('Название и фотография обязательны.', '#uploadAlert');
                    return;
                }
                
                // Создаем FormData для отправки файла
                const formData = new FormData();
                formData.append('file', fileInput.files[0]);
                formData.append('title', title);
                formData.append('description', description);
                if (albumId) formData.append('albumId', albumId);
                if (categoryIds.length > 0) {
                    categoryIds.forEach(id => formData.append('categoryIds', id));
                }
                formData.append('tags', tags);
                formData.append('privacyLevel', privacyLevel);
                
                // Показываем прогресс загрузки
                $('#uploadAlert').removeClass('alert-danger alert-success')
                    .addClass('alert-info')
                    .html('<div class="text-center"><div class="spinner-border spinner-border-sm me-2" role="status"></div>Загрузка фотографии...</div>')
                    .show();
                
                $.ajax({
                    url: `${API_URL}/photos/upload`,
                    type: 'POST',
                    data: formData,
                    processData: false,
                    contentType: false,
                    success: function(response) {
                        // Показываем сообщение об успехе
                        $('#uploadAlert').removeClass('alert-danger alert-info').addClass('alert-success')
                            .text('Фотография успешно загружена!').show();
                        
                        // Очищаем форму
                        $('#uploadForm')[0].reset();
                        $('#imagePreview').hide();
                        
                        // Перенаправляем на страницу галереи через 2 секунды
                        setTimeout(function() {
                            window.location.href = '/gallery';
                        }, 2000);
                    },
                    error: function(xhr) {
                        let errorMsg = 'Не удалось загрузить фотографию. Пожалуйста, попробуйте еще раз.';
                        if (xhr.responseJSON && xhr.responseJSON.message) {
                            errorMsg = xhr.responseJSON.message;
                        }
                        showError(errorMsg, '#uploadAlert');
                    }
                });
            });
        });
        
        // Загрузка категорий
        function loadCategories() {
            $.ajax({
                url: `${API_URL}/categories`,
                type: 'GET',
                success: function(categories) {
                    let categoriesHtml = '';
                    
                    categories.forEach(category => {
                        categoriesHtml += `<option value="${category.id}">${category.name}</option>`;
                    });
                    
                    $('#photoCategories').html(categoriesHtml);
                },
                error: function() {
                    showError('Не удалось загрузить категории. Пожалуйста, попробуйте позже.', '#uploadAlert');
                }
            });
        }
        
        
    }
};

// Загрузка альбомов пользователя
function loadAlbums() {
    $.ajax({
        url: `${API_URL}/albums/user`,
        type: 'GET',
        success: function(albums) {
            let albumsHtml = '<option value="">-- Выберите альбом --</option>';
            
            albums.forEach(album => {
                albumsHtml += `<option value="${album.id}">${album.name}</option>`;
            });
            
            $('#albumId').html(albumsHtml);
        },
        error: function() {
            console.error('Не удалось загрузить альбомы');
        }
    });
}

// =========== REGISTER PAGE ===========
const registerPageScripts = {
    setup: function() {
        $(document).ready(function() {
            // Проверяем, авторизован ли пользователь
            const token = localStorage.getItem('photoapp_token');
            const user = localStorage.getItem('photoapp_user');
            
            // Если пользователь уже авторизован, перенаправляем на главную
            if (token && user) {
                window.location.href = '/';
                return;
            }
            
            $('#registerForm').on('submit', function(e) {
                e.preventDefault();
                
                const username = $('#username').val();
                const email = $('#email').val();
                const password = $('#password').val();
                
                // Валидация на стороне клиента
                if (username.length < 2) {
                    $('#error-message').text('Имя пользователя должно содержать минимум 2 символа').show();
                    return;
                }
                
                if (!/^[а-яА-Яa-zA-Z]+$/.test(username)) {
                    $('#error-message').text('Имя должно содержать только буквы').show();
                    return;
                }
                
                if (password.length < 8) {
                    $('#error-message').text('Пароль должен содержать минимум 8 символов').show();
                    return;
                }
                
                // Скрываем сообщения
                $('#error-message').hide();
                $('#success-message').hide();
                
                // Отправляем запрос на регистрацию
                $.ajax({
                    url: '/api/auth/signup',
                    type: 'POST',
                    contentType: 'application/json',
                    data: JSON.stringify({
                        username: username,
                        email: email,
                        password: password
                    }),
                    success: function(response) {
                        $('#success-message')
                            .text('Регистрация успешна! Теперь вы можете войти в систему. Сейчас вы будете перенаправлены на страницу входа...')
                            .show();
                        
                        // Очищаем форму
                        $('#registerForm')[0].reset();
                        
                        // Перенаправляем на страницу входа через 3 секунды
                        setTimeout(function() {
                            window.location.href = '/login.html';
                        }, 3000);
                    },
                    error: function(xhr) {
                        let errorMsg = 'Ошибка регистрации. Пожалуйста, попробуйте снова.';
                        if (xhr.responseJSON && xhr.responseJSON.message) {
                            if (xhr.responseJSON.message.includes('username') || xhr.responseJSON.message.includes('email')) {
                                errorMsg = 'Логин или email уже заняты. Пожалуйста, выберите другие данные.';
                            } else {
                                errorMsg = xhr.responseJSON.message;
                            }
                        }
                        $('#error-message').text(errorMsg).show();
                    }
                });
            });
        });
    }
};

// =========== ALBUMS PAGE ===========
const albumsPageScripts = {
    setup: function() {
        $(document).ready(function() {
            // Проверяем доступ к защищенной странице
            checkProtectedPage();
            
            // Обновляем UI для авторизованного пользователя
            updateAuthUI();
            
            // Загружаем альбомы пользователя
            albumsPageScripts.loadUserAlbums();
            
            // Обработка создания нового альбома
            $('#createAlbumForm').on('submit', function(e) {
                e.preventDefault();
                
                const name = $('#albumName').val().trim();
                const description = $('#albumDescription').val().trim();
                const privacyLevel = $('input[name="albumPrivacyLevel"]:checked').val();
                
                if (!name) {
                    showError('Название альбома обязательно.', '#albumAlert');
                    return;
                }

                const albumData = {
                    name: name,
                    description: description,
                    privacyLevel: privacyLevel
                };
            });

            // Обработка редактирования альбома
            $('#editAlbumForm').on('submit', function(e) {
                e.preventDefault();
                
                const albumId = $('#editAlbumId').val();
                const name = $('#editAlbumName').val().trim();
                const description = $('#editAlbumDescription').val().trim();
                const privacyLevel = $('input[name="editAlbumPrivacyLevel"]:checked').val();
                
                if (!name) {
                    showError('Название альбома обязательно.', '#editAlbumAlert');
                    return;
                }
                
                const albumData = {
                    name: name,
                    description: description,
                    privacyLevel: privacyLevel
                };

                $.ajax({
                    url: `${API_URL}/albums/${albumId}`,
                    type: 'PUT',
                    contentType: 'application/json',
                    data: JSON.stringify(albumData),
                    success: function(response) {
                        // Закрываем модальное окно
                        $('#editAlbumModal').modal('hide');
                        
                        // Показываем сообщение об успехе
                        showSuccess('Альбом успешно обновлен!', '#albumsAlert');
                        
                        // Обновляем список альбомов
                        albumsPageScripts.loadUserAlbums();
                    },
                    error: function(xhr) {
                        let errorMsg = 'Не удалось обновить альбом. Пожалуйста, попробуйте еще раз.';
                        if (xhr.responseJSON && xhr.responseJSON.message) {
                            errorMsg = xhr.responseJSON.message;
                        }
                        showError(errorMsg, '#editAlbumAlert');
                    }
                });
            });
            
            // Настройка модального окна удаления альбома
            $(document).on('click', '.delete-album-btn', function() {
                const albumId = $(this).data('id');
                const albumName = $(this).data('name');
                
                $('#deleteAlbumName').text(albumName);
                
                // Настраиваем кнопку подтверждения
                $('#confirmDeleteAlbum').data('id', albumId);
                
                // Открываем модальное окно
                $('#deleteAlbumModal').modal('show');
            });
            
            // Обработка удаления альбома
            $('#confirmDeleteAlbum').on('click', function() {
                const albumId = $(this).data('id');
                
                $.ajax({
                    url: `${API_URL}/albums/${albumId}`,
                    type: 'DELETE',
                    success: function(response) {
                        // Закрываем модальное окно
                        $('#deleteAlbumModal').modal('hide');
                        
                        // Показываем сообщение об успехе
                        showSuccess('Альбом успешно удален!', '#albumsAlert');
                        
                        // Обновляем список альбомов
                        albumsPageScripts.loadUserAlbums();
                    },
                    error: function(xhr) {
                        // Закрываем модальное окно
                        $('#deleteAlbumModal').modal('hide');
                        
                        let errorMsg = 'Не удалось удалить альбом. Пожалуйста, попробуйте еще раз.';
                        if (xhr.responseJSON && xhr.responseJSON.message) {
                            errorMsg = xhr.responseJSON.message;
                        }
                        showError(errorMsg, '#albumsAlert');
                    }
                });
            });
            
            // Настройка модального окна редактирования альбома
            $(document).on('click', '.edit-album-btn', function() {
                const albumId = $(this).data('id');
                
                // Получаем данные альбома
                $.ajax({
                    url: `${API_URL}/albums/${albumId}`,
                    type: 'GET',
                    success: function(album) {
                        // Заполняем форму данными
                        $('#editAlbumId').val(album.id);
                        $('#editAlbumName').val(album.name);
                        $('#editAlbumDescription').val(album.description);
                        
                        // Устанавливаем приватность
                        $(`input[name="editAlbumPrivacyLevel"][value="${album.privacyLevel}"]`).prop('checked', true);
                        
                        // Открываем модальное окно
                        $('#editAlbumModal').modal('show');
                    },
                    error: function(xhr) {
                        let errorMsg = 'Не удалось загрузить данные альбома. Пожалуйста, попробуйте еще раз.';
                        if (xhr.responseJSON && xhr.responseJSON.message) {
                            errorMsg = xhr.responseJSON.message;
                        }
                        showError(errorMsg, '#albumsAlert');
                    }
                });
            });
        });
    },
    
    // Вспомогательные функции для работы с альбомами
    loadUserAlbums: function() {
        $.ajax({
            url: `${API_URL}/albums/user`,
            type: 'GET',
            headers: getAuthHeader(),
            success: function(albums) {
                const container = $('#albumsContainer');
                container.empty();
                
                if (albums && albums.length > 0) {
                    console.log("Loaded albums:", albums);
                    
                    albums.forEach(function(album) {
                        // Определяем изображение обложки
                        let coverImageUrl = '';
                        let defaultCoverClass = '';
                        if (album.coverPhotoId) {
                            console.log(`Album ${album.id} (${album.name}) has coverPhotoId: ${album.coverPhotoId}`);
                            coverImageUrl = `/api/photos/image/${album.coverPhotoId}`;
                        } else {
                            console.log(`Album ${album.id} (${album.name}) has NO coverPhotoId`);
                            defaultCoverClass = 'default-album-cover';
                        }
                        
                        // Определяем иконку для уровня приватности
                        let privacyIcon = '';
                        let privacyText = '';
                        switch (album.privacyLevel) {
                            case 'PUBLIC':
                                privacyIcon = 'bi-globe';
                                privacyText = 'Публичный';
                                break;
                            case 'FRIENDS':
                                privacyIcon = 'bi-people';
                                privacyText = 'Для друзей';
                                break;
                            case 'PRIVATE':
                                privacyIcon = 'bi-lock';
                                privacyText = 'Приватный';
                                break;
                            default:
                                privacyIcon = 'bi-lock';
                                privacyText = 'Приватный';
                        }
                        
                        // Форматируем дату создания
                        const createdAt = new Date(album.createdAt);
                        const formattedDate = createdAt.toLocaleDateString('ru-RU', {
                            day: '2-digit',
                            month: 'long',
                            year: 'numeric'
                        });
                        
                        // Создаем карточку альбома
                        const albumCard = $(`
                            <div class="col-md-4 col-sm-6 mb-4">
                                <div class="photo-card album-card" data-album-id="${album.id}">
                                    <img src="${coverImageUrl}" alt="${album.name}" class="card-img-top ${defaultCoverClass}">
                                    
                                    <div class="photo-overlay">
                                        <div class="action-buttons">
                                            <a href="/album.html?id=${album.id}" class="action-btn view" title="Открыть альбом">
                                                <i class="fas fa-folder-open"></i>
                                            </a>
                                            <button class="action-btn edit edit-album-btn" data-album-id="${album.id}" title="Редактировать альбом">
                                                <i class="fas fa-edit"></i>
                                            </button>
                                            <button class="action-btn delete delete-album-btn" data-album-id="${album.id}" data-album-name="${album.name}" title="Удалить альбом">
                                                <i class="fas fa-trash"></i>
                                            </button>
                                        </div>
                                    </div>
                                    
                                    <div class="photo-info">
                                        <h5 class="photo-title">${album.name}</h5>
                                        <div class="photo-meta">
                                            <div class="album-privacy">
                                                <i class="bi ${privacyIcon}"></i> ${privacyText}
                                            </div>
                                            <div class="album-date">${formattedDate}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        `);
                        
                        container.append(albumCard);
                    });
                    
                    $('#emptyAlbums').addClass('d-none');
                } else {
                    $('#emptyAlbums').removeClass('d-none');
                }
            },
            error: function() {
                showError('Не удалось загрузить альбомы', '#albumsAlert');
            }
        });
    },
    
    // Функции для вывода сообщений пользователю
    showError: function(message, container) {
        $(container).removeClass('alert-success alert-info').addClass('alert-danger')
            .html(`<i class="bi bi-exclamation-triangle me-2"></i> ${message}`).show();
            
        // Автоматически скрываем сообщение через 5 секунд
        if (container === '#albumsAlert') {
            setTimeout(function() {
                $(container).hide();
            }, 5000);
        }
    },
    
    showSuccess: function(message, container) {
        $(container).removeClass('alert-danger alert-info').addClass('alert-success')
            .html(`<i class="bi bi-check-circle me-2"></i> ${message}`).show();
            
        // Автоматически скрываем сообщение через 5 секунд
        setTimeout(function() {
            $(container).hide();
        }, 5000);
    }
};

// Обновляем инициализацию для разных страниц
function initPageScripts() {
    const currentPage = window.location.pathname;
    
    if (currentPage.includes('login.html')) {
        loginPageScripts.setup();
    }
    
    if (currentPage.includes('register.html')) {
        registerPageScripts.setup();
    }
    
    if (currentPage.includes('upload')) {
        uploadPageScripts.setup();
        uploadPageScripts.initUploadForm();
        albumsPageScripts.setup();
    }
    
    if (currentPage.includes('albums')) {
        albumsPageScripts.setup();
    }
}

// Вызов инициализации при загрузке страницы
$(document).ready(function() {
    initPageScripts();
}); 