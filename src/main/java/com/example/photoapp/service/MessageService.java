package com.example.photoapp.service;

import com.example.photoapp.dto.MessageDto;
import com.example.photoapp.dto.CreateMessageRequest;
import com.example.photoapp.model.Message;
import com.example.photoapp.model.User;
import com.example.photoapp.repository.MessageRepository;
import com.example.photoapp.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    @Autowired
    public MessageService(MessageRepository messageRepository, UserRepository userRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    /**
     * Отправить сообщение
     */
    @Transactional
    public MessageDto sendMessage(Long senderId, CreateMessageRequest request) {
        User sender = userRepository.findById(senderId)
                .orElseThrow(() -> new RuntimeException("Отправитель не найден"));
        User recipient = userRepository.findById(request.getRecipientId())
                .orElseThrow(() -> new RuntimeException("Получатель не найден"));
        
        Message message = new Message(sender, recipient, request.getContent());
        message = messageRepository.save(message);
        
        return new MessageDto(message, senderId);
    }
    
    /**
     * Получить диалог между двумя пользователями
     */
    @Transactional(readOnly = true)
    public List<MessageDto> getConversation(Long userId, Long otherUserId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Пользователь не найден"));
        User otherUser = userRepository.findById(otherUserId)
                .orElseThrow(() -> new RuntimeException("Собеседник не найден"));
        
        List<Message> messages = messageRepository.findConversation(user, otherUser);
        return messages.stream()
                .map(message -> new MessageDto(message, userId))
                .collect(Collectors.toList());
    }
    
    /**
     * Получить список последних сообщений со всеми пользователями
     */
    @Transactional(readOnly = true)
    public List<MessageDto> getRecentConversations(Long userId) {
        List<Message> recentMessages = messageRepository.findRecentConversations(userId);
        
        return recentMessages.stream()
                .map(message -> new MessageDto(message, userId))
                .collect(Collectors.toList());
    }
    
    /**
     * Отметить сообщения как прочитанные
     */
    @Transactional
    public void markAsRead(Long recipientId, Long senderId) {
        List<Message> unreadMessages = messageRepository.findUnreadMessages(recipientId, senderId);
        
        LocalDateTime now = LocalDateTime.now();
        unreadMessages.forEach(message -> message.setReadAt(now));
        
        messageRepository.saveAll(unreadMessages);
    }
    
    /**
     * Получить количество непрочитанных сообщений
     */
    @Transactional(readOnly = true)
    public int getUnreadCount(Long userId) {
        return messageRepository.countUnreadMessages(userId);
    }
} 