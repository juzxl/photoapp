package com.example.photoapp.repository;

import com.example.photoapp.model.Comment;
import com.example.photoapp.model.Photo;
import com.example.photoapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByPhoto(Photo photo);
    
    List<Comment> findByUser(User user);
    
    List<Comment> findByPhotoOrderByCreatedAtDesc(Photo photo);
    
    void deleteByPhotoAndUser(Photo photo, User user);
} 