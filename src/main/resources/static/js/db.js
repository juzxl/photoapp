// db.js - Локальная база данных IndexedDB для кэширования фотографий

// Объявляем переменную для хранения соединения с базой данных
let db = null;
let dbReady = false;

// Инициализация базы данных
function initDB() {
    return new Promise((resolve, reject) => {
        // Проверяем поддержку IndexedDB в браузере
        if (!window.indexedDB) {
            console.warn('Ваш браузер не поддерживает IndexedDB. Локальный кэш не будет доступен.');
            reject('IndexedDB не поддерживается');
            return;
        }

        // Открываем или создаем базу данных
        const request = indexedDB.open('PhotoAppDB', 1);

        // Обработчик обновления структуры БД (срабатывает при первом создании или изменении версии)
        request.onupgradeneeded = function(event) {
            const db = event.target.result;

            // Создаем хранилище для фотографий с ключом по ID
            if (!db.objectStoreNames.contains('photos')) {
                const photosStore = db.createObjectStore('photos', { keyPath: 'id' });
                
                // Создаем индексы для быстрого поиска
                photosStore.createIndex('title', 'title', { unique: false });
                photosStore.createIndex('description', 'description', { unique: false });
                photosStore.createIndex('tags', 'tags', { unique: false, multiEntry: true });
                photosStore.createIndex('user', 'user.id', { unique: false });
            }

            console.log('База данных создана или обновлена.');
        };

        // Обработчик успешного открытия базы
        request.onsuccess = function(event) {
            db = event.target.result;
            dbReady = true;
            console.log('База данных успешно открыта.');
            resolve(db);
        };

        // Обработчик ошибок
        request.onerror = function(event) {
            console.error('Ошибка при открытии базы данных:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Сохранение фотографий в локальную базу
function savePhotosToLocalDB(photos) {
    return new Promise((resolve, reject) => {
        if (!dbReady || !db) {
            reject('База данных не готова');
            return;
        }

        const tx = db.transaction('photos', 'readwrite');
        const store = tx.objectStore('photos');

        // Сохраняем каждую фотографию
        let countSaved = 0;
        photos.forEach(photo => {
            const request = store.put(photo);
            request.onsuccess = function() {
                countSaved++;
                if (countSaved === photos.length) {
                    resolve(countSaved);
                }
            };
            request.onerror = function(event) {
                console.error('Ошибка при сохранении фото:', event.target.error);
                // Продолжаем сохранять другие фото
            };
        });

        // Обработка ошибок транзакции
        tx.onerror = function(event) {
            console.error('Ошибка транзакции:', event.target.error);
            reject(event.target.error);
        };

        // Если нет фотографий для сохранения
        if (photos.length === 0) {
            resolve(0);
        }
    });
}

// Поиск фотографий в локальной базе
function searchPhotosLocally(query) {
    return new Promise((resolve, reject) => {
        if (!dbReady || !db) {
            reject('База данных не готова');
            return;
        }

        const tx = db.transaction('photos', 'readonly');
        const store = tx.objectStore('photos');
        const results = [];

        // Функция для поиска по всем объектам
        const getAllPhotosRequest = store.openCursor();

        getAllPhotosRequest.onsuccess = function(event) {
            const cursor = event.target.result;
            if (cursor) {
                const photo = cursor.value;
                
                // Проверяем совпадение по различным полям
                const titleMatch = photo.title && photo.title.toLowerCase().includes(query.toLowerCase());
                const descMatch = photo.description && photo.description.toLowerCase().includes(query.toLowerCase());
                const idMatch = photo.id && photo.id.toString() === query;
                
                // Проверяем совпадение по тегам
                let tagMatch = false;
                if (photo.tags && Array.isArray(photo.tags)) {
                    tagMatch = photo.tags.some(tag => 
                        tag && tag.toLowerCase().includes(query.toLowerCase())
                    );
                }

                if (titleMatch || descMatch || idMatch || tagMatch) {
                    results.push(photo);
                }
                
                cursor.continue();
            } else {
                // Когда все записи обработаны
                console.log(`Локальный поиск по запросу "${query}" нашел ${results.length} фото`);
                resolve(results);
            }
        };

        getAllPhotosRequest.onerror = function(event) {
            console.error('Ошибка при поиске в локальной базе:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Очистка базы данных
function clearLocalDB() {
    return new Promise((resolve, reject) => {
        if (!dbReady || !db) {
            reject('База данных не готова');
            return;
        }

        const tx = db.transaction('photos', 'readwrite');
        const store = tx.objectStore('photos');
        const request = store.clear();

        request.onsuccess = function() {
            console.log('Локальная база данных очищена');
            resolve();
        };

        request.onerror = function(event) {
            console.error('Ошибка при очистке базы данных:', event.target.error);
            reject(event.target.error);
        };
    });
}

// Инициализируем базу данных при загрузке скрипта
initDB().catch(err => console.warn('Не удалось инициализировать локальную базу данных:', err));

// Экспортируем функции для использования в других скриптах
window.localDB = {
    init: initDB,
    savePhotos: savePhotosToLocalDB,
    search: searchPhotosLocally,
    clear: clearLocalDB
}; 