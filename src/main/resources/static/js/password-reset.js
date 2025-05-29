$(document).ready(function() {
    // Обработка формы запроса на восстановление пароля
    $('#forgotPasswordForm').on('submit', function(e) {
        e.preventDefault();
        
        const email = $('#email').val();
        
        // Отправка запроса на сервер
        $.ajax({
            url: '/api/auth/forgot-password',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ email: email }),
            success: function(response) {
                // Переход на второй шаг
                $('#step-1').hide();
                $('#step-2').show();
                $('#email-verify').val(email);
                
                // Показываем сообщение об успехе
                showMessage('success', 'Код подтверждения отправлен на ваш email.');
            },
            error: function(xhr) {
                let errorMsg = 'Произошла ошибка при отправке запроса.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                }
                showMessage('danger', errorMsg);
            }
        });
    });
    
    // Обработка формы подтверждения кода
    $('#verifyCodeForm').on('submit', function(e) {
        e.preventDefault();
        
        const email = $('#email-verify').val();
        const resetCode = $('#resetCode').val();
        
        // Отправка запроса на сервер
        $.ajax({
            url: '/api/auth/verify-reset-code',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ 
                email: email, 
                resetCode: resetCode 
            }),
            success: function(response) {
                // Переход на третий шаг
                $('#step-2').hide();
                $('#step-3').show();
                $('#token').val(response.token);
                
                showMessage('success', 'Код подтвержден. Установите новый пароль.');
            },
            error: function(xhr) {
                let errorMsg = 'Неверный код подтверждения.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                }
                showMessage('danger', errorMsg);
            }
        });
    });
    
    // Обработка формы сброса пароля
    $('#resetPasswordForm').on('submit', function(e) {
        e.preventDefault();
        
        const newPassword = $('#newPassword').val();
        const confirmPassword = $('#confirmPassword').val();
        const token = $('#token').val();
        
        // Проверка совпадения паролей
        if (newPassword !== confirmPassword) {
            showMessage('danger', 'Пароли не совпадают');
            return;
        }
        
        // Отправка запроса на сервер
        $.ajax({
            url: '/api/auth/reset-password',
            type: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ 
                token: token, 
                newPassword: newPassword 
            }),
            success: function(response) {
                showMessage('success', 'Пароль успешно изменен. Вы будете перенаправлены на страницу входа.');
                
                // Перенаправление на страницу входа через 3 секунды
                setTimeout(function() {
                    window.location.href = '/login.html';
                }, 3000);
            },
            error: function(xhr) {
                let errorMsg = 'Произошла ошибка при сбросе пароля.';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMsg = xhr.responseJSON.message;
                }
                showMessage('danger', errorMsg);
            }
        });
    });
    
    // Функция для отображения сообщений пользователю
    function showMessage(type, message) {
        const alertBox = $('#message-container');
        alertBox.removeClass('alert-success alert-danger alert-warning')
                .addClass('alert-' + type)
                .html(message)
                .show();
    }
    
    // Проверка URL параметров для автоматического перехода между шагами
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const email = urlParams.get('email');
    
    if (token && email) {
        // Если в URL есть токен и email, переходим сразу к шагу сброса пароля
        $('#step-1').hide();
        $('#step-3').show();
        $('#token').val(token);
        showMessage('info', 'Пожалуйста, установите новый пароль.');
    }
}); 