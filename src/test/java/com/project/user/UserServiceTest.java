package com.project.user;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.common.exception.BusinessException;
import com.project.user.dto.CreateUserRequest;
import com.project.user.dto.UserResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * Integration tests for {@link UserService} on top of the real Spring context
 * with the in-memory H2 database (PostgreSQL compatibility mode).
 *
 * <p>Each test is transactional and rolls back, keeping the shared in-memory
 * database clean between tests.</p>
 */
@SpringBootTest
@Transactional
class UserServiceTest {

    private static final String RAW_PASSWORD = "Str0ng!Pass";

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void createUserPersistsAccountReturningResponseWithoutPassword() {
        UserResponse created = userService.createUser(request("teacher1", "teacher1@example.com", "Mrs. Teacher"));

        assertThat(created.id()).isNotNull();
        assertThat(created.username()).isEqualTo("teacher1");
        assertThat(created.email()).isEqualTo("teacher1@example.com");
        assertThat(created.displayName()).isEqualTo("Mrs. Teacher");
        assertThat(created.role()).isEqualTo(UserRole.USER);
        assertThat(created.isActive()).isTrue();
        assertThat(created.createdAt()).isNotNull();

        assertThat(userRepository.findByEmail("teacher1@example.com")).isPresent();
    }

    @Test
    void createUserStoresBcryptHashNeverPlaintext() {
        userService.createUser(request("teacher2", "teacher2@example.com", null));

        User stored = userRepository.findByEmail("teacher2@example.com").orElseThrow();

        assertThat(stored.getPassword()).isNotEqualTo(RAW_PASSWORD);
        assertThat(stored.getPassword()).startsWith("$2a$");
        assertThat(passwordEncoder.matches(RAW_PASSWORD, stored.getPassword())).isTrue();
    }

    @Test
    void createUserNormalizesEmailToLowerCase() {
        UserResponse created = userService.createUser(request("teacher3", "Teacher3@Example.com", null));

        assertThat(created.email()).isEqualTo("teacher3@example.com");
    }

    @Test
    void findByEmailReturnsUser() {
        userService.createUser(request("teacher4", "teacher4@example.com", null));

        Optional<UserResponse> found = userService.findByEmail("Teacher4@example.com");

        assertThat(found).isPresent();
        assertThat(found.get().username()).isEqualTo("teacher4");
    }

    @Test
    void findByUsernameReturnsUser() {
        userService.createUser(request("student5", "student5@example.com", "Student Five"));

        Optional<UserResponse> found = userService.findByUsername("student5");

        assertThat(found).isPresent();
        assertThat(found.get().displayName()).isEqualTo("Student Five");
    }

    @Test
    void duplicateEmailIsRejectedWithBusinessException() {
        userService.createUser(request("first", "duplicate@example.com", null));

        assertThatThrownBy(() -> userService.createUser(request("second", "duplicate@example.com", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("email")
                .hasMessageContaining("duplicate@example.com");
    }

    @Test
    void duplicateEmailIsRejectedCaseInsensitively() {
        userService.createUser(request("first", "CaseTest@example.com", null));

        assertThatThrownBy(() -> userService.createUser(request("second", "casetest@example.com", null)))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void duplicateUsernameIsRejectedWithBusinessException() {
        userService.createUser(request("dupuser", "first@example.com", null));

        assertThatThrownBy(() -> userService.createUser(request("dupuser", "second@example.com", null)))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("username")
                .hasMessageContaining("dupuser");
    }

    @Test
    void availabilityChecksReturnTrueForUnusedKeys() {
        assertThat(userService.isEmailAvailable("unused@example.com")).isTrue();
        assertThat(userService.isUsernameAvailable("unused_user")).isTrue();
    }

    @Test
    void availabilityChecksReturnFalseForTakenKeys() {
        userService.createUser(request("takenuser", "taken@example.com", null));

        assertThat(userService.isEmailAvailable("taken@example.com")).isFalse();
        assertThat(userService.isUsernameAvailable("takenuser")).isFalse();
    }

    @Test
    void userResponseJsonNeverContainsPassword() throws Exception {
        UserResponse response = userService.createUser(request("jsonuser", "jsonuser@example.com", "JSON User"));

        String json = objectMapper.writeValueAsString(response);

        assertThat(json).contains("jsonuser");
        assertThat(json).contains("JSON User");
        assertThat(json.toLowerCase()).doesNotContain("password");
        assertThat(json.toLowerCase()).doesNotContain("passhash");
    }

    private CreateUserRequest request(String username, String email, String displayName) {
        return new CreateUserRequest(
                username,
                email,
                RAW_PASSWORD,
                displayName,
                UserRole.USER,
                "en");
    }
}