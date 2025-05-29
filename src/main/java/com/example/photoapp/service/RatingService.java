package com.example.photoapp.service;

import com.example.photoapp.model.Photo;
import com.example.photoapp.model.PhotoRating;
import com.example.photoapp.model.User;
import com.example.photoapp.repository.PhotoRatingRepository;
import com.example.photoapp.repository.PhotoRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class RatingService {
    
    private static final Logger logger = LoggerFactory.getLogger(RatingService.class);
    
    @Autowired
    private PhotoRatingRepository photoRatingRepository;
    
    @Autowired
    private PhotoRepository photoRepository;
    
    /**
     * Оценить фотографию.
     * Если пользователь уже оценил фото, его оценка будет обновлена.
     * 
     * @param photoId ID фотографии
     * @param userId ID пользователя
     * @param value значение оценки (от 1 до 5)
     * @return обновленная средняя оценка фото
     */
    @Transactional
    public double ratePhoto(Long photoId, Long userId, int value) {
        logger.info("User {} rating photo {} with value {}", userId, photoId, value);
        
        if (value < 1 || value > 5) {
            throw new IllegalArgumentException("Оценка должна быть от 1 до 5");
        }
        
        // Находим фото и пользователя
        Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new IllegalArgumentException("Фото с ID " + photoId + " не найдено"));
        
        User user = new User();
        user.setId(userId);
        
        // Проверяем, оценил ли пользователь это фото ранее
        Optional<PhotoRating> existingRating = photoRatingRepository.findByPhotoAndUser(photo, user);
        
        if (existingRating.isPresent()) {
            // Обновляем существующую оценку
            PhotoRating rating = existingRating.get();
            rating.setValue(value);
            rating.setUpdatedAt(LocalDateTime.now());
            photoRatingRepository.save(rating);
            logger.info("Updated existing rating for photo {} by user {}", photoId, userId);
        } else {
            // Создаем новую оценку
            PhotoRating newRating = new PhotoRating();
            newRating.setPhoto(photo);
            newRating.setUser(user);
            newRating.setValue(value);
            photoRatingRepository.save(newRating);
            logger.info("Created new rating for photo {} by user {}", photoId, userId);
        }
        
        // Пересчитываем среднюю оценку фото
        updatePhotoRating(photo);
        
        return photo.getRating();
    }
    
    /**
     * Удалить оценку пользователя с фотографии
     * 
     * @param photoId ID фотографии
     * @param userId ID пользователя
     * @return обновленная средняя оценка фото
     */
    @Transactional
    public double removeRating(Long photoId, Long userId) {
        logger.info("Removing rating from photo {} by user {}", photoId, userId);
        
        // Находим фото и пользователя
        Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new IllegalArgumentException("Фото с ID " + photoId + " не найдено"));
        
        User user = new User();
        user.setId(userId);
        
        // Удаляем оценку, если она существует
        photoRatingRepository.deleteByPhotoAndUser(photo, user);
        logger.info("Rating removed for photo {} by user {}", photoId, userId);
        
        // Пересчитываем среднюю оценку фото
        updatePhotoRating(photo);
        
        return photo.getRating();
    }
    
    /**
     * Проверить, оценил ли пользователь фотографию
     * 
     * @param photoId ID фотографии
     * @param userId ID пользователя
     * @return текущая оценка пользователя или null, если оценки нет
     */
    public Integer getUserRating(Long photoId, Long userId) {
        logger.debug("Checking if user {} rated photo {}", userId, photoId);
        
        // Находим фото и пользователя
        Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new IllegalArgumentException("Фото с ID " + photoId + " не найдено"));
        
        User user = new User();
        user.setId(userId);
        
        // Ищем оценку
        Optional<PhotoRating> rating = photoRatingRepository.findByPhotoAndUser(photo, user);
        
        return rating.map(PhotoRating::getValue).orElse(null);
    }
    
    /**
     * Получить все оценки для фотографии
     * 
     * @param photoId ID фотографии
     * @return список оценок
     */
    public List<PhotoRating> getPhotoRatings(Long photoId) {
        logger.debug("Getting all ratings for photo {}", photoId);
        
        Photo photo = photoRepository.findById(photoId)
                .orElseThrow(() -> new IllegalArgumentException("Фото с ID " + photoId + " не найдено"));
        
        return photoRatingRepository.findByPhoto(photo);
    }
    
    /**
     * Пересчитать и обновить среднюю оценку фотографии
     * 
     * @param photo фотография, для которой нужно обновить оценку
     */
    private void updatePhotoRating(Photo photo) {
        logger.debug("Recalculating rating for photo {}", photo.getId());
        
        Double avgRating = photoRatingRepository.calculateAverageRating(photo);
        long ratingCount = photoRatingRepository.countByPhoto(photo);
        
        photo.setRating(avgRating != null ? avgRating : 0.0);
        photo.setRatingCount((int) ratingCount);
        
        photoRepository.save(photo);
        logger.debug("Updated photo {} rating to {} with {} ratings", photo.getId(), photo.getRating(), photo.getRatingCount());
    }
} 