package com.example.photoapp.controller;

import com.example.photoapp.model.Album;
import com.example.photoapp.model.Photo;
import com.example.photoapp.model.User;
import com.example.photoapp.model.PrivacyLevel;
import com.example.photoapp.repository.AlbumRepository;
import com.example.photoapp.repository.PhotoRepository;
import com.example.photoapp.repository.UserRepository;
import com.example.photoapp.repository.CategoryRepository;
import com.example.photoapp.security.services.UserDetailsImpl;
import com.example.photoapp.service.PhotoService;
import com.example.photoapp.service.TagService;
import com.example.photoapp.service.ActivityLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.example.photoapp.dto.MessageResponse;
import com.example.photoapp.service.FileStorageService;

import java.io.IOException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.Optional;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/photos")
public class PhotoController {
    private static final Logger logger = LoggerFactory.getLogger(PhotoController.class);
    
    @Autowired
    private PhotoRepository photoRepository;

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private AlbumRepository albumRepository;
    
    @Autowired
    private CategoryRepository categoryRepository;
    
    @Autowired
    private TagService tagService;

    @Autowired
    private PhotoService photoService;

    @Autowired
    private FileStorageService fileStorageService;
    
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

    // Метод для преобразования Photo в Map, чтобы избежать проблем с сериализацией
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

