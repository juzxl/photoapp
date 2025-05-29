package com.example.photoapp.repository;

import com.example.photoapp.model.PasswordResetToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    
    Optional<PasswordResetToken> findByToken(String token);
    
    Optional<PasswordResetToken> findByEmailAndResetCodeAndUsedFalse(String email, String resetCode);
    
    boolean existsByEmailAndUsedFalse(String email);
} 