package com.project.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.Instant;
import java.util.UUID;

/**
 * Application user account.
 *
 * <p>Accounts are the foundation of the {@code auth} module: authentication later
 * reads users through {@link UserRepository}/{@link UserService}, verifies the
 * password against the stored {@link #password} BCrypt hash, and refuses login
 * for accounts where {@link #isActive} is {@code false}.
 *
 * <p><strong>Security:</strong> {@link #password} holds a BCrypt hash, never a
 * plaintext value, and must never appear in any API response (DTOs like
 * {@code UserResponse} deliberately exclude it).</p>
 */
@Entity
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_users_username", columnNames = "username"),
                @UniqueConstraint(name = "uk_users_email", columnNames = "email")
        })
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(updatable = false, nullable = false)
    private UUID id;

    @Column(nullable = false, length = 50)
    private String username;

    @Column(nullable = false, length = 254)
    private String email;

    /**
     * BCrypt hash of the user's password.
     *
     * <p>Never return this through API responses; only used by the
     * authentication flow to verify credentials via Spring Security's
     * {@code PasswordEncoder}.</p>
     */
    @Column(name = "password_hash", nullable = false, length = 100)
    private String password;

    @Column(name = "display_name", length = 100)
    private String displayName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private UserRole role = UserRole.USER;

    /**
     * ISO 639-1 language code, e.g. {@code en}, {@code hi}, {@code ta}.
     *
     * <p>Deliberately stored as the standard <em>code</em> rather than a foreign
     * key to the {@code languages} table: this keeps the user/auth module
     * decoupled from language reference data, and the value is directly portable
     * (it matches {@code languages.code} seeded by {@code LanguageDataInitializer}).
     * User-facing responses expose the same code.</p>
     */
    @Column(name = "preferred_language", nullable = false, length = 16)
    @Builder.Default
    private String preferredLanguage = "en";

    /** Whether the account may authenticate. Frozen accounts are soft-deactivated with this flag. */
    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
}