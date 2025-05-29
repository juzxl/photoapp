package com.example.photoapp.controller;

import com.example.photoapp.model.Photo;
import com.example.photoapp.repository.PhotoRepository;
import com.example.photoapp.service.FileStorageService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Optional;

@RestController
@RequestMapping("/api/photos")
public class PhotoFileController {
    private static final Logger logger = LoggerFactory.getLogger(PhotoFileController.class);

    @Autowired
    private PhotoRepository photoRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @GetMapping("/image/{id}")
    public ResponseEntity<Resource> getPhotoImage(@PathVariable Long id) {
        logger.info("Requested image for photo ID: {}", id);
        
     
        Optional<Photo> photoOpt = photoRepository.findById(id);
        
        if (!photoOpt.isPresent()) {
            logger.error("Photo not found with ID: {}", id);
            return ResponseEntity.notFound().build();
        }
        
        Photo photo = photoOpt.get();
        
        // Get the filename - adapt this based on your actual model structure
        String filename = photo.getFileName(); // Make sure this matches your Photo entity
        
        if (filename == null || filename.isEmpty()) {
            logger.error("Filename is null or empty for photo ID: {}", id);
            return ResponseEntity.notFound().build();
        }
        
        logger.info("Loading file: {} for photo ID: {}", filename, id);
        
        try {
            // Load the file as a resource
            Resource resource = fileStorageService.loadFileAsResource(filename);
            
            // Determine content type
            String contentType = determineContentType(filename);
            
            // Return the resource
            return ResponseEntity.ok()
                    .contentType(MediaType.parseMediaType(contentType))
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
                    .body(resource);
        } catch (Exception e) {
            logger.error("Error loading file {}: {}", filename, e.getMessage());
            return ResponseEntity.notFound().build();
        }
    }
    
    private String determineContentType(String filename) {
        if (filename.toLowerCase().endsWith(".jpg") || filename.toLowerCase().endsWith(".jpeg")) {
            return "image/jpeg";
        } else if (filename.toLowerCase().endsWith(".png")) {
            return "image/png";
        } else if (filename.toLowerCase().endsWith(".gif")) {
            return "image/gif";
        } else {
            return "application/octet-stream";
        }
    }
} 