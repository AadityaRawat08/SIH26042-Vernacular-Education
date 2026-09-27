package com.project.translation;

import com.fasterxml.jackson.databind.ObjectMapper;
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
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end security and behaviour tests for the translation module with the
 * REAL filter chain: unauthenticated → 401, ownership isolation (IDOR), history
 * scoping and pagination, all through the public HTTP API.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class TranslationApiSecurityE2eTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;

    // --- helpers -------------------------------------------------------------

    private String registerAndLogin(String username) throws Exception {
        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "username", username,
                                "email", username + "@example.com",
                                "password", "Str0ngPass!x"))))
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

    private String translateAndReturnId(String token, String source, String target, String text) throws Exception {
        String body = mockMvc.perform(post("/api/translations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "sourceLanguage", source,
                                "targetLanguage", target,
                                "text", text))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).path("data").path("id").asText();
    }

    // --- tests ---------------------------------------------------------------

    @Test
    void unauthenticated_request_isRejected() throws Exception {
        mockMvc.perform(post("/api/translations")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "sourceLanguage", "hi", "targetLanguage", "en", "text", "नमस्ते"))))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/translations"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticated_translation_succeeds_withMockResult() throws Exception {
        String token = registerAndLogin("translatorA");

        mockMvc.perform(post("/api/translations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "sourceLanguage", "hi", "targetLanguage", "en", "text", "नमस्ते"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.sourceLanguage").value("hi"))
                .andExpect(jsonPath("$.data.targetLanguage").value("en"))
                .andExpect(jsonPath("$.data.translatedText").value("[MOCK TRANSLATION] नमस्ते"))
                .andExpect(jsonPath("$.data.provider").value("mock"))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.id").isNotEmpty());
    }

    @Test
    void blankText_isRejectedWith400() throws Exception {
        String token = registerAndLogin("translatorB");

        mockMvc.perform(post("/api/translations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "sourceLanguage", "hi", "targetLanguage", "en", "text", ""))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.fieldErrors.text").isNotEmpty());
    }

    @Test
    void history_returnsOnlyCurrentUsersRecords() throws Exception {
        String tokenA = registerAndLogin("histA");
        String tokenB = registerAndLogin("histB");

        translateAndReturnId(tokenA, "hi", "en", "A's record");
        translateAndReturnId(tokenB, "hi", "en", "B's record");

        mockMvc.perform(get("/api/translations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].sourceText").value("A's record"));

        mockMvc.perform(get("/api/translations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].sourceText").value("B's record"));
    }

    @Test
    void pagination_returnsNewestFirst_andRespectsSize() throws Exception {
        String token = registerAndLogin("pager");

        String id1 = translateAndReturnId(token, "hi", "en", "first");
        String id2 = translateAndReturnId(token, "hi", "en", "second");
        String id3 = translateAndReturnId(token, "hi", "en", "third");

        String page0 = mockMvc.perform(get("/api/translations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("page", "0").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(2))
                .andReturn().getResponse().getContentAsString();

        // newest first: "third" then "second"
        assertThat(objectMapper.readTree(page0).path("data").get(0).path("id").asText()).isEqualTo(id3);
        assertThat(objectMapper.readTree(page0).path("data").get(1).path("id").asText()).isEqualTo(id2);

        mockMvc.perform(get("/api/translations")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("page", "1").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.length()").value(1))
                .andExpect(jsonPath("$.data[0].id").value(id1));
    }

    @Test
    void user_cannotAccessAnotherUsersTranslation() throws Exception {
        String tokenA = registerAndLogin("ownerA");
        String tokenB = registerAndLogin("ownerB");

        String id = translateAndReturnId(tokenA, "hi", "en", "private record");

        mockMvc.perform(get("/api/translations/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    void user_cannotDeleteAnotherUsersTranslation() throws Exception {
        String tokenA = registerAndLogin("delA");
        String tokenB = registerAndLogin("delB");

        String id = translateAndReturnId(tokenA, "hi", "en", "private record");

        mockMvc.perform(delete("/api/translations/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    void user_canDeleteOwnTranslation() throws Exception {
        String token = registerAndLogin("delOwn");

        String id = translateAndReturnId(token, "hi", "en", "to be deleted");

        mockMvc.perform(delete("/api/translations/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/translations/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());
    }
}


