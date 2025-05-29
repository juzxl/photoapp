package com.example.photoapp.repository;

import com.example.photoapp.model.ActivityLog;
import com.example.photoapp.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    // Поиск по типу активности
    Page<ActivityLog> findByActivityType(String activityType, Pageable pageable);
    
    // Поиск по типу действия
    Page<ActivityLog> findByActionType(String actionType, Pageable pageable);
    
    // Поиск по роли исполнителя
    Page<ActivityLog> findByActor(String actor, Pageable pageable);
    
    // Поиск по пользователю
    Page<ActivityLog> findByUser(User user, Pageable pageable);
    
    // Поиск по имени пользователя (частичное совпадение)
    @Query("SELECT a FROM ActivityLog a JOIN a.user u WHERE LOWER(u.username) LIKE LOWER(CONCAT('%', :username, '%'))")
    Page<ActivityLog> findByUsernameLike(String username, Pageable pageable);
    
    // Комбинированный поиск по типу активности и типу действия
    Page<ActivityLog> findByActivityTypeAndActionType(String activityType, String actionType, Pageable pageable);
    
    // Комбинированный поиск по типу активности и роли исполнителя
    Page<ActivityLog> findByActivityTypeAndActor(String activityType, String actor, Pageable pageable);
    
    // Запрос для получения статистики по типам активности
    @Query("SELECT a.activityType, COUNT(a) FROM ActivityLog a GROUP BY a.activityType")
    List<Object[]> countByActivityType();
    
    // Запрос для получения статистики по типам действий
    @Query("SELECT a.actionType, COUNT(a) FROM ActivityLog a GROUP BY a.actionType")
    List<Object[]> countByActionType();
} 