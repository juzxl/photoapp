package com.example.photoapp.controller;

import com.example.photoapp.model.Photo;
import com.example.photoapp.model.PhotoStatus;
import com.example.photoapp.model.User;
import com.example.photoapp.service.PhotoService;
import com.example.photoapp.service.UserService;
import com.example.photoapp.repository.PhotoRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class FeedController {
    private static final Logger logger = LoggerFactory.getLogger(FeedController.class);

    @Autowired
    private PhotoService photoService;

    @Autowired
    private UserService userService;
    
    @Autowired
    private PhotoRepository photoRepository;

    /**
     * Получение ленты фотографий (собственные + публичные других пользователей)
     */
    @GetMapping("/feed")
    public ResponseEntity<?> getFeed(
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "12") int size,
            @RequestParam(value = "sort", defaultValue = "recent") String sort,
            @RequestParam(value = "tags", required = false) String tags,
            Authentication authentication) {

        // Создаем параметры пагинации и сортировки
        Pageable pageable;
        switch (sort) {
            case "popular":
                pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "likesCount"));
                break;
            case "rating":
                pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "rating"));
                break;
            case "recent":
            default:
                pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
                break;
        }

        // Парсим теги, если они указаны
        List<String> tagsList = null;
        if (tags != null && !tags.isEmpty()) {
            tagsList = Arrays.asList(tags.split(","));
        }

        // Получаем текущего пользователя (если авторизован)
        User currentUser = getCurrentUser(authentication);

        // Загружаем ленту фотографий
        Page<Photo> feedPage;
        if (currentUser != null) {
            // Если пользователь авторизован, получаем его ленту
            logger.info("Загрузка ленты для авторизованного пользователя: {}", currentUser.getUsername());
            feedPage = photoService.getFeedForUser(currentUser, tagsList, pageable);
        } else {
            // Если пользователь не авторизован, показываем только публичные фото
            logger.info("Загрузка публичных фотографий для неавторизованного пользователя");
            feedPage = photoService.getPublicPhotos(tags != null ? tags : "", sort, pageable);
        }

        logger.info("Загружено {} фотографий для ленты", feedPage.getContent().size());
        return ResponseEntity.ok(feedPage);
    }
    
    /**
     * Получить текущего пользователя из контекста безопасности
     */
    private User getCurrentUser(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        try {
            // Получаем имя пользователя из контекста безопасности
            String username = authentication.getName();
            return userService.getUserByUsername(username);
        } catch (Exception e) {
            logger.error("Ошибка при получении текущего пользователя: {}", e.getMessage());
            return null;
        }
    }
    
    /**
     * Отладочный эндпоинт для проверки фотографий в базе данных
     */
    @GetMapping("/feed/debug")
    public ResponseEntity<?> debugFeed(Authentication authentication) {
        // Получаем текущего пользователя
        User currentUser = getCurrentUser(authentication);
        if (currentUser == null) {
            return ResponseEntity.status(401).body("Требуется авторизация");
        }
        
        logger.info("Отладка ленты для пользователя ID: {}, имя: {}", 
            currentUser.getId(), currentUser.getUsername());
        
        // Получаем все фотографии без пагинации для проверки
        List<Photo> allPhotos = photoRepository.findAll();
        List<Photo> userPhotos = photoRepository.findByUser(currentUser);
        
        // Проверяем фотографии других пользователей, которые должны быть в ленте
        List<Photo> otherUsersPublicPhotos = allPhotos.stream()
            .filter(p -> !p.getUser().getId().equals(currentUser.getId()))
            .filter(p -> p.isPublic() && p.getStatus() == PhotoStatus.APPROVED)
            .collect(java.util.stream.Collectors.toList());
        
        // Сформируем информативный ответ
        return ResponseEntity.ok(Map.of(
            "totalPhotos", allPhotos.size(),
            "userPhotos", userPhotos.size(),
            "otherUsersPublicApprovedPhotos", otherUsersPublicPhotos.size(),
            "otherUsersPhotosDetails", otherUsersPublicPhotos.stream()
                .map(p -> Map.of(
                    "id", p.getId(),
                    "title", p.getTitle(),
                    "userId", p.getUser().getId(),
                    "username", p.getUser().getUsername(),
                    "isPublic", p.isPublic(),
                    "status", p.getStatus().toString()
                ))
                .collect(java.util.stream.Collectors.toList())
        ));
    }
} 