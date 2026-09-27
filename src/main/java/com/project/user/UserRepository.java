package com.project.user;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

/**
 * Data access for {@link User} accounts.
 *
 * <p>{@code email} is stored lower-cased by the {@link UserService} layer, so the
 * exact-match queries below are effectively case-insensitive for email. Usernames
 * are unique and matched exactly.</p>
 */
public interface UserRepository extends JpaRepository<User, UUID> {

    Optional<User> findByEmail(String email);

    Optional<User> findByUsername(String username);

    boolean existsByEmail(String email);

    boolean existsByUsername(String username);
}