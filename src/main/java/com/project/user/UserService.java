package com.project.user;

import com.project.common.exception.BusinessException;
import com.project.user.dto.CreateUserRequest;
import com.project.user.dto.UserResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.validation.annotation.Validated;

import java.util.Locale;
import java.util.Optional;

/**
 * Application service for managing user accounts.
 *
 * <p>Exposes the operations the future {@code auth} module needs:
 * account creation, lookups by unique key, and availability checks.
 * Passwords are hashed with Spring Security's {@link PasswordEncoder}
 * (BCrypt) before being persisted — never stored in plaintext.</p>
 *
 * <p><strong>Authentication rule:</strong> once authentication lands, only accounts
 * with {@link User#isActive()} {@code == true} may sign in. This flag is set during
 * creation and can be cleared by administrative flows to disable an account.</p>
 *
 * <p>Business rules enforced here:
 * <ul>
 *   <li>duplicate email → {@link BusinessException}</li>
 *   <li>duplicate username → {@link BusinessException}</li>
 *   <li>email uniqueness is case-insensitive (stored lower-cased)</li>
 * </ul>
 */
@Service
@Validated
@RequiredArgsConstructor
public class UserService {

    private static final String DEFAULT_PREFERRED_LANGUAGE = "en";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    /**
     * Creates a new user account.
     *
     * <p>Validates the request, normalizes the email to lower-case, rejects
     * duplicate email/username with a {@link BusinessException}, hashes the
     * password with BCrypt, and persists the account.</p>
     *
     * @param request validated creation payload
     * @return public view of the created account (never contains the password)
     */
    @Transactional
    public UserResponse createUser(@Valid CreateUserRequest request) {
        String normalizedEmail = normalizeEmail(request.email());
        String normalizedUsername = request.username().trim();

        if (userRepository.existsByEmail(normalizedEmail)) {
            throw new BusinessException("A user with email '" + normalizedEmail + "' already exists");
        }
        if (userRepository.existsByUsername(normalizedUsername)) {
            throw new BusinessException("A user with username '" + normalizedUsername + "' already exists");
        }

        User user = User.builder()
                .username(normalizedUsername)
                .email(normalizedEmail)
                .password(passwordEncoder.encode(request.password()))
                .displayName(trimToNull(request.displayName()))
                .role(request.role() != null ? request.role() : UserRole.USER)
                .preferredLanguage(request.preferredLanguage() != null
                        ? request.preferredLanguage()
                        : DEFAULT_PREFERRED_LANGUAGE)
                .build();

        // saveAndFlush so the UUID id / timestamps are generated and database
        // unique constraints are enforced now, not at transaction commit — the
        // returned DTO always carries a populated id and duplicates fail fast.
        return toResponse(userRepository.saveAndFlush(user));
    }

    /**
     * Finds an active-or-inactive account by its email (case-insensitive).
     */
    @Transactional(readOnly = true)
    public Optional<UserResponse> findByEmail(String email) {
        return userRepository.findByEmail(normalizeEmail(email)).map(this::toResponse);
    }

    /**
     * Finds an account by its exact unique username.
     */
    @Transactional(readOnly = true)
    public Optional<UserResponse> findByUsername(String username) {
        if (username == null) {
            return Optional.empty();
        }
        return userRepository.findByUsername(username.trim()).map(this::toResponse);
    }

    /**
     * Returns {@code true} when no account uses the given email yet.
     */
    @Transactional(readOnly = true)
    public boolean isEmailAvailable(String email) {
        return !userRepository.existsByEmail(normalizeEmail(email));
    }

    /**
     * Returns {@code true} when no account uses the given username yet.
     */
    @Transactional(readOnly = true)
    public boolean isUsernameAvailable(String username) {
        return username != null && !userRepository.existsByUsername(username.trim());
    }

    private String normalizeEmail(String email) {
        return email == null ? null : email.trim().toLowerCase(Locale.ROOT);
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private UserResponse toResponse(User user) {
        return UserResponse.from(user);
    }
}