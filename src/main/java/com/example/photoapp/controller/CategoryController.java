package com.example.photoapp.controller;

import com.example.photoapp.dto.MessageResponse;
import com.example.photoapp.model.Category;
import com.example.photoapp.repository.CategoryRepository;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/categories")
public class CategoryController {
    
    @Autowired
    private CategoryRepository categoryRepository;
    
    @GetMapping
    public ResponseEntity<List<Category>> getAllCategories() {
        List<Category> categories = categoryRepository.findAll();
        return new ResponseEntity<>(categories, HttpStatus.OK);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<Category> getCategoryById(@PathVariable("id") Long id) {
        return categoryRepository.findById(id)
                .map(category -> new ResponseEntity<>(category, HttpStatus.OK))
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }
    
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> createCategory(@Valid @RequestBody Category category) {
        if (categoryRepository.existsByName(category.getName())) {
            return ResponseEntity
                    .badRequest()
                    .body(new MessageResponse("Error: Category name already exists!"));
        }
        
        Category newCategory = new Category(category.getName(), category.getDescription());
        categoryRepository.save(newCategory);
        
        return new ResponseEntity<>(newCategory, HttpStatus.CREATED);
    }
    
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<?> updateCategory(@PathVariable("id") Long id, @Valid @RequestBody Category category) {
        return categoryRepository.findById(id)
                .map(existingCategory -> {
                    // Check if new name conflicts with another category
                    if (!existingCategory.getName().equals(category.getName()) && 
                            categoryRepository.existsByName(category.getName())) {
                        return ResponseEntity
                                .badRequest()
                                .body(new MessageResponse("Error: Category name already exists!"));
                    }
                    
                    existingCategory.setName(category.getName());
                    existingCategory.setDescription(category.getDescription());
                    
                    return new ResponseEntity<>(categoryRepository.save(existingCategory), HttpStatus.OK);
                })
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }
    
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<HttpStatus> deleteCategory(@PathVariable("id") Long id) {
        return categoryRepository.findById(id)
                .map(category -> {
                    categoryRepository.delete(category);
                    return new ResponseEntity<HttpStatus>(HttpStatus.NO_CONTENT);
                })
                .orElse(new ResponseEntity<>(HttpStatus.NOT_FOUND));
    }
} 