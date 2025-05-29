package com.example.photoapp.model;

public enum NotificationType {
    FRIEND_REQUEST,        // Уведомление о новом запросе в друзья
    FRIEND_ACCEPTED,       // Уведомление о принятии запроса в друзья
    NEW_COMMENT,          // Уведомление о новом комментарии к фото
    PHOTO_APPROVED,       // Уведомление об одобрении фото
    PHOTO_REJECTED,       // Уведомление об отклонении фото
    SYSTEM_MESSAGE        // Системное уведомление
} 