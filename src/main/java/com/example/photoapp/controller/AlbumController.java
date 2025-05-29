package com.example.photoapp.controller;

import com.example.photoapp.dto.MessageResponse;
import com.example.photoapp.model.Album;
import com.example.photoapp.model.PrivacyLevel;
import com.example.photoapp.model.User;
import com.example.photoapp.repository.AlbumRepository;
import com.example.photoapp.repository.UserRepository;
import com.example.photoapp.security.services.UserDetailsImpl;
import com.example.photoapp.service.ActivityLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/albums")
public class AlbumController {
    private static final Logger logger = LoggerFactory.getLogger(AlbumController.class);
    
    @Autowired
    private AlbumRepository albumRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ActivityLogService activityLogService;
    
    // Вспомогательный метод для определения роли пользователя
    private String getRoleString(UserDetailsImpl userDetails) {
        if (userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return "admin";
        } else if (userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MODERATOR"))) {
            return "moderator";
        }
        return "user";
    }
    
    @GetMapping
    public ResponseEntity<List<Album>> getAllAlbums() {
        logger.info("Fetching all albums");
        List<Album> albums = albumRepository.findAll();
        return new ResponseEntity<>(albums, HttpStatus.OK);
    }
    
    @GetMapping("/user")
    public ResponseEntity<List<Album>> getUserAlbums(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        logger.info("Fetching albums for user ID: {}", userDetails.getId());
        
        try {
            User user = userRepository.findById(userDetails.getId())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + userDetails.getId()));
            
            // Запрос альбомов напрямую из репозитория с явным указанием, что нужны только альбомы этого пользователя
            List<Album> albums = albumRepository.findByUser(user);
            
            // Дополнительная проверка: строго фильтруем альбомы, которые принадлежат текущему пользователю
            // Это защита от случаев, когда в findByUser могут быть возвращены чужие альбомы
            List<Album> filteredAlbums = albums.stream()
                    .filter(album -> album.getUser().getId().equals(userDetails.getId()))
                    .toList();
            
            // Логируем, если были найдены альбомы, не принадлежащие пользователю
            if (filteredAlbums.size() < albums.size()) {
                logger.warn("Filtered out {} albums that did not belong to user {}", 
                        albums.size() - filteredAlbums.size(), userDetails.getId());
                
                // Запишем в лог альбомы, которые были отфильтрованы для отладки
                albums.stream()
                    .filter(album -> !album.getUser().getId().equals(userDetails.getId()))
                    .forEach(album -> logger.warn("Filtered out album: id={}, name={}, userId={}", 
                        album.getId(), album.getName(), album.getUser().getId()));
            }
            
