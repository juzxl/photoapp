package com.example.photoapp.controller;

import com.example.photoapp.dto.MessageResponse;
import com.example.photoapp.dto.UserProfileDto;
import com.example.photoapp.dto.UserPasswordDto;
import com.example.photoapp.dto.UserNotificationsDto;
import com.example.photoapp.dto.UserPrivacyDto;
import com.example.photoapp.model.User;
import com.example.photoapp.repository.UserRepository;
import com.example.photoapp.security.services.UserDetailsImpl;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
public class UserSettingsController {

    private static final Logger logger = LoggerFactory.getLogger(UserSettingsController.class);
    
    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private PasswordEncoder passwordEncoder;
    
    // Базовый путь для хранения аватарок
    private final String AVATAR_UPLOAD_DIR = "uploads/avatars/";

    /**
     * Получить информацию о текущем пользователе
     */
    @GetMapping("/me")
    // @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> getCurrentUserProfile(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        logger.info("Fetching profile for user ID: {}", userDetails.getId());
        
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", user.getId());
        userInfo.put("username", user.getUsername());
        userInfo.put("email", user.getEmail());
        userInfo.put("displayName", user.getDisplayName());
        userInfo.put("bio", user.getBio());
        userInfo.put("location", user.getLocation());
        userInfo.put("website", user.getWebsite());
        userInfo.put("avatarUrl", user.getAvatarUrl());
        userInfo.put("createdAt", user.getCreatedAt());
        userInfo.put("roles", userDetails.getAuthorities().stream()
                .map(grantedAuthority -> grantedAuthority.getAuthority())
                .collect(java.util.stream.Collectors.toList()));
        
