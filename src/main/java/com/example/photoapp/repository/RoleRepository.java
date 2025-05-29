package com.example.photoapp.repository;

import com.example.photoapp.model.ERole;
import com.example.photoapp.model.Role;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoleRepository extends JpaRepository<Role, Integer> {
    Optional<Role> findByName(ERole name);
    Boolean existsByName(ERole name);
} 