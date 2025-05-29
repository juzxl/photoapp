package com.example.photoapp.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import org.springframework.lang.NonNull;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry config) {
        // Префикс для каналов, куда клиент подписывается
        config.enableSimpleBroker("/topic", "/queue", "/user/queue");
        
        // Префикс для методов контроллера
        config.setApplicationDestinationPrefixes("/app");
        
        // Префикс для пользовательских назначений
        config.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        // Добавляем конечную точку WebSocket с поддержкой SockJS
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS()
                .setHeartbeatTime(25000) // Увеличиваем heartbeat для более стабильной связи
                .setDisconnectDelay(30000); // Увеличиваем задержку отключения
    }
} 