package com.project.auth;

import com.project.user.User;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;

/**
 * Issues and validates stateless JWT access tokens (HMAC-SHA256).
 *
 * <p>The token carries only what clients and the {@code JwtAuthenticationFilter}
 * need: subject (user id), username, role, plus standard {@code iss}/{@code iat}/
 * {@code exp} claims. No email, no password-derived data.</p>
 *
 * <p>The signing secret comes exclusively from environment configuration
 * ({@code JWT_SECRET}); the service refuses to start when it is missing or too
 * short for HMAC-SHA256 (min 256 bits).</p>
 */
@Slf4j
@Service
public class JwtService {

    private final SecretKey signingKey;
    private final String issuer;
    private final Duration accessTokenTtl;

    public JwtService(JwtProperties properties) {
        byte[] secretBytes = properties.secret() == null
                ? new byte[0]
                : properties.secret().getBytes(StandardCharsets.UTF_8);
        if (secretBytes.length < 32) {
            throw new IllegalStateException(
                    "jwt.secret must be at least 32 characters (256 bits) for HMAC-SHA256. "
                            + "Set the JWT_SECRET environment variable to a long random value.");
        }
        this.signingKey = Keys.hmacShaKeyFor(secretBytes);
        this.issuer = properties.issuer();
        this.accessTokenTtl = properties.accessTokenTtl();
    }

    /**
     * Creates an access token for the given user with the configured TTL.
     */
    public String generateAccessToken(User user) {
        return generateAccessToken(user, Instant.now(), accessTokenTtl);
    }

    /**
     * Creates an access token with an explicit issue time and TTL.
     *
     * <p>The extra parameters exist so tests can mint already-expired tokens
     * and verify rejection behaviour end-to-end.</p>
     */
    public String generateAccessToken(User user, Instant issuedAt, Duration ttl) {
        Instant expiresAt = issuedAt.plus(ttl);
        return Jwts.builder()
                .issuer(issuer)
                .subject(user.getId().toString())
                .claim("username", user.getUsername())
                .claim("role", user.getRole().name())
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(expiresAt))
                .signWith(signingKey, Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Parses and verifies a signed access token.
     *
     * @return the verified claims (subject = user id)
     * @throws ExpiredJwtException   when the token is past its expiry
     * @throws JwtException          when the token is malformed or the signature fails
     * @throws IllegalArgumentException when the token is null/empty
     */
    public Claims parseAccessToken(String token) {
        return Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(issuer)
                .build()
                .parseSignedClaims(token)
                .getPayload();
    }

    /**
     * Access-token lifetime in whole seconds — returned to clients as
     * {@code expiresIn} so they know when to schedule a refresh.
     */
    public long accessTokenTtlSeconds() {
        return accessTokenTtl.toSeconds();
    }

    /**
     * Access-token lifetime.
     */
    public Duration accessTokenTtl() {
        return accessTokenTtl;
    }
}