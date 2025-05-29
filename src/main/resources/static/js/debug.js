// Debug.js - файл для отладки и диагностики проблем с JavaScript

// Ждем загрузки DOM, чтобы все скрипты были загружены
$(document).ready(function() {
    // Выполняем диагностику через небольшую задержку, чтобы убедиться, что все переменные установлены
    setTimeout(function() {
        runDiagnostics();
        // Запускаем тест авторизации после диагностики
        testAuthFunctions();
    }, 500);
});

// Функция диагностики
function runDiagnostics() {
    console.log("=== Debug.js: Diagnostic start ===");
    
    // Проверка загрузки скриптов
    console.log("Checking loaded scripts:");
    const loadedScripts = [];
    document.querySelectorAll('script').forEach(script => {
        if (script.src) {
            loadedScripts.push(script.src);
            console.log(" - " + script.src);
        }
    });
    
    // Проверка наличия токенов
    console.log("Auth check:");
    console.log(" - SECURITY_DISABLED:", typeof SECURITY_DISABLED !== 'undefined' ? SECURITY_DISABLED : 'undefined');
    console.log(" - Token exists:", localStorage.getItem('photoapp_token') ? 'Yes' : 'No');
    console.log(" - User exists:", localStorage.getItem('photoapp_user') ? 'Yes' : 'No');
    
    // Если пользователь существует, показываем информацию о нем
    const user = localStorage.getItem('photoapp_user');
    if (user) {
        try {
            const userData = JSON.parse(user);
            console.log(" - User ID:", userData.id);
            console.log(" - Username:", userData.username);
        } catch (e) {
            console.error(" - Error parsing user data:", e);
        }
    }
    
    // Проверка глобальных переменных
    console.log("Global variables check:");
    console.log(" - API_URL:", typeof API_URL !== 'undefined' ? API_URL : 'undefined');
    console.log(" - TOKEN_KEY:", typeof TOKEN_KEY !== 'undefined' ? TOKEN_KEY : 'undefined');
    console.log(" - USER_KEY:", typeof USER_KEY !== 'undefined' ? USER_KEY : 'undefined');
    
    console.log("=== Debug.js: Diagnostic end ===");
}

// Перехват и логирование всех ошибок
window.addEventListener('error', function(event) {
    console.error('Caught error:', event.error);
    console.error('Error message:', event.message);
    console.error('Error at:', event.filename, 'line', event.lineno, 'column', event.colno);
    
    // Сохраняем информацию об ошибке в localStorage для анализа
    const errors = JSON.parse(localStorage.getItem('debug_errors') || '[]');
    errors.push({
        message: event.message,
        file: event.filename,
        line: event.lineno,
        column: event.colno,
        timestamp: new Date().toISOString(),
        url: window.location.href
    });
    localStorage.setItem('debug_errors', JSON.stringify(errors));
    
    // Возвращаем false, чтобы предотвратить стандартную обработку ошибки
    return false;
});

// Проверка функций авторизации
function testAuthFunctions() {
    console.log("=== Testing auth functions ===");
    
    // Проверяем функции из api.js
    if (typeof getAuthToken === 'function') {
        console.log("getAuthToken exists, result:", getAuthToken());
    } else {
        console.error("getAuthToken is not defined!");
    }
    
    if (typeof getAuthHeader === 'function') {
        console.log("getAuthHeader exists, result:", getAuthHeader());
    } else {
        console.error("getAuthHeader is not defined!");
    }
    
    // Проверяем функции из auth.js
    if (typeof isLoggedIn === 'function') {
        console.log("isLoggedIn exists, result:", isLoggedIn());
    } else {
        console.error("isLoggedIn is not defined!");
    }
    
    if (typeof showAuthenticatedUI === 'function') {
        console.log("showAuthenticatedUI exists");
    } else {
        console.error("showAuthenticatedUI is not defined!");
    }
    
    console.log("=== Auth functions test complete ===");
} 