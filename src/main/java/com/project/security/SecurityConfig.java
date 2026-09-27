package com.project.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

/**
 * Security configuration for the stateless JWT architecture.
 *
 * <p>Public endpoints: registration, login, token refresh, actuator health/info,
 * and the OpenAPI/Swagger docs. Everything else — including every current and
 * future {@code /api/**} route — requires a valid Bearer access token.</p>
 *
 * <p>Form login, HTTP basic auth, servlet sessions, CSRF, and the container
 * logout mechanism are all disabled; authentication is performed exclusively by
 * {@link JwtAuthenticationFilter} and failures are answered with the standard
 * JSON error contract by {@link JwtAuthEntryPoint} (401) and
 * {@link JwtAccessDeniedHandler} (403).</p>
 */
@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    private final JwtAuthEntryPoint authenticationEntryPoint;
    private final JwtAccessDeniedHandler accessDeniedHandler;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable)
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(authenticationEntryPoint)
                        .accessDeniedHandler(accessDeniedHandler))
                .authorizeHttpRequests(authorize -> authorize
                        // Browser CORS preflight: no credentials are attached, so
                        // OPTIONS must never hit the authentication rules. Actual
                        // CORS headers are written by CorsConfig's CorsFilter.
                        .requestMatchers(HttpMethod.OPTIONS, "/**")
                        .permitAll()
                        // --- Authentication endpoints anyone may call ---
                        .requestMatchers(HttpMethod.POST,
                                "/api/auth/register",
                                "/api/auth/login",
                                "/api/auth/refresh")
                        .permitAll()
                        // --- Operations & docs ---
                        .requestMatchers(
                                "/api/health",
                                // Read-only pipeline status (translation provider / AI service
                                // reachability). Exposes no credential and performs no
                                // translation; used by local health checks and the UI.
                                "/api/health/**",
                                "/actuator/health/**",
                                "/actuator/info",
                                "/v3/api-docs/**",
                                "/swagger-ui/**",
                                "/swagger-ui.html",
                                "/error")
                        .permitAll()
                        // --- Language administration: ADMIN role only ---
                        .requestMatchers("/api/admin/**")
                        .hasRole("ADMIN")
                        // --- Everything else (incl. /api/languages/**,
                        //     /api/auth/me, /api/auth/logout and all future
                        //     /api/** modules) requires authentication ---
                        .anyRequest()
                        .authenticated())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    /**
     * Authenticates login requests against the database:
     * {@link DatabaseUserDetailsService} loads the account and BCrypt verifies
     * the password. Unknown users are reported as bad credentials, never as
     * "user does not exist".
     */
    @Bean
    public AuthenticationManager authenticationManager(
            UserDetailsService userDetailsService, PasswordEncoder passwordEncoder) {
        DaoAuthenticationProvider provider = new DaoAuthenticationProvider(userDetailsService);
        provider.setPasswordEncoder(passwordEncoder);
        return new ProviderManager(provider);
    }

    /**
     * BCrypt encoder used to hash all user passwords before persistence and to
     * verify them at sign-in time. Plaintext passwords are never stored.
     */
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}