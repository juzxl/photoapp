package com.example.photoapp.controller;

import com.example.photoapp.model.Photo;
import com.example.photoapp.service.PhotoService;
import com.example.photoapp.service.TagService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/public")
public class PublicController {
    private static final Logger logger = LoggerFactory.getLogger(PublicController.class);

    @Autowired
    private PhotoService photoService;

    @Autowired
    private TagService tagService;

    // Метод для преобразования Photo в Map
    private Map<String, Object> convertPhotoToMap(Photo photo) {
        Map<String, Object> photoMap = new HashMap<>();
        photoMap.put("id", photo.getId());
        photoMap.put("title", photo.getTitle());
        photoMap.put("description", photo.getDescription());
        photoMap.put("fileName", photo.getFileName());
        photoMap.put("originalFileName", photo.getOriginalFileName());
        photoMap.put("mimeType", photo.getMimeType());
        photoMap.put("fileSize", photo.getFileSize());
        photoMap.put("isPublic", photo.isPublic());
        photoMap.put("viewCount", photo.getViewCount());
        photoMap.put("rating", photo.getRating());
        photoMap.put("ratingCount", photo.getRatingCount());
        photoMap.put("createdAt", photo.getCreatedAt());
        photoMap.put("updatedAt", photo.getUpdatedAt());
        photoMap.put("url", photo.getUrl());
        photoMap.put("status", photo.getStatus().toString());
        photoMap.put("privacyLevel", photo.getPrivacyLevel().toString());
        
        // Добавляем информацию о пользователе
        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", photo.getUser().getId());
        userMap.put("username", photo.getUser().getUsername());
        photoMap.put("user", userMap);
        
        // Добавляем информацию об альбоме, если он есть
        if (photo.getAlbum() != null) {
            Map<String, Object> albumMap = new HashMap<>();
            albumMap.put("id", photo.getAlbum().getId());
            albumMap.put("name", photo.getAlbum().getName());
            photoMap.put("album", albumMap);
        } else {
            photoMap.put("album", null);
        }
        
        return photoMap;
    }

    // Метод для преобразования списка Photo в список Map
    private List<Map<String, Object>> convertPhotosToMaps(List<Photo> photos) {
        return photos.stream()
                .map(this::convertPhotoToMap)
                .collect(Collectors.toList());
    }

    @GetMapping("/photos")
    public ResponseEntity<?> getPublicPhotos(
            @RequestParam(required = false) String tags,
            @RequestParam(defaultValue = "recent") String sort,
            Pageable pageable) {
        logger.info("Getting public photos with sort: {}, tags: {}", sort, tags);
        
        Page<Photo> photos = photoService.getPublicPhotos(tags, sort, pageable);
        
        // Логируем информацию о загруженных фотографиях
        logger.info("Loaded {} public photos", photos.getContent().size());
        
        if (photos.getContent().isEmpty()) {
            logger.debug("No photos found! Total elements: {}, total pages: {}", 
                photos.getTotalElements(), photos.getTotalPages());
        } else {
            // Выводим в лог информацию о первой фотографии для отладки
            Photo firstPhoto = photos.getContent().get(0);
            logger.debug("First photo: id={}, title={}, url={}, filename={}", 
                firstPhoto.getId(), firstPhoto.getTitle(), 
                firstPhoto.getUrl(), firstPhoto.getFileName());
        }
        
        // Преобразуем фотографии в безопасный DTO формат
        List<Map<String, Object>> safePhotos = convertPhotosToMaps(photos.getContent());
        
        // Создаем формат ответа, который ожидает фронтенд
        Map<String, Object> response = new HashMap<>();
        response.put("content", safePhotos);
        response.put("totalPages", photos.getTotalPages());
        response.put("totalElements", photos.getTotalElements());
        response.put("number", photos.getNumber());
        
        return ResponseEntity.ok(response);
    }

    @GetMapping("/tags/popular")
    public ResponseEntity<?> getPopularTags() {
        return ResponseEntity.ok(tagService.getPopularTags());
    }
} 