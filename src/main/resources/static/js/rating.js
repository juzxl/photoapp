/**
 * PhotoApp - Система рейтинга
 * 
 * Этот файл содержит функции для работы с рейтингами фотографий
 */

// Компонент для отображения и выставления рейтингов
class PhotoRating {
    constructor(container, options = {}) {
        this.container = typeof container === 'string' ? document.querySelector(container) : container;
        this.photoId = options.photoId || this.container.dataset.photoId;
        this.readonly = options.readonly || false;
        this.currentRating = options.currentRating || 0;
        this.averageRating = options.averageRating || 0;
        this.ratingCount = options.ratingCount || 0;
        this.onUpdate = options.onUpdate || null;
        this.API_URL = '/api';
        
        this.init();
    }
    
    // Инициализация компонента
    init() {
        this.render();
        if (!this.readonly) {
            this.loadUserRating();
            this.setupListeners();
        }
    }
    
    // Отрисовка компонента
    render() {
        // Очищаем контейнер
        this.container.innerHTML = '';
        
        // Создаем элемент для отображения среднего рейтинга
        const averageRatingDisplay = document.createElement('div');
        averageRatingDisplay.className = 'star-rating-display mb-2';
        averageRatingDisplay.innerHTML = this.getStarsHTML(this.averageRating);
        averageRatingDisplay.innerHTML += `<span class="rating-count">(${this.ratingCount})</span>`;
        
        this.container.appendChild(averageRatingDisplay);
        
        // Если рейтинг не только для чтения, добавляем интерактивные звезды
        if (!this.readonly) {
            const ratingForm = document.createElement('div');
            ratingForm.className = 'rating-form';
            
            const starRating = document.createElement('div');
            starRating.className = 'star-rating';
            starRating.setAttribute('id', `rating-${this.photoId}`);
            
            // Создаем 5 звезд с радио-кнопками
            for (let i = 5; i >= 1; i--) {
                const input = document.createElement('input');
                input.type = 'radio';
                input.name = `rating-${this.photoId}`;
                input.value = i;
                input.id = `star-${this.photoId}-${i}`;
                if (this.currentRating === i) {
                    input.checked = true;
                }
                
                const label = document.createElement('label');
                label.setAttribute('for', `star-${this.photoId}-${i}`);
                label.innerHTML = '★';
                label.title = `${i} из 5`;
                
                starRating.appendChild(input);
                starRating.appendChild(label);
            }
            
            ratingForm.appendChild(starRating);
            
            // Если есть текущий рейтинг пользователя, добавляем кнопку удаления
            if (this.currentRating > 0) {
                const deleteBtn = document.createElement('button');
                deleteBtn.className = 'rating-delete';
                deleteBtn.type = 'button';
                deleteBtn.innerHTML = '<i class="fas fa-times"></i>';
                deleteBtn.title = 'Удалить оценку';
                deleteBtn.setAttribute('id', `delete-rating-${this.photoId}`);
                
                ratingForm.appendChild(deleteBtn);
            }
            
            this.container.appendChild(ratingForm);
        }
    }
    
