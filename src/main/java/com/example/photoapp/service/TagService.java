package com.example.photoapp.service;

import com.example.photoapp.model.Tag;
import com.example.photoapp.repository.TagRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.HashSet;
import java.util.stream.Collectors;

@Service
public class TagService {

    @Autowired
    private TagRepository tagRepository;

    public List<Tag> getPopularTags() {
        return tagRepository.findPopularTags();
    }
    
    /**
     * Получает существующие теги или создает новые на основе имен тегов
     * 
     * @param tagNames Набор имен тегов
     * @return Набор объектов Tag
     */
    @Transactional
    public Set<Tag> getOrCreateTags(Set<String> tagNames) {
        if (tagNames == null || tagNames.isEmpty()) {
            return new HashSet<>();
        }
        
        // Сначала получаем все существующие теги с указанными именами
        Set<Tag> existingTags = new HashSet<>(tagRepository.findByNameIn(tagNames));
        
        // Находим имена тегов, которые уже существуют
        Set<String> existingTagNames = existingTags.stream()
                .map(Tag::getName)
                .collect(Collectors.toSet());
        
        // Находим имена тегов, которые нужно создать
        Set<String> newTagNames = tagNames.stream()
                .filter(name -> !existingTagNames.contains(name))
                .collect(Collectors.toSet());
        
        // Создаем новые теги
        if (!newTagNames.isEmpty()) {
            Set<Tag> newTags = newTagNames.stream()
                    .map(name -> {
                        Tag tag = new Tag();
                        tag.setName(name);
                        return tag;
                    })
                    .collect(Collectors.toSet());
            
            // Сохраняем новые теги в базу данных
            tagRepository.saveAll(newTags);
            
            // Добавляем новые теги к существующим
            existingTags.addAll(newTags);
        }
        
        return existingTags;
    }
} 