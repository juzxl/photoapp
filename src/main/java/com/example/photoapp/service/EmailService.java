package com.example.photoapp.service;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {
    @Autowired
    private JavaMailSender mailSender;
    
    @Value("${spring.mail.username}")
    private String fromEmail;

    public void sendVerificationEmail(String to, String token) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("Подтверждение регистрации");
        message.setText("Для подтверждения вашего email перейдите по ссылке: "
                + "http://localhost:8080/api/auth/verify/" + token);
        
        mailSender.send(message);
    }
    
    public void sendWelcomeEmail(String to) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject("Добро пожаловать в PhotoApp!");
        message.setText("Спасибо за регистрацию в нашем приложении PhotoApp! "
                + "Ваш аккаунт успешно создан и уже активирован. "
                + "Теперь вы можете войти в систему и начать пользоваться всеми функциями приложения.\n\n"
                + "С уважением,\nКоманда PhotoApp");
        
        mailSender.send(message);
    }
    
    /**
     * Отправляет обычное email сообщение
     * 
     * @param to адрес получателя
     * @param subject тема письма
     * @param content содержимое письма
     */
    public void sendEmail(String to, String subject, String content) {
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(fromEmail);
        message.setTo(to);
        message.setSubject(subject);
        message.setText(content);
        
        mailSender.send(message);
    }
} 