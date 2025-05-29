package com.example.photoapp.repository;

import com.example.photoapp.model.Role;
import com.example.photoapp.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByEmailVerificationToken(String token);
    Optional<User> findByUsernameOrEmail(String username, String email);
    Boolean existsByUsername(String username);
    Boolean existsByEmail(String email);
    
    // Новые методы для админской панели
    Page<User> findByUsernameContainingOrEmailContaining(String username, String email, Pageable pageable);
    Page<User> findByRolesContaining(Role role, Pageable pageable);
    Page<User> findByEnabledTrueAndDeletedFalse(Pageable pageable);
    Page<User> findByEnabledFalse(Pageable pageable);
    Page<User> findByEmailVerificationTokenIsNotNull(Pageable pageable);
} 