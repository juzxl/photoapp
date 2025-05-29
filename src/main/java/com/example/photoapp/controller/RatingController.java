package com.example.photoapp.controller;

import com.example.photoapp.dto.MessageResponse;
import com.example.photoapp.model.PhotoRating;
import com.example.photoapp.security.services.UserDetailsImpl;
import com.example.photoapp.service.RatingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api")
public class RatingController {
    
    private static final Logger logger = LoggerFactory.getLogger(RatingController.class);
    
    @Autowired
    private RatingService ratingService;
    
    /**
     * Оценить фото
     */
    @PostMapping("/photos/{id}/rate")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<?> ratePhoto(
            @PathVariable("id") Long photoId,
            @RequestBody Map<String, Integer> requestBody,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        logger.info("User {} rating photo {}", userDetails.getId(), photoId);
        
        Integer value = requestBody.get("value");
        if (value == null || value < 1 || value > 5) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(new MessageResponse("Оценка должна быть от 1 до 5"));
        }
        
        try {
            double newRating = ratingService.ratePhoto(photoId, userDetails.getId(), value);
            long ratingCount = ratingService.getPhotoRatings(photoId).size();
            
            Map<String, Object> response = new HashMap<>();
            response.put("newRating", newRating);
            response.put("ratingCount", ratingCount);
            response.put("userRating", value);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error rating photo: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при оценке фото: " + e.getMessage()));
        }
    }
    
    /**
     * Удалить оценку фото
     */
    @DeleteMapping("/photos/{id}/rate")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<?> removeRating(
            @PathVariable("id") Long photoId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        logger.info("User {} removing rating from photo {}", userDetails.getId(), photoId);
        
        try {
            double newRating = ratingService.removeRating(photoId, userDetails.getId());
            long ratingCount = ratingService.getPhotoRatings(photoId).size();
            
            Map<String, Object> response = new HashMap<>();
            response.put("newRating", newRating);
            response.put("ratingCount", ratingCount);
            response.put("userRating", null);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error removing rating: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при удалении оценки: " + e.getMessage()));
        }
    }
    
    /**
     * Получить оценку пользователя для фото
     */
    @GetMapping("/photos/{id}/rate")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<?> getUserRating(
            @PathVariable("id") Long photoId,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        logger.info("Getting user {} rating for photo {}", userDetails.getId(), photoId);
        
        try {
            Integer userRating = ratingService.getUserRating(photoId, userDetails.getId());
            
            Map<String, Object> response = new HashMap<>();
            response.put("userRating", userRating);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Error getting user rating: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при получении оценки: " + e.getMessage()));
        }
    }
    
    /**
     * Получить все оценки для фото (только для администраторов)
     */
    @GetMapping("/photos/{id}/ratings")
    @PreAuthorize("hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<?> getAllPhotoRatings(@PathVariable("id") Long photoId) {
        
        logger.info("Getting all ratings for photo {}", photoId);
        
        try {
            List<PhotoRating> ratings = ratingService.getPhotoRatings(photoId);
            return ResponseEntity.ok(ratings);
        } catch (Exception e) {
            logger.error("Error getting photo ratings: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при получении оценок: " + e.getMessage()));
        }
    }
} 