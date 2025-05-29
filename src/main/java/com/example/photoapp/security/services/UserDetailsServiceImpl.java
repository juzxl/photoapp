package com.example.photoapp.security.services;

import com.example.photoapp.model.User;
import com.example.photoapp.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.stream.Collectors;

@Service
public class UserDetailsServiceImpl implements UserDetailsService {
    private static final Logger logger = LoggerFactory.getLogger(UserDetailsServiceImpl.class);
    
    @Autowired
    UserRepository userRepository;

    @Override
    @Transactional
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        logger.info("Attempting to load user: {}", username);
        
        User user = userRepository.findByUsername(username)
                .orElseGet(() -> userRepository.findByEmail(username)
                        .orElseThrow(() -> {
                            logger.error("User not found with username/email: {}", username);
                            return new UsernameNotFoundException("User Not Found with username/email: " + username);
                        }));
        
        logger.info("User found: {} (enabled: {})", user.getUsername(), user.isEnabled());
        logger.info("User roles: {}", user.getRoles().stream()
                .map(role -> role.getName().name())
                .collect(Collectors.joining(", ")));
        
        return UserDetailsImpl.build(user);
    }
} 