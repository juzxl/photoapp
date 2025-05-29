package com.example.photoapp.dto;

public class UserProfileDto {
    private String displayName;
    private String bio;
    private String location;
    private String website;
    
    public UserProfileDto() {
    }
    
    public UserProfileDto(String displayName, String bio, String location, String website) {
        this.displayName = displayName;
        this.bio = bio;
        this.location = location;
        this.website = website;
    }
    
    public String getDisplayName() {
        return displayName;
    }
    
    public void setDisplayName(String displayName) {
        this.displayName = displayName;
    }
    
    public String getBio() {
        return bio;
    }
    
    public void setBio(String bio) {
        this.bio = bio;
    }
    
    public String getLocation() {
        return location;
    }
    
    public void setLocation(String location) {
        this.location = location;
    }
    
    public String getWebsite() {
        return website;
    }
    
    public void setWebsite(String website) {
        this.website = website;
    }
} 