package com.example.photoapp.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.nio.file.Path;
import java.nio.file.Paths;

@Configuration
public class StorageConfig implements WebMvcConfigurer {

    @Value("${file.upload-dir:uploads}")
    private String uploadDir;

    @Override
    public void addResourceHandlers(@NonNull ResourceHandlerRegistry registry) {
        Path uploadPath = Paths.get(uploadDir);
        String uploadAbsolutePath = uploadPath.toFile().getAbsolutePath();
        
        registry.addResourceHandler("/uploads/**")
                .addResourceLocations("file:" + uploadAbsolutePath + "/");
    }
} 
