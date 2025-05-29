package com.example.photoapp.dto;

public class UserPrivacyDto {
    private String profileVisibility;
    private String defaultPhotoPrivacy;
    
    public UserPrivacyDto() {
    }
    
    public UserPrivacyDto(String profileVisibility, String defaultPhotoPrivacy) {
        this.profileVisibility = profileVisibility;
        this.defaultPhotoPrivacy = defaultPhotoPrivacy;
    }
    
    public String getProfileVisibility() {
        return profileVisibility;
    }
    
    public void setProfileVisibility(String profileVisibility) {
        this.profileVisibility = profileVisibility;
    }
    
    public String getDefaultPhotoPrivacy() {
        return defaultPhotoPrivacy;
    }
    
    public void setDefaultPhotoPrivacy(String defaultPhotoPrivacy) {
        this.defaultPhotoPrivacy = defaultPhotoPrivacy;
    }
} 