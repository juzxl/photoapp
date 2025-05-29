package com.example.photoapp.controller;

import com.example.photoapp.model.Tag;
import com.example.photoapp.service.TagService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/tags")
public class TagController {

    @Autowired
    private TagService tagService;

    @GetMapping("/popular")
    public ResponseEntity<List<Tag>> getPopularTags() {
        List<Tag> popularTags = tagService.getPopularTags();
        return ResponseEntity.ok(popularTags);
    }
} 