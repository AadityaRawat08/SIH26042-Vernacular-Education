package com.project.auth;

import com.project.auth.dto.AuthResponse;
import com.project.common.exception.BusinessException;
import com.project.common.exception.UnauthorizedException;
import com.project.security.UserPrincipal;
import com.project.user.User;
import com.project.user.UserRepository;
import com.project.user.UserRole;
import com.project.user.dto.UserResponse;
import io.jsonwebtoken.ExpiredJwtException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Full-context integration tests for the authentication service against the
 * in-memory PostgreSQL-compatible database (H2 in PostgreSQL mode).
 *
 * <p>Covers registration rules, BCrypt hashing, the no-account-enumeration
 * login contract, JWT expiry, refresh-token rotation with reuse detection, and
 * logout revocation.</p>
 */
@SpringBootTest
@Transactional
class AuthServiceIntegrationTest {

    private static final String GENERIC_401 = "Invalid email or password";

    @Autowired
    private AuthenticationService authenticationService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private JwtService jwtService;

    private User registerUser(String username) {
        UserResponse response = authenticationService.register(new com.project.auth.dto.RegisterRequest(
                username, username + "@example.com", "Str0ngPass!x", "Display " + username, "en"));
        return userRepository.findById(response.id()).orElseThrow();
    }

    // --- Registration ---------------------------------------------------------

    @Test
    void register_hashesPasswordAndAppliesDefaults() {
        registerUser("maya");

        User user = userRepository.findByEmail("maya@example.com").orElseThrow();
        assertThat(user.getPassword())
                .startsWith("$2")
                .doesNotContain("Str0ngPass!x"); // never the plaintext
        assertThat(user.getRole()).isEqualTo(UserRole.USER);
        assertThat(user.isActive()).isTrue();
        assertThat(user.getCreatedAt()).isNotNull();
    }

    @Test
    void register_duplicateEmail_throws() {
        registerUser("maya");
        assertThatThrownBy(() -> authenticationService.register(new com.project.auth.dto.RegisterRequest(
                "other", "maya@example.com", "Str0ngPass!x", null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("email")
                .hasMessageContaining("already exists");
    }

    @Test
    void register_duplicateUsername_throws() {
        registerUser("maya");
        assertThatThrownBy(() -> authenticationService.register(new com.project.auth.dto.RegisterRequest(
                "maya", "other@example.com", "Str0ngPass!x", null, null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("username")
                .hasMessageContaining("already exists");
    }

    // --- Login --------------------------------------------------------------

    @Test
    void login_success_returnsTokensAndSafeUser() {
        registerUser("maya");

        AuthResponse response = authenticationService.login(
                new com.project.auth.dto.LoginRequest("MAYA@example.com", "Str0ngPass!x"));

        assertThat(response.accessToken()).isNotBlank();
        assertThat(response.refreshToken()).isNotBlank();
        assertThat(response.tokenType()).isEqualTo("Bearer");
        assertThat(response.expiresIn()).isEqualTo(jwtService.accessTokenTtlSeconds());
        assertThat(response.user().username()).isEqualTo("maya");
        assertThat(response.user().email()).isEqualTo("maya@example.com");
    }

    @Test
    void login_wrongPassword_throwsGenericError() {
        registerUser("maya");
        assertThatThrownBy(() -> authenticationService.login(
                new com.project.auth.dto.LoginRequest("maya@example.com", "wrong-password")))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage(GENERIC_401);
    }

    @Test
    void login_unknownEmail_throwsSameGenericErrorAsWrongPassword() {
        registerUser("maya");
        // Unknown email must be indistinguishable from a wrong password.
        assertThatThrownBy(() -> authenticationService.login(
                new com.project.auth.dto.LoginRequest("ghost@example.com", "whatever-pass")))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage(GENERIC_401);
    }

    @Test
    void login_inactiveUser_throwsGenericError() {
        registerUser("maya");
        User user = userRepository.findByEmail("maya@example.com").orElseThrow();
        user.setActive(false);

        assertThatThrownBy(() -> authenticationService.login(
                new com.project.auth.dto.LoginRequest("maya@example.com", "Str0ngPass!x")))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessage(GENERIC_401);
    }

    // --- JWT ----------------------------------------------------------------

    @Test
    void expiredAccessToken_isRejectedByParser() {
        User user = registerUser("maya");
        String expiredToken = jwtService.generateAccessToken(
                user, Instant.now().minus(Duration.ofHours(2)), Duration.ofSeconds(30));

        assertThatThrownBy(() -> jwtService.parseAccessToken(expiredToken))
                .isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    void validAccessToken_parsesToExpectedClaims() {
        User user = registerUser("maya");

        var claims = jwtService.parseAccessToken(jwtService.generateAccessToken(user));

        assertThat(claims.getSubject()).isEqualTo(user.getId().toString());
        assertThat(claims.get("username", String.class)).isEqualTo("maya");
        assertThat(claims.get("role", String.class)).isEqualTo("USER");
        assertThat(claims.getIssuer()).isNotBlank();
        // No sensitive claims beyond identity/role.
        assertThat(claims.entrySet())
                .noneMatch(entry -> entry.getKey().toLowerCase().contains("password"));
    }

    // --- Refresh & logout ---------------------------------------------------

    @Test
    void refresh_rotatesTokens_andReuseOfOldTokenRevokesTheFamily() {
        registerUser("maya");
        AuthResponse first = authenticationService.login(
                new com.project.auth.dto.LoginRequest("maya@example.com", "Str0ngPass!x"));

        AuthResponse second = authenticationService.refresh(
                new com.project.auth.dto.RefreshTokenRequest(first.refreshToken()));
        assertThat(second.refreshToken()).isNotEqualTo(first.refreshToken());
        assertThat(second.accessToken()).isNotBlank();

        // Replaying the already-rotated token is treated as token theft.
        assertThatThrownBy(() -> authenticationService.refresh(
                new com.project.auth.dto.RefreshTokenRequest(first.refreshToken())))
                .isInstanceOf(UnauthorizedException.class);

        // ... and the replacement token is dead too.
        assertThatThrownBy(() -> authenticationService.refresh(
                new com.project.auth.dto.RefreshTokenRequest(second.refreshToken())))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void refresh_withGarbageToken_throws() {
        assertThatThrownBy(() -> authenticationService.refresh(
                new com.project.auth.dto.RefreshTokenRequest("not-a-real-token")))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void logout_revokesAllRefreshTokens() {
        registerUser("maya");
        AuthResponse session = authenticationService.login(
                new com.project.auth.dto.LoginRequest("maya@example.com", "Str0ngPass!x"));
        User user = userRepository.findByEmail("maya@example.com").orElseThrow();

        authenticationService.logout(new UserPrincipal(user));

        assertThatThrownBy(() -> authenticationService.refresh(
                new com.project.auth.dto.RefreshTokenRequest(session.refreshToken())))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void currentUser_returnsSafeView() {
        User user = registerUser("maya");

        UserResponse me = authenticationService.currentUser(new UserPrincipal(user));

        assertThat(me.id()).isEqualTo(user.getId());
        assertThat(me.username()).isEqualTo("maya");
        assertThat(me.isActive()).isTrue();
    }
}