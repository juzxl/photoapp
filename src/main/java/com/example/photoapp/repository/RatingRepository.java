package com.example.photoapp.repository;

import com.example.photoapp.model.Photo;
import com.example.photoapp.model.Rating;
import com.example.photoapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RatingRepository extends JpaRepository<Rating, Long> {
    Optional<Rating> findByUserAndPhoto(User user, Photo photo);
    
    List<Rating> findByPhoto(Photo photo);
    
    @Query("SELECT AVG(r.value) FROM Rating r WHERE r.photo = ?1")
    Double getAverageRating(Photo photo);
    
    @Query("SELECT COUNT(r) FROM Rating r WHERE r.photo = ?1")
    Long getRatingCount(Photo photo);
    
    boolean existsByUserAndPhoto(User user, Photo photo);
} 