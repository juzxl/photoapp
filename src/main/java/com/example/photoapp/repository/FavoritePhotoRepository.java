package com.example.photoapp.repository;

import com.example.photoapp.model.FavoritePhoto;
import com.example.photoapp.model.Photo;
import com.example.photoapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FavoritePhotoRepository extends JpaRepository<FavoritePhoto, Long> {
    List<FavoritePhoto> findByUserOrderByCreatedAtDesc(User user);
    
    boolean existsByUserAndPhoto(User user, Photo photo);
    
    void deleteByUserAndPhoto(User user, Photo photo);
} 