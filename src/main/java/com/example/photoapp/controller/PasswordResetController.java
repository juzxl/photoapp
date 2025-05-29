package com.example.photoapp.controller;

import com.example.photoapp.exception.ResourceNotFoundException;
import com.example.photoapp.exception.TokenExpiredException;
import com.example.photoapp.payload.request.ForgotPasswordRequest;
import com.example.photoapp.payload.request.ResetPasswordRequest;
import com.example.photoapp.payload.request.VerifyResetCodeRequest;
import com.example.photoapp.payload.response.MessageResponse;
import com.example.photoapp.payload.response.TokenResponse;
import com.example.photoapp.service.PasswordResetService;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class PasswordResetController {
    
    private static final Logger logger = LoggerFactory.getLogger(PasswordResetController.class);
    
    @Autowired
    private PasswordResetService passwordResetService;
    
    /**
     * Запрос на восстановление пароля
     */
    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        try {
            passwordResetService.createPasswordResetRequest(request.getEmail());
            logger.info("Password reset requested for email: {}", request.getEmail());
            return ResponseEntity.ok(new MessageResponse("Инструкции по восстановлению пароля отправлены на ваш email"));
        } catch (ResourceNotFoundException e) {
            // Для безопасности не сообщаем, что пользователь не найден
            logger.warn("Password reset requested for non-existent email: {}", request.getEmail());
            return ResponseEntity.ok(new MessageResponse("Если указанный email зарегистрирован в системе, на него будут отправлены инструкции"));
        } catch (Exception e) {
            logger.error("Error processing password reset request: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new MessageResponse("Ошибка при обработке запроса: " + e.getMessage()));
        }
    }
    
    /**
     * Проверка кода подтверждения
     */
    @PostMapping("/verify-reset-code")
    public ResponseEntity<?> verifyResetCode(@Valid @RequestBody VerifyResetCodeRequest request) {
        try {
            String token = passwordResetService.verifyResetCode(request.getEmail(), request.getResetCode());
            logger.info("Reset code verified for email: {}", request.getEmail());
            return ResponseEntity.ok(new TokenResponse(token));
        } catch (ResourceNotFoundException e) {
            logger.warn("Invalid reset code attempt for email: {}", request.getEmail());
            return ResponseEntity.badRequest().body(new MessageResponse("Неверный код подтверждения"));
        } catch (TokenExpiredException e) {
            logger.warn("Expired reset code attempt for email: {}", request.getEmail());
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error verifying reset code: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new MessageResponse("Ошибка при проверке кода: " + e.getMessage()));
        }
    }
    
    /**
     * Сброс пароля
     */
    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        try {
            passwordResetService.resetPassword(request.getToken(), request.getNewPassword());
            logger.info("Password reset successful");
            return ResponseEntity.ok(new MessageResponse("Пароль успешно изменен"));
        } catch (ResourceNotFoundException e) {
            logger.warn("Password reset attempt with invalid token");
            return ResponseEntity.badRequest().body(new MessageResponse("Недействительный токен сброса пароля"));
        } catch (TokenExpiredException e) {
            logger.warn("Password reset attempt with expired token");
            return ResponseEntity.badRequest().body(new MessageResponse(e.getMessage()));
        } catch (Exception e) {
            logger.error("Error resetting password: {}", e.getMessage());
            return ResponseEntity.badRequest().body(new MessageResponse("Ошибка при сбросе пароля: " + e.getMessage()));
        }
    }
} 