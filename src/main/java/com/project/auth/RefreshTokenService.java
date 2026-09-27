package com.project.auth;

import com.project.common.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.HexFormat;
import java.util.UUID;

/**
 * Manages persistent refresh tokens.
 *
 * <p>Security properties:</p>
 * <ul>
 *   <li>Tokens are 256-bit secure-random values (opaque, not JWTs).</li>
 *   <li>Only the SHA-256 hash is persisted — the raw token is returned once to
 *       the client and never stored.</li>
 *   <li>Validation checks existence, expiry, revocation, and that the owning
 *       account is still active — refresh tokens are never blindly trusted.</li>
 *   <li>Presenting a revoked token (e.g. an old one after rotation) is treated
 *       as potential token theft: all of that user's refresh tokens are revoked.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class RefreshTokenService {

    private static final int TOKEN_BYTES = 32; // 256 bits of entropy
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final RefreshTokenRepository refreshTokenRepository;
    private final JwtProperties jwtProperties;

    /**
     * Creates a new refresh token for the user.
     *
     * @return the raw token value to hand to the client (stored only as a hash)
     */
    @Transactional
    public String create(com.project.user.User user) {
        byte[] raw = new byte[TOKEN_BYTES];
        SECURE_RANDOM.nextBytes(raw);
        String rawToken = java.util.Base64.getUrlEncoder().withoutPadding().encodeToString(raw);

        RefreshToken entity = RefreshToken.builder()
                .user(user)
                .tokenHash(sha256Hex(rawToken))
                .expiresAt(Instant.now().plus(jwtProperties.refreshTokenTtl()))
                .build();
        refreshTokenRepository.save(entity);
        return rawToken;
    }

    /**
     * Validates a raw refresh token presented by a client.
     *
     * @return the stored, still-active token
     * @throws UnauthorizedException when the token is unknown, expired, revoked
     *                               (also revoking the user's remaining tokens),
     *                               or the owning account is inactive
     */
    @Transactional
    public RefreshToken validate(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }
        RefreshToken token = refreshTokenRepository.findByTokenHash(sha256Hex(rawToken))
                .orElseThrow(() -> new UnauthorizedException("Invalid or expired refresh token"));

        if (token.isRevoked()) {
            // Reuse of an already-rotated/revoked token suggests theft: kill the whole family.
            revokeAllForUser(token.getUser().getId());
            throw new UnauthorizedException("Invalid or expired refresh token");
        }
        if (token.isExpired()) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }
        if (!token.getUser().isActive()) {
            throw new UnauthorizedException("Invalid or expired refresh token");
        }
        return token;
    }

    /**
     * Marks a single token as revoked (used during rotation).
     */
    @Transactional
    public void revoke(RefreshToken token) {
        if (token.getRevokedAt() == null) {
            token.setRevokedAt(Instant.now());
            refreshTokenRepository.save(token);
        }
    }

    /**
     * Revokes every active refresh token of a user (logout / theft response).
     */
    @Transactional
    public void revokeAllForUser(UUID userId) {
        Instant now = Instant.now();
        refreshTokenRepository.findAllByUser_IdAndRevokedAtIsNull(userId)
                .forEach(token -> {
                    token.setRevokedAt(now);
                    refreshTokenRepository.save(token);
                });
    }

    private String sha256Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return HexFormat.of().formatHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            // SHA-256 is mandatory on every supported JDK; this cannot happen.
            throw new IllegalStateException("SHA-256 algorithm unavailable", e);
        }
    }
}