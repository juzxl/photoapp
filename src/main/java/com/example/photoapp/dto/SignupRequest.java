package com.example.photoapp.dto;

import jakarta.validation.constraints.*;
import java.util.Set;

public class SignupRequest {
    @NotBlank(message = "Имя обязательно для заполнения")
    @Pattern(regexp = "^[a-zA-Zа-яА-Я]{2,}$", message = "Имя должно содержать минимум 2 символа и только буквы")
    private String username;

    @NotBlank(message = "Email обязателен для заполнения")
    @Email(message = "Введите корректный email")
    private String email;

    @NotBlank(message = "Пароль обязателен для заполнения")
    @Size(min = 8, message = "Пароль должен содержать минимум 8 символов")
    private String password;

    private Set<String> roles;

    public String getUsername() {
        return username;
    }

    public void setUsername(String username) {
        this.username = username;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public String getPassword() {
        return password;
    }

    public void setPassword(String password) {
        this.password = password;
    }

    public Set<String> getRoles() {
        return roles;
    }

    public void setRoles(Set<String> roles) {
        this.roles = roles;
    }
} 