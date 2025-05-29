package com.example.photoapp.controller;

import com.example.photoapp.dto.MessageDto;
import com.example.photoapp.dto.CreateMessageRequest;
import com.example.photoapp.dto.MessageResponse;
import com.example.photoapp.security.services.UserDetailsImpl;
import com.example.photoapp.service.MessageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private static final Logger logger = LoggerFactory.getLogger(MessageController.class);
    
    private final MessageService messageService;

    @Autowired
    public MessageController(MessageService messageService) {
        this.messageService = messageService;
    }

    /**
     * Отправить новое сообщение
     */
    @PostMapping
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<?> sendMessage(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @RequestBody CreateMessageRequest request) {
        
        try {
            // Проверяем, что пользователь не отправляет сообщение самому себе
            if (userDetails.getId().equals(request.getRecipientId())) {
                logger.warn("Попытка отправить сообщение самому себе: user_id={}", userDetails.getId());
                return ResponseEntity.badRequest()
                    .body(new MessageResponse("Невозможно отправить сообщение самому себе"));
            }
            
            MessageDto message = messageService.sendMessage(userDetails.getId(), request);
            return ResponseEntity.status(HttpStatus.CREATED).body(message);
        } catch (Exception e) {
            logger.error("Ошибка при отправке сообщения", e);
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Получить диалог с пользователем
     */
    @GetMapping("/conversation/{userId}")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<List<MessageDto>> getConversation(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long userId) {
        
        try {
            logger.info("Получение диалога для пользователя ID: {} с пользователем ID: {}", 
                     userDetails != null ? userDetails.getId() : "не авторизован", userId);
            
            if (userDetails == null) {
                logger.error("Пользователь не авторизован или данные аутентификации отсутствуют");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }
            
            List<MessageDto> messages = messageService.getConversation(userDetails.getId(), userId);
            
            // Помечаем сообщения как прочитанные
            messageService.markAsRead(userDetails.getId(), userId);
            
            return ResponseEntity.ok(messages);
        } catch (Exception e) {
            logger.error("Ошибка при получении диалога", e);
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Получить все диалоги с последними сообщениями
     */
    @GetMapping("/conversations")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<List<MessageDto>> getConversations(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        try {
            List<MessageDto> conversations = messageService.getRecentConversations(userDetails.getId());
            return ResponseEntity.ok(conversations);
        } catch (Exception e) {
            logger.error("Ошибка при получении списка диалогов", e);
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Получить количество непрочитанных сообщений
     */
    @GetMapping("/unread/count")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<Map<String, Integer>> getUnreadCount(
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        try {
            int count = messageService.getUnreadCount(userDetails.getId());
            Map<String, Integer> response = new HashMap<>();
            response.put("count", count);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Ошибка при получении количества непрочитанных сообщений", e);
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Пометить сообщения как прочитанные
     */
    @PostMapping("/read/{senderId}")
    @PreAuthorize("hasRole('USER') or hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<?> markAsRead(
            @AuthenticationPrincipal UserDetailsImpl userDetails,
            @PathVariable Long senderId) {
        
        try {
            messageService.markAsRead(userDetails.getId(), senderId);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            logger.error("Ошибка при отметке сообщений как прочитанных", e);
            return ResponseEntity.badRequest().build();
        }
    }
} 