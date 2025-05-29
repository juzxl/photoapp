package com.example.photoapp.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Entity
@Table(name = "password_reset_tokens")
@Data
@NoArgsConstructor
public class PasswordResetToken {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String token;
    
    @Column(nullable = false)
    private String resetCode;
    
    @Column(nullable = false)
    private String email;
    
    @Column(nullable = false)
    private Instant expiryDate;
    
    @Column(nullable = false)
    private boolean used = false;
    
    public boolean isExpired() {
        return Instant.now().isAfter(expiryDate);
    }
} 