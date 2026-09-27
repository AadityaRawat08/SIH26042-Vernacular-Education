package com.project.language;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.user.User;
import com.project.user.UserRepository;
import com.project.user.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end security and CRUD tests for the language module with the REAL
 * filter chain: unauthenticated → 401, USER → 200 on public endpoints and 403
 * on admin endpoints, ADMIN → full CRUD.
 *
 * <p>Language seed data (committed by {@code LanguageDataInitializer} at context
 * startup) is used as read-only fixture.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class LanguageApiSecurityE2eTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private UserRepository userRepository;

    // --- helpers -------------------------------------------------------------

    private Map<String, String> registerBody(String username) {
        return Map.of(
                "username", username,
                "email", username + "@example.com",
                "password", "Str0ngPass!x",
                "displayName", "Display " + username,
                "preferredLanguage", "en");
    }

    /** Registers via the public API and returns the login access token. */
    private String registerAndLogin(String username) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerBody(username))))
                .andExpect(status().isCreated());
        String body = mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "email", username + "@example.com",
                                "password", "Str0ngPass!x"))))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).path("data").path("accessToken").asText();
    }

    /** Registers a user through the API, then promotes the account to ADMIN. */
    private String createAdminAndLogin(String username) throws Exception {
        String token = registerAndLogin(username);
        User user = userRepository.findByEmail(username + "@example.com").orElseThrow();
        user.setRole(UserRole.ADMIN);
        return token;
    }

    // --- Unauthenticated access ----------------------------------------------

    @Test
    void languages_withoutToken_returns401() throws Exception {
        mockMvc.perform(get("/api/languages"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication required"));
    }

    @Test
    void adminEndpoints_withoutToken_returns401() throws Exception {
        mockMvc.perform(post("/api/admin/languages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isUnauthorized());
    }

    // --- Authenticated USER access --------------------------------------------

    @Test
    void user_canListSeededLanguages() throws Exception {
        String token = registerAndLogin("languser1");

        mockMvc.perform(get("/api/languages").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                // seed data is visible: Hindi and English are in the catalogue
                .andExpect(jsonPath("$.data[?(@.code == 'hi')].name").value("Hindi"))
                .andExpect(jsonPath("$.data[?(@.code == 'en')].name").value("English"));
    }

    @Test
    void user_canSearchLanguages() throws Exception {
        String token = registerAndLogin("languser2");

        mockMvc.perform(get("/api/languages").param("search", "tamil")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[0].code").value("ta"))
                .andExpect(jsonPath("$.data[0].nativeName").value("தமிழ்"));
    }

    @Test
    void user_canGetLanguageById_andByCode_andDialectsAndScripts() throws Exception {
        String token = registerAndLogin("languser3");

        String id = objectMapper.readTree(mockMvc.perform(get("/api/languages/code/hi")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.nativeName").value("हिन्दी"))
                .andReturn().getResponse().getContentAsString()).path("data").path("id").asText();

        mockMvc.perform(get("/api/languages/{id}", id).header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.code").value("hi"));

        mockMvc.perform(get("/api/languages/{id}/dialects", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data").isArray());

        mockMvc.perform(get("/api/languages/{id}/scripts", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data[?(@.code == 'Deva')].name").value("Devanagari"));
    }

    @Test
    void user_cannotUseAdminEndpoints_returns403() throws Exception {
        String token = registerAndLogin("plainuser");

        mockMvc.perform(post("/api/admin/languages")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Sneaky", "nativeName", "Sneaky", "code", "snk"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access denied"));

        mockMvc.perform(delete("/api/admin/languages/" + java.util.UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden());
    }

    // --- ADMIN CRUD journey ----------------------------------------------------

    @Test
    void admin_canCreateUpdateAndDeleteLanguage_overHttp() throws Exception {
        String token = createAdminAndLogin("langadmin1");

        String created = mockMvc.perform(post("/api/admin/languages")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Dogri", "nativeName", "डोगरी", "code", "doi",
                                "description", "Language of Jammu", "scriptCodes", java.util.List.of("Deva")))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.code").value("doi"))
                .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(created).path("data").path("id").asText();

        // the new language is immediately visible through the public API
        mockMvc.perform(get("/api/languages/code/doi").header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Dogri"))
                .andExpect(jsonPath("$.data.description").value("Language of Jammu"));

        // update (name + script links)
        mockMvc.perform(put("/api/admin/languages/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Dogri (updated)", "nativeName", "डोगरी",
                                "description", "Updated", "isActive", true,
                                "scriptCodes", java.util.List.of("Deva", "Latn")))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.name").value("Dogri (updated)"));

        mockMvc.perform(get("/api/languages/{id}/scripts", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2));

        // duplicate code via admin API → 422 through the global handler
        mockMvc.perform(post("/api/admin/languages")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "name", "Duplicate", "nativeName", "डुप्लिकेट", "code", "DOI"))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422));
    }
}