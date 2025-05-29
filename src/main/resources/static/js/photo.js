// JavaScript для страницы просмотра фото

// Глобальные переменные
let photoId = null;

// Обработчик загрузки DOM
document.addEventListener('DOMContentLoaded', () => {
    // Получаем ID фото из URL
    const urlParams = new URLSearchParams(window.location.search);
    photoId = urlParams.get('id');
    
    if (photoId) {
        loadPhoto(photoId);
        loadComments(photoId);
        setupEventListeners();
    } else {
        showError('Фотография не найдена');
    }
});

// Настройка обработчиков событий
function setupEventListeners() {
    // Обработчик отправки комментария
    document.getElementById('commentForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleCommentSubmit();
    });
    
    // Обработчик кнопки лайка
    document.getElementById('likeBtn').addEventListener('click', handleLike);
    
    // Обработчики для кнопок владельца фото
    document.getElementById('editPhotoBtn').addEventListener('click', handleEditPhoto);
    document.getElementById('deletePhotoBtn').addEventListener('click', handleDeletePhoto);
    
    // Обработчики для кнопок поделиться
    document.getElementById('shareFacebook').addEventListener('click', () => sharePhoto('facebook'));
    document.getElementById('shareTwitter').addEventListener('click', () => sharePhoto('twitter'));
    document.getElementById('shareCopyLink').addEventListener('click', () => sharePhoto('copy'));
}

// Загрузка информации о фотографии
async function loadPhoto(id) {
    try {
        const response = await fetch(`/api/photos/${id}/info`, {
            headers: getAuthHeaders()
        });
        
        const photo = await handleFetchResponse(response);
        
        if (photo) {
            displayPhoto(photo);
            checkOwnership(photo.user.id);
        }
    } catch (error) {
        console.error('Ошибка при загрузке фотографии:', error);
        showError('Произошла ошибка при загрузке фотографии');
    }
}

// Отображение информации о фотографии
function displayPhoto(photo) {
    document.title = `${photo.title || 'Без названия'} - Фотогалерея`;
    
    // Основная информация
    document.getElementById('photoImage').src = photo.url;
    document.getElementById('photoTitle').textContent = photo.title || 'Без названия';
    document.getElementById('photoDescription').textContent = photo.description || 'Описание отсутствует';
    
    // Информация об авторе
    document.getElementById('photoAuthor').textContent = photo.user.username;
    document.getElementById('photoAuthor').href = `/profile.html?id=${photo.user.id}`;
    
    // Дата добавления
    document.getElementById('photoDate').textContent = formatDate(photo.createdAt);
    
    // Статистика
    document.getElementById('viewCount').textContent = photo.viewCount || 0;
    document.getElementById('likesCount').textContent = photo.likes || 0;
    document.getElementById('commentsCount').textContent = photo.commentCount || 0;
    
    // Альбом
    if (photo.album) {
        document.getElementById('albumSection').style.display = 'block';
        document.getElementById('albumName').textContent = photo.album.name;
        document.getElementById('albumLink').href = `/album.html?id=${photo.album.id}`;
    } else {
        document.getElementById('albumSection').style.display = 'none';
    }
    
    // Теги
    if (photo.tags && photo.tags.length > 0) {
        document.getElementById('tagsSection').style.display = 'block';
        const tagsContainer = document.getElementById('photoTags');
        tagsContainer.innerHTML = photo.tags.map(tag => 
            `<a href="/gallery.html?tag=${tag.name}" class="badge bg-primary me-1">${tag.name}</a>`
        ).join('');
    } else {
        document.getElementById('tagsSection').style.display = 'none';
    }
}

// Проверка, является ли текущий пользователь владельцем фото
function checkOwnership(ownerId) {
    const currentUser = JSON.parse(localStorage.getItem('photoapp_user'));
    if (currentUser && currentUser.id === ownerId) {
        // Показываем кнопки редактирования и удаления
        document.querySelectorAll('.owner-actions').forEach(el => {
            el.style.display = 'block';
        });
    }
}

