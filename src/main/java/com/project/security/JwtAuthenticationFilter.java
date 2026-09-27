package com.project.security;

import com.project.auth.JwtService;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpHeaders;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

/**
 * Authenticates requests carrying a {@code Authorization: Bearer <JWT>} header.
 *
 * <p>On every request the token is verified (signature, expiry, issuer) and the
 * account behind the {@code sub} claim is re-loaded from the database. This keeps
 * the filter stateless while still blocking accounts that were deactivated after
 * the token was issued.</p>
 *
 * <p>On any token problem the security context is simply left empty; protected
 * endpoints then receive a 401 from {@link JwtAuthEntryPoint}, while public
 * endpoints keep working. The specific failure reason is stashed as a request
 * attribute so the entry point can surface a helpful (non-sensitive) message.</p>
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    /** Request attribute under which the filter stores a non-sensitive failure reason. */
    public static final String AUTH_ERROR_ATTRIBUTE = JwtAuthenticationFilter.class.getName() + ".authError";

    private final JwtService jwtService;
    private final DatabaseUserDetailsService userDetailsService;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(7).trim();
        try {
            Claims claims = jwtService.parseAccessToken(token);
            UUID userId = UUID.fromString(claims.getSubject());

            UserDetails principal = userDetailsService.loadByUserId(userId).orElse(null);
            if (principal != null && principal.isEnabled()) {
                UsernamePasswordAuthenticationToken authentication =
                        UsernamePasswordAuthenticationToken.authenticated(
                                principal, token, principal.getAuthorities());
                authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                SecurityContextHolder.getContext().setAuthentication(authentication);
            } else {
                // Valid token, but the account no longer exists or was deactivated.
                request.setAttribute(AUTH_ERROR_ATTRIBUTE, "Account is no longer active");
                SecurityContextHolder.clearContext();
            }
        } catch (JwtException | IllegalArgumentException ex) {
            log.debug("Rejected JWT for {} {}: {}", request.getMethod(), request.getRequestURI(), ex.getClass().getSimpleName());
            request.setAttribute(AUTH_ERROR_ATTRIBUTE, "Invalid or expired authentication token");
            SecurityContextHolder.clearContext();
        }

        filterChain.doFilter(request, response);
    }
}