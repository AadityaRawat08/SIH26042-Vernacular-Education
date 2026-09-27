package com.project.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.user.User;
import com.project.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end security tests with the REAL filter chain active (no
 * {@code addFilters = false}): public vs protected endpoint enforcement, the
 * JSON 401 contract, and the full register → login → me → refresh → logout
 * journey over HTTP.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AuthSecurityE2eTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private JwtService jwtService;
    @Autowired
    private UserRepository userRepository;

    private String json(Map<String, String> body) throws Exception {
        return objectMapper.writeValueAsString(body);
    }

    private JsonNode postJson(String uri, Map<String, String> body, int expectedStatus) throws Exception {
        String response = mockMvc.perform(post(uri)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(body)))
                .andExpect(status().is(expectedStatus))
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response);
    }

    private Map<String, String> registerBody(String username) {
        return Map.of(
                "username", username,
                "email", username + "@example.com",
                "password", "Str0ngPass!x",
                "displayName", "Display " + username,
                "preferredLanguage", "en");
    }

    private AuthTokens registerAndLogin(String username) throws Exception {
        postJson("/api/auth/register", registerBody(username), 201);
        JsonNode login = postJson("/api/auth/login",
                Map.of("email", username + "@example.com", "password", "Str0ngPass!x"), 200);
        JsonNode data = login.path("data");
        return new AuthTokens(data.path("accessToken").asText(), data.path("refreshToken").asText());
    }

    private record AuthTokens(String accessToken, String refreshToken) {
    }

    // --- Public vs protected endpoints --------------------------------------

    @Test
    void register_isPublicAndReturns201() throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(registerBody("kabir"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.username").value("kabir"))
                .andExpect(jsonPath("$.data.password").doesNotExist());
    }

    @Test
    void me_withoutToken_returns401StandardErrorBody() throws Exception {
        mockMvc.perform(get("/api/auth/me"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.error").value("Unauthorized"))
                .andExpect(jsonPath("$.message").value("Authentication required"))
                .andExpect(jsonPath("$.path").value("/api/auth/me"));
    }

    @Test
    void me_withGarbageToken_returns401GenericMessage() throws Exception {
        mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer this-is-not-a-jwt"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired authentication token"));
    }

    @Test
    void otherProtectedApi_withoutToken_returns401() throws Exception {
        // anyRequest().authenticated() — future modules are protected by default.
        mockMvc.perform(get("/api/some-future-module/resource"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }

    // --- Full journey over HTTP ----------------------------------------------

    @Test
    void journey_registerLoginMeRefreshLogout() throws Exception {
        AuthTokens session = registerAndLogin("kabir");

        // Bearer token grants access to the protected /me endpoint.
        mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + session.accessToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("kabir"))
                .andExpect(jsonPath("$.data.email").value("kabir@example.com"))
                .andExpect(jsonPath("$.data.password").doesNotExist());

        // Refresh rotates the token pair.
        JsonNode refreshed = postJson("/api/auth/refresh",
                Map.of("refreshToken", session.refreshToken()), 200).path("data");
        String newAccess = refreshed.path("accessToken").asText();
        assertThat(newAccess).isNotBlank();
        assertThat(refreshed.path("refreshToken").asText()).isNotEqualTo(session.refreshToken());

        mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + newAccess))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("kabir"));

        // Logout revokes refresh tokens; afterwards no new session can be obtained.
        mockMvc.perform(post("/api/auth/logout").header(HttpHeaders.AUTHORIZATION, "Bearer " + newAccess))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        JsonNode afterLogout = postJson("/api/auth/refresh",
                Map.of("refreshToken", refreshed.path("refreshToken").asText()), 401);
        assertThat(afterLogout.path("message").asText()).containsIgnoringCase("refresh token");
    }

    @Test
    void me_withExpiredToken_returns401() throws Exception {
        registerAndLogin("kabir");
        User user = userRepository.findByEmail("kabir@example.com").orElseThrow();
        String expired = jwtService.generateAccessToken(
                user, Instant.now().minus(Duration.ofHours(2)), Duration.ofSeconds(30));

        mockMvc.perform(get("/api/auth/me").header(HttpHeaders.AUTHORIZATION, "Bearer " + expired))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid or expired authentication token"));
    }

    @Test
    void login_inactiveUser_returns401OverHttp() throws Exception {
        postJson("/api/auth/register", registerBody("kabir"), 201);
        User user = userRepository.findByEmail("kabir@example.com").orElseThrow();
        user.setActive(false);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("email", "kabir@example.com", "password", "Str0ngPass!x"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    void refresh_withInvalidToken_returns401() throws Exception {
        mockMvc.perform(post("/api/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(json(Map.of("refreshToken", "bogus-token"))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401));
    }
}