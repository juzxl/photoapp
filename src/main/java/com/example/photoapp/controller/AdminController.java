package com.example.photoapp.controller;

import com.example.photoapp.dto.MessageResponse;
import com.example.photoapp.model.Photo;
import com.example.photoapp.model.User;
import com.example.photoapp.model.ERole;
import com.example.photoapp.model.Role;
import com.example.photoapp.model.ActivityLog;
import com.example.photoapp.repository.PhotoRepository;
import com.example.photoapp.repository.UserRepository;
import com.example.photoapp.repository.RoleRepository;
import com.example.photoapp.repository.ActivityLogRepository;
import com.example.photoapp.security.Permissions;
import com.example.photoapp.security.services.UserDetailsImpl;
import com.example.photoapp.service.FileStorageService;
import com.example.photoapp.service.ActivityLogService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;
import java.util.HashSet;
import java.util.Set;
import java.io.PrintWriter;
import java.util.List;
import java.text.SimpleDateFormat;
import java.util.Date;
import jakarta.servlet.http.HttpServletResponse;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private static final Logger logger = LoggerFactory.getLogger(AdminController.class);

    @Autowired
    private PhotoRepository photoRepository;

    @Autowired
    private UserRepository userRepository;
    
    @Autowired
    private RoleRepository roleRepository;

    @Autowired
    private FileStorageService fileStorageService;

    @Autowired
    private Permissions permissions;
    
    @Autowired
    private ActivityLogRepository activityLogRepository;
    
    @Autowired
    private ActivityLogService activityLogService;

    // Удаление фото (доступно модераторам и админам)
    @DeleteMapping("/photos/{id}")
    @PreAuthorize("hasRole('MODERATOR') or hasRole('ADMIN')")
    public ResponseEntity<?> deletePhoto(@PathVariable("id") Long id, @AuthenticationPrincipal UserDetailsImpl userDetails)
            throws IOException {
        try {
            // Получаем фото
            Photo photo = photoRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Фото не найдено"));
            
            // Проверяем права доступа
            boolean hasAccess = permissions.canDeletePhoto(userDetails, photo);
            
            if (!hasAccess) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(new MessageResponse("У вас нет прав для удаления этого фото"));
            }
            
            // Удаляем файл
            fileStorageService.deleteFile(photo.getFileName());
            
            // Удаляем запись из базы данных
            photoRepository.delete(photo);
            
            return ResponseEntity.ok(new MessageResponse("Фото успешно удалено"));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при удалении фото: " + e.getMessage()));
        }
    }
    
    // Получение списка всех пользователей с пагинацией
    @GetMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getAllUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        logger.info("Получение списка пользователей: page={}, size={}, role={}, status={}, search={}", 
                page, size, role, status, search);
        
        try {
            Pageable pageable = PageRequest.of(page, size, Sort.by("id").ascending());
            Page<User> usersPage;
            
            // Применяем фильтры
            if (search != null && !search.trim().isEmpty()) {
                // Поиск по имени пользователя или email
                usersPage = userRepository.findByUsernameContainingOrEmailContaining(search, search, pageable);
            } else if (role != null && !role.isEmpty()) {
                // Фильтр по роли
                ERole eRole;
                try {
                    eRole = ERole.valueOf(role);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(new MessageResponse("Неверное значение роли"));
                }
                
                // Получаем объект роли
                Role roleObj = roleRepository.findByName(eRole)
                        .orElseThrow(() -> new RuntimeException("Роль не найдена"));
                
                usersPage = userRepository.findByRolesContaining(roleObj, pageable);
            } else if (status != null && !status.isEmpty()) {
                // Фильтр по статусу
                if ("active".equals(status)) {
                    usersPage = userRepository.findByEnabledTrueAndDeletedFalse(pageable);
                } else if ("blocked".equals(status)) {
                    usersPage = userRepository.findByEnabledFalse(pageable);
                } else if ("unverified".equals(status)) {
                    usersPage = userRepository.findByEmailVerificationTokenIsNotNull(pageable);
                } else {
                    return ResponseEntity.badRequest().body(new MessageResponse("Неверное значение статуса"));
                }
            } else {
                // Без фильтров
                usersPage = userRepository.findAll(pageable);
            }
            
            // Преобразуем данные для лучшей совместимости с фронтендом
            Page<Map<String, Object>> transformedPage = usersPage.map(user -> {
                Map<String, Object> userMap = new HashMap<>();
                userMap.put("id", user.getId());
                userMap.put("username", user.getUsername());
                userMap.put("email", user.getEmail());
                
                // Преобразуем роли в строковый формат
                if (user.getRoles() != null && !user.getRoles().isEmpty()) {
                    // Берем первую роль
                    Role userRole = user.getRoles().iterator().next();
                    userMap.put("role", userRole.getName().toString());
                } else {
                    userMap.put("role", "ROLE_USER"); // По умолчанию
                }
                
                // Устанавливаем статус
                userMap.put("status", user.isEnabled() ? "active" : "blocked");
                if (user.getEmailVerificationToken() != null) {
                    userMap.put("status", "unverified");
                }
                
                // Добавляем дату регистрации
                userMap.put("registrationDate", user.getCreatedAt());
                
                return userMap;
            });
            
            return ResponseEntity.ok(transformedPage);
        } catch (Exception e) {
            logger.error("Ошибка при получении списка пользователей", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при получении списка пользователей: " + e.getMessage()));
        }
    }
    
    // Получение информации о пользователе по ID
    @GetMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getUserById(@PathVariable Long id, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        logger.info("Получение информации о пользователе ID={}", id);
        
        try {
            User user = userRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Пользователь не найден"));
            
            // Скрываем пароль для безопасности
            user.setPassword(null);
            
            return ResponseEntity.ok(user);
        } catch (Exception e) {
            logger.error("Ошибка при получении информации о пользователе", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при получении информации о пользователе: " + e.getMessage()));
        }
    }
    
    // Обновление информации о пользователе
    @PutMapping("/users")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateUser(@RequestBody Map<String, Object> userData, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        logger.info("Обновление информации о пользователе: {}", userData);
        
        try {
            // Получаем ID пользователя
            Long userId = Long.parseLong(userData.get("id").toString());
            
            // Находим пользователя
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("Пользователь не найден"));
            
            // Обновляем информацию о пользователе
            if (userData.containsKey("username")) {
                user.setUsername(userData.get("username").toString());
            }
            
            if (userData.containsKey("email")) {
                user.setEmail(userData.get("email").toString());
            }
            
            // Обновляем роль пользователя
            if (userData.containsKey("role")) {
                String roleName = userData.get("role").toString();
                ERole eRole;
                try {
                    eRole = ERole.valueOf(roleName);
                } catch (IllegalArgumentException e) {
                    return ResponseEntity.badRequest().body(new MessageResponse("Неверное значение роли"));
                }
                
                // Получаем объект роли
                Role role = roleRepository.findByName(eRole)
                        .orElseThrow(() -> new RuntimeException("Роль не найдена"));
                
                // Устанавливаем новую роль
                Set<Role> roles = new HashSet<>();
                roles.add(role);
                user.setRoles(roles);
            }
            
            // Обновляем статус пользователя
            if (userData.containsKey("status")) {
                String status = userData.get("status").toString();
                if ("active".equals(status)) {
                    user.setEnabled(true);
                    user.setDeleted(false);
                } else if ("blocked".equals(status)) {
                    user.setEnabled(false);
                } else if ("unverified".equals(status)) {
                    // Для неподтвержденных аккаунтов устанавливаем токен верификации
                    if (user.getEmailVerificationToken() == null) {
                        user.setEmailVerificationToken("unverified_" + System.currentTimeMillis());
                    }
                    user.setEnabled(false);
                }
            }
            
            // Сохраняем изменения
            userRepository.save(user);
            
            return ResponseEntity.ok(new MessageResponse("Информация о пользователе успешно обновлена"));
        } catch (Exception e) {
            logger.error("Ошибка при обновлении информации о пользователе", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при обновлении информации о пользователе: " + e.getMessage()));
        }
    }
    
    // Удаление пользователя
    @DeleteMapping("/users/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> deleteUser(@PathVariable Long id, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        logger.info("Удаление пользователя ID={}", id);
        
        try {
            // Проверяем, существует ли пользователь
            if (!userRepository.existsById(id)) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .body(new MessageResponse("Пользователь не найден"));
            }
            
            // Проверяем, не пытается ли пользователь удалить сам себя
            if (userDetails.getId().equals(id)) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                        .body(new MessageResponse("Вы не можете удалить свой собственный аккаунт"));
            }
            
            // Удаляем пользователя
            userRepository.deleteById(id);
            
            return ResponseEntity.ok(new MessageResponse("Пользователь успешно удален"));
        } catch (Exception e) {
            logger.error("Ошибка при удалении пользователя", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при удалении пользователя: " + e.getMessage()));
        }
    }
    
    // Экспорт пользователей в CSV
    @GetMapping("/users/export")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> exportUsers(
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        logger.info("Экспорт пользователей: role={}, status={}, search={}", role, status, search);
        
        try {
            // Здесь должна быть логика экспорта в CSV
            // Пока просто возвращаем сообщение об успехе
            return ResponseEntity.ok(new MessageResponse("Экспорт пользователей в разработке"));
        } catch (Exception e) {
            logger.error("Ошибка при экспорте пользователей", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при экспорте пользователей: " + e.getMessage()));
        }
    }

    // Получение списка аудит-логов с пагинацией и фильтрацией
    @GetMapping("/activity")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getActivityLogs(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "25") int size,
            @RequestParam(required = false) String activityType,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) String username,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        logger.info("Получение аудит-логов: page={}, size={}, activityType={}, actionType={}, actor={}, username={}", 
                page, size, activityType, actionType, actor, username);
        
        try {
            // Создаем объект пагинации с сортировкой по timestamp по убыванию (сначала новые)
            Pageable pageable = PageRequest.of(page, size, Sort.by("timestamp").descending());
            Page<ActivityLog> logsPage;
            
            // Применяем фильтры
            logsPage = activityLogService.findActivityLogs(activityType, actionType, actor, username, pageable);
            
            return ResponseEntity.ok(logsPage);
        } catch (Exception e) {
            logger.error("Ошибка при получении аудит-логов", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при получении аудит-логов: " + e.getMessage()));
        }
    }
    
    // Получение детальной информации о записи аудита
    @GetMapping("/activity/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getActivityLogDetails(@PathVariable Long id, @AuthenticationPrincipal UserDetailsImpl userDetails) {
        logger.info("Получение информации о записи аудита ID={}", id);
        
        try {
            ActivityLog activityLog = activityLogRepository.findById(id)
                    .orElseThrow(() -> new RuntimeException("Запись аудита не найдена"));
            
            return ResponseEntity.ok(activityLog);
        } catch (Exception e) {
            logger.error("Ошибка при получении информации о записи аудита", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при получении информации о записи аудита: " + e.getMessage()));
        }
    }
    
    // Экспорт аудит-логов в CSV
    @GetMapping("/activity/export")
    @PreAuthorize("hasRole('ADMIN')")
    public void exportActivityLogs(
            @RequestParam(required = false) String activityType,
            @RequestParam(required = false) String actionType,
            @RequestParam(required = false) String actor,
            @RequestParam(required = false) String username,
            HttpServletResponse response,
            @AuthenticationPrincipal UserDetailsImpl userDetails) {
        
        logger.info("Экспорт аудит-логов: activityType={}, actionType={}, actor={}, username={}", 
                activityType, actionType, actor, username);
        
        try {
            // Настраиваем response для выдачи CSV файла
            response.setContentType("text/csv");
            response.setCharacterEncoding("UTF-8");
            
            // Добавляем BOM для правильной работы с кириллицей в Excel
            response.getOutputStream().write(0xEF);
            response.getOutputStream().write(0xBB);
            response.getOutputStream().write(0xBF);
            
            // Устанавливаем заголовок для скачивания файла
            String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss").format(new Date());
            String filename = "activity_logs_" + timestamp + ".csv";
            response.setHeader("Content-Disposition", "attachment; filename=\"" + filename + "\"");
            
            // Получаем все записи аудита с применением фильтров, но без пагинации
            List<ActivityLog> logs = activityLogService.findAllActivityLogs(activityType, actionType, actor, username);
            
            // Пишем CSV
            try (PrintWriter writer = new PrintWriter(response.getWriter())) {
                // Заголовок CSV
                writer.println("ID,Время,ID пользователя,Имя пользователя,Тип действия,Операция,ID объекта,Имя объекта,Связанный ID,Роль исполнителя");
                
                // Данные
                for (ActivityLog log : logs) {
                    writer.println(String.format("%d,%s,%d,%s,%s,%s,%d,%s,%s,%s",
                            log.getId(),
                            log.getTimestamp(),
                            log.getUser().getId(),
                            log.getUser().getUsername(),
                            log.getActivityType(),
                            log.getActionType(),
                            log.getObjectId(),
                            log.getObjectName() != null ? "\"" + log.getObjectName().replace("\"", "\"\"") + "\"" : "",
                            log.getRelatedId() != null ? log.getRelatedId().toString() : "",
                            log.getActor()));
                }
            }
            
            response.getWriter().flush();
            
        } catch (Exception e) {
            logger.error("Ошибка при экспорте аудит-логов", e);
            try {
                response.sendError(HttpStatus.INTERNAL_SERVER_ERROR.value(), "Ошибка при экспорте аудит-логов: " + e.getMessage());
            } catch (IOException ioe) {
                logger.error("Ошибка при отправке ответа об ошибке", ioe);
            }
        }
    }
    
    // Получение статистики по аудит-логам
    @GetMapping("/activity/stats")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> getActivityStats(@AuthenticationPrincipal UserDetailsImpl userDetails) {
        logger.info("Получение статистики по аудит-логам");
        
        try {
            Map<String, Object> stats = activityLogService.getActivityStats();
            return ResponseEntity.ok(stats);
        } catch (Exception e) {
            logger.error("Ошибка при получении статистики по аудит-логам", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(new MessageResponse("Ошибка при получении статистики: " + e.getMessage()));
        }
    }
} 