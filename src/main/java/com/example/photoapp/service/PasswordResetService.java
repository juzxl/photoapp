package com.example.photoapp.service;

import com.example.photoapp.exception.ResourceNotFoundException;
import com.example.photoapp.exception.TokenExpiredException;
import com.example.photoapp.model.PasswordResetToken;
import com.example.photoapp.model.User;
import com.example.photoapp.repository.PasswordResetTokenRepository;
import com.example.photoapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Random;
import java.util.UUID;

@Service
public class PasswordResetService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Value("${photoapp.app.resetPasswordExpirationMs:3600000}")
    private long resetPasswordExpirationMs;

    /**
     * Создает запрос на восстановление пароля и отправляет код на email пользователя
     * 
     * @param email Email пользователя
     * @return true если код отправлен успешно
     * @throws ResourceNotFoundException если пользователь не найден
     */
    @Transactional
    public boolean createPasswordResetRequest(String email) {
        // Проверяем существование пользователя
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("Пользователь с таким email не найден"));

        // Генерируем 6-значный код подтверждения
        String resetCode = generateResetCode();
        
        // Генерируем уникальный токен
        String token = UUID.randomUUID().toString();
        
        // Создаем запись о запросе восстановления пароля
        PasswordResetToken resetToken = new PasswordResetToken();
        resetToken.setToken(token);
        resetToken.setResetCode(resetCode);
        resetToken.setEmail(email);
        resetToken.setExpiryDate(Instant.now().plus(resetPasswordExpirationMs, ChronoUnit.MILLIS));
        
        // Сохраняем токен
        tokenRepository.save(resetToken);
        
        // Отправляем код на email
        String subject = "Восстановление пароля";
        String content = String.format(
                "Здравствуйте, %s!\n\n" +
                "Вы запросили восстановление пароля. Ваш код подтверждения: %s\n\n" +
                "Код действителен в течение %d минут.\n\n" +
                "Если вы не запрашивали восстановление пароля, проигнорируйте это сообщение.",
                user.getUsername(), resetCode, resetPasswordExpirationMs / 60000);
        
        emailService.sendEmail(email, subject, content);
        
        return true;
    }
    
    /**
     * Проверяет код подтверждения и генерирует токен для сброса пароля
     * 
     * @param email Email пользователя
     * @param resetCode Код подтверждения
     * @return Токен для сброса пароля
     * @throws ResourceNotFoundException если запрос на сброс не найден
     * @throws TokenExpiredException если срок действия кода истек
     */
    @Transactional
    public String verifyResetCode(String email, String resetCode) {
        // Ищем запись о запросе восстановления пароля
        PasswordResetToken resetToken = tokenRepository.findByEmailAndResetCodeAndUsedFalse(email, resetCode)
                .orElseThrow(() -> new ResourceNotFoundException("Неверный код подтверждения"));
        
        // Проверяем срок действия кода
        if (resetToken.isExpired()) {
            throw new TokenExpiredException("Срок действия кода истек");
        }
        
        return resetToken.getToken();
    }
    
    /**
     * Сбрасывает пароль пользователя
     * 
     * @param token Токен для сброса пароля
     * @param newPassword Новый пароль
     * @return true если пароль успешно сброшен
     * @throws ResourceNotFoundException если токен не найден
     * @throws TokenExpiredException если срок действия токена истек
     */
    @Transactional
    public boolean resetPassword(String token, String newPassword) {
        // Ищем запись о запросе восстановления пароля
        PasswordResetToken resetToken = tokenRepository.findByToken(token)
                .orElseThrow(() -> new ResourceNotFoundException("Недействительный токен сброса пароля"));
        
        // Проверяем срок действия токена
        if (resetToken.isExpired()) {
            throw new TokenExpiredException("Срок действия токена истек");
        }
        
        // Проверяем, не использован ли токен ранее
        if (resetToken.isUsed()) {
            throw new TokenExpiredException("Токен уже использован");
        }
        
        // Ищем пользователя
        User user = userRepository.findByEmail(resetToken.getEmail())
                .orElseThrow(() -> new ResourceNotFoundException("Пользователь не найден"));
        
        // Обновляем пароль
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
        
        // Помечаем токен как использованный
        resetToken.setUsed(true);
        tokenRepository.save(resetToken);
        
        return true;
    }
    
    /**
     * Генерирует случайный 6-значный код подтверждения
     * 
     * @return Код подтверждения
     */
    private String generateResetCode() {
        Random random = new Random();
        int code = 100000 + random.nextInt(900000); // 6-значный код
        return String.valueOf(code);
    }
} 