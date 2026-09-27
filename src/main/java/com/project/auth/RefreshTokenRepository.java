package com.project.auth;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository for persistent {@link RefreshToken}s.
 */
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, UUID> {

    /**
     * Resolves a stored token by the SHA-256 hash of its raw value.
     */
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    /**
     * All not-yet-revoked tokens belonging to a user (used by logout and
     * token-theft revocation). Expired entries are harmlessly included; they
     * are inactive regardless.
     */
    java.util.List<RefreshToken> findAllByUser_IdAndRevokedAtIsNull(UUID userId);
}