// Загрузка комментариев
async function loadComments(photoId) {
    try {
        const response = await fetch(`/api/comments/photo/${photoId}`, {
            headers: getAuthHeaders()
        });
        
        const comments = await handleFetchResponse(response);
        
        const commentsList = document.getElementById('commentsList');
        
        if (comments && comments.length > 0) {
            commentsList.innerHTML = comments.map(comment => `
                <div class="comment mb-3">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="comment-author fw-bold">${comment.user.username}</div>
                        <div class="comment-date text-muted small">${formatDate(comment.createdAt)}</div>
                    </div>
                    <div class="comment-content mt-1">${comment.content}</div>
                    ${isCurrentUser(comment.user.id) ? `
                        <div class="comment-actions mt-1 text-end">
                            <button class="btn btn-sm btn-outline-danger" onclick="deleteComment(${comment.id})">
                                <i class="bi bi-trash"></i> Удалить
                            </button>
                        </div>
                    ` : ''}
                </div>
            `).join('');
            
            // Обновляем счетчик комментариев
            document.getElementById('commentsCount').textContent = comments.length;
        } else {
            commentsList.innerHTML = '<div class="text-center text-muted my-3">Комментариев пока нет</div>';
        }
    } catch (error) {
        console.error('Ошибка при загрузке комментариев:', error);
        document.getElementById('commentsList').innerHTML = 
            '<div class="alert alert-danger">Не удалось загрузить комментарии</div>';
    }
}

// Отправка комментария
async function handleCommentSubmit() {
    const content = document.getElementById('commentText').value.trim();
    
    if (!content) {
        showError('Пожалуйста, введите текст комментария');
        return;
    }
    
    try {
        const response = await fetch(`/api/comments/photo/${photoId}`, {
            method: 'POST',
            headers: {
                ...getAuthHeaders(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ content })
        });
        
        await handleFetchResponse(response);
        
        // Очищаем поле ввода
        document.getElementById('commentText').value = '';
        
        // Перезагружаем комментарии
        loadComments(photoId);
    } catch (error) {
        console.error('Ошибка при отправке комментария:', error);
        showError('Не удалось отправить комментарий');
    }
}

// Удаление комментария
async function deleteComment(commentId) {
    if (!confirm('Вы уверены, что хотите удалить этот комментарий?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/comments/${commentId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        await handleFetchResponse(response);
        
        // Перезагружаем комментарии
        loadComments(photoId);
    } catch (error) {
        console.error('Ошибка при удалении комментария:', error);
        showError('Не удалось удалить комментарий');
    }
}

// Обработка лайка фотографии
async function handleLike() {
    // Заглушка - реальную функциональность нужно реализовать
    showMessage('Функция "Нравится" будет реализована позже', 'info');
}

// Редактирование фотографии
function handleEditPhoto() {
    window.location.href = `/edit-photo.html?id=${photoId}`;
}

// Удаление фотографии
async function handleDeletePhoto() {
    if (!confirm('Вы уверены, что хотите удалить эту фотографию?')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/photos/${photoId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        await handleFetchResponse(response);
        
        showMessage('Фотография успешно удалена', 'success');
        window.location.href = '/my-photos.html';
    } catch (error) {
        console.error('Ошибка при удалении фото:', error);
        showError('Не удалось удалить фотографию');
    }
}

// Поделиться фотографией
function sharePhoto(platform) {
    const url = window.location.href;
    
    switch (platform) {
        case 'facebook':
            window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
            break;
        case 'twitter':
            window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}`, '_blank');
            break;
        case 'copy':
            navigator.clipboard.writeText(url)
                .then(() => showMessage('Ссылка скопирована в буфер обмена', 'success'))
                .catch(err => {
                    console.error('Не удалось скопировать ссылку:', err);
                    prompt('Скопируйте эту ссылку:', url);
                });
            break;
    }
}

// Вспомогательные функции
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function isCurrentUser(userId) {
    const currentUser = JSON.parse(localStorage.getItem('photoapp_user'));
    return currentUser && currentUser.id === userId;
}

function showError(message) {
    console.error(message);
    showMessage(message, 'error');
}

// Вспомогательная функция для обработки ответов fetch
async function handleFetchResponse(response) {
    const data = await response.json();
    
    if (!response.ok) {
        throw new Error(data.message || 'Произошла ошибка при выполнении запроса');
    }
    
    return data;
}

// Получение заголовков авторизации
function getAuthHeaders() {
    const token = localStorage.getItem('photoapp_token');
    return token ? { 
        'Authorization': `Bearer ${token}`
    } : {};
}

// Отображение сообщения
function showMessage(message, type) {
    const alertElement = document.createElement('div');
    alertElement.className = `alert alert-${type} mt-3`;
    alertElement.textContent = message;
    document.body.appendChild(alertElement);

    setTimeout(() => {
        alertElement.remove();
    }, 3000);
} 