    @GetMapping("/list")
    public ResponseEntity<Map<String, Object>> getAllPhotos(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt,desc") String[] sort) {

        logger.info("Getting all photos with page: {}, size: {}, sort: {}", page, size, String.join(",", sort));
        
        try {
            Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
            logger.info("Current authentication: {}", authentication);
            
            if (authentication == null || !authentication.isAuthenticated()) {
                logger.error("No authentication found or not authenticated");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            Sort.Direction direction = Sort.Direction.ASC;
            if (sort.length > 1 && sort[1].equals("desc")) {
                direction = Sort.Direction.DESC;
            }
            
            String sortField = sort.length > 0 ? sort[0] : "createdAt";
            Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));
            
            Page<Photo> photosPage = photoRepository.findAll(pageable);
            
            List<Photo> photos = photosPage.getContent();
            
            Map<String, Object> response = new HashMap<>();
            response.put("photos", photos);
            response.put("currentPage", photosPage.getNumber());
            response.put("totalItems", photosPage.getTotalElements());
            response.put("totalPages", photosPage.getTotalPages());
            
            logger.info("Successfully retrieved {} photos", photos.size());
            
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (Exception e) {
            logger.error("Error getting photos: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).<Map<String, Object>>build();
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPhotoById(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        try {
            Photo photo = photoService.getPhotoById(id);
            
            // Проверка прав доступа
            boolean isOwner = userDetails != null && photo.getUser().getId().equals(userDetails.getId());
            boolean isAdmin = userDetails != null && userDetails.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            boolean isModerator = userDetails != null && userDetails.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_MODERATOR"));
            
            // Если фотография не публичная и пользователь не владелец, не админ и не модератор
            if (!photo.isPublic() && !isOwner && !isAdmin && !isModerator) {
                logger.warn("Unauthorized access attempt to photo {}", id);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new MessageResponse("У вас нет доступа к этой фотографии"));
            }
            
            // Для администраторов и модераторов добавляем логирование доступа к приватным фото
            if ((isAdmin || isModerator) && !isOwner && !photo.isPublic()) {
                logger.info("Admin/moderator {} accessing private photo {} belonging to user {}", 
                    userDetails.getId(), photo.getId(), photo.getUser().getId());
            }
            
            return ResponseEntity.ok(photo);
        } catch (Exception e) {
            logger.error("Error getting photo by ID {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(new MessageResponse("Фотография не найдена"));
        }
    }

    @GetMapping("/{id}/view")
    public ResponseEntity<?> viewPhoto(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        try {
            Photo photo = photoService.getPhotoById(id);
            
            // Проверка прав доступа
            boolean isOwner = userDetails != null && photo.getUser().getId().equals(userDetails.getId());
            boolean isAdmin = userDetails != null && userDetails.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            boolean isModerator = userDetails != null && userDetails.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_MODERATOR"));
            
            // Если фотография не публичная и пользователь не владелец, не админ и не модератор
            if (!photo.isPublic() && !isOwner && !isAdmin && !isModerator) {
                logger.warn("Unauthorized access attempt to view photo {}", id);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new MessageResponse("У вас нет доступа к этой фотографии"));
            }
            
            // Для администраторов и модераторов добавляем логирование доступа к приватным фото
            if ((isAdmin || isModerator) && !isOwner && !photo.isPublic()) {
                logger.info("Admin/moderator {} viewing private photo {} belonging to user {}", 
                    userDetails.getId(), photo.getId(), photo.getUser().getId());
            }
            
            // Увеличиваем счетчик просмотров
            photo.setViewCount(photo.getViewCount() + 1);
            photoRepository.save(photo);
            
            // Возвращаем файл изображения через FileStorageService
            try {
                org.springframework.core.io.Resource resource = fileStorageService.loadFileAsResource(photo.getFileName());
                
                return ResponseEntity.ok()
                        .contentType(org.springframework.http.MediaType.parseMediaType(photo.getMimeType()))
                        .body(resource);
            } catch (Exception e) {
                logger.error("Could not load file: {}", e.getMessage());
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                        .body(new MessageResponse("Ошибка при загрузке изображения: " + e.getMessage()));
            }
        } catch (Exception e) {
            logger.error("Error viewing photo with id {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при просмотре изображения: " + e.getMessage()));
        }
    }

    @PostMapping("/upload")
    public ResponseEntity<?> uploadPhoto(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "title", required = false) String title,
            @RequestParam(value = "description", required = false) String description,
            @RequestParam(value = "albumId", required = false) Long albumId,
            @RequestParam(value = "categoryIds", required = false) List<Long> categoryIds,
            @RequestParam(value = "tags", required = false) String tags,
            @RequestParam(value = "privacyLevel", defaultValue = "PUBLIC") String privacyLevel,
            @AuthenticationPrincipal UserDetailsImpl userDetails) throws IOException {
        
        logger.info("Uploading photo: title={}, albumId={}, categories={}, tags={}, privacy={}", 
                title, albumId, categoryIds, tags, privacyLevel);
        
        try {
            // Получаем пользователя
            User user = userRepository.findById(userDetails.getId())
                    .orElseThrow(() -> new UsernameNotFoundException("User not found with id: " + userDetails.getId()));
            
            // Создаем новое фото
            Photo photo = photoService.uploadPhoto(file, title, description, user);
            
            // Выводим информацию об альбоме для отладки
            if (albumId != null) {
                logger.info("Album ID provided: {}", albumId);
                
                try {
                    // Находим альбом
                    Album album = albumRepository.findById(albumId)
                            .orElseThrow(() -> new RuntimeException("Album not found with id: " + albumId));
                    
                    // Выводим информацию о владельце альбома для отладки
                    logger.info("Album owner ID: {}, Current user ID: {}", album.getUser().getId(), user.getId());
                    
                    // Проверяем, принадлежит ли альбом текущему пользователю
                    if (album.getUser().getId().equals(user.getId())) {
                        // Если альбом принадлежит пользователю, устанавливаем его для фото
                        photo.setAlbum(album);
                        logger.info("Album set for photo");
                        
                        // Сохраняем фото с обновленным альбомом
                        photo = photoRepository.save(photo);
                        
                        // Если у альбома еще нет обложки, устанавливаем текущую фотографию как обложку
                        if (album.getCoverPhotoId() == null) {
                            album.setCoverPhotoId(photo.getId());
                            albumRepository.save(album);
                            logger.info("Cover photo set for album: {}", album.getId());
                        }
                        
                        logger.info("Photo saved with album");
                    } else {
                        logger.warn("User {} attempted to add photo to another user's album {}", user.getId(), albumId);
                        return ResponseEntity.status(HttpStatus.FORBIDDEN)
                                .body(Map.of("message", "Вы не можете добавлять фотографии в чужие альбомы"));
                    }
                } catch (Exception e) {
                    logger.error("Error setting album for photo: ", e);
                    return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                            .body(Map.of("message", "Ошибка при добавлении фото в альбом: " + e.getMessage()));
                }
            }
            
            // Добавляем категории
            if (categoryIds != null && !categoryIds.isEmpty()) {
                Set<com.example.photoapp.model.Category> categories = categoryRepository.findAllById(categoryIds)
                        .stream().collect(Collectors.toSet());
                photo.setCategories(categories);
                
                // Сохраняем обновленное фото
                photo = photoRepository.save(photo);
            }
            
            // Добавляем теги
            if (tags != null && !tags.isEmpty()) {
                Set<String> tagNames = Arrays.stream(tags.split(","))
                        .map(String::trim)
                        .filter(tag -> !tag.isEmpty())
                        .collect(Collectors.toSet());
                
                Set<com.example.photoapp.model.Tag> photoTags = tagService.getOrCreateTags(tagNames);
                photo.setTags(photoTags);
                
                // Сохраняем обновленное фото
                photo = photoRepository.save(photo);
            }
            
            // Устанавливаем уровень приватности
            try {
                PrivacyLevel photoPrivacy = PrivacyLevel.valueOf(privacyLevel);
                photo.setPrivacyLevel(photoPrivacy);
                
                // Устанавливаем публичность в зависимости от уровня приватности
                photo.setPublic(photoPrivacy == PrivacyLevel.PUBLIC);
                
                // Сохраняем обновленное фото
                photo = photoRepository.save(photo);
            } catch (IllegalArgumentException e) {
                logger.warn("Invalid privacy level: {}, using PUBLIC as default", privacyLevel);
                photo.setPrivacyLevel(PrivacyLevel.PUBLIC);
                photo.setPublic(true);
                
                // Сохраняем обновленное фото
                photo = photoRepository.save(photo);
            }
            
            // Логируем добавление фото
            activityLogService.logActivity(userDetails.getId(), "photo", "add", photo.getId(), 
                photo.getTitle(), null, getRoleString(userDetails));
            
            // Возвращаем ID созданного фото и оригинальное имя файла
            Map<String, Object> response = new HashMap<>();
            response.put("id", photo.getId());
            response.put("originalFileName", photo.getOriginalFileName());
            response.put("fileName", photo.getFileName());
            response.put("title", photo.getTitle());
            response.put("url", photo.getUrl());
            response.put("message", "Фотография успешно загружена");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error uploading photo: ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при загрузке фото: " + e.getMessage()));
        }
    }

