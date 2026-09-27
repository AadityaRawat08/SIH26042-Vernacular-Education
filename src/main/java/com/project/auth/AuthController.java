package com.project.auth;

import com.project.auth.dto.AuthResponse;
import com.project.auth.dto.LoginRequest;
import com.project.auth.dto.RefreshTokenRequest;
import com.project.auth.dto.RegisterRequest;
import com.project.common.dto.ApiResponse;
import com.project.security.UserPrincipal;
import com.project.user.dto.UserResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/**
 * Authentication endpoints: registration, login, token refresh, logout, and
 * current-user lookup.
 *
 * <p>Register, login and refresh are public; {@code /me} and {@code /logout}
 * require a valid Bearer access token (see {@code SecurityConfig}).</p>
 */
@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Authentication", description = "User registration, login, JWT refresh and session management")
public class AuthController {

    private final AuthenticationService authenticationService;

    /**
     * POST /api/auth/register — creates an account (role forced to USER).
     */
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a new user account",
            description = "Creates an active USER account. Passwords are stored as BCrypt hashes "
                    + "and never appear in responses.")
    public ApiResponse<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.of("Registration successful", authenticationService.register(request));
    }

    /**
     * POST /api/auth/login — verifies credentials, returns access + refresh tokens.
     */
    @PostMapping("/login")
    @Operation(summary = "Log in with email and password",
            description = "Returns a JWT access token, a rotating refresh token, and the safe user view. "
                    + "Failures always return the same generic 401 message for unknown emails, wrong "
                    + "passwords, and deactivated accounts.")
    public ApiResponse<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.of("Login successful", authenticationService.login(request));
    }

    /**
     * POST /api/auth/refresh — exchanges a valid refresh token for a new pair.
     */
    @PostMapping("/refresh")
    @Operation(summary = "Refresh the access token",
            description = "Rotates the refresh token: the presented token is revoked and a new pair is "
                    + "issued. Reusing an already-rotated token revokes all of the user's refresh tokens.")
    public ApiResponse<AuthResponse> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ApiResponse.of("Token refreshed", authenticationService.refresh(request));
    }

    /**
     * POST /api/auth/logout — revokes all of the caller's refresh tokens.
     */
    @PostMapping("/logout")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Log out",
            description = "Requires a valid access token. Revokes all of the user's refresh tokens so no "
                    + "new access tokens can be issued. The presented JWT access token cannot be revoked "
                    + "server-side and simply expires within JWT_ACCESS_TOKEN_TTL.")
    public ApiResponse<Void> logout(@AuthenticationPrincipal UserPrincipal principal) {
        authenticationService.logout(principal);
        return ApiResponse.of("Logged out successfully", null);
    }

    /**
     * GET /api/auth/me — returns the authenticated user's safe profile.
     */
    @GetMapping("/me")
    @SecurityRequirement(name = "bearerAuth")
    @Operation(summary = "Get the current authenticated user",
            description = "Requires a valid Bearer access token. Returns the safe user view (never the password).")
    public ApiResponse<UserResponse> me(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.of(authenticationService.currentUser(principal));
    }
}