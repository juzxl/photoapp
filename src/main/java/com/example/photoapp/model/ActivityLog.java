package com.example.photoapp.model;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "activity_logs")
@NoArgsConstructor
@AllArgsConstructor
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
    
    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
    private LocalDateTime timestamp;
    
    // Тип активности: login, photo, album, comment, favorite
    @Column(length = 50)
    private String activityType;
    
    // Тип действия: add, delete, login, register
    @Column(length = 50)
    private String actionType;
    
    // Идентификатор объекта, с которым выполнено действие
    private Long objectId;
    
    // Название объекта (если применимо)
    @Column(length = 255)
    private String objectName;
    
    // Связанный ID объекта (например, для комментария - ID фото)
    private Long relatedId;
    
    // Роль выполнившего действие: user, moderator, admin
    @Column(length = 50)
    private String actor;
    
    // Дополнительные данные в JSON формате (если нужно хранить специфическую информацию)
    @Column(columnDefinition = "TEXT")
    private String additionalData;
} 