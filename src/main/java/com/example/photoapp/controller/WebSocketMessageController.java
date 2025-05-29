package com.example.photoapp.controller;

import com.example.photoapp.dto.CreateMessageRequest;
import com.example.photoapp.dto.MessageDto;
import com.example.photoapp.dto.MessageResponse;
import com.example.photoapp.security.services.UserDetailsImpl;
import com.example.photoapp.service.MessageService;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Controller;

@Controller
public class WebSocketMessageController {
    
    private static final Logger logger = LoggerFactory.getLogger(WebSocketMessageController.class);
    
    private final SimpMessagingTemplate messagingTemplate;
    private final MessageService messageService;
    
    @Autowired
    public WebSocketMessageController(SimpMessagingTemplate messagingTemplate, MessageService messageService) {
        this.messagingTemplate = messagingTemplate;
        this.messageService = messageService;
    }
    
    /**
     * Обработка отправки сообщения через WebSocket
     */
    @MessageMapping("/chat.sendMessage")
    public void sendMessage(@Payload CreateMessageRequest request, SimpMessageHeaderAccessor headerAccessor) {
        try {
            // Получаем текущего пользователя
            UsernamePasswordAuthenticationToken auth = (UsernamePasswordAuthenticationToken) headerAccessor.getUser();
            if (auth == null) {
                logger.error("Authentication not found in request");
                return;
            }
            
            UserDetailsImpl userDetails = (UserDetailsImpl) auth.getPrincipal();
            Long senderId = userDetails.getId();
            
            // Проверяем, что пользователь не отправляет сообщение самому себе
            if (senderId.equals(request.getRecipientId())) {
                logger.error("Попытка отправить сообщение самому себе: user_id={}", senderId);
                
                // Отправляем ошибку отправителю
                messagingTemplate.convertAndSendToUser(
                        userDetails.getUsername(),
                        "/queue/errors",
                        new MessageResponse("Невозможно отправить сообщение самому себе")
                );
                return;
            }
            
            logger.info("Обработка WebSocket сообщения от {}, к пользователю {}", userDetails.getUsername(), request.getRecipientId());
            
            // Сохраняем сообщение
            MessageDto message = messageService.sendMessage(senderId, request);
            
            logger.info("Отправка сообщения: от={}, к={}", message.getSenderUsername(), message.getRecipientUsername());
            
            // Отправляем сообщение отправителю (исправлено)
            messagingTemplate.convertAndSendToUser(
                    userDetails.getUsername(),
                    "/queue/messages",
                    message
            );
            
            // Отправляем сообщение получателю (исправлено)
            messagingTemplate.convertAndSendToUser(
                    message.getRecipientUsername(),
                    "/queue/messages",
                    message
            );
            
            // Для отладки
            logger.info("Сообщение отправлено через WebSocket: отправитель={}, получатель={}",
                    userDetails.getUsername(), message.getRecipientUsername());
            
            // Отправляем уведомление об обновлении счетчика сообщений
            int unreadCount = messageService.getUnreadCount(message.getRecipientId());
            messagingTemplate.convertAndSendToUser(
                    message.getRecipientUsername(),
                    "/queue/notifications",
                    unreadCount
            );
            
            logger.info("Сообщение успешно отправлено через WebSocket от {} к {}", 
                       userDetails.getUsername(), message.getRecipientUsername());
        } catch (Exception e) {
            logger.error("Ошибка при отправке сообщения через WebSocket", e);
        }
    }
} 