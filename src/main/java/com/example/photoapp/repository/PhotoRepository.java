package com.example.photoapp.repository;

import com.example.photoapp.model.Album;
import com.example.photoapp.model.Photo;
import com.example.photoapp.model.PhotoStatus;
import com.example.photoapp.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface PhotoRepository extends JpaRepository<Photo, Long> {
    Page<Photo> findByUser(User user, Pageable pageable);
    
    @Query("SELECT p FROM Photo p JOIN p.categories c WHERE c.id = :categoryId")
    Page<Photo> findByCategoryId(@Param("categoryId") Long categoryId, Pageable pageable);
    
    @Query("SELECT DISTINCT p FROM Photo p JOIN p.tags t WHERE t IN :tags")
    Page<Photo> findByTagsIn(@Param("tags") List<String> tags, Pageable pageable);
    
    Page<Photo> findByCreatedAtBetween(LocalDateTime start, LocalDateTime end, Pageable pageable);
    
    @Query("SELECT DISTINCT p FROM Photo p LEFT JOIN p.tags t WHERE " +
           "LOWER(p.title) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(p.description) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "LOWER(t) LIKE LOWER(CONCAT('%', :keyword, '%')) OR " +
           "CONCAT('', p.id) = :keyword")
    Page<Photo> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    List<Photo> findByAlbum(Album album);
    
    List<Photo> findByStatus(PhotoStatus status);
    
    @Query("SELECT p FROM Photo p WHERE p.album.privacyLevel = 'PUBLIC' OR p.album.privacyLevel = 'FRIENDS' OR p.album.user = ?1")
    List<Photo> findAccessiblePhotos(User user);
    
    @Query("SELECT p FROM Photo p WHERE p.createdAt BETWEEN ?1 AND ?2")
    List<Photo> findByDateRange(LocalDateTime start, LocalDateTime end);
    
    @Query("SELECT p FROM Photo p JOIN p.tags t WHERE t.name = ?1")
    List<Photo> findByTagName(String tagName);
    
    @Query("SELECT p FROM Photo p WHERE p.status = 'PENDING' ORDER BY p.createdAt DESC")
    List<Photo> findPendingPhotos();

    Page<Photo> findByUserOrderByCreatedAtDesc(User user, Pageable pageable);
    
    Page<Photo> findAllByOrderByCreatedAtDesc(Pageable pageable);
    
    @Query("SELECT p FROM Photo p WHERE p.status = 'APPROVED' ORDER BY p.createdAt DESC")
    Page<Photo> findAllApprovedPhotos(Pageable pageable);
    
    @Query("SELECT p FROM Photo p WHERE p.user = ?1 AND p.status = 'APPROVED' ORDER BY p.createdAt DESC")
    Page<Photo> findApprovedPhotosByUser(User user, Pageable pageable);
    
    Optional<Photo> findByIdAndUser(Long id, User user);
    
    List<Photo> findByAlbumId(Long albumId);
    
    @Query("SELECT COUNT(p) FROM Photo p WHERE p.user = ?1")
    long countByUser(User user);

    @Query("SELECT p FROM Photo p WHERE p.isPublic = true " +
           "AND (:tags IS NULL OR :tags = '') " +
           "ORDER BY CASE " +
           "    WHEN :sort = 'popular' THEN p.viewCount " +
           "    WHEN :sort = 'recent' THEN p.createdAt " +
           "    ELSE p.createdAt " +
           "END DESC")
    Page<Photo> findPublicPhotos(@Param("tags") String tags, @Param("sort") String sort, Pageable pageable);
    
    // Метод для получения публичных фотографий с использованием Spring Data JPA
    Page<Photo> findByIsPublicTrue(Pageable pageable);
    
    // Метод для получения всех фотографий без проверки на приватность
    @Query("SELECT p FROM Photo p ORDER BY p.createdAt DESC")
    Page<Photo> findAllPhotos(Pageable pageable);

    // Метод для получения фотографий по ID пользователя без проверки на статус
    @Query("SELECT p FROM Photo p WHERE p.user.id = :userId ORDER BY p.createdAt DESC")
    Page<Photo> findByUserId(@Param("userId") Long userId, Pageable pageable);

    List<Photo> findByUser(User user);

    // Получение всех фотографий пользователя без пагинации (для отладки)
    @Query("SELECT p FROM Photo p WHERE p.user.id = :userId ORDER BY p.createdAt DESC")
    List<Photo> findAllByUserId(@Param("userId") Long userId);
    
    // Метод для получения публичных фотографий определенного пользователя
    @Query("SELECT p FROM Photo p WHERE p.user.id = :userId AND p.isPublic = true ORDER BY p.createdAt DESC")
    Page<Photo> findByUserIdAndIsPublicTrue(@Param("userId") Long userId, Pageable pageable);

    /**
     * Получение ленты фотографий для пользователя
     * Включает публичные фотографии всех пользователей и все фотографии самого пользователя
     * При этом фотографии других пользователей должны иметь статус APPROVED
     */
    @Query("SELECT p FROM Photo p WHERE (p.isPublic = true AND p.status = 'APPROVED' AND p.user.id != :userId) OR (p.user.id = :userId) ORDER BY p.createdAt DESC")
    Page<Photo> findFeedForUser(@Param("userId") Long userId, Pageable pageable);
    
    /**
     * Получение ленты фотографий с фильтрацией по тегам
     * Включает публичные фотографии всех пользователей и все фотографии самого пользователя
     * При этом фотографии других пользователей должны иметь статус APPROVED
     */
    @Query("SELECT DISTINCT p FROM Photo p JOIN p.tags t WHERE ((p.isPublic = true AND p.status = 'APPROVED' AND p.user.id != :userId) OR p.user.id = :userId) AND t IN :tags ORDER BY p.createdAt DESC")
    Page<Photo> findFeedByTags(@Param("userId") Long userId, @Param("tags") List<String> tags, Pageable pageable);

    // Получение публичных фотографий со статусом APPROVED
    Page<Photo> findByIsPublicTrueAndStatus(PhotoStatus status, Pageable pageable);

    // Получение публичных фотографий со статусом APPROVED с фильтрацией по тегам
    @Query("SELECT DISTINCT p FROM Photo p JOIN p.tags t WHERE p.isPublic = true AND p.status = :status AND t IN :tags")
    Page<Photo> findByIsPublicTrueAndStatusAndTagsIn(@Param("status") PhotoStatus status, @Param("tags") List<String> tags, Pageable pageable);
} 