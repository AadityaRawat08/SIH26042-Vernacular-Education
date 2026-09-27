package com.project.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.filter.CorsFilter;

import java.util.Arrays;
import java.util.List;

/**
 * CORS configuration for the browser-based frontend.
 *
 * <p>The Spring Boot 3.5 auto-configuration ships without a CORS filter, so the
 * filter is registered explicitly here. Origins are read from
 * {@code cors.allowed-origins} ({@code CORS_ALLOWED_ORIGINS} env var) as a
 * comma-separated list; the default matches the frontend development server
 * (see {@code FrontEnd/vite.config.ts} — http://localhost:5173).
 *
 * <p>Security remains intact: only the configured origins are reflected,
 * credentials (cookies) are not allowed because the client authenticates with
 * an {@code Authorization: Bearer <JWT>} header, and preflight requests carry
 * no token so Spring Security's {@code OPTIONS} permitAll never weakens a
 * protected resource.</p>
 */
@Configuration
public class CorsConfig {

    /** Prefix applied to every API route so CORS never leaks to non-API paths. */
    private static final String[] CORS_PATHS = {"/api/**", "/actuator/**"};

    @Bean
    public FilterRegistrationBean<CorsFilter> corsFilter(
            @Value("${cors.allowed-origins:http://localhost:5173}") String allowedOrigins) {
        List<String> origins = Arrays.stream(allowedOrigins.split(","))
                .map(String::trim)
                .filter(origin -> !origin.isEmpty())
                .toList();
        if (origins.isEmpty()) {
            throw new IllegalArgumentException(
                    "cors.allowed-origins must list at least one origin (e.g. http://localhost:5173)");
        }

        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(origins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setExposedHeaders(List.of("Location"));
        // No cookies/sessions: the client sends a Bearer token header.
        configuration.setAllowCredentials(false);
        configuration.setMaxAge(3600L);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        for (String path : CORS_PATHS) {
            source.registerCorsConfiguration(path, configuration);
        }
        // Registered with the highest precedence so the filter runs BEFORE the
        // Spring Security FilterChainProxy (order -100). Otherwise a 401/403
        // response committed by the security chain would leave the response
        // without CORS headers and the browser could not read the error.
        FilterRegistrationBean<CorsFilter> registration = new FilterRegistrationBean<>(new CorsFilter(source));
        registration.setOrder(Ordered.HIGHEST_PRECEDENCE);
        return registration;
    }
}