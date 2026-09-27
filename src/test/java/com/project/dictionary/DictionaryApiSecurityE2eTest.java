package com.project.dictionary;

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

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end security and CRUD tests for the dictionary module with the REAL
 * filter chain: unauthenticated → 401, USER → 200 on reads and 403 on admin
 * endpoints, ADMIN → full CRUD.
 *
 * <p>Relies on the committed language + dictionary seed (e.g. Hindi 'नमस्ते')
 * for read tests; writes are rolled back per test via {@code @Transactional}.</p>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DictionaryApiSecurityE2eTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private UserRepository userRepository;

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

    // --- Unauthenticated access ------------------------------------------------

    @Test
    void unauthenticated_search_returns401() throws Exception {
        mockMvc.perform(get("/api/dictionary/search")
                        .param("language", "hi").param("word", "नमस्ते"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.message").value("Authentication required"));
    }

    @Test
    void unauthenticated_getEntry_returns401() throws Exception {
        mockMvc.perform(get("/api/dictionary/{id}", java.util.UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }

    // --- USER reads (allowed) --------------------------------------------------

    @Test
    void user_canSearchDictionary() throws Exception {
        String token = registerAndLogin("dicouser1");

        mockMvc.perform(get("/api/dictionary/search")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("language", "hi").param("word", "नमस्ते"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].word").value("नमस्ते"))
                .andExpect(jsonPath("$.data[0].languageCode").value("hi"));
    }

    @Test
    void user_canViewEntry() throws Exception {
        String token = registerAndLogin("dicouser2");

        // find a seeded entry id through search
        String searchBody = mockMvc.perform(get("/api/dictionary/search")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("language", "hi").param("word", "नमस्ते"))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(searchBody).path("data").get(0).path("id").asText();

        mockMvc.perform(get("/api/dictionary/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(id))
                .andExpect(jsonPath("$.data.word").value("नमस्ते"))
                .andExpect(jsonPath("$.data.languageCode").value("hi"))
                .andExpect(jsonPath("$.data.definition").exists());
    }

        // --- USER writes (forbidden) ----------------------------------------------

    @Test
    void user_cannotCreateEntry() throws Exception {
        String token = registerAndLogin("dicouser3");

        mockMvc.perform(post("/api/admin/dictionary")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "language", "en", "word", "oops", "definition", "d"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.status").value(403))
                .andExpect(jsonPath("$.message").value("Access denied"));
    }

    @Test
    void user_cannotModifyEntry() throws Exception {
        String token = registerAndLogin("dicouser4");

        mockMvc.perform(put("/api/admin/dictionary/{id}", java.util.UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "word", "oops", "definition", "d"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access denied"));
    }

    @Test
    void user_cannotDeleteEntry() throws Exception {
        String token = registerAndLogin("dicouser5");

        mockMvc.perform(delete("/api/admin/dictionary/{id}", java.util.UUID.randomUUID())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value("Access denied"));
    }

        // --- ADMIN CRUD ------------------------------------------------------------

    @Test
    void admin_canCreateEntry() throws Exception {
        String token = createAdminAndLogin("dicoadmin1");

        String body = mockMvc.perform(post("/api/admin/dictionary")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "language", "en",
                                "word", "adminTestEntry",
                                "pronunciation", "ədˈmɪn",
                                "definition", "Created by an admin test.",
                                "partOfSpeech", "noun",
                                "exampleSentence", "The admin test entry.",
                                "translation", "entry"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").exists())
                .andExpect(jsonPath("$.data.languageCode").value("en"))
                .andExpect(jsonPath("$.data.word").value("adminTestEntry"))
                .andExpect(jsonPath("$.data.definition").value("Created by an admin test."))
                .andReturn().getResponse().getContentAsString();
        String id = objectMapper.readTree(body).path("data").path("id").asText();

        // the new entry is immediately visible to regular users through the read API
        String userToken = registerAndLogin("dicouser6");
        mockMvc.perform(get("/api/dictionary/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.word").value("adminTestEntry"));
    }

    @Test
    void admin_canModifyEntry() throws Exception {
        String token = createAdminAndLogin("dicoadmin2");
        String id = createAdminEntry(token, "adminModEntry", "before");

        mockMvc.perform(put("/api/admin/dictionary/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "word", "adminModEntryUpdated", "definition", "after"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.word").value("adminModEntryUpdated"));

        // persisted change is visible via the read API
        mockMvc.perform(get("/api/dictionary/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.word").value("adminModEntryUpdated"))
                .andExpect(jsonPath("$.data.definition").value("after"));
    }

    @Test
    void admin_canDeleteEntry() throws Exception {
        String token = createAdminAndLogin("dicoadmin3");
        String id = createAdminEntry(token, "adminDelEntry", "to be deleted");

        mockMvc.perform(delete("/api/admin/dictionary/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());

        // deleted entry is gone
        mockMvc.perform(get("/api/dictionary/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    private String createAdminEntry(String token, String word, String definition) throws Exception {
        String body = mockMvc.perform(post("/api/admin/dictionary")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "language", "en", "word", word, "definition", definition))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).path("data").path("id").asText();
    }
}
