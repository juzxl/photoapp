package com.example.photoapp.repository;

import com.example.photoapp.model.Tag;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface TagRepository extends JpaRepository<Tag, Long> {
    Optional<Tag> findByName(String name);
    
    boolean existsByName(String name);
    
    /**
     * Находит все теги с именами из переданного набора
     * 
     * @param names набор имен тегов для поиска
     * @return список найденных тегов
     */
    List<Tag> findByNameIn(Set<String> names);
    
    @Query("SELECT t FROM Tag t JOIN t.photos p GROUP BY t ORDER BY COUNT(p) DESC")
    List<Tag> findPopularTags();
    
    @Query("SELECT t FROM Tag t WHERE LOWER(t.name) LIKE LOWER(CONCAT('%', ?1, '%'))")
    List<Tag> searchByNameContaining(String keyword);
} 