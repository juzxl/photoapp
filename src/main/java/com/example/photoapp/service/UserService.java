package com.example.photoapp.service;

import com.example.photoapp.model.User;

/**
 * Сервис для работы с пользователями
 */
public interface UserService {

    /**
     * Получить пользователя по ID
     *
     * @param id ID пользователя
     * @return пользователь
     */
    User getUserById(Long id);

    /**
     * Получить пользователя по имени пользователя
     *
     * @param username имя пользователя
     * @return пользователь
     */
    User getUserByUsername(String username);

    /**
     * Получить пользователя по email
     *
     * @param email email пользователя
     * @return пользователь
     */
    User getUserByEmail(String email);

    /**
     * Проверить существование пользователя по имени пользователя
     *
     * @param username имя пользователя
     * @return true, если пользователь существует
     */
    boolean existsByUsername(String username);

    /**
     * Проверить существование пользователя по email
     *
     * @param email email пользователя
     * @return true, если пользователь существует
     */
    boolean existsByEmail(String email);
} 