package com.example.photoapp.controller;

import com.example.photoapp.model.Comment;
import com.example.photoapp.model.Photo;
import com.example.photoapp.model.User;
import com.example.photoapp.repository.CommentRepository;
import com.example.photoapp.repository.PhotoRepository;
import com.example.photoapp.repository.UserRepository;
import com.example.photoapp.security.services.UserDetailsImpl;
import com.example.photoapp.dto.MessageResponse;
import com.example.photoapp.service.ActivityLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.*;
import java.util.stream.Collectors;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/comments")
public class CommentController {
    private static final Logger logger = LoggerFactory.getLogger(CommentController.class);
    
    @Autowired
    private CommentRepository commentRepository;
    
    @Autowired
    private PhotoRepository photoRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private ActivityLogService activityLogService;
    
    // Вспомогательный метод для определения роли пользователя
    private String getRoleString(UserDetailsImpl userDetails) {
        if (userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return "admin";
        } else if (userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MODERATOR"))) {
            return "moderator";
        }
        return "user";
    }
    
    // Получение комментариев к фотографии
    @GetMapping("/photo/{photoId}")
    public ResponseEntity<?> getPhotoComments(@PathVariable Long photoId) {
        logger.info("Getting comments for photo ID: {}", photoId);
        
        try {
            Optional<Photo> photoOpt = photoRepository.findById(photoId);
            if (!photoOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new MessageResponse("Фотография не найдена"));
            }
            
            Photo photo = photoOpt.get();
            List<Comment> comments = commentRepository.findByPhotoOrderByCreatedAtDesc(photo);
            
            // Преобразуем комментарии в DTO для избежания проблем с JSON-сериализацией
            List<Map<String, Object>> commentsDto = comments.stream()
                    .map(this::convertCommentToMap)
                    .collect(Collectors.toList());
            
            logger.info("Found {} comments for photo ID: {}", comments.size(), photoId);
            return ResponseEntity.ok(commentsDto);
        } catch (Exception e) {
            logger.error("Error getting comments for photo: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при получении комментариев: " + e.getMessage()));
        }
    }
    
    // Добавление комментария к фотографии
    @PostMapping("/photo/{photoId}")
    public ResponseEntity<?> addComment(
            @PathVariable Long photoId,
            @RequestBody Map<String, String> payload,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        String content = payload.get("content");
        
        if (content == null || content.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Текст комментария не может быть пустым"));
        }
        
        logger.info("Adding comment to photo ID: {} by user ID: {}", photoId, userDetails.getId());
        
        try {
            // Получаем фотографию
            Optional<Photo> photoOpt = photoRepository.findById(photoId);
            if (!photoOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new MessageResponse("Фотография не найдена"));
            }
            
            // Получаем пользователя
            Optional<User> userOpt = userRepository.findById(userDetails.getId());
            if (!userOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new MessageResponse("Пользователь не найден"));
            }
            
            Photo photo = photoOpt.get();
            User user = userOpt.get();
            
            // Создаем и сохраняем комментарий
            Comment comment = new Comment();
            comment.setContent(content);
            comment.setPhoto(photo);
            comment.setUser(user);
            
            comment = commentRepository.save(comment);
            
            // Логируем добавление комментария
            activityLogService.logActivity(userDetails.getId(), "comment", "add", comment.getId(), 
                    null, photo.getId(), getRoleString(userDetails));
            
            // Преобразуем комментарий в DTO
            Map<String, Object> commentDto = convertCommentToMap(comment);
            
            logger.info("Comment added successfully for photo ID: {}", photoId);
            return ResponseEntity.ok(commentDto);
        } catch (Exception e) {
            logger.error("Error adding comment: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при добавлении комментария: " + e.getMessage()));
        }
    }
    
    // Удаление комментария
    @DeleteMapping("/{commentId}")
    public ResponseEntity<?> deleteComment(
            @PathVariable Long commentId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        logger.info("Deleting comment ID: {} by user ID: {}", commentId, userDetails.getId());
        
        try {
            Optional<Comment> commentOpt = commentRepository.findById(commentId);
            if (!commentOpt.isPresent()) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new MessageResponse("Комментарий не найден"));
            }
            
            Comment comment = commentOpt.get();
            
            // Проверяем, принадлежит ли комментарий пользователю или является ли пользователь модератором/админом
            boolean isOwner = comment.getUser().getId().equals(userDetails.getId());
            boolean isModerator = userDetails.getAuthorities().stream()
                    .anyMatch(a -> a.getAuthority().equals("ROLE_MODERATOR") || a.getAuthority().equals("ROLE_ADMIN"));
            
            if (!isOwner && !isModerator) {
                logger.warn("User {} attempted to delete another user's comment {}", 
                        userDetails.getId(), commentId);
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new MessageResponse("Вы не можете удалять чужие комментарии"));
            }
            
            // Запоминаем ID фотографии для логирования
            Long photoId = comment.getPhoto().getId();
            
            // Удаляем комментарий
            commentRepository.delete(comment);
            
            // Логируем удаление комментария
            activityLogService.logActivity(userDetails.getId(), "comment", "delete", commentId, 
                    null, photoId, getRoleString(userDetails));
            
            logger.info("Comment deleted successfully: ID {}", commentId);
            return ResponseEntity.ok(new MessageResponse("Комментарий успешно удален"));
        } catch (Exception e) {
            logger.error("Error deleting comment: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при удалении комментария: " + e.getMessage()));
        }
    }
    
    // Преобразование Comment в Map для JSON-сериализации
    private Map<String, Object> convertCommentToMap(Comment comment) {
        Map<String, Object> commentMap = new HashMap<>();
        commentMap.put("id", comment.getId());
        commentMap.put("content", comment.getContent());
        commentMap.put("createdAt", comment.getCreatedAt());
        
        // Добавляем информацию о пользователе
        Map<String, Object> userMap = new HashMap<>();
        userMap.put("id", comment.getUser().getId());
        userMap.put("username", comment.getUser().getUsername());
        commentMap.put("user", userMap);
        
        // Добавляем минимальную информацию о фото
        Map<String, Object> photoMap = new HashMap<>();
        photoMap.put("id", comment.getPhoto().getId());
        photoMap.put("title", comment.getPhoto().getTitle());
        commentMap.put("photo", photoMap);
        
        return commentMap;
    }
} 