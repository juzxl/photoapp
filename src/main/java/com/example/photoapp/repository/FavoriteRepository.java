package com.example.photoapp.repository;

import com.example.photoapp.model.Favorite;
import com.example.photoapp.model.Photo;
import com.example.photoapp.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FavoriteRepository extends JpaRepository<Favorite, Long> {
    Page<Favorite> findByUser(User user, Pageable pageable);
    Page<Favorite> findByPhoto(Photo photo, Pageable pageable);
    Optional<Favorite> findByUserAndPhoto(User user, Photo photo);
    boolean existsByUserAndPhoto(User user, Photo photo);
    void deleteByUserAndPhoto(User user, Photo photo);
} 