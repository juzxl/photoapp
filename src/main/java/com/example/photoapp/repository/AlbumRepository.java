package com.example.photoapp.repository;

import com.example.photoapp.model.Album;
import com.example.photoapp.model.PrivacyLevel;
import com.example.photoapp.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AlbumRepository extends JpaRepository<Album, Long> {
    Page<Album> findByUser(User user, Pageable pageable);
    
    /**
     * Найти все альбомы, созданные указанным пользователем
     * Явно используем критерий равенства с ID пользователя, чтобы избежать проблем с равенством объектов
     */
    @Query("SELECT a FROM Album a WHERE a.user.id = :#{#user.id}")
    List<Album> findByUser(User user);
    
    List<Album> findByUserAndPrivacyLevel(User user, PrivacyLevel privacyLevel);
    
    Optional<Album> findByUserAndName(User user, String name);
    
    /**
     * Найти альбомы, доступные для просмотра указанному пользователю
     * (публичные, для друзей или собственные)
     */
    @Query("SELECT a FROM Album a WHERE a.privacyLevel = 'PUBLIC' OR a.privacyLevel = 'FRIENDS' OR a.user.id = :#{#user.id}")
    List<Album> findAccessibleAlbums(User user);
} 