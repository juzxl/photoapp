package com.example.photoapp.config;

import com.example.photoapp.security.jwt.AuthEntryPointJwt;
import com.example.photoapp.security.jwt.AuthTokenFilter;
import com.example.photoapp.security.services.UserDetailsImpl;
import com.example.photoapp.security.services.UserDetailsServiceImpl;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.filter.CorsFilter;
import org.springframework.web.filter.GenericFilterBean;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class WebSecurityConfig {
    private static final Logger logger = LoggerFactory.getLogger(WebSecurityConfig.class);
    
    @Autowired
    UserDetailsServiceImpl userDetailsService;
    
    @Autowired
    private AuthEntryPointJwt unauthorizedHandler;
    
    @Autowired
    private CorsFilter corsFilter;

    @Bean
    public AuthTokenFilter authenticationJwtTokenFilter() {
        return new AuthTokenFilter();
    }
    
    /**
     * Фильтр для добавления временного пользователя в SecurityContext
     * Используется только когда проверки безопасности отключены
     */
    @Bean
    public GenericFilterBean temporaryUserFilter() {
        return new GenericFilterBean() {
            @Override
            public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
                    throws IOException, ServletException {
                
                // Проверяем, есть ли уже аутентификация в контексте
                Authentication existingAuth = SecurityContextHolder.getContext().getAuthentication();
                
                // Если аутентификации нет, создаем временного пользователя с ограниченными правами
                if (existingAuth == null || !existingAuth.isAuthenticated()) {
                    logger.info("Adding temporary user to SecurityContext");
                    
                    // Создаем временные права доступа (ROLE_USER)
                    List<GrantedAuthority> authorities = Collections.singletonList(
                            new SimpleGrantedAuthority("ROLE_USER"));
                    
                    // Создаем временный объект UserDetailsImpl с ID=7
                    UserDetailsImpl userDetails = new UserDetailsImpl(
                            7L,                     // ID пользователя (соответствует тестовому пользователю)
                            "testuser",             // Имя пользователя
                            "test@example.com",     // Email
                            "",                     // Пустой пароль (не используется)
                            authorities,            // Права доступа
                            true                    // Аккаунт активен
                    );
                    
                    // Создаем объект аутентификации
                    UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
                            userDetails, null, authorities);
                    
                    // Устанавливаем аутентификацию в контексте безопасности
                    SecurityContextHolder.getContext().setAuthentication(auth);
                    
                    logger.info("Temporary user authentication set with ID: 7");
                }
                
                // Продолжаем обработку запроса
                chain.doFilter(request, response);
            }
        };
    }

    @Bean
    public DaoAuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration authConfig) throws Exception {
        return authConfig.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    @Bean
    public AuthenticationSuccessHandler authenticationSuccessHandler() {
        return new SimpleUrlAuthenticationSuccessHandler() {
            @Override
            public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                               Authentication authentication) throws IOException, ServletException {
                String redirectParam = request.getParameter("redirect");
                if (redirectParam != null && !redirectParam.isEmpty()) {
                    // Проверяем, что редирект идет на наш сайт (предотвращение open redirect)
                    if (redirectParam.startsWith("/")) {
                        getRedirectStrategy().sendRedirect(request, response, redirectParam);
                        return;
                    }
                }
                
                // Если редиректа нет или он некорректный, используем стандартный URL
                getRedirectStrategy().sendRedirect(request, response, "/");
            }
        };
    }
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        logger.info("Configuring security filter chain");
        
        http
            .csrf(csrf -> {
                csrf.disable();
                logger.info("CSRF protection disabled");
            })
            .addFilterBefore(corsFilter, UsernamePasswordAuthenticationFilter.class)
            .exceptionHandling(exception -> {
                exception.authenticationEntryPoint(unauthorizedHandler);
                logger.info("Custom authentication entry point configured");
            })
            .sessionManagement(session -> {
                session.sessionCreationPolicy(SessionCreationPolicy.STATELESS);
                logger.info("Session management set to STATELESS");
            })
            .authorizeHttpRequests(auth -> {
                // Публичные ресурсы (не требующие аутентификации)
                auth.requestMatchers("/api/public/**").permitAll();
                auth.requestMatchers("/api/feed").permitAll();  
                auth.requestMatchers("/api/feed/debug").permitAll();
                auth.requestMatchers("/api/auth/**").permitAll();
                auth.requestMatchers("/api/tags/popular").permitAll();
                auth.requestMatchers("/", "/index.html", "/login.html", "/register.html", "/forgot-password.html").permitAll();
                auth.requestMatchers("/gallery", "/gallery.html").permitAll();
                auth.requestMatchers("/profile/{id}").permitAll();
                auth.requestMatchers("/api/users/{id}").permitAll();
                auth.requestMatchers("/user/{id}").permitAll();
                auth.requestMatchers("/photos/user/{id}/public").permitAll();
                auth.requestMatchers("/*.css", "/*.js", "/*.ico", "/js/**", "/css/**", "/fonts/**", "/uploads/**").permitAll();
                
                // Защищённые ресурсы (требующие аутентификации)
                auth.requestMatchers("/api/photos/**").authenticated(); 
                auth.requestMatchers("/api/albums/**").authenticated();
                auth.requestMatchers("/api/users/me/**").authenticated();
                auth.requestMatchers("/api/messages/**").authenticated();
                auth.requestMatchers("/profile", "/profile.html").authenticated();
                auth.requestMatchers("/upload", "/upload.html").authenticated();
                auth.requestMatchers("/settings", "/settings.html").authenticated();
                auth.requestMatchers("/albums", "/albums.html").authenticated();
                auth.requestMatchers("/favorites", "/favorites.html").authenticated();
                auth.requestMatchers("/messages", "/messages.html").authenticated();
                
                // Админские ресурсы
                auth.requestMatchers("/api/admin/**").hasRole("ADMIN");
                auth.requestMatchers("/admin/**").hasRole("ADMIN");
                
                // Модераторские ресурсы (доступны и админам)
                auth.requestMatchers("/api/moderator/**").hasAnyRole("ADMIN", "MODERATOR");
                auth.requestMatchers("/moderator/**").hasAnyRole("ADMIN", "MODERATOR");
                
                // Все остальные запросы требуют аутентификации
                auth.anyRequest().authenticated();
            });
        
        // Удаляем временный фильтр пользователя, так как теперь мы используем правильную аутентификацию
        // http.addFilterBefore(temporaryUserFilter(), UsernamePasswordAuthenticationFilter.class);
        
        // Добавляем JWT фильтр
        http.addFilterBefore(authenticationJwtTokenFilter(), UsernamePasswordAuthenticationFilter.class);
        
        logger.info("Security filter chain configuration completed");
        
        return http.build();
    }
} 