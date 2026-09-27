package com.project.user;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * JPA slice tests for {@link UserRepository}.
 *
 * <p>Runs against the in-memory H2 database in PostgreSQL compatibility mode
 * (see {@code src/test/resources/application.yml}) with {@code create-drop}
 * schema generation, matching the existing project test strategy.</p>
 */
@DataJpaTest
class UserRepositoryTest {

    private static final String PASSWORD_HASH = "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy";

    @Autowired
    private UserRepository userRepository;

    @Test
    void savePersistsUserWithGeneratedIdAndTimestamps() {
        User saved = userRepository.saveAndFlush(testUser("teacher1", "teacher1@example.com"));

        assertThat(saved.getId()).isNotNull();
        assertThat(saved.getCreatedAt()).isNotNull();
        assertThat(saved.getUpdatedAt()).isNotNull();
        assertThat(saved.getRole()).isEqualTo(UserRole.USER);
        assertThat(saved.getPreferredLanguage()).isEqualTo("en");
        assertThat(saved.isActive()).isTrue();
    }

    @Test
    void findByEmailReturnsPersistedUser() {
        userRepository.save(testUser("teacher1", "teacher1@example.com"));

        Optional<User> found = userRepository.findByEmail("teacher1@example.com");

        assertThat(found).isPresent();
        assertThat(found.get().getUsername()).isEqualTo("teacher1");
        assertThat(found.get().getEmail()).isEqualTo("teacher1@example.com");
    }

    @Test
    void findByUsernameReturnsPersistedUser() {
        userRepository.save(testUser("student1", "student1@example.com"));

        Optional<User> found = userRepository.findByUsername("student1");

        assertThat(found).isPresent();
        assertThat(found.get().getEmail()).isEqualTo("student1@example.com");
    }

    @Test
    void findByEmailReturnsEmptyWhenAbsent() {
        Optional<User> found = userRepository.findByEmail("nobody@example.com");

        assertThat(found).isEmpty();
    }

    @Test
    void existsByEmailReflectsStoredState() {
        userRepository.save(testUser("teacher1", "teacher1@example.com"));

        assertThat(userRepository.existsByEmail("teacher1@example.com")).isTrue();
        assertThat(userRepository.existsByEmail("other@example.com")).isFalse();
    }

    @Test
    void existsByUsernameReflectsStoredState() {
        userRepository.save(testUser("student1", "student1@example.com"));

        assertThat(userRepository.existsByUsername("student1")).isTrue();
        assertThat(userRepository.existsByUsername("absent")).isFalse();
    }

    @Test
    void duplicateEmailIsRejectedByDatabaseConstraint() {
        userRepository.saveAndFlush(testUser("userA", "duplicate@example.com"));

        assertThatThrownBy(() -> userRepository.saveAndFlush(testUser("userB", "duplicate@example.com")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void duplicateUsernameIsRejectedByDatabaseConstraint() {
        userRepository.saveAndFlush(testUser("dupuser", "first@example.com"));

        assertThatThrownBy(() -> userRepository.saveAndFlush(testUser("dupuser", "second@example.com")))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    private User testUser(String username, String email) {
        return User.builder()
                .username(username)
                .email(email)
                .password(PASSWORD_HASH)
                .role(UserRole.USER)
                .preferredLanguage("en")
                .isActive(true)
                .build();
    }
}