    @GetMapping
    public ResponseEntity<?> getUserPhotos(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam(defaultValue = "recent") String sort,
            Pageable pageable) {
        
        User user = new User();
        user.setId(userDetails.getId());
        
        logger.info("Getting photos for user ID: {} with sort: {}", user.getId(), sort);
        
        // Преобразуем 'recent' в сортировку по createdAt
        if (sort.equals("recent")) {
            // Создаем новый Pageable с сортировкой по createdAt в порядке убывания
            pageable = PageRequest.of(
                pageable.getPageNumber(),
                pageable.getPageSize(),
                Sort.by(Sort.Direction.DESC, "createdAt")
            );
        }
        
        logger.info("Using pageable before service call: page={}, size={}, sort={}", 
            pageable.getPageNumber(), pageable.getPageSize(), 
            pageable.getSort());
        
        // Сначала попробуем напрямую загрузить фотографии
        List<Photo> allUserPhotos = photoRepository.findAllByUserId(user.getId());
        
        if (!allUserPhotos.isEmpty()) {
            logger.info("Direct query found {} photos for user {}", allUserPhotos.size(), user.getId());
            
            // Логируем информацию о первой фотографии для отладки
            Photo firstPhoto = allUserPhotos.get(0);
            logger.debug("First direct photo: id={}, title={}, created={}, url={}, filename={}", 
                firstPhoto.getId(), firstPhoto.getTitle(), firstPhoto.getCreatedAt(),
                firstPhoto.getUrl(), firstPhoto.getFileName());
                
            // Делаем ручную пагинацию
            int start = (int) pageable.getOffset();
            int end = Math.min((start + pageable.getPageSize()), allUserPhotos.size());
            
            if (start > allUserPhotos.size()) {
                start = 0;
                end = Math.min(pageable.getPageSize(), allUserPhotos.size());
            }
            
            List<Photo> pageContent = allUserPhotos.subList(start, end);
            
            // Преобразуем фотографии в безопасный DTO формат
            List<Map<String, Object>> safePhotos = convertPhotosToMaps(pageContent);
            
            // Создаем формат ответа, который ожидает фронтенд
            Map<String, Object> response = new HashMap<>();
            response.put("content", safePhotos);
            response.put("totalPages", (int) Math.ceil((double) allUserPhotos.size() / pageable.getPageSize()));
            response.put("totalElements", allUserPhotos.size());
            response.put("number", pageable.getPageNumber());
            
            return ResponseEntity.ok(response);
        }
        
        // Если прямой запрос не дал результатов, используем стандартный метод
        Page<Photo> photos = photoService.getUserPhotos(user, pageable);
        
        // Логируем информацию о загруженных фотографиях
        logger.info("Loaded {} photos for user {} using regular service", photos.getContent().size(), user.getId());
        
        if (photos.getContent().isEmpty()) {
            logger.debug("No photos found for user {}! Total elements: {}, total pages: {}", 
                user.getId(), photos.getTotalElements(), photos.getTotalPages());
            
            if (photos.getTotalElements() > 0) {
                logger.warn("Found {} photos in database but content is empty! This may indicate a mapping issue.", 
                    photos.getTotalElements());
            }
        } else {
            // Выводим в лог информацию о первой фотографии для отладки
            Photo firstPhoto = photos.getContent().get(0);
            logger.debug("First photo for user {}: id={}, title={}, url={}, filename={}", 
                user.getId(), firstPhoto.getId(), firstPhoto.getTitle(), 
                firstPhoto.getUrl(), firstPhoto.getFileName());
            
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
        
        // Если ничего не найдено, возвращаем пустой ответ
        Map<String, Object> emptyResponse = new HashMap<>();
        emptyResponse.put("content", List.of());
        emptyResponse.put("totalPages", 0);
        emptyResponse.put("totalElements", 0);
        emptyResponse.put("number", pageable.getPageNumber());
        
        return ResponseEntity.ok(emptyResponse);
    }

    @GetMapping("/all")
    public ResponseEntity<Page<Photo>> getAllPhotos(Pageable pageable) {
        Page<Photo> photos = photoService.getAllPhotos(pageable);
        return ResponseEntity.ok(photos);
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePhoto(
            @PathVariable Long id,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String description,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        User user = new User();
        user.setId(userDetails.getId());
        
        Photo photo = photoService.updatePhoto(id, title, description, user);
        return ResponseEntity.ok(photo);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePhoto(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) throws IOException {
        
        logger.info("Attempt to delete photo with ID: {} by user ID: {}", id, userDetails.getId());
        
        try {
            Photo photo = photoService.getPhotoById(id);
            
            // Проверяем права доступа
            boolean isOwner = photo.getUser().getId().equals(userDetails.getId());
            boolean isModerator = userDetails.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_MODERATOR") || a.getAuthority().equals("ROLE_ADMIN"));
            
            if (!isOwner && !isModerator) {
                logger.warn("User {} attempted to delete photo {} without permission", userDetails.getId(), id);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new MessageResponse("У вас нет прав для удаления этой фотографии"));
            }
            
            // Запоминаем название фото перед удалением для логирования
            String photoTitle = photo.getTitle();
            
            photoService.deletePhoto(id, null);
            
            // Логируем удаление фото
            activityLogService.logActivity(userDetails.getId(), "photo", "delete", id, 
                photoTitle, null, getRoleString(userDetails));
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Фотография успешно удалена");
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error deleting photo with ID: {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при удалении фотографии: " + e.getMessage()));
        }
    }

    @GetMapping("/search")
    public ResponseEntity<Map<String, Object>> searchPhotos(
            @RequestParam(required = false) String keyword,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        
        logger.info("Search photos by keyword: {}, page: {}, size: {}", keyword, page, size);
        
        try {
            Pageable pageable = PageRequest.of(page, size);
            Page<Photo> photosPage;
            
            if (keyword == null || keyword.isEmpty()) {
                photosPage = photoRepository.findAll(pageable);
            } else {
                photosPage = photoRepository.searchByKeyword(keyword, pageable);
            }
            
            List<Photo> photos = photosPage.getContent();
            
            // Преобразуем фотографии в безопасный DTO формат
            List<Map<String, Object>> safePhotos = convertPhotosToMaps(photos);
            
            // Создаем формат ответа, который ожидает фронтенд
            Map<String, Object> response = new HashMap<>();
            response.put("content", safePhotos);
            response.put("totalPages", photosPage.getTotalPages());
            response.put("totalElements", photosPage.getTotalElements());
            response.put("number", photosPage.getNumber());
            
            logger.info("Found {} photos matching keyword: {}", photos.size(), keyword);
            
            return new ResponseEntity<>(response, HttpStatus.OK);
        } catch (Exception e) {
            logger.error("Error searching photos by keyword '{}': {}", keyword, e.getMessage(), e);
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to search photos");
            errorResponse.put("message", e.getMessage());
            
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/album/{albumId}")
    public ResponseEntity<?> getPhotosByAlbumId(@PathVariable Long albumId, 
                                             @AuthenticationPrincipal UserDetailsImpl userDetails) {
        logger.info("Fetching photos for album ID: {}", albumId);
        
        try {
            // Получаем информацию об альбоме
            Optional<Album> albumOpt = albumRepository.findById(albumId);
            
            if (!albumOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new MessageResponse("Альбом не найден"));
            }
            
            Album album = albumOpt.get();
            
            // Проверяем, является ли пользователь владельцем альбома
            boolean isOwner = album.getUser().getId().equals(userDetails.getId());
            
            // Проверяем, является ли пользователь администратором или модератором
            boolean isAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            boolean isModerator = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MODERATOR"));
                
            // Проверка доступа: администраторы и модераторы имеют полный доступ
            if (album.getPrivacyLevel() == PrivacyLevel.PRIVATE && !isOwner && !isAdmin && !isModerator) {
                logger.warn("User {} attempted to access photos in private album {}", 
                        userDetails.getId(), albumId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new MessageResponse("У вас нет доступа к этому альбому"));
            } 
            
            if (album.getPrivacyLevel() == PrivacyLevel.FRIENDS && !isOwner && !isAdmin && !isModerator) {
                // TODO: Добавить проверку на друзей
                // Временно разрешаем для FRIENDS - будет реализовано в будущем
                logger.info("User {} accessing FRIENDS-level album {}", userDetails.getId(), albumId);
            }
            
            // Для администраторов и модераторов добавляем логирование
            if ((isAdmin || isModerator) && !isOwner && album.getPrivacyLevel() == PrivacyLevel.PRIVATE) {
                logger.info("Admin/moderator {} accessing private album {} belonging to user {}", 
                    userDetails.getId(), album.getId(), album.getUser().getId());
            }
            
            // Получаем фотографии из альбома
            List<Photo> photos = photoRepository.findByAlbum(album);
            logger.info("Found {} photos in album {}", photos.size(), albumId);
            
            // Преобразуем фотографии для передачи клиенту
            List<Map<String, Object>> safePhotos = convertPhotosToMaps(photos);
            
            return ResponseEntity.ok(safePhotos);
        } catch (Exception e) {
            logger.error("Error fetching photos for album: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Произошла ошибка при получении фотографий: " + e.getMessage()));
        }
    }

    @GetMapping("/{id}/info")
    public ResponseEntity<?> getPhotoInfo(
            @PathVariable("id") Long id,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        try {
            Photo photo = photoService.getPhotoById(id);
            
            // Проверка прав доступа
            boolean isOwner = userDetails != null && photo.getUser().getId().equals(userDetails.getId());
            boolean isAdmin = userDetails != null && userDetails.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            boolean isModerator = userDetails != null && userDetails.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_MODERATOR"));
            
            // Если фотография не публичная и пользователь не владелец, не админ и не модератор
            if (!photo.isPublic() && !isOwner && !isAdmin && !isModerator) {
                logger.warn("Unauthorized access attempt to photo {}", id);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new MessageResponse("У вас нет доступа к этой фотографии"));
            }
            
            // Для администраторов и модераторов добавляем логирование доступа к приватным фото
            if ((isAdmin || isModerator) && !isOwner && !photo.isPublic()) {
                logger.info("Admin/moderator {} accessing private photo {} belonging to user {}", 
                    userDetails.getId(), photo.getId(), photo.getUser().getId());
            }
            
            // Увеличиваем счетчик просмотров
            photo.setViewCount(photo.getViewCount() + 1);
            photoRepository.save(photo);
            
            // Формируем расширенную информацию о файле для отображения
            Map<String, Object> photoInfo = new HashMap<>();
            photoInfo.put("id", photo.getId());
            photoInfo.put("title", photo.getTitle());
            photoInfo.put("description", photo.getDescription());
            photoInfo.put("originalFileName", photo.getOriginalFileName());
            photoInfo.put("fileSize", photo.getFileSize());
            photoInfo.put("mimeType", photo.getMimeType());
            photoInfo.put("createdAt", photo.getCreatedAt());
            photoInfo.put("updatedAt", photo.getUpdatedAt());
            photoInfo.put("viewCount", photo.getViewCount());
            photoInfo.put("rating", photo.getRating());
            photoInfo.put("ratingCount", photo.getRatingCount());
            photoInfo.put("isPublic", photo.isPublic());
            photoInfo.put("tags", photo.getTags());
            
            // Включаем подробную информацию о пользователе
            if (photo.getUser() != null) {
                Map<String, Object> userInfo = new HashMap<>();
                userInfo.put("id", photo.getUser().getId());
                userInfo.put("username", photo.getUser().getUsername());
                // Не включаем чувствительную информацию о пользователе
                photoInfo.put("user", userInfo);
                
                logger.info("Photo {} owner: user ID {} ({})", 
                    photo.getId(), photo.getUser().getId(), photo.getUser().getUsername());
            } else {
                logger.warn("Photo {} has no associated user!", photo.getId());
            }
            
            // Если фото принадлежит альбому, включаем информацию об альбоме
            if (photo.getAlbum() != null) {
                Map<String, Object> albumInfo = new HashMap<>();
                albumInfo.put("id", photo.getAlbum().getId());
                albumInfo.put("name", photo.getAlbum().getName());
                albumInfo.put("privacyLevel", photo.getAlbum().getPrivacyLevel().toString());
                photoInfo.put("album", albumInfo);
            }
            
            return ResponseEntity.ok(photoInfo);
        } catch (Exception e) {
            logger.error("Error fetching photo info: {}", e.getMessage());
            Map<String, String> errorResponse = new HashMap<>();
            errorResponse.put("error", "Failed to get photo information");
            errorResponse.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(errorResponse);
        }
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserPublicPhotos(
            @PathVariable Long userId,
            @RequestParam(defaultValue = "recent") String sort,
            Pageable pageable,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        logger.info("Getting public photos for user ID: {} with sort: {}", userId, sort);
        
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        
        // Проверяем, является ли текущий пользователь админом или модератором
        boolean isAdmin = false;
        boolean isModerator = false;
        
        if (userDetails != null) {
            isAdmin = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
            isModerator = userDetails.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_MODERATOR"));
        }
        
        Page<Photo> photos;
        
        if (isAdmin || isModerator) {
            // Для администраторов и модераторов получаем все фотографии пользователя
            logger.info("Admin/moderator {} accessing all photos of user {}", 
                userDetails != null ? userDetails.getId() : "anonymous", userId);
            photos = photoRepository.findByUserId(userId, pageable);
        } else {
            // Для остальных пользователей получаем только публичные фотографии
            photos = photoService.getUserPublicPhotos(userId, pageable);
        }
        
        // Логируем информацию о загруженных фотографиях
        logger.info("Loaded {} photos for user {}", photos.getContent().size(), userId);
        
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
} 