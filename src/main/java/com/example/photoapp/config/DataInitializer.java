package com.example.photoapp.config;

import com.example.photoapp.model.ERole;
import com.example.photoapp.model.Role;
import com.example.photoapp.repository.RoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;

@Component
public class DataInitializer implements CommandLineRunner {
    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);

    @Autowired
    private RoleRepository roleRepository;

    @Override
    public void run(String... args) throws Exception {
        // Initialize roles if they don't exist
        initRoles();
        
        logger.info("Application initialization completed");
    }

    private void initRoles() {
        // Create roles if not exist
        Arrays.asList(ERole.values()).forEach(role -> {
            if (!roleRepository.existsByName(role)) {
                roleRepository.save(new Role(role));
                logger.info("Created role: {}", role);
            }
        });
    }
} 