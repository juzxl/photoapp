package com.example.photoapp.controller;

import com.example.photoapp.model.Favorite;
import com.example.photoapp.model.Photo;
import com.example.photoapp.model.User;
import com.example.photoapp.repository.FavoriteRepository;
import com.example.photoapp.repository.PhotoRepository;
import com.example.photoapp.repository.UserRepository;
import com.example.photoapp.security.services.UserDetailsImpl;
import com.example.photoapp.service.ActivityLogService;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/favorites")
public class FavoriteController {

    @Autowired
    private FavoriteRepository favoriteRepository;

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

    /**
     * Получить избранные фотографии пользователя
     */
    @GetMapping
    public ResponseEntity<?> getFavorites(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(defaultValue = "createdAt") String sort,
            @RequestParam(defaultValue = "desc") String direction) {

        // Получаем ID пользователя из контекста безопасности
        Long userId = getUserIdFromContext();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Пользователь не аутентифицирован");
        }

        // Находим пользователя в базе
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Пользователь не найден");
        }

        // Создаем объект сортировки
        Sort sortObj = direction.equalsIgnoreCase("asc") 
                ? Sort.by(sort).ascending() 
                : Sort.by(sort).descending();

        // Создаем объект Pageable для пагинации
        Pageable pageable = PageRequest.of(page, size, sortObj);

        // Получаем избранные фотографии пользователя
        Page<Favorite> favorites = favoriteRepository.findByUser(userOpt.get(), pageable);

        return ResponseEntity.ok(favorites);
    }

    /**
     * Добавить/удалить фотографию из избранного
     */
    @PostMapping("/{photoId}")
    public ResponseEntity<?> toggleFavorite(@PathVariable Long photoId) {
        // Получаем ID пользователя из контекста безопасности
        Long userId = getUserIdFromContext();
        if (userId == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Пользователь не аутентифицирован");
        }

        // Находим пользователя в базе
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Пользователь не найден");
        }

        // Находим фотографию в базе
        Optional<Photo> photoOpt = photoRepository.findById(photoId);
        if (photoOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body("Фотография не найдена");
        }

        User user = userOpt.get();
        Photo photo = photoOpt.get();

        // Проверяем, есть ли уже эта фотография в избранном
        Optional<Favorite> existingFavorite = favoriteRepository.findByUserAndPhoto(user, photo);

        Map<String, Object> response = new HashMap<>();

        try {
            // Получаем UserDetails для определения роли при логировании
            UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            String userRole = getRoleString(userDetails);
            
            // Если фотография уже в избранном - удаляем её
            if (existingFavorite.isPresent()) {
                favoriteRepository.delete(existingFavorite.get());
                response.put("status", "removed");
                response.put("message", "Фотография удалена из избранного");
                
                // Логируем удаление из избранного
                activityLogService.logActivity(userId, "favorite", "delete", photoId, 
                    null, null, userRole);
            } else {
                // Иначе добавляем в избранное
                Favorite favorite = new Favorite(user, photo);
                favoriteRepository.save(favorite);
                response.put("status", "added");
                response.put("message", "Фотография добавлена в избранное");
                
                // Логируем добавление в избранное
                activityLogService.logActivity(userId, "favorite", "add", photoId, 
                    null, null, userRole);
            }
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Ошибка при обработке запроса: " + e.getMessage());
        }
    }

    /**
     * Проверить, находится ли фотография в избранном
     */
    @GetMapping("/check/{photoId}")
    public ResponseEntity<?> checkFavorite(@PathVariable Long photoId) {
        // Получаем ID пользователя из контекста безопасности
        Long userId = getUserIdFromContext();
        if (userId == null) {
            return ResponseEntity.ok(Map.of("isFavorite", false));
        }

        // Находим пользователя в базе
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("isFavorite", false));
        }

        // Находим фотографию в базе
        Optional<Photo> photoOpt = photoRepository.findById(photoId);
        if (photoOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of("isFavorite", false));
        }

        // Проверяем, есть ли уже эта фотография в избранном
        boolean isFavorite = favoriteRepository.existsByUserAndPhoto(userOpt.get(), photoOpt.get());

        return ResponseEntity.ok(Map.of("isFavorite", isFavorite));
    }

    /**
     * Вспомогательный метод для получения ID пользователя из контекста безопасности
     */
    private Long getUserIdFromContext() {
        try {
            // Временное решение для тестового режима
            // return 7L;
            
            //  Рабочая версия, когда безопасность включена:
            UserDetailsImpl userDetails = (UserDetailsImpl) SecurityContextHolder.getContext().getAuthentication().getPrincipal();
            return userDetails.getId();
            
        } catch (Exception e) {
            return null;
        }
    }
} 