package com.project.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

/**
 * JWT authentication settings, bound from the {@code jwt.*} configuration
 * namespace.
 *
 * <p>The signing secret is injected from the {@code JWT_SECRET} environment
 * variable (see {@code application.yml} and {@code .env.example}) — it is never
 * hardcoded for production use. HMAC-SHA256 requires at least 32 bytes
 * (256 bits) of key material; {@link JwtService} fails fast at startup when the
 * configured secret is too short.</p>
 *
 * @param secret          HMAC-SHA256 signing secret (min 32 characters)
 * @param issuer          {@code iss} claim value identifying this service
 * @param accessTokenTtl  access-token lifetime (e.g. {@code 15m})
 * @param refreshTokenTtl refresh-token lifetime (e.g. {@code 7d})
 */
@ConfigurationProperties(prefix = "jwt")
public record JwtProperties(
        String secret,
        String issuer,
        Duration accessTokenTtl,
        Duration refreshTokenTtl) {
}