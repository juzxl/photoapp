package com.example.photoapp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.ViewControllerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class WebMvcConfig implements WebMvcConfigurer {
    
    @Value("${file.upload-dir:uploads}")
    private String uploadDir;
    
    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        // Настройки для загруженных файлов из StorageConfig
        Path uploadPath = Paths.get(uploadDir);
        String uploadAbsolutePath = uploadPath.toFile().getAbsolutePath();
        
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadAbsolutePath + "/");
        
        // Настраиваем обработку статических ресурсов
        registry.addResourceHandler("/**")
                .addResourceLocations("classpath:/static/");
    }
    
    @Override
    public void addViewControllers(@NonNull ViewControllerRegistry registry) {
        // Добавляем маппинги URL к HTML файлам для обработки запросов без расширения
        registry.addViewController("/").setViewName("forward:/index.html");
        registry.addViewController("/gallery").setViewName("forward:/gallery.html");
        registry.addViewController("/albums").setViewName("forward:/albums.html");
        registry.addViewController("/upload").setViewName("forward:/upload.html");
        registry.addViewController("/favorites").setViewName("forward:/favorites.html");
        registry.addViewController("/profile").setViewName("forward:/profile.html");
        registry.addViewController("/settings").setViewName("forward:/settings.html");
        registry.addViewController("/album").setViewName("forward:/album.html");
    }
} 