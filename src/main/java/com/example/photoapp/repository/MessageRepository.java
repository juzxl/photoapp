package com.example.photoapp.repository;

import com.example.photoapp.model.Message;
import com.example.photoapp.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {
    
    /**
     * Получить все сообщения между двумя пользователями
     */
    @Query("SELECT m FROM Message m WHERE (m.sender = :user1 AND m.recipient = :user2) OR (m.sender = :user2 AND m.recipient = :user1) ORDER BY m.createdAt")
    List<Message> findConversation(@Param("user1") User user1, @Param("user2") User user2);
    
    /**
     * Получить список последних сообщений с каждым пользователем
     */
    @Query(value = "SELECT * FROM messages m " + 
                   "WHERE (m.sender_id = :userId OR m.recipient_id = :userId) " + 
                   "AND m.id IN (" + 
                       "SELECT MAX(m2.id) FROM messages m2 " + 
                       "WHERE (m2.sender_id = :userId OR m2.recipient_id = :userId) " + 
                       "GROUP BY " + 
                       "CASE " + 
                           "WHEN m2.sender_id = :userId THEN m2.recipient_id " + 
                           "ELSE m2.sender_id " + 
                       "END" + 
                   ") " +
                   "ORDER BY m.created_at DESC", nativeQuery = true)
    List<Message> findRecentConversations(@Param("userId") Long userId);
    
    /**
     * Получить количество непрочитанных сообщений для пользователя
     */
    @Query("SELECT COUNT(m) FROM Message m WHERE m.recipient.id = :userId AND m.readAt IS NULL")
    int countUnreadMessages(@Param("userId") Long userId);
    
    /**
     * Получить непрочитанные сообщения для пользователя от другого пользователя
     */
    @Query("SELECT m FROM Message m WHERE m.recipient.id = :recipientId AND m.sender.id = :senderId AND m.readAt IS NULL ORDER BY m.createdAt")
    List<Message> findUnreadMessages(@Param("recipientId") Long recipientId, @Param("senderId") Long senderId);
} 