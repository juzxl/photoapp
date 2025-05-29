package com.example.photoapp.model;

/**
 * Перечисление для статусов фотографий
 */
public enum PhotoStatus {
    /**
     * Ожидает проверки
     */
    PENDING,    // Ожидает модерации
    
    /**
     * Одобрено и опубликовано
     */
    APPROVED,   // Одобрено
    
    /**
     * Отклонено
     */
    REJECTED    // Отклонено
} 