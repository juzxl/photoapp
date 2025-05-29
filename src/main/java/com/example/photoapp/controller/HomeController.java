package com.example.photoapp.controller;

import org.springframework.core.io.ClassPathResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;
import org.springframework.util.FileCopyUtils;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.ResponseBody;

import java.io.IOException;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;

@Controller
public class HomeController {

    @GetMapping("/")
    public String home() {
        return "forward:/index.html";
    }
    
    @GetMapping("/index")
    public String index() {
        return "forward:/index.html";
    }
    
    @GetMapping(value = "/profile", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public String profile() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            try {
                return readResourceAsString("static/profile.html");
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        } else {
            return "<script>window.location.href='/';</script>";
        }
    }
    
    @GetMapping(value = "/upload", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public String upload() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            try {
                return readResourceAsString("static/upload.html");
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        } else {
            return "<script>window.location.href='/';</script>";
        }
    }
    
    @GetMapping(value = "/gallery", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public String gallery() {
        try {
            return readResourceAsString("static/gallery.html");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
    
    @GetMapping(value = "/albums", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public String albums() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            try {
                return readResourceAsString("static/albums.html");
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        } else {
            return "<script>window.location.href='/';</script>";
        }
    }
    
    @GetMapping(value = "/favorites", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public String favorites() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            try {
                return readResourceAsString("static/favorites.html");
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        } else {
            return "<script>window.location.href='/';</script>";
        }
    }
    
    @GetMapping(value = "/settings", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public String settings() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.isAuthenticated() && !auth.getName().equals("anonymousUser")) {
            try {
                return readResourceAsString("static/settings.html");
            } catch (IOException e) {
                throw new UncheckedIOException(e);
            }
        } else {
            return "<script>window.location.href='/';</script>";
        }
    }
    
    @GetMapping("/favicon.ico")
    @ResponseBody
    public ResponseEntity<Void> favicon() {
        return ResponseEntity.status(HttpStatus.NO_CONTENT).build();
    }
    
    @GetMapping(value = "/profile/{id}", produces = MediaType.TEXT_HTML_VALUE)
    @ResponseBody
    public String userProfile(@PathVariable("id") Long id) {
        try {
            return readResourceAsString("static/user-profile.html");
        } catch (IOException e) {
            throw new UncheckedIOException(e);
        }
    }
    
    private String readResourceAsString(String path) throws IOException {
        ClassPathResource resource = new ClassPathResource(path);
        try (Reader reader = new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8)) {
            return FileCopyUtils.copyToString(reader);
        }
    }
} 