    // Настраиваем слушатели событий
    setupListeners() {
        const starRating = this.container.querySelector('.star-rating');
        
        // Обработка клика на звезды
        starRating.addEventListener('change', (event) => {
            if (event.target.type === 'radio') {
                const value = parseInt(event.target.value);
                this.submitRating(value);
            }
        });
        
        // Обработка клика на кнопку удаления
        const deleteBtn = this.container.querySelector('.rating-delete');
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deleteRating();
            });
        }
    }
    
    // Загрузка текущей оценки пользователя
    async loadUserRating() {
        try {
            // Показываем индикатор загрузки
            this.showLoading(true);
            
            const response = await fetch(`${this.API_URL}/photos/${this.photoId}/rate`, {
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Не удалось загрузить оценку');
            }
            
            const data = await response.json();
            
            // Обновляем текущую оценку
            this.currentRating = data.userRating || 0;
            
            // Обновляем интерфейс
            this.render();
            this.setupListeners();
            
            // Скрываем индикатор загрузки
            this.showLoading(false);
        } catch (error) {
            console.error('Ошибка при загрузке оценки:', error);
            this.showLoading(false);
        }
    }
    
    // Отправка оценки
    async submitRating(value) {
        try {
            // Показываем индикатор загрузки
            this.showLoading(true);
            
            // Отключаем форму на время загрузки
            this.setFormDisabled(true);
            
            const response = await fetch(`${this.API_URL}/photos/${this.photoId}/rate`, {
                method: 'POST',
                headers: {
                    ...this.getAuthHeaders(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ value })
            });
            
            if (!response.ok) {
                throw new Error('Не удалось отправить оценку');
            }
            
            const data = await response.json();
            
            // Обновляем рейтинг
            this.currentRating = data.userRating;
            this.averageRating = data.newRating;
            this.ratingCount = data.ratingCount;
            
            // Обновляем интерфейс
            this.render();
            this.setupListeners();
            
            // Вызываем обработчик обновления, если он есть
            if (this.onUpdate) {
                this.onUpdate(this.photoId, data);
            }
            
            // Скрываем индикатор загрузки
            this.showLoading(false);
        } catch (error) {
            console.error('Ошибка при отправке оценки:', error);
            this.showLoading(false);
            this.setFormDisabled(false);
            showMessage('Не удалось отправить оценку. Попробуйте снова.', 'error');
        }
    }
    
    // Удаление оценки
    async deleteRating() {
        try {
            // Показываем индикатор загрузки
            this.showLoading(true);
            
            // Отключаем форму на время загрузки
            this.setFormDisabled(true);
            
            const response = await fetch(`${this.API_URL}/photos/${this.photoId}/rate`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            
            if (!response.ok) {
                throw new Error('Не удалось удалить оценку');
            }
            
            const data = await response.json();
            
            // Обновляем рейтинг
            this.currentRating = 0;
            this.averageRating = data.newRating;
            this.ratingCount = data.ratingCount;
            
            // Обновляем интерфейс
            this.render();
            this.setupListeners();
            
            // Вызываем обработчик обновления, если он есть
            if (this.onUpdate) {
                this.onUpdate(this.photoId, data);
            }
            
            // Скрываем индикатор загрузки
            this.showLoading(false);
        } catch (error) {
            console.error('Ошибка при удалении оценки:', error);
            this.showLoading(false);
            this.setFormDisabled(false);
            showMessage('Не удалось удалить оценку. Попробуйте снова.', 'error');
        }
    }
    
    // Отображение HTML звезд по рейтингу
    getStarsHTML(rating) {
        let html = '';
        const roundedRating = Math.round(rating * 10) / 10;
        
        for (let i = 1; i <= 5; i++) {
            if (i <= roundedRating) {
                html += '★';
            } else {
                html += '<span class="empty-star">★</span>';
            }
        }
        
        return html;
    }
    
    // Показать/скрыть индикатор загрузки
    showLoading(isLoading) {
        let loader = this.container.querySelector('.rating-loading');
        
        if (isLoading) {
            if (!loader) {
                loader = document.createElement('div');
                loader.className = 'rating-loading spinner-border spinner-border-sm text-primary';
                loader.setAttribute('role', 'status');
                this.container.appendChild(loader);
            }
            loader.style.display = 'inline-block';
        } else if (loader) {
            loader.style.display = 'none';
        }
    }
    
    // Включение/отключение формы
    setFormDisabled(disabled) {
        const ratingForm = this.container.querySelector('.rating-form');
        if (!ratingForm) return;
        
        const inputs = ratingForm.querySelectorAll('input');
        inputs.forEach(input => {
            input.disabled = disabled;
        });
        
        const deleteBtn = ratingForm.querySelector('.rating-delete');
        if (deleteBtn) {
            deleteBtn.disabled = disabled;
        }
        
        if (disabled) {
            ratingForm.classList.add('disabled');
        } else {
            ratingForm.classList.remove('disabled');
        }
    }
    
    // Получение заголовков авторизации
    getAuthHeaders() {
        const token = localStorage.getItem('photoapp_token');
        return token ? {
            'Authorization': `Bearer ${token}`
        } : {};
    }
}

// Статический метод для инициализации всех рейтингов на странице
PhotoRating.initAll = function(selector = '.photo-rating-container', options = {}) {
    const containers = document.querySelectorAll(selector);
    const instances = [];
    
    containers.forEach((container) => {
        const photoId = container.dataset.photoId;
        const instance = new PhotoRating(container, {
            photoId: photoId,
            averageRating: parseFloat(container.dataset.averageRating) || 0,
            ratingCount: parseInt(container.dataset.ratingCount) || 0,
            readonly: container.dataset.readonly === 'true',
            ...options
        });
        
        instances.push(instance);
    });
    
    return instances;
};

// При загрузке DOM инициализируем все рейтинги
document.addEventListener('DOMContentLoaded', () => {
    PhotoRating.initAll();
}); 