            logger.info("Returning {} albums for user {}", filteredAlbums.size(), userDetails.getId());
            return new ResponseEntity<>(filteredAlbums, HttpStatus.OK);
        } catch (Exception e) {
            logger.error("Error fetching user albums: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Album> getAlbumById(@PathVariable("id") Long id, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        logger.info("Fetching album with ID: {}", id);
        
        return albumRepository.findById(id)
                .map(album -> {
                    // Проверяем доступ к альбому
                    if (!hasAccessToAlbum(album, userDetails.getId())) {
                        logger.warn("User {} attempted to access album {} without permission", userDetails.getId(), id);
                        return new ResponseEntity<Album>(HttpStatus.FORBIDDEN);
                    }
                    
                    return new ResponseEntity<>(album, HttpStatus.OK);
                })
                .orElseGet(() -> {
                    logger.warn("Album not found with ID: {}", id);
                    return new ResponseEntity<>(HttpStatus.NOT_FOUND);
                });
    }
    
    @PostMapping
    public ResponseEntity<?> createAlbum(@RequestBody Map<String, String> albumData, 
                                        @AuthenticationPrincipal UserDetailsImpl userDetails) {
        logger.info("Creating new album for user ID: {}", userDetails.getId());
        
        try {
            String name = albumData.get("name");
            String description = albumData.get("description");
            String privacyLevelStr = albumData.get("privacyLevel");
            
            if (name == null || name.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Название альбома обязательно"));
            }
            
            User user = userRepository.findById(userDetails.getId())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + userDetails.getId()));
            
            Album album = new Album();
            album.setName(name);
            album.setDescription(description);
            album.setUser(user);
            album.setCreatedAt(LocalDateTime.now());
            album.setUpdatedAt(LocalDateTime.now());
            
            // Установка уровня приватности
            if (privacyLevelStr != null && !privacyLevelStr.isEmpty()) {
                try {
                    PrivacyLevel privacyLevel = PrivacyLevel.valueOf(privacyLevelStr);
                    album.setPrivacyLevel(privacyLevel);
                } catch (IllegalArgumentException e) {
                    logger.warn("Invalid privacy level: {}, using default PRIVATE", privacyLevelStr);
                    album.setPrivacyLevel(PrivacyLevel.PRIVATE);
                }
            } else {
                album.setPrivacyLevel(PrivacyLevel.PRIVATE);
            }
            
            Album savedAlbum = albumRepository.save(album);
            logger.info("Album created with ID: {}", savedAlbum.getId());
            
            // Логируем создание альбома
            activityLogService.logActivity(userDetails.getId(), "album", "add", 
                savedAlbum.getId(), savedAlbum.getName(), null, getRoleString(userDetails));
            
            return new ResponseEntity<>(savedAlbum, HttpStatus.CREATED);
        } catch (Exception e) {
            logger.error("Error creating album: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Произошла ошибка при создании альбома: " + e.getMessage()));
        }
    }
    
    @PutMapping("/{id}")
    public ResponseEntity<?> updateAlbum(@PathVariable("id") Long id,
                                        @RequestBody Map<String, String> albumData,
                                        @AuthenticationPrincipal UserDetailsImpl userDetails) {
        logger.info("Updating album with ID: {}", id);
        
        try {
            String name = albumData.get("name");
            String description = albumData.get("description");
            String privacyLevelStr = albumData.get("privacyLevel");
            
            if (name == null || name.isEmpty()) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("Название альбома обязательно"));
            }
            
            return albumRepository.findById(id)
                    .map(album -> {
                        // Проверяем, что альбом принадлежит текущему пользователю
                        if (!album.getUser().getId().equals(userDetails.getId())) {
                            logger.warn("User {} attempted to update another user's album {}", 
                                    userDetails.getId(), id);
                            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                    .body(new MessageResponse("Вы не можете редактировать чужие альбомы"));
                        }
                        
                        album.setName(name);
                        album.setDescription(description);
                        album.setUpdatedAt(LocalDateTime.now());
                        
                        // Обновление уровня приватности, если указан
                        if (privacyLevelStr != null && !privacyLevelStr.isEmpty()) {
                            try {
                                PrivacyLevel privacyLevel = PrivacyLevel.valueOf(privacyLevelStr);
                                album.setPrivacyLevel(privacyLevel);
                            } catch (IllegalArgumentException e) {
                                logger.warn("Invalid privacy level: {}, keeping existing value", privacyLevelStr);
                            }
                        }
                        
                        Album updatedAlbum = albumRepository.save(album);
                        logger.info("Album updated: {}", updatedAlbum.getId());
                        
                        return new ResponseEntity<>(updatedAlbum, HttpStatus.OK);
                    })
                    .orElseGet(() -> {
                        logger.warn("Album not found with ID: {}", id);
                        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
                    });
        } catch (Exception e) {
            logger.error("Error updating album: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Произошла ошибка при обновлении альбома: " + e.getMessage()));
        }
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteAlbum(@PathVariable("id") Long id,
                                       @AuthenticationPrincipal UserDetailsImpl userDetails) {
        logger.info("Deleting album with ID: {}", id);
        
        try {
            return albumRepository.findById(id)
                    .map(album -> {
                        // Проверяем, что альбом принадлежит текущему пользователю
                        // Важно: даже модераторы не могут удалять чужие альбомы согласно требованиям
                        if (!album.getUser().getId().equals(userDetails.getId())) {
                            boolean isModerator = userDetails.getAuthorities().stream()
                                    .anyMatch(a -> a.getAuthority().equals("ROLE_MODERATOR"));
                            boolean isAdmin = userDetails.getAuthorities().stream()
                                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
                            
                            // Если пользователь модератор, показываем соответствующее сообщение
                            if (isModerator && !isAdmin) {
                                logger.warn("Moderator {} attempted to delete another user's album {}", 
                                        userDetails.getId(), id);
                                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                        .body(new MessageResponse("Модераторы не могут удалять чужие альбомы, только фотографии и комментарии"));
                            }
                            
                            // Если обычный пользователь, стандартное сообщение
                            logger.warn("User {} attempted to delete another user's album {}", 
                                    userDetails.getId(), id);
                            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                    .body(new MessageResponse("Вы не можете удалять чужие альбомы"));
                        }
                        
                        // Запоминаем информацию об альбоме перед удалением
                        Long albumId = album.getId();
                        String albumName = album.getName();
                        
                        albumRepository.delete(album);
                        logger.info("Album deleted: {}", id);
                        
                        // Логируем удаление альбома
                        activityLogService.logActivity(userDetails.getId(), "album", "delete", 
                            albumId, albumName, null, getRoleString(userDetails));
                        
                        return ResponseEntity.ok(new MessageResponse("Альбом успешно удален"));
                    })
                    .orElseGet(() -> {
                        logger.warn("Album not found with ID: {}", id);
                        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
                    });
        } catch (Exception e) {
            logger.error("Error deleting album: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Произошла ошибка при удалении альбома: " + e.getMessage()));
        }
    }
    
    @PutMapping("/{id}/cover")
    public ResponseEntity<?> updateAlbumCover(@PathVariable("id") Long albumId,
                                           @RequestBody Map<String, Long> requestBody,
                                           @AuthenticationPrincipal UserDetailsImpl userDetails) {
        logger.info("Updating cover photo for album with ID: {}", albumId);
        
        try {
            Long photoId = requestBody.get("photoId");
            
            if (photoId == null) {
                return ResponseEntity.badRequest()
                        .body(new MessageResponse("ID фотографии обязателен"));
            }
            
            return albumRepository.findById(albumId)
                    .map(album -> {
                        // Проверяем, что альбом принадлежит текущему пользователю
                        if (!album.getUser().getId().equals(userDetails.getId())) {
                            logger.warn("User {} attempted to update cover of another user's album {}", 
                                    userDetails.getId(), albumId);
                            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                    .body(new MessageResponse("Вы не можете изменять чужие альбомы"));
                        }
                        
                        // Проверяем, что фотография принадлежит этому альбому
                        boolean photoInAlbum = album.getPhotos().stream()
                                .anyMatch(photo -> photo.getId().equals(photoId));
                        
                        if (!photoInAlbum) {
                            logger.warn("Photo {} does not belong to album {}", photoId, albumId);
                            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                                    .body(new MessageResponse("Выбранная фотография не принадлежит данному альбому"));
                        }
                        
                        album.setCoverPhotoId(photoId);
                        Album updatedAlbum = albumRepository.save(album);
                        logger.info("Album cover updated for album ID {}: set to photo ID {}", albumId, photoId);
                        
                        return new ResponseEntity<>(updatedAlbum, HttpStatus.OK);
                    })
                    .orElseGet(() -> {
                        logger.warn("Album not found with ID: {}", albumId);
                        return new ResponseEntity<>(HttpStatus.NOT_FOUND);
                    });
                    
        } catch (Exception e) {
            logger.error("Error updating album cover: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Произошла ошибка при обновлении обложки альбома: " + e.getMessage()));
        }
    }
    
    @GetMapping("/user/{userId}/public")
    public ResponseEntity<List<Album>> getUserPublicAlbums(@PathVariable("userId") Long userId) {
        logger.info("Fetching public albums for user ID: {}", userId);
        
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + userId));
            
            // Находим все публичные альбомы пользователя
            List<Album> albums = albumRepository.findByUserAndPrivacyLevel(user, PrivacyLevel.PUBLIC);
            return new ResponseEntity<>(albums, HttpStatus.OK);
        } catch (Exception e) {
            logger.error("Error fetching user public albums: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    /**
     * Получение всех альбомов пользователя (включая приватные) для админов и модераторов
     */
    @GetMapping("/user/{userId}/all")
    public ResponseEntity<?> getAllUserAlbums(
            @PathVariable("userId") Long userId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        logger.info("Fetching all albums for user ID: {} by user ID: {}", userId, userDetails.getId());
        
        // Проверяем, является ли запрашивающий пользователь админом или модератором
        boolean isAdmin = userDetails.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
        boolean isModerator = userDetails.getAuthorities().stream()
            .anyMatch(a -> a.getAuthority().equals("ROLE_MODERATOR"));
            
        if (!isAdmin && !isModerator) {
            logger.warn("User {} attempted to access all albums of user {} without permissions", 
                userDetails.getId(), userId);
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(new MessageResponse("У вас нет доступа к этим альбомам"));
        }
        
        try {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + userId));
            
            // Находим все альбомы пользователя, независимо от уровня приватности
            List<Album> albums = albumRepository.findByUser(user);
            
            logger.info("Admin/moderator {} accessed all {} albums of user {}", 
                userDetails.getId(), albums.size(), userId);
                
            return new ResponseEntity<>(albums, HttpStatus.OK);
        } catch (Exception e) {
            logger.error("Error fetching all user albums: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Произошла ошибка при получении альбомов: " + e.getMessage()));
        }
    }

    /**
     * Проверяет, имеет ли пользователь доступ к альбому
     * 
     * @param album альбом
     * @param userId ID пользователя
     * @return true, если пользователь имеет доступ
     */
    private boolean hasAccessToAlbum(Album album, Long userId) {
        logger.info("Checking access to album {} for user {}", album.getId(), userId);
        
        // Получаем информацию о пользователе для проверки ролей
        try {
            UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            
            // Администраторы и модераторы имеют доступ ко всем альбомам
            boolean isAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            boolean isModerator = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MODERATOR"));
                
            if (isAdmin || isModerator) {
                logger.info("User {} has admin/moderator role, access granted to album {}", userId, album.getId());
                return true;
            }
        } catch (Exception e) {
            logger.warn("Could not check user roles for album access", e);
        }
        
        // Если пользователь - владелец альбома, то доступ есть всегда
        if (album.getUser().getId().equals(userId)) {
            logger.info("User {} is the owner of album {}", userId, album.getId());
            return true;
        }
        
        // Проверяем уровень приватности
        switch (album.getPrivacyLevel()) {
            case PUBLIC:
                // Публичные альбомы доступны всем
                logger.info("Album {} is PUBLIC, access granted", album.getId());
                return true;
            case FRIENDS:
                // TODO: Добавить проверку на друзей
                // Пока что доступ для "друзей" открыт всем
                logger.info("Album {} is FRIENDS, access granted (not implemented)", album.getId());
                return true;
            case PRIVATE:
                // Приватные альбомы доступны только владельцу (проверка выше)
                logger.info("Album {} is PRIVATE, access denied", album.getId());
                return false;
            default:
                logger.warn("Unknown privacy level for album {}", album.getId());
                return false;
        }
    }
} 