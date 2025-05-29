package com.example.photoapp.service;

import com.example.photoapp.model.Photo;
import com.example.photoapp.model.PhotoStatus;
import com.example.photoapp.model.User;
import com.example.photoapp.repository.PhotoRepository;
import com.example.photoapp.exception.ResourceNotFoundException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;
import java.util.Arrays;

@Service
public class PhotoService {
    
    private static final Logger logger = LoggerFactory.getLogger(PhotoService.class);
    
    @Autowired
    private PhotoRepository photoRepository;
    
    @Autowired
    private FileStorageService fileStorageService;
    
    @Transactional
    public Photo uploadPhoto(MultipartFile file, String title, String description, User user) throws IOException {
        logger.info("Uploading photo for user: {}", user.getId());
        
        // Создаем новое фото
        Photo photo = new Photo();
        photo.setUser(user);
        photo.setTitle(title != null ? title : file.getOriginalFilename());
        photo.setDescription(description);
        photo.setStatus(PhotoStatus.APPROVED);
        photo.setPublic(true);
        photo.setViewCount(0L);
        photo.setRating(0.0);
        photo.setRatingCount(0);
        
        // Сохраняем оригинальное имя файла
        String originalFilename = file.getOriginalFilename();
        photo.setOriginalFileName(originalFilename);
        
        // Сохраняем файл с помощью FileStorageService
        String fileName = fileStorageService.storeFile(file);
        photo.setFileName(fileName);
        photo.setFileSize(file.getSize());
        photo.setMimeType(file.getContentType());
        photo.setFilePath(fileStorageService.getFileUrl(fileName));
        
        // Сохраняем фото в базе данных
        logger.info("Saving photo to database with original name: {}", originalFilename);
        return photoRepository.save(photo);
    }
    
    public Page<Photo> getUserPhotos(User user, Pageable pageable) {
        logger.info("Getting photos for user ID: {}", user.getId());
        
        // Убедимся, что пагинация не переопределяет нашу сортировку
        Pageable pageWithCorrectSort = PageRequest.of(
            pageable.getPageNumber(),
            pageable.getPageSize(),
            Sort.by(Sort.Direction.DESC, "createdAt")
        );
        
        logger.info("Using pageable: page={}, size={}, sort={}", 
            pageWithCorrectSort.getPageNumber(), 
            pageWithCorrectSort.getPageSize(),
            pageWithCorrectSort.getSort());
            
        return photoRepository.findByUserId(user.getId(), pageWithCorrectSort);
    }
    
    public Page<Photo> getAllPhotos(Pageable pageable) {
        return photoRepository.findAllPhotos(pageable);
    }
    
    public Page<Photo> getApprovedPhotos(Pageable pageable) {
        return photoRepository.findAllApprovedPhotos(pageable);
    }
    
    public Photo getPhotoById(Long id) {
        return photoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found with id: " + id));
    }
    
    public Photo getUserPhotoById(Long id, User user) {
        return photoRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found with id: " + id));
    }
    
    public void deletePhoto(Long id, User user) throws IOException {
        logger.info("Deleting photo with ID: {}", id);
        
        // Получаем фото по ID
        Photo photo = photoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Photo not found with id: " + id));
        
        // Если передан пользователь, проверяем, является ли он владельцем
        // Модераторы и администраторы могут удалять любые фотографии
        if (user != null && !photo.getUser().getId().equals(user.getId())) {
            logger.warn("User {} attempted to delete another user's photo {}", user.getId(), id);
            throw new SecurityException("You don't have permission to delete this photo");
        }
        
        // Удаляем файл
        fileStorageService.deleteFile(photo.getFileName());
        
        // Удаляем запись из базы данных
        photoRepository.delete(photo);
        
        logger.info("Photo with ID: {} successfully deleted", id);
    }
    
    public Photo updatePhoto(Long id, String title, String description, User user) {
        Photo photo = getUserPhotoById(id, user);
        
        if (title != null) {
            photo.setTitle(title);
        }
        if (description != null) {
            photo.setDescription(description);
        }
        
        return photoRepository.save(photo);
    }
    
    /**
     * Получение публичных фотографий с возможностью фильтрации по тегам
     * 
     * @param tags строка с тегами, разделенными запятыми
     * @param sortBy строка с названием поля для сортировки
     * @param pageable объект пагинации
     * @return страница с публичными фотографиями
     */
    public Page<Photo> getPublicPhotos(String tags, String sortBy, Pageable pageable) {
        logger.info("Getting public photos");
        logger.info("Tags: {}", tags);
        logger.info("Sort by: {}", sortBy);
        
        // Если теги не указаны, используем запрос без фильтрации по тегам
        if (tags == null || tags.isEmpty()) {
            // Получаем все публичные фотографии со статусом APPROVED
            return photoRepository.findByIsPublicTrueAndStatus(PhotoStatus.APPROVED, pageable);
        }
        
        // Если указаны теги, используем поиск по тегам
        List<String> tagsList = Arrays.asList(tags.split(","));
        logger.info("Parsed tags: {}", tagsList);
        
        // Получаем публичные фотографии с заданными тегами со статусом APPROVED
        return photoRepository.findByIsPublicTrueAndStatusAndTagsIn(PhotoStatus.APPROVED, tagsList, pageable);
    }
    
    public Page<Photo> getUserPublicPhotos(Long userId, Pageable pageable) {
        logger.info("Getting public photos for user ID: {}", userId);
        
        // Создаем новый Pageable с сортировкой по дате создания
        Pageable pageWithCorrectSort = PageRequest.of(
            pageable.getPageNumber(),
            pageable.getPageSize(),
            Sort.by(Sort.Direction.DESC, "createdAt")
        );
        
        // Ищем публичные фото пользователя с указанным ID
        Page<Photo> photos = photoRepository.findByUserIdAndIsPublicTrue(userId, pageWithCorrectSort);
        logger.info("Found {} public photos for user {}", photos.getContent().size(), userId);
        return photos;
    }
    
    /**
     * Получение ленты фотографий для пользователя
     * Включает публичные фотографии всех пользователей и собственные фотографии пользователя
     * 
     * @param user пользователь, для которого формируется лента
     * @param tags список тегов для фильтрации (опционально)
     * @param pageable объект пагинации
     * @return страница с фотографиями
     */
    public Page<Photo> getFeedForUser(User user, List<String> tags, Pageable pageable) {
        logger.info("Getting feed for user ID: {}", user.getId());
        logger.info("Filtering by tags: {}", tags);
        
        Page<Photo> results;
        // Если указаны теги, используем поиск по тегам
        if (tags != null && !tags.isEmpty()) {
            results = photoRepository.findFeedByTags(user.getId(), tags, pageable);
        } else {
            // Иначе получаем все фотографии для ленты
            results = photoRepository.findFeedForUser(user.getId(), pageable);
        }
        
        logger.info("Feed query returned {} photos", results.getContent().size());
        // Log details about each photo for debugging
        results.getContent().forEach(photo -> 
            logger.info("Photo ID: {}, User ID: {}, isPublic: {}, Status: {}, Title: {}", 
                photo.getId(), 
                photo.getUser().getId(), 
                photo.isPublic(), 
                photo.getStatus(), 
                photo.getTitle())
        );
        
        return results;
    }
} 