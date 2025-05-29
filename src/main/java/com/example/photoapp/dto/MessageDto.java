package com.example.photoapp.dto;

import com.example.photoapp.model.Message;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class MessageDto {
    private Long id;
    private Long senderId;
    private String senderUsername;
    private String senderAvatarUrl;
    private Long recipientId;
    private String recipientUsername;
    private String recipientAvatarUrl;
    private String content;
    private String createdAt;
    private boolean isRead;
    private boolean isOwnMessage;

    public MessageDto() {
    }
    
    public MessageDto(Message message, Long currentUserId) {
        this.id = message.getId();
        this.senderId = message.getSender().getId();
        this.senderUsername = message.getSender().getUsername();
        this.senderAvatarUrl = message.getSender().getAvatarUrl();
        this.recipientId = message.getRecipient().getId();
        this.recipientUsername = message.getRecipient().getUsername();
        this.recipientAvatarUrl = message.getRecipient().getAvatarUrl();
        this.content = message.getContent();
        this.createdAt = formatDateTime(message.getCreatedAt());
        this.isRead = message.getReadAt() != null;
        
        // Сообщение "своё" только если отправитель - текущий пользователь
        this.isOwnMessage = this.senderId.equals(currentUserId);
    }
    
    private String formatDateTime(LocalDateTime dateTime) {
        if (dateTime == null) {
            return "";
        }
        
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("dd.MM.yyyy HH:mm");
        return dateTime.format(formatter);
    }
    
    // Getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getSenderId() {
        return senderId;
    }

    public void setSenderId(Long senderId) {
        this.senderId = senderId;
    }

    public String getSenderUsername() {
        return senderUsername;
    }

    public void setSenderUsername(String senderUsername) {
        this.senderUsername = senderUsername;
    }

    public String getSenderAvatarUrl() {
        return senderAvatarUrl;
    }

    public void setSenderAvatarUrl(String senderAvatarUrl) {
        this.senderAvatarUrl = senderAvatarUrl;
    }

    public Long getRecipientId() {
        return recipientId;
    }

    public void setRecipientId(Long recipientId) {
        this.recipientId = recipientId;
    }

    public String getRecipientUsername() {
        return recipientUsername;
    }

    public void setRecipientUsername(String recipientUsername) {
        this.recipientUsername = recipientUsername;
    }

    public String getRecipientAvatarUrl() {
        return recipientAvatarUrl;
    }

    public void setRecipientAvatarUrl(String recipientAvatarUrl) {
        this.recipientAvatarUrl = recipientAvatarUrl;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    public boolean isRead() {
        return isRead;
    }

    public void setRead(boolean read) {
        isRead = read;
    }

    public boolean isOwnMessage() {
        return isOwnMessage;
    }

    public void setOwnMessage(boolean ownMessage) {
        isOwnMessage = ownMessage;
    }
} 