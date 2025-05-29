package com.example.photoapp.util;

import com.example.photoapp.model.User;
import com.example.photoapp.security.services.UserDetailsImpl;
import com.example.photoapp.service.UserService;
import org.springframework.security.core.Authentication;

/**
 * Утилитарный класс для работы с безопасностью
 */
public class SecurityUtils {

    /**
     * Получить текущего пользователя из контекста безопасности
     *
     * @param authentication объект Authentication из Spring Security
     * @param userService сервис для работы с пользователями
     * @return текущий пользователь или null, если пользователь не аутентифицирован
     */
    public static User getCurrentUser(Authentication authentication, UserService userService) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return null;
        }

        try {
            Object principal = authentication.getPrincipal();
            if (principal instanceof UserDetailsImpl) {
                UserDetailsImpl userDetails = (UserDetailsImpl) principal;
                Long userId = userDetails.getId();
                return userService.getUserById(userId);
            }
        } catch (Exception e) {
            // Логирование ошибки
            System.err.println("Error getting current user: " + e.getMessage());
        }

        return null;
    }
} 