package com.example.photoapp.service;

import com.example.photoapp.model.ActivityLog;
import com.example.photoapp.model.User;
import com.example.photoapp.repository.ActivityLogRepository;
import com.example.photoapp.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class ActivityLogService {
    
    private static final Logger logger = LoggerFactory.getLogger(ActivityLogService.class);
    
    @Autowired
    private ActivityLogRepository activityLogRepository;
    
    @Autowired
    private UserRepository userRepository;
    
    /**
     * Поиск активности с применением фильтров и пагинации
     */
    public Page<ActivityLog> findActivityLogs(String activityType, String actionType, String actor, String username, Pageable pageable) {
        logger.info("Поиск активности с фильтрами: activityType={}, actionType={}, actor={}, username={}", 
                activityType, actionType, actor, username);
        
        // Если указано имя пользователя, ищем по нему
        if (username != null && !username.isEmpty()) {
            return activityLogRepository.findByUsernameLike(username, pageable);
        }
        
        // Если указаны оба фильтра - тип активности и тип действия
        if (activityType != null && !activityType.equals("all") && 
            actionType != null && !actionType.equals("all")) {
            return activityLogRepository.findByActivityTypeAndActionType(activityType, actionType, pageable);
        }
        
        // Если указаны оба фильтра - тип активности и роль исполнителя
        if (activityType != null && !activityType.equals("all") && 
            actor != null && !actor.equals("all")) {
            return activityLogRepository.findByActivityTypeAndActor(activityType, actor, pageable);
        }
        
        // Если указан только тип активности
        if (activityType != null && !activityType.equals("all")) {
            return activityLogRepository.findByActivityType(activityType, pageable);
        }
        
        // Если указан только тип действия
        if (actionType != null && !actionType.equals("all")) {
            return activityLogRepository.findByActionType(actionType, pageable);
        }
        
        // Если указана только роль исполнителя
        if (actor != null && !actor.equals("all")) {
            return activityLogRepository.findByActor(actor, pageable);
        }
        
        // Без фильтров - возвращаем все с пагинацией
        return activityLogRepository.findAll(pageable);
    }
    
    /**
     * Поиск всех записей активности по фильтрам без пагинации (для экспорта)
     */
    public List<ActivityLog> findAllActivityLogs(String activityType, String actionType, String actor, String username) {
        // Для простоты реализации просто возвращаем все записи
        // В боевом приложении тут была бы более сложная логика с применением фильтров
        return activityLogRepository.findAll();
    }
    
    /**
     * Регистрация нового события активности
     */
    public ActivityLog logActivity(Long userId, String activityType, String actionType, 
                                Long objectId, String objectName, Long relatedId, String actor) {
        
        try {
            ActivityLog log = new ActivityLog();
            
            // Находим пользователя
            Optional<User> userOpt = userRepository.findById(userId);
            if (userOpt.isPresent()) {
                log.setUser(userOpt.get());
            } else {
                logger.error("Не удалось найти пользователя с ID: {}", userId);
                return null;
            }
            
            // Заполняем информацию о действии
            log.setTimestamp(java.time.LocalDateTime.now());
            log.setActivityType(activityType);
            log.setActionType(actionType);
            log.setObjectId(objectId);
            log.setObjectName(objectName);
            log.setRelatedId(relatedId);
            log.setActor(actor);
            
            // Сохраняем в БД
            return activityLogRepository.save(log);
            
        } catch (Exception e) {
            logger.error("Ошибка при логировании активности", e);
            return null;
        }
    }
    
    /**
     * Получение статистики по активности
     */
    public Map<String, Object> getActivityStats() {
        Map<String, Object> stats = new HashMap<>();
        
        try {
            // Статистика по типам активности
            List<Object[]> activityTypeStats = activityLogRepository.countByActivityType();
            Map<String, Long> activityTypeMap = new HashMap<>();
            
            for (Object[] result : activityTypeStats) {
                String type = (String) result[0];
                Long count = (Long) result[1];
                activityTypeMap.put(type, count);
            }
            
            // Статистика по типам действий
            List<Object[]> actionTypeStats = activityLogRepository.countByActionType();
            Map<String, Long> actionTypeMap = new HashMap<>();
            
            for (Object[] result : actionTypeStats) {
                String type = (String) result[0];
                Long count = (Long) result[1];
                actionTypeMap.put(type, count);
            }
            
            // Добавляем в общую статистику
            stats.put("activityTypes", activityTypeMap);
            stats.put("actionTypes", actionTypeMap);
            stats.put("totalLogs", activityLogRepository.count());
            
            return stats;
            
        } catch (Exception e) {
            logger.error("Ошибка при получении статистики активности", e);
            stats.put("error", e.getMessage());
            return stats;
        }
    }
} 