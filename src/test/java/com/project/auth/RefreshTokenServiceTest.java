package com.project.auth;

import com.project.common.exception.UnauthorizedException;
import com.project.user.User;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the refresh-token lifecycle: hashing, validation, and
 * revocation rules (including reuse detection).
 */
@ExtendWith(MockitoExtension.class)
class RefreshTokenServiceTest {

    @Mock
    private RefreshTokenRepository refreshTokenRepository;

    private RefreshTokenService refreshTokenService;
    private User user;

    @BeforeEach
    void setUp() {
        JwtProperties properties = new JwtProperties(
                "unit-test-only-secret-key-not-valid-in-any-environment-0123456789",
                "prototype-backend-test",
                Duration.ofMinutes(15),
                Duration.ofDays(7));
        refreshTokenService = new RefreshTokenService(refreshTokenRepository, properties);
        user = User.builder()
                .username("maya")
                .email("maya@example.com")
                .password("$2a$10$somehash")
                .build();
        user.setId(UUID.randomUUID());
        user.setActive(true);
    }

    @Test
    void create_persistsOnlyHashAndReturnsRawToken() {
        String rawToken = refreshTokenService.create(user);

        ArgumentCaptor<RefreshToken> captor = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokenRepository).save(captor.capture());
        RefreshToken saved = captor.getValue();

        assertThat(rawToken).isNotBlank();
        assertThat(saved.getUser()).isEqualTo(user);
        // SHA-256 hex digest: 64 hex characters, never the raw token itself.
        assertThat(saved.getTokenHash()).hasSize(64).matches("[0-9a-f]{64}");
        assertThat(saved.getTokenHash()).isNotEqualTo(rawToken);
        assertThat(saved.getRevokedAt()).isNull();
        assertThat(saved.getExpiresAt()).isAfter(Instant.now().plus(Duration.ofDays(6)));
    }

    @Test
    void validate_unknownToken_throwsUnauthorized() {
        when(refreshTokenRepository.findByTokenHash(anyString()))
                .thenAnswer(inv -> java.util.Optional.<RefreshToken>empty());

        assertThatThrownBy(() -> refreshTokenService.validate("no-such-token"))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Invalid or expired refresh token");
    }

    @Test
    void validate_activeToken_returnsStoredToken() {
        RefreshToken stored = RefreshToken.builder()
                .user(user)
                .tokenHash("a".repeat(64))
                .expiresAt(Instant.now().plus(Duration.ofDays(1)))
                .build();
        when(refreshTokenRepository.findByTokenHash(anyString()))
                .thenReturn(java.util.Optional.of(stored));

        assertThat(refreshTokenService.validate("raw-token-value")).isEqualTo(stored);
    }

    @Test
    void validate_revokedToken_throwsAndRevokesAllUserTokens() {
        RefreshToken reused = RefreshToken.builder()
                .user(user)
                .tokenHash("b".repeat(64))
                .expiresAt(Instant.now().plus(Duration.ofDays(1)))
                .revokedAt(Instant.now().minusSeconds(60))
                .build();
        when(refreshTokenRepository.findByTokenHash(anyString()))
                .thenReturn(java.util.Optional.of(reused));

        assertThatThrownBy(() -> refreshTokenService.validate("raw-token-value"))
                .isInstanceOf(UnauthorizedException.class);
        // Reuse of a revoked token = suspected theft: every token of the user is killed.
        verify(refreshTokenRepository).findAllByUser_IdAndRevokedAtIsNull(user.getId());
    }

    @Test
    void validate_expiredToken_throwsWithoutRevokingOthers() {
        RefreshToken expired = RefreshToken.builder()
                .user(user)
                .tokenHash("c".repeat(64))
                .expiresAt(Instant.now().minusSeconds(60))
                .build();
        when(refreshTokenRepository.findByTokenHash(anyString()))
                .thenReturn(java.util.Optional.of(expired));

        assertThatThrownBy(() -> refreshTokenService.validate("raw-token-value"))
                .isInstanceOf(UnauthorizedException.class);
        verify(refreshTokenRepository, never()).findAllByUser_IdAndRevokedAtIsNull(any());
    }

    @Test
    void validate_tokenOfInactiveUser_throws() {
        user.setActive(false);
        RefreshToken stored = RefreshToken.builder()
                .user(user)
                .tokenHash("d".repeat(64))
                .expiresAt(Instant.now().plus(Duration.ofDays(1)))
                .build();
        when(refreshTokenRepository.findByTokenHash(anyString()))
                .thenReturn(java.util.Optional.of(stored));

        assertThatThrownBy(() -> refreshTokenService.validate("raw-token-value"))
                .isInstanceOf(UnauthorizedException.class);
    }
}