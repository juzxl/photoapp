package com.example.photoapp.repository;

import com.example.photoapp.model.Photo;
import com.example.photoapp.model.PhotoRating;
import com.example.photoapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface PhotoRatingRepository extends JpaRepository<PhotoRating, Long> {
    
    /**
     * Найти оценку пользователя для конкретной фотографии
     */
    Optional<PhotoRating> findByPhotoAndUser(Photo photo, User user);
    
    /**
     * Найти все оценки для фотографии
     */
    List<PhotoRating> findByPhoto(Photo photo);
    
    /**
     * Найти все оценки, оставленные пользователем
     */
    List<PhotoRating> findByUser(User user);
    
    /**
     * Посчитать количество оценок для фотографии
     */
    long countByPhoto(Photo photo);
    
    /**
     * Посчитать среднюю оценку для фотографии
     */
    @Query("SELECT AVG(r.value) FROM PhotoRating r WHERE r.photo = :photo")
    Double calculateAverageRating(@Param("photo") Photo photo);
    
    /**
     * Проверить, оценил ли пользователь конкретную фотографию
     */
    boolean existsByPhotoAndUser(Photo photo, User user);
    
    /**
     * Удалить оценку пользователя для конкретной фотографии
     */
    void deleteByPhotoAndUser(Photo photo, User user);
} 