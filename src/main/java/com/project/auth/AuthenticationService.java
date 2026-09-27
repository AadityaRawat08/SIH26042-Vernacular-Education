package com.project.auth;

import com.project.auth.dto.AuthResponse;
import com.project.auth.dto.LoginRequest;
import com.project.auth.dto.RefreshTokenRequest;
import com.project.auth.dto.RegisterRequest;
import com.project.common.exception.UnauthorizedException;
import com.project.security.UserPrincipal;
import com.project.user.UserService;
import com.project.user.dto.CreateUserRequest;
import com.project.user.dto.UserResponse;
import com.project.user.User;
import com.project.user.UserRole;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

/**
 * Authentication service orchestrating registration, login, token refresh, and
 * logout.
 *
 * <p>Password verification is delegated to Spring Security's
 * {@link AuthenticationManager} backed by {@code DaoAuthenticationProvider} +
 * BCrypt. Login failures always produce the same generic
 * {@link UnauthorizedException} — for unknown emails, wrong passwords, and
 * deactivated accounts alike — so the API never reveals whether an email
 * address is registered.</p>
 *
 * <p>Refresh tokens are persisted (hashed) and rotated on every refresh; see
 * {@link RefreshTokenService} for the theft-detection rules.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AuthenticationService {

    private final UserService userService;
    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenService refreshTokenService;

    /**
     * Registers a new account.
     *
     * <p>Role is forced to {@link UserRole#USER} regardless of client input, and
     * the account starts active. Passwords are BCrypt-hashed by
     * {@link UserService} before persistence.</p>
     *
     * @return the safe public view of the created account
     * @throws com.project.common.exception.BusinessException on duplicate email/username (HTTP 422)
     */
    @Transactional
    public UserResponse register(RegisterRequest request) {
        CreateUserRequest createRequest = new CreateUserRequest(
                request.username(),
                request.email(),
                request.password(),
                request.displayName(),
                UserRole.USER,
                request.preferredLanguage());
        UserResponse created = userService.createUser(createRequest);
        log.info("Registered new account: userId={}, username={}", created.id(), created.username());
        return created;
    }

    /**
     * Verifies credentials and issues a new access + refresh token pair.
     *
     * @throws UnauthorizedException with a generic message for unknown emails,
     *                               wrong passwords, and deactivated accounts
     */
    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = request.email() == null ? null : request.email().trim().toLowerCase(Locale.ROOT);
        try {
            var authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, request.password()));
            UserPrincipal principal = (UserPrincipal) authentication.getPrincipal();
            User user = principal.getUser();
            log.info("Login successful: userId={}", user.getId());
            return buildAuthResponse(user);
        } catch (AuthenticationException ex) {
            // BadCredentials (incl. hidden UsernameNotFound) and Disabled (inactive
            // account) all map to the SAME generic message — no existence leak.
            log.warn("Login rejected for email={}: {}", email, ex.getClass().getSimpleName());
            throw new UnauthorizedException("Invalid email or password");
        }
    }

    /**
     * Exchanges a valid refresh token for a fresh token pair (rotation: the
     * presented token is revoked and a new one issued).
     *
     * @throws UnauthorizedException for unknown/expired/revoked tokens, reused
     *                               (rotated) tokens — which also revokes the
     *                               user's remaining tokens — or deactivated accounts
     */
    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        RefreshToken stored = refreshTokenService.validate(request.refreshToken());
        refreshTokenService.revoke(stored);
        String rawRefreshToken = refreshTokenService.create(stored.getUser());
        log.info("Refreshed tokens for userId={}", stored.getUser().getId());
        return buildAuthResponse(stored.getUser(), rawRefreshToken);
    }

    /**
     * Logs the authenticated user out by revoking all of their refresh tokens.
     *
     * <p>Honest limitation: stateless JWT <em>access</em> tokens cannot be
     * revoked server-side; after logout they remain valid until they expire
     * (at most {@code JWT_ACCESS_TOKEN_TTL}). Revoking every refresh token
     * guarantees no new access tokens can be obtained.</p>
     */
    @Transactional
    public void logout(UserPrincipal principal) {
        refreshTokenService.revokeAllForUser(principal.getId());
        log.info("Logout: all refresh tokens revoked for userId={}", principal.getId());
    }

    /**
     * Returns the safe public view of the currently authenticated account.
     */
    @Transactional(readOnly = true)
    public UserResponse currentUser(UserPrincipal principal) {
        return UserResponse.from(principal.getUser());
    }

    private AuthResponse buildAuthResponse(User user) {
        return buildAuthResponse(user, refreshTokenService.create(user));
    }

    private AuthResponse buildAuthResponse(User user, String refreshToken) {
        return new AuthResponse(
                jwtService.generateAccessToken(user),
                refreshToken,
                "Bearer",
                jwtService.accessTokenTtlSeconds(),
                UserResponse.from(user));
    }
}