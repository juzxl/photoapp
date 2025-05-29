package com.example.photoapp.controller;

import com.example.photoapp.dto.JwtResponse;
import com.example.photoapp.dto.LoginRequest;
import com.example.photoapp.dto.MessageResponse;
import com.example.photoapp.dto.SignupRequest;
import com.example.photoapp.model.ERole;
import com.example.photoapp.model.Role;
import com.example.photoapp.model.User;
import com.example.photoapp.repository.RoleRepository;
import com.example.photoapp.repository.UserRepository;
import com.example.photoapp.security.jwt.JwtUtils;
import com.example.photoapp.security.services.UserDetailsImpl;
import com.example.photoapp.service.EmailService;
import com.example.photoapp.service.ActivityLogService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    RoleRepository roleRepository;

    @Autowired
    PasswordEncoder encoder;
    
    @Autowired
    JwtUtils jwtUtils;
    
    @Autowired
    EmailService emailService;
    
    @Autowired
    ActivityLogService activityLogService;
    
    // Вспомогательный метод для определения роли пользователя
    private String getRoleString(UserDetailsImpl userDetails) {
        if (userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) {
            return "admin";
        } else if (userDetails.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MODERATOR"))) {
            return "moderator";
        }
        return "user";
    }
    
    @PostMapping("/signin")
    public ResponseEntity<?> authenticateUser(@Valid @RequestBody LoginRequest loginRequest, HttpServletResponse response) {
        logger.info("Attempting authentication for user: {}", loginRequest.getUsernameOrEmail());
        
        try {
            // Проверяем, верифицирован ли аккаунт
            User user = userRepository.findByUsernameOrEmail(loginRequest.getUsernameOrEmail(), loginRequest.getUsernameOrEmail())
                    .orElseThrow(() -> new RuntimeException("Пользователь не найден"));
                    
            if (!user.isEnabled()) {
                return ResponseEntity
                        .status(HttpStatus.UNAUTHORIZED)
                        .body(new MessageResponse("Ошибка: Аккаунт не активирован. Пожалуйста, проверьте вашу электронную почту для подтверждения."));
            }
            
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.getUsernameOrEmail(), loginRequest.getPassword()));
            
            SecurityContextHolder.getContext().setAuthentication(authentication);
            String jwt = jwtUtils.generateJwtToken(authentication);
            
            UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
            List<String> roles = userDetails.getAuthorities().stream()
                    .map(item -> item.getAuthority())
                    .collect(Collectors.toList());
            
            logger.info("Authentication successful for user: {}", userDetails.getUsername());
            logger.info("Generated JWT token length: {}", jwt.length());
            logger.info("User roles: {}", roles);
            
            // Добавляем JWT токен в cookie
            Cookie jwtCookie = new Cookie("jwt_token", jwt);
            jwtCookie.setPath("/");  // Доступен для всего сайта
            jwtCookie.setHttpOnly(true);  // Недоступен для JavaScript
            jwtCookie.setMaxAge(24 * 60 * 60);  // 1 день
            response.addCookie(jwtCookie);
            
            // Логируем вход пользователя
            activityLogService.logActivity(userDetails.getId(), "login", "login", null, null, null, getRoleString(userDetails));
            
            return ResponseEntity.ok(new JwtResponse(
                jwt,
                userDetails.getId(),
                userDetails.getUsername(),
                userDetails.getEmail(),
                roles));
        } catch (Exception e) {
            logger.error("Authentication failed for user: {}", loginRequest.getUsernameOrEmail());
            logger.error("Error details: ", e);
            return ResponseEntity.status(401).body(new MessageResponse("Error: " + e.getMessage()));
        }
    }

    @PostMapping("/signup")
    public ResponseEntity<?> registerUser(@Valid @RequestBody SignupRequest signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.getUsername())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Username is already taken!"));
        }

        if (userRepository.existsByEmail(signUpRequest.getEmail())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Email is already in use!"));
        }

        // Create new user's account
        User user = new User(signUpRequest.getUsername(), 
                             signUpRequest.getEmail(),
                             encoder.encode(signUpRequest.getPassword()));

        Set<String> strRoles = signUpRequest.getRoles();
        Set<Role> roles = new HashSet<>();

        // Проверяем количество существующих пользователей для автоматического назначения ролей
        long userCount = userRepository.count();
        logger.info("Current user count: {}. Assigning roles for new user.", userCount);
        
        // Если пользователь не указал роли явно или не админ
        if (strRoles == null || strRoles.isEmpty()) {
            // Первый пользователь получает роль администратора
            if (userCount == 0) {
                logger.info("Assigning ADMIN role to the first user");
                Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                        .orElseThrow(() -> new RuntimeException("Error: Admin role not found"));
                roles.add(adminRole);
            } 
            // Второй пользователь получает роль модератора
            else if (userCount == 1) {
                logger.info("Assigning MODERATOR role to the second user");
                Role modRole = roleRepository.findByName(ERole.ROLE_MODERATOR)
                        .orElseThrow(() -> new RuntimeException("Error: Moderator role not found"));
                roles.add(modRole);
            } 
            // Все остальные пользователи получают обычную роль
            else {
                logger.info("Assigning USER role to a regular user");
                Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                        .orElseThrow(() -> new RuntimeException("Error: User role not found"));
                roles.add(userRole);
            }
        } 
        // Если роли были указаны явно
        else {
            strRoles.forEach(role -> {
                switch (role) {
                case "admin":
                    Role adminRole = roleRepository.findByName(ERole.ROLE_ADMIN)
                            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                    roles.add(adminRole);
                    break;
                case "mod":
                    Role modRole = roleRepository.findByName(ERole.ROLE_MODERATOR)
                            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                    roles.add(modRole);
                    break;
                default:
                    Role userRole = roleRepository.findByName(ERole.ROLE_USER)
                            .orElseThrow(() -> new RuntimeException("Error: Role is not found."));
                    roles.add(userRole);
                }
            });
        }

        user.setRoles(roles);
        
        // Генерируем токен для верификации email
        String verificationToken = generateRandomToken();
        user.setEmailVerificationToken(verificationToken);
        
        // Аккаунт НЕ активирован до подтверждения email
        user.setEnabled(false);
        
        User savedUser = userRepository.save(user);
        
        // Логируем регистрацию нового пользователя
        String userRole = "user";
        if (roles.stream().anyMatch(r -> r.getName().equals(ERole.ROLE_ADMIN))) {
            userRole = "admin";
        } else if (roles.stream().anyMatch(r -> r.getName().equals(ERole.ROLE_MODERATOR))) {
            userRole = "moderator";
        }
        activityLogService.logActivity(savedUser.getId(), "login", "register", null, null, null, userRole);
        
        // Логирование назначенных ролей
        String assignedRoles = roles.stream()
                .map(r -> r.getName().toString())
                .collect(Collectors.joining(", "));
        logger.info("User {} registered successfully with roles: {}", user.getUsername(), assignedRoles);
        
        // Отправляем письмо для подтверждения email
        try {
            emailService.sendVerificationEmail(user.getEmail(), verificationToken);
            logger.info("Verification email sent to: {}", user.getEmail());
        } catch (Exception e) {
            logger.error("Ошибка отправки email: {}", e.getMessage());
            // Продолжаем выполнение, но сообщаем пользователю о проблеме
            return ResponseEntity.ok(new MessageResponse("Пользователь зарегистрирован, но возникла проблема с отправкой письма для подтверждения. Пожалуйста, свяжитесь с администратором."));
        }

        return ResponseEntity.ok(new MessageResponse("Регистрация прошла успешно! Пожалуйста, проверьте вашу электронную почту для подтверждения аккаунта."));
    }
    
    // Генерация случайного токена для верификации email
    private String generateRandomToken() {
        return java.util.UUID.randomUUID().toString();
    }
    
    @GetMapping("/verify/{token}")
    public ResponseEntity<?> verifyEmail(@PathVariable String token) {
        try {
            User user = userRepository.findByEmailVerificationToken(token)
                .orElseThrow(() -> new RuntimeException("Неверный верификационный токен"));
            
            // Проверяем не истек ли срок действия токена (если хотите добавить такую проверку)
            
            // Активируем аккаунт
            user.setEnabled(true);
            user.setEmailVerificationToken(null); // Очищаем токен
            userRepository.save(user);
            
            // Отправляем приветственное письмо
            try {
                emailService.sendWelcomeEmail(user.getEmail());
                logger.info("Welcome email sent to: {}", user.getEmail());
            } catch (Exception e) {
                logger.error("Ошибка отправки приветственного email: {}", e.getMessage());
            }
            
            return ResponseEntity.ok(new MessageResponse("Email успешно подтвержден. Теперь вы можете войти в систему."));
        } catch (Exception e) {
            logger.error("Ошибка верификации email: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new MessageResponse("Ошибка при подтверждении email: " + e.getMessage()));
        }
    }
    
    @GetMapping("/user")
    public ResponseEntity<?> getCurrentUser() {
        // Информация о текущем пользователе доступна через SecurityContextHolder
        // в обычных контроллерах
        return ResponseEntity.ok(new MessageResponse("User info endpoint"));
    }

    @PostMapping("/signout")
    public ResponseEntity<?> logoutUser(HttpServletResponse response) {
        // Удаляем JWT cookie
        Cookie jwtCookie = new Cookie("jwt_token", null);
        jwtCookie.setPath("/");
        jwtCookie.setMaxAge(0); // Удаляем куку
        jwtCookie.setHttpOnly(true);
        response.addCookie(jwtCookie);
        
        return ResponseEntity.ok(new MessageResponse("User logged out successfully!"));
    }
    
    @GetMapping("/check")
    public ResponseEntity<?> checkAuth() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            return ResponseEntity.ok(Map.of("authenticated", true));
        }
        
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("authenticated", false));
    }

    @GetMapping("/validate")
    public ResponseEntity<?> validateToken() {
        // Если запрос дошел до этого метода, значит токен валиден
        // (Spring Security уже проверил его)
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        // Добавляем логирование для отладки
        System.out.println("validateToken called");
        System.out.println("Authentication: " + authentication);
        if (authentication != null) {
            System.out.println("Authentication class: " + authentication.getClass().getName());
            System.out.println("Principal: " + authentication.getPrincipal());
            System.out.println("Principal class: " + (authentication.getPrincipal() != null ? authentication.getPrincipal().getClass().getName() : "null"));
            System.out.println("Is authenticated: " + authentication.isAuthenticated());
        }
        
        // Проверяем тип объекта перед приведением
        if (authentication != null && authentication.isAuthenticated()) {
            return ResponseEntity.ok(new MessageResponse("Token is valid"));
        }
        
        return ResponseEntity.status(401).body(new MessageResponse("Invalid token"));
    }
    
    @GetMapping("/session")
    public ResponseEntity<?> checkSession() {
        System.out.println("Session check called");
        
        // Проверяем, есть ли аутентификация в текущем контексте безопасности
        // (Это позволит определить, есть ли активная сессия)
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.isAuthenticated() && 
            !(authentication.getPrincipal() instanceof String)) {
            
            System.out.println("Valid authentication found: " + authentication);
            
            try {
                // Пытаемся извлечь пользовательские данные, если есть активная сессия
                UserDetailsImpl userDetails = (UserDetailsImpl) authentication.getPrincipal();
                
                // Генерируем новый JWT токен
                String jwt = jwtUtils.generateJwtToken(authentication);
                
                // Формируем ответ аналогично методу signin
                List<String> roles = userDetails.getAuthorities().stream()
                        .map(item -> item.getAuthority())
                        .collect(Collectors.toList());
                
                return ResponseEntity.ok(new JwtResponse(
                    jwt,
                    userDetails.getId(),
                    userDetails.getUsername(),
                    userDetails.getEmail(),
                    roles));
            } catch (ClassCastException e) {
                System.out.println("Cannot cast authentication principal: " + e.getMessage());
                return ResponseEntity.status(401).body(new MessageResponse("No valid session"));
            }
        }
        
        System.out.println("No valid authentication found");
        return ResponseEntity.status(401).body(new MessageResponse("No active session"));
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerificationEmail(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        if (email == null || email.isEmpty()) {
            return ResponseEntity.badRequest()
                .body(new MessageResponse("Email не указан"));
        }
        
        try {
            User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("Пользователь с таким email не найден"));
            
            // Проверяем, что аккаунт еще не активирован
            if (user.isEnabled()) {
                return ResponseEntity.badRequest()
                    .body(new MessageResponse("Этот аккаунт уже активирован. Вы можете войти в систему."));
            }
            
            // Генерируем новый токен
            String verificationToken = generateRandomToken();
            user.setEmailVerificationToken(verificationToken);
            userRepository.save(user);
            
            // Отправляем письмо с верификацией
            emailService.sendVerificationEmail(user.getEmail(), verificationToken);
            logger.info("Verification email resent to: {}", user.getEmail());
            
            return ResponseEntity.ok(new MessageResponse("Письмо с подтверждением отправлено повторно. Проверьте вашу электронную почту."));
        } catch (Exception e) {
            logger.error("Ошибка при повторной отправке письма с подтверждением: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .body(new MessageResponse("Ошибка: " + e.getMessage()));
        }
    }
} 