package com.example.photoapp.payload.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyResetCodeRequest {
    
    @NotBlank(message = "Email не может быть пустым")
    @Email(message = "Пожалуйста, введите корректный email")
    private String email;
    
    @NotBlank(message = "Код восстановления не может быть пустым")
    private String resetCode;
} 