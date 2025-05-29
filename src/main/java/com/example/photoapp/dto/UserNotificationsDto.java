package com.example.photoapp.dto;

public class UserNotificationsDto {
    private boolean emailEnabled;
    private boolean commentsEnabled;
    private boolean likesEnabled;
    private boolean systemEnabled;
    
    public UserNotificationsDto() {
    }
    
    public UserNotificationsDto(boolean emailEnabled, boolean commentsEnabled, boolean likesEnabled, boolean systemEnabled) {
        this.emailEnabled = emailEnabled;
        this.commentsEnabled = commentsEnabled;
        this.likesEnabled = likesEnabled;
        this.systemEnabled = systemEnabled;
    }
    
    public boolean isEmailEnabled() {
        return emailEnabled;
    }
    
    public void setEmailEnabled(boolean emailEnabled) {
        this.emailEnabled = emailEnabled;
    }
    
    public boolean isCommentsEnabled() {
        return commentsEnabled;
    }
    
    public void setCommentsEnabled(boolean commentsEnabled) {
        this.commentsEnabled = commentsEnabled;
    }
    
    public boolean isLikesEnabled() {
        return likesEnabled;
    }
    
    public void setLikesEnabled(boolean likesEnabled) {
        this.likesEnabled = likesEnabled;
    }
    
    public boolean isSystemEnabled() {
        return systemEnabled;
    }
    
    public void setSystemEnabled(boolean systemEnabled) {
        this.systemEnabled = systemEnabled;
    }
} 