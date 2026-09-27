package com.project.learning;

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
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end security and behaviour tests for the learning module with the REAL
 * filter chain: unauthenticated -> 401, per-user data isolation, validation,
 * pagination and dictionary-backed practice through the ADMIN content API.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class LearningApiSecurityE2eTest {

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

    /** Registers, then promotes the account to ADMIN (role is re-read per request). */
    private String registerAdminAndLogin(String username) throws Exception {
        String token = registerAndLogin(username);
        User admin = userRepository.findByEmail(username + "@example.com").orElseThrow();
        admin.setRole(UserRole.ADMIN);
        userRepository.saveAndFlush(admin);
        return token;
    }

    /** Creates a dictionary entry through the real ADMIN content API. */
    private void createDictionaryEntry(String adminToken, String language,
                                       String word, String translation) throws Exception {
        mockMvc.perform(post("/api/admin/dictionary")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "language", language,
                                "word", word,
                                "definition", "definition of " + word,
                                "translation", translation))))
                .andExpect(status().isCreated());
    }

    /** Records one practice attempt and returns the progress id. */
    private String practiceAndReturnProgressId(String token, String language,
                                               String word, boolean correct) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/learning/practice")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "language", language, "word", word, "correct", correct))))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("progress").path("id").asText();
    }


    // --- Unauthenticated ------------------------------------------------------

    @Test
    void unauthenticated_practice_returns401() throws Exception {
        mockMvc.perform(post("/api/learning/practice")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("language", "hi", "word", "pani", "correct", true))))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication required"));
    }

    @Test
    void unauthenticated_progress_returns401() throws Exception {
        mockMvc.perform(get("/api/learning/progress"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticated_history_returns401() throws Exception {
        mockMvc.perform(get("/api/learning/history"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticated_reset_returns401() throws Exception {
        mockMvc.perform(delete("/api/learning/progress/{code}", "hi"))
                .andExpect(status().isUnauthorized());
    }

    // --- Happy paths ----------------------------------------------------------

    @Test
    void authenticated_practice_succeeds_withDictionaryFeedback() throws Exception {
        String adminToken = registerAdminAndLogin("learnadmin1");
        String userToken = registerAndLogin("learnuser1");
        createDictionaryEntry(adminToken, "hi", "पानी", "water");

        mockMvc.perform(post("/api/learning/practice")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("language", "hi", "word", "पानी", "correct", true))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.languageCode").value("hi"))
                .andExpect(jsonPath("$.data.word").value("पानी"))
                .andExpect(jsonPath("$.data.translation").value("water"))
                .andExpect(jsonPath("$.data.correct").value(true))
                .andExpect(jsonPath("$.data.progress.id").exists())
                .andExpect(jsonPath("$.data.progress.languageCode").value("hi"))
                .andExpect(jsonPath("$.data.progress.attempts").value(1))
                .andExpect(jsonPath("$.data.progress.correctCount").value(1))
                .andExpect(jsonPath("$.data.progress.wordsPracticed").value(1));

        // the progress list now shows the practiced language
        mockMvc.perform(get("/api/learning/progress")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].languageCode").value("hi"))
                .andExpect(jsonPath("$.data[0].attempts").value(1));
    }

    @Test
    void authenticated_adminCanAlsoPractice_withOwnScopedData() throws Exception {
        String adminToken = registerAdminAndLogin("learnadmin2");
        createDictionaryEntry(adminToken, "hi", "पानी", "water");

        String progressId = practiceAndReturnProgressId(adminToken, "hi", "पानी", true);
        org.assertj.core.api.Assertions.assertThat(progressId).isNotBlank();

        // ADMIN accounts use the same endpoints; data is scoped to their own account
        mockMvc.perform(get("/api/learning/progress")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(progressId));
    }


    // --- Validation ------------------------------------------------------------

    @Test
    void practice_unknownLanguage_returns404() throws Exception {
        String token = registerAndLogin("learnuser2");

        mockMvc.perform(post("/api/learning/practice")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("language", "zzz", "word", "pani", "correct", true))))
                .andExpect(status().isNotFound());
    }

    @Test
    void practice_wordNotInDictionary_returns404() throws Exception {
        String adminToken = registerAdminAndLogin("learnadmin3");
        String userToken = registerAndLogin("learnuser3");
        createDictionaryEntry(adminToken, "hi", "पानी", "water");

        mockMvc.perform(post("/api/learning/practice")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("language", "hi", "word", "vriksha", "correct", true))))
                .andExpect(status().isNotFound());
    }

    @Test
    void practice_blankWord_returns400() throws Exception {
        String token = registerAndLogin("learnuser4");

        // DTO bean validation fires before the service — invalid payloads are 400.
        mockMvc.perform(post("/api/learning/practice")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("language", "hi", "word", "   ", "correct", true))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void practice_missingCorrectField_returns400() throws Exception {
        String token = registerAndLogin("learnuser5");

        mockMvc.perform(post("/api/learning/practice")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("language", "hi", "word", "पानी"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }


    // --- Ownership / isolation -------------------------------------------------

    @Test
    void user_cannotSeeAnotherUsersProgressOrHistory() throws Exception {
        String adminToken = registerAdminAndLogin("learnadmin4");
        String userA = registerAndLogin("learnisoA");
        String userB = registerAndLogin("learnisoB");
        createDictionaryEntry(adminToken, "hi", "पानी", "water");

        practiceAndReturnProgressId(userA, "hi", "पानी", true);

        // user B sees neither A's progress nor A's history
        mockMvc.perform(get("/api/learning/progress")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(0));

        mockMvc.perform(get("/api/learning/history")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(0));

        // resetting by language code is scoped to the caller: B has nothing to reset
        mockMvc.perform(delete("/api/learning/progress/{code}", "hi")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userB))
                .andExpect(status().isNotFound());

        // A's data survives B's attempts
        mockMvc.perform(get("/api/learning/progress/{code}", "hi")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + userA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.attempts").value(1));
    }

    @Test
    void history_pagination_newestFirst() throws Exception {
        String adminToken = registerAdminAndLogin("learnadmin5");
        String token = registerAndLogin("learnpage1");
        createDictionaryEntry(adminToken, "hi", "पानी", "water");
        createDictionaryEntry(adminToken, "hi", "किताब", "book");
        createDictionaryEntry(adminToken, "hi", "गाय", "cow");

        practiceAndReturnProgressId(token, "hi", "पानी", true);
        practiceAndReturnProgressId(token, "hi", "किताब", false);
        practiceAndReturnProgressId(token, "hi", "गाय", true);

        String page0 = mockMvc.perform(get("/api/learning/history")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("page", "0").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(2))
                .andExpect(jsonPath("$.data.totalElements").value(3))
                .andExpect(jsonPath("$.data.totalPages").value(2))
                .andReturn().getResponse().getContentAsString();

        // newest first: cow (गाय) then book (किताब)
        org.assertj.core.api.Assertions.assertThat(
                        objectMapper.readTree(page0).path("data").path("content").get(0).path("word").asText())
                .isEqualTo("गाय");
        org.assertj.core.api.Assertions.assertThat(
                        objectMapper.readTree(page0).path("data").path("content").get(1).path("word").asText())
                .isEqualTo("किताब");
    }

    // --- Reset -----------------------------------------------------------------

    @Test
    void user_canResetOwnProgress() throws Exception {
        String adminToken = registerAdminAndLogin("learnadmin6");
        String token = registerAndLogin("learndel1");
        createDictionaryEntry(adminToken, "hi", "पानी", "water");

        practiceAndReturnProgressId(token, "hi", "पानी", true);

        mockMvc.perform(delete("/api/learning/progress/{code}", "hi")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());

        // progress is gone afterwards, and the history is empty
        mockMvc.perform(get("/api/learning/progress/{code}", "hi")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());

        mockMvc.perform(get("/api/learning/history")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.totalElements").value(0));
    }

    @Test
    void reset_unknownOrUnpracticedLanguage_returns404() throws Exception {
        String token = registerAndLogin("learndel2");

        mockMvc.perform(delete("/api/learning/progress/{code}", "zzz")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());
    }
}