        return ResponseEntity.ok(userInfo);
    }
    
    /**
     * Обновить профиль пользователя
     */
    @PutMapping("/me")
    public ResponseEntity<?> updateUserProfile(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody UserProfileDto profileDto) {
        
        // Проверка авторизации
        if (userDetails == null) {
            logger.warn("Попытка обновления профиля без авторизации");
            return ResponseEntity.status(401).body(new MessageResponse("Error: Authentication required"));
        }
        
        logger.info("Updating profile for user ID: {}", userDetails.getId());
        
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Обновляем только разрешенные поля
        if (profileDto.getDisplayName() != null) {
            user.setDisplayName(profileDto.getDisplayName());
        }
        if (profileDto.getBio() != null) {
            user.setBio(profileDto.getBio());
        }
        if (profileDto.getLocation() != null) {
            user.setLocation(profileDto.getLocation());
        }
        if (profileDto.getWebsite() != null) {
            user.setWebsite(profileDto.getWebsite());
        }
        
        userRepository.save(user);
        
        return ResponseEntity.ok(new MessageResponse("Profile updated successfully"));
    }
    
    /**
     * Изменение пароля
     */
    @PostMapping("/me/change-password")
    public ResponseEntity<?> changePassword(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody UserPasswordDto passwordDto) {
        
        // Проверка авторизации
        if (userDetails == null) {
            logger.warn("Попытка смены пароля без авторизации");
            return ResponseEntity.status(401).body(new MessageResponse("Error: Authentication required"));
        }
        
        logger.info("Changing password for user ID: {}", userDetails.getId());
        
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Проверяем текущий пароль
        if (!passwordEncoder.matches(passwordDto.getCurrentPassword(), user.getPassword())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Current password is incorrect"));
        }
        
        // Обновляем пароль
        user.setPassword(passwordEncoder.encode(passwordDto.getNewPassword()));
        userRepository.save(user);
        
        return ResponseEntity.ok(new MessageResponse("Password changed successfully"));
    }
    
    /**
     * Загрузка аватара
     */
    @PostMapping(value = "/me/avatar", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadAvatar(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestParam("avatar") MultipartFile avatar) {
        
        // Проверка авторизации
        if (userDetails == null) {
            logger.warn("Попытка загрузки аватара без авторизации");
            return ResponseEntity.status(401).body(new MessageResponse("Error: Authentication required"));
        }
        
        logger.info("Uploading avatar for user ID: {}", userDetails.getId());
        
        if (avatar.isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Please select a file to upload"));
        }
        
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Проверяем тип файла
        String contentType = avatar.getContentType();
        if (contentType == null || (!contentType.equals("image/jpeg") && !contentType.equals("image/png") && !contentType.equals("image/gif"))) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Only JPG, PNG and GIF files are allowed"));
        }
        
        try {
            // Создаем директорию для хранения аватаров, если она не существует
            Path uploadDir = Paths.get(AVATAR_UPLOAD_DIR);
            if (!Files.exists(uploadDir)) {
                Files.createDirectories(uploadDir);
            }
            
            // Генерируем уникальное имя файла
            String fileName = UUID.randomUUID().toString() + "_" + avatar.getOriginalFilename();
            Path filePath = uploadDir.resolve(fileName);
            
            // Сохраняем файл
            Files.copy(avatar.getInputStream(), filePath);
            
            // Обновляем путь к аватару в базе данных
            user.setAvatarUrl("/api/users/avatar/" + fileName);
            userRepository.save(user);
            
            Map<String, String> response = new HashMap<>();
            response.put("avatarUrl", user.getAvatarUrl());
            
            return ResponseEntity.ok(response);
        } catch (IOException e) {
            logger.error("Failed to upload avatar: ", e);
            return ResponseEntity.status(500).body(new MessageResponse("Error: Failed to upload avatar"));
        }
    }
    
    /**
     * Обновление настроек уведомлений
     */
    @PutMapping("/me/notifications")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> updateNotificationSettings(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody UserNotificationsDto notificationsDto) {
        
        logger.info("Updating notification settings for user ID: {}", userDetails.getId());
        
        userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // В реальном проекте здесь будет сохранение настроек уведомлений
        // Для демонстрации просто возвращаем успешный ответ
        return ResponseEntity.ok(new MessageResponse("Notification settings updated successfully"));
    }
    
    /**
     * Обновление настроек приватности
     */
    @PutMapping("/me/privacy")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> updatePrivacySettings(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody UserPrivacyDto privacyDto) {
        
        logger.info("Updating privacy settings for user ID: {}", userDetails.getId());
        
        userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // В реальном проекте здесь будет сохранение настроек приватности
        // Для демонстрации просто возвращаем успешный ответ
        return ResponseEntity.ok(new MessageResponse("Privacy settings updated successfully"));
    }
    
    /**
     * Деактивация аккаунта
     */
    @PostMapping("/me/deactivate")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> deactivateAccount(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        logger.info("Deactivating account for user ID: {}", userDetails.getId());
        
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // В реальном проекте здесь будет деактивация аккаунта
        user.setEnabled(false);
        userRepository.save(user);
        
        return ResponseEntity.ok(new MessageResponse("Account successfully deactivated"));
    }
    
    /**
     * Удаление аккаунта
     */
    @PostMapping("/me/delete")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> deleteAccount(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody Map<String, String> passwordData) {
        
        logger.info("Deleting account for user ID: {}", userDetails.getId());
        
        // Проверяем пароль для подтверждения удаления
        String password = passwordData.get("password");
        if (password == null || password.isEmpty()) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Password is required"));
        }
        
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        if (!passwordEncoder.matches(password, user.getPassword())) {
            return ResponseEntity.badRequest().body(new MessageResponse("Error: Password is incorrect"));
        }
        
        // В реальном проекте здесь будет удаление аккаунта
        // Для демонстрации просто помечаем пользователя как удаленного
        user.setEnabled(false);
        user.setDeleted(true);
        userRepository.save(user);
        
        // Очищаем контекст безопасности
        SecurityContextHolder.clearContext();
        
        return ResponseEntity.ok(new MessageResponse("Account successfully deleted"));
    }
    
    /**
     * Экспорт данных пользователя
     */
    @GetMapping("/me/export")
    @PreAuthorize("hasRole('USER')")
    public ResponseEntity<?> exportUserData(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        logger.info("Exporting data for user ID: {}", userDetails.getId());
        
        User user = userRepository.findById(userDetails.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // В реальном проекте здесь будет экспорт всех данных пользователя
        // Для демонстрации возвращаем базовую информацию
        Map<String, Object> userData = new HashMap<>();
        userData.put("id", user.getId());
        userData.put("username", user.getUsername());
        userData.put("email", user.getEmail());
        userData.put("displayName", user.getDisplayName());
        userData.put("bio", user.getBio());
        userData.put("location", user.getLocation());
        userData.put("website", user.getWebsite());
        userData.put("createdAt", user.getCreatedAt());
        
        return ResponseEntity.ok(userData);
    }
    
    /**
     * Получение аватара пользователя
     */
    @GetMapping("/avatar/{filename:.+}")
    public ResponseEntity<?> getAvatar(@PathVariable String filename) {
        logger.info("Getting avatar: {}", filename);
        
        try {
            Path filePath = Paths.get(AVATAR_UPLOAD_DIR).resolve(filename);
            
            if (!Files.exists(filePath)) {
                logger.warn("Avatar file not found: {}", filename);
                return ResponseEntity.notFound().build();
            }
            
            byte[] fileContent = Files.readAllBytes(filePath);
            
            // Определяем тип контента по расширению файла
            String contentType = "image/jpeg"; // По умолчанию
            if (filename.endsWith(".png")) {
                contentType = "image/png";
            } else if (filename.endsWith(".gif")) {
                contentType = "image/gif";
            }
            
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .body(fileContent);
        } catch (IOException e) {
            logger.error("Error reading avatar file: {}", e.getMessage());
            return ResponseEntity.status(500).body("Error reading avatar file");
        }
    }
    
    /**
     * Получение дефолтного аватара (без авторизации)
     */
    @GetMapping(value = "/default-avatar", produces = MediaType.IMAGE_JPEG_VALUE)
    public ResponseEntity<?> getDefaultAvatar() {
        try {
            // Путь к файлу дефолтного аватара в ресурсах
            ClassLoader classLoader = getClass().getClassLoader();
            Path filePath = Paths.get(classLoader.getResource("static/img/default-avatar.jpg").toURI());
            
            byte[] fileContent = Files.readAllBytes(filePath);
            
            return ResponseEntity.ok()
                    .contentType(MediaType.IMAGE_JPEG)
                    .body(fileContent);
        } catch (Exception e) {
            logger.error("Error reading default avatar file: {}", e.getMessage());
            return ResponseEntity.status(500).body("Error reading default avatar file");
        }
    }
    
    /**
     * Получение информации о пользователе по ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getUserProfile(@PathVariable("id") Long id) {
        logger.info("Fetching profile for user ID: {}", id);
        
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Возвращаем только публичную информацию о пользователе
        Map<String, Object> userInfo = new HashMap<>();
        userInfo.put("id", user.getId());
        userInfo.put("username", user.getUsername());
        userInfo.put("displayName", user.getDisplayName());
        userInfo.put("bio", user.getBio());
        userInfo.put("location", user.getLocation());
        userInfo.put("website", user.getWebsite());
        userInfo.put("avatarUrl", user.getAvatarUrl());
        userInfo.put("createdAt", user.getCreatedAt());
        
        return ResponseEntity.ok(userInfo);
    }
} 