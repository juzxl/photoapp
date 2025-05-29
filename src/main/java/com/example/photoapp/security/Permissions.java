package com.example.photoapp.security;

import com.example.photoapp.model.Photo;
import com.example.photoapp.security.services.UserDetailsImpl;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.stereotype.Component;

@Component
public class Permissions {
    
    // Права администратора
    public boolean canManageUsers(Authentication auth) {
        return hasRole(auth, "ROLE_ADMIN");
    }
    
    public boolean canManageRoles(Authentication auth) {
        return hasRole(auth, "ROLE_ADMIN");
    }
    
    public boolean canAccessAdminPanel(Authentication auth) {
        return hasRole(auth, "ROLE_ADMIN");
    }
    
    // Права модератора
    public boolean canModerateContent(Authentication auth) {
        return hasRole(auth, "ROLE_ADMIN") || hasRole(auth, "ROLE_MODERATOR");
    }
    
    public boolean canDeletePhotos(Authentication auth) {
        return hasRole(auth, "ROLE_ADMIN") || hasRole(auth, "ROLE_MODERATOR");
    }
    
    public boolean canEditPhotos(Authentication auth) {
        return hasRole(auth, "ROLE_ADMIN") || hasRole(auth, "ROLE_MODERATOR");
    }
    
    public boolean canDeleteComments(Authentication auth) {
        return hasRole(auth, "ROLE_ADMIN") || hasRole(auth, "ROLE_MODERATOR");
    }
    
    public boolean canApprovePhotos(Authentication auth) {
        return hasRole(auth, "ROLE_ADMIN") || hasRole(auth, "ROLE_MODERATOR");
    }
    
    // Права пользователя
    public boolean canUploadPhotos(Authentication auth) {
        return auth != null && auth.isAuthenticated();
    }
    
    public boolean canCreateAlbums(Authentication auth) {
        return auth != null && auth.isAuthenticated();
    }
    
    public boolean canComment(Authentication auth) {
        return auth != null && auth.isAuthenticated();
    }
    
    public boolean canRate(Authentication auth) {
        return auth != null && auth.isAuthenticated();
    }
    
    public boolean canSendMessages(Authentication auth) {
        return auth != null && auth.isAuthenticated();
    }
    
    // Проверка владельца ресурса
    public boolean isResourceOwner(Authentication auth, String username) {
        return auth != null && auth.getName().equals(username);
    }
    
    // Проверка доступа к альбому
    public boolean canAccessAlbum(Authentication auth, String albumOwner, String privacyLevel) {
        if (hasRole(auth, "ROLE_ADMIN") || hasRole(auth, "ROLE_MODERATOR")) {
            return true;
        }
        
        if (isResourceOwner(auth, albumOwner)) {
            return true;
        }
        
        switch (privacyLevel) {
            case "PUBLIC":
                return true;
            case "FRIENDS_ONLY":
            case "FRIENDS":
                // Обрабатываем FRIENDS как PUBLIC
                return true;
            case "PRIVATE":
                return isResourceOwner(auth, albumOwner);
            default:
                return false;
        }
    }
    
    // Вспомогательные методы
    private boolean hasRole(Authentication auth, String role) {
        return auth != null && auth.getAuthorities().contains(new SimpleGrantedAuthority(role));
    }
    
    // Вспомогательный метод для проверки роли у UserDetailsImpl
    private boolean hasRole(UserDetailsImpl userDetails, String role) {
        return userDetails != null && userDetails.getAuthorities().contains(new SimpleGrantedAuthority(role));
    }

    /**
     * Проверяет, может ли пользователь удалить фотографию
     * @param userDetails данные текущего пользователя
     * @param photo фотография
     * @return true, если пользователь имеет право удалить фотографию
     */
    public boolean canDeletePhoto(UserDetailsImpl userDetails, Photo photo) {
        // Проверяем, является ли пользователь владельцем фотографии
        boolean isOwner = photo.getUser().getId().equals(userDetails.getId());
        
        // Проверяем, имеет ли пользователь роль администратора или модератора
        boolean isAdminOrModerator = hasRole(userDetails, "ROLE_ADMIN") || hasRole(userDetails, "ROLE_MODERATOR");
        
        // Владелец фотографии или администратор/модератор может удалить фотографию
        return isOwner || isAdminOrModerator;
    }
} 