package com.example.photoapp.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;

@Service
public class FileStorageService {
    private static final Logger logger = LoggerFactory.getLogger(FileStorageService.class);
    
    private final Path fileStorageLocation;
    
    @Autowired
    public FileStorageService(@Value("${file.upload-dir:uploads}") String uploadDir) {
        this.fileStorageLocation = Paths.get(uploadDir).toAbsolutePath().normalize();
        
        try {
            Files.createDirectories(this.fileStorageLocation);
        } catch (IOException ex) {
            throw new RuntimeException("Could not create the directory where the uploaded files will be stored", ex);
        }
        
        logger.info("FileStorageService initialized with path: {}", this.fileStorageLocation);
    }
    
    public String storeFile(MultipartFile file) {
        String originalFilename = file.getOriginalFilename();
        String fileExtension = "";
        
        if (originalFilename != null && originalFilename.contains(".")) {
            fileExtension = originalFilename.substring(originalFilename.lastIndexOf("."));
        }
        
        String filename = UUID.randomUUID().toString() + fileExtension;
        
        try {
            // Проверяем имя файла
            if (filename.contains("..")) {
                throw new RuntimeException("Sorry! Filename contains invalid path sequence " + filename);
            }
            
            // Копируем файл в целевое место
            Path targetLocation = this.fileStorageLocation.resolve(filename);
            Files.copy(file.getInputStream(), targetLocation, StandardCopyOption.REPLACE_EXISTING);
            
            logger.info("File stored successfully: {}", filename);
            
            return filename;
        } catch (IOException ex) {
            throw new RuntimeException("Could not store file " + filename, ex);
        }
    }
    
    public Resource loadFileAsResource(String filename) {
        try {
            Path filePath = this.fileStorageLocation.resolve(filename).normalize();
            Resource resource = new UrlResource(filePath.toUri());
            
            if (resource.exists()) {
                return resource;
            } else {
                throw new RuntimeException("File not found: " + filename);
            }
        } catch (MalformedURLException ex) {
            throw new RuntimeException("File not found: " + filename, ex);
        }
    }
    
    public String getFileUrl(String filename) {
        return ServletUriComponentsBuilder.fromCurrentContextPath()
                .path("/uploads/")
                .path(filename)
                .toUriString();
    }
    
    public boolean deleteFile(String filename) {
        try {
            Path file = fileStorageLocation.resolve(filename);
            return Files.deleteIfExists(file);
        } catch (IOException e) {
            logger.error("Error deleting file: {}", e.getMessage());
            return false;
        }
    }
} 