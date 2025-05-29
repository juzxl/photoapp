package com.example.photoapp.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

@Configuration
public class CorsConfig {
    
    @Bean
    public CorsFilter corsFilter() {
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        CorsConfiguration config = new CorsConfiguration();
        
        // Разрешаем запросы с localhost
        config.addAllowedOrigin("http://localhost:8080");
        config.addAllowedOrigin("http://localhost:3000");
        
        // Разрешаем все заголовки
        config.addAllowedHeader("*");
        
        // Разрешаем все методы
        config.addAllowedMethod("*");
        
        // Разрешаем credentials (cookies, authorization headers)
        config.setAllowCredentials(true);
        
        // Добавляем конфигурацию для всех путей
        source.registerCorsConfiguration("/**", config);
        
        return new CorsFilter(source);
    }
} 