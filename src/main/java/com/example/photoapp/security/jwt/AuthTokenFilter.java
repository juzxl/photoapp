package com.example.photoapp.security.jwt;

import com.example.photoapp.security.services.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class AuthTokenFilter extends OncePerRequestFilter {
    private static final Logger logger = LoggerFactory.getLogger(AuthTokenFilter.class);

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private UserDetailsServiceImpl userDetailsService;

    @Override
    protected boolean shouldNotFilter(@NonNull HttpServletRequest request) throws ServletException {
        // Включаем JWT фильтр для защищенных API-эндпоинтов и страниц
        String path = request.getRequestURI();
        
        // Не фильтруем публичные ресурсы 
        return path.startsWith("/api/public/") || 
               path.startsWith("/api/auth/") || 
               path.equals("/api/tags/popular") ||
               path.equals("/") ||
               path.equals("/index.html") ||
               path.equals("/gallery") ||
               path.equals("/gallery.html") ||
               path.endsWith(".css") ||
               path.endsWith(".js") ||
               path.endsWith(".ico") ||
               path.startsWith("/uploads/") ||
               path.contains("fonts/") ||
               path.endsWith(".woff2") ||
               path.endsWith(".woff") ||
               path.endsWith(".ttf") ||
               path.equals("/login.html") ||
               path.equals("/register.html");
    }

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request, @NonNull HttpServletResponse response,
                                  @NonNull FilterChain filterChain) throws ServletException, IOException {
        try {
            logger.debug("Filtering request: {} {}", request.getMethod(), request.getRequestURI());
            String jwt = parseJwt(request);
            
            if (jwt != null) {
                logger.debug("JWT token found in request: {}", jwt.substring(0, Math.min(10, jwt.length())) + "...");
                
                try {
                    if (jwtUtils.validateJwtToken(jwt)) {
                        String username = jwtUtils.getUserNameFromJwtToken(jwt);
                        logger.debug("JWT token is valid for user: {}", username);
                        
                        UserDetails userDetails = userDetailsService.loadUserByUsername(username);
                        
                        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(
                                userDetails, null, userDetails.getAuthorities());
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));

                        SecurityContextHolder.getContext().setAuthentication(authentication);
                        logger.debug("Authentication set in SecurityContext for user: {}", username);
                    } else {
                        logger.warn("Invalid JWT token");
                    }
                } catch (Exception e) {
                    logger.error("Cannot set user authentication: {}", e.getMessage(), e);
                }
            } else {
                logger.debug("No JWT token found in request");
            }
        } catch (Exception e) {
            logger.error("Filter exception: {}", e.getMessage(), e);
        }

        filterChain.doFilter(request, response);
    }

    private String parseJwt(HttpServletRequest request) {
        // 1. Пробуем получить токен из заголовка Authorization
        String headerAuth = request.getHeader("Authorization");
        logger.debug("Authorization header: {}", headerAuth);

        if (StringUtils.hasText(headerAuth) && headerAuth.startsWith("Bearer ")) {
            return headerAuth.substring(7);
        }

        // 2. Если токен не найден в заголовке, проверяем в куках
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("jwt_token".equals(cookie.getName())) {
                    logger.debug("Found JWT token in cookie");
                    return cookie.getValue();
                }
            }
        }

        return null;
    }
} 