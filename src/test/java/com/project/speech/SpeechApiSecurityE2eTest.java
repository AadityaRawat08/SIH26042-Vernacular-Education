package com.project.speech;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.language.Language;
import com.project.language.LanguageRepository;
import com.project.user.User;
import com.project.user.UserRepository;
import com.project.user.UserRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end security and behaviour tests for the speech module with the REAL
 * filter chain: unauthenticated -> 401, ownership isolation (IDOR), history
 * scoping, pagination, validation and speech -> Translation integration.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SpeechApiSecurityE2eTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private LanguageRepository languageRepository;
    @Autowired
    private SpeechRepository speechRepository;

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

    private String transcribeAndReturnId(String token, MockMultipartFile file,
                                         String language) throws Exception {
        var builder = multipart("/api/speech/transcribe")
                .file(file).header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        if (language != null) {
            builder.param("language", language);
        }
        MvcResult result = mockMvc.perform(builder)
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asText();
    }

    private String synthesizeAndReturnId(String token, String text,
                                         String language) throws Exception {
        MvcResult result = mockMvc.perform(post("/api/speech/synthesize")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("text", text, "language", language))))
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asText();
    }


    // --- Unauthenticated ------------------------------------------------------

    @Test
    void unauthenticated_transcribe_returns401() throws Exception {
        mockMvc.perform(multipart("/api/speech/transcribe")
                        .file(new MockMultipartFile("file", "clip.wav", "audio/wav", new byte[]{1})))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication required"));
    }

    @Test
    void unauthenticated_synthesize_returns401() throws Exception {
        mockMvc.perform(post("/api/speech/synthesize")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("text", "hi", "language", "en"))))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticated_history_returns401() throws Exception {
        mockMvc.perform(get("/api/speech"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticated_detail_returns401() throws Exception {
        mockMvc.perform(get("/api/speech/{id}", java.util.UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticated_delete_returns401() throws Exception {
        mockMvc.perform(delete("/api/speech/{id}", java.util.UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }


    // --- Happy paths ----------------------------------------------------------

    @Test
    void authenticated_transcribe_succeeds_returnsCompleted() throws Exception {
        String token = registerAndLogin("speechuploader1");

        mockMvc.perform(multipart("/api/speech/transcribe")
                        .file(new MockMultipartFile("file", "clip.wav", "audio/wav", new byte[]{1, 2, 3}))
                        .param("language", "hi")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").exists())
                .andExpect(jsonPath("$.data.operation").value("SPEECH_TO_TEXT"))
                .andExpect(jsonPath("$.data.originalFileName").value("clip.wav"))
                .andExpect(jsonPath("$.data.contentType").value("audio/wav"))
                .andExpect(jsonPath("$.data.fileSize").value(3))
                .andExpect(jsonPath("$.data.outputText")
                        .value("[MOCK TRANSCRIPTION] Speech processed from clip.wav"))
                .andExpect(jsonPath("$.data.languageCode").value("hi"))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.provider").value("mock-speech"));
    }

    @Test
    void authenticated_synthesize_succeeds_returnsMetadata() throws Exception {
        String token = registerAndLogin("speechuploader2");

        mockMvc.perform(post("/api/speech/synthesize")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                Map.of("text", "नमस्ते", "language", "hi"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").exists())
                .andExpect(jsonPath("$.data.operation").value("TEXT_TO_SPEECH"))
                .andExpect(jsonPath("$.data.inputText").value("नमस्ते"))
                .andExpect(jsonPath("$.data.outputText")
                        .value(org.hamcrest.Matchers.containsString("[MOCK SYNTHESIS]")))
                .andExpect(jsonPath("$.data.contentType").value("audio/wav"))
                .andExpect(jsonPath("$.data.languageCode").value("hi"))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.provider").value("mock-speech"));
    }


    // --- Upload validation ----------------------------------------------------

    @Test
    void authenticated_missingFile_returns400() throws Exception {
        String token = registerAndLogin("speechuploader3");

        mockMvc.perform(multipart("/api/speech/transcribe")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void authenticated_emptyFile_returns422() throws Exception {
        String token = registerAndLogin("speechuploader4");

        mockMvc.perform(multipart("/api/speech/transcribe")
                        .file(new MockMultipartFile("file", "empty.wav", "audio/wav", new byte[0]))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.message").value("file must not be empty"));
    }

    @Test
    void authenticated_unsupportedContentType_returns422() throws Exception {
        String token = registerAndLogin("speechuploader5");

        mockMvc.perform(multipart("/api/speech/transcribe")
                        .file(new MockMultipartFile("file", "notes.txt", "text/plain", new byte[]{1, 2}))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message")
                        .value(org.hamcrest.Matchers.containsString("Unsupported file type")));
    }

    @Test
    void authenticated_oversizedFile_returns422() throws Exception {
        String token = registerAndLogin("speechuploader6");
        // test config caps uploads at 1MB; the service-level check rejects it.
        // (MockMvc bypasses the servlet multipart limit, so the application's own
        // size validation is what fires.)
        byte[] big = new byte[1024 * 1024 + 1];

        mockMvc.perform(multipart("/api/speech/transcribe")
                        .file(new MockMultipartFile("file", "big.wav", "audio/wav", big))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.message")
                        .value(org.hamcrest.Matchers.containsString("maximum allowed size")));
    }

    @Test
    void invalidLanguage_returns404() throws Exception {
        String token = registerAndLogin("speechuploader7");

        mockMvc.perform(multipart("/api/speech/transcribe")
                        .file(new MockMultipartFile("file", "clip.wav", "audio/wav", new byte[]{1}))
                        .param("language", "zz")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void inactiveLanguage_returns422() throws Exception {
        String token = registerAndLogin("speechuploader8");
        languageRepository.save(Language.builder()
                .name("Inactive").nativeName("Inactive").code("xs").isActive(false).build());

        mockMvc.perform(multipart("/api/speech/transcribe")
                        .file(new MockMultipartFile("file", "clip.wav", "audio/wav", new byte[]{1}))
                        .param("language", "xs")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message")
                        .value(org.hamcrest.Matchers.containsString("inactive")));
    }

    @Test
    void synthesize_blankText_returns400() throws Exception {
        String token = registerAndLogin("speechuploader9");

        // Bean validation on the request DTO fires before the service — the
        // project convention maps invalid request payloads to 400.
        mockMvc.perform(post("/api/speech/synthesize")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("text", "   ", "language", "hi"))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }


    // --- Ownership (IDOR) -----------------------------------------------------

    @Test
    void user_canViewOwnRecord_andOwnHistory() throws Exception {
        String token = registerAndLogin("speechown1");
        String id = transcribeAndReturnId(token,
                new MockMultipartFile("file", "mine.wav", "audio/wav", new byte[]{1}), null);

        mockMvc.perform(get("/api/speech/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(id))
                .andExpect(jsonPath("$.data.originalFileName").value("mine.wav"))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));

        mockMvc.perform(get("/api/speech")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].id").value(id));
    }

    @Test
    void user_cannotViewAnotherUsersRecord_returns404() throws Exception {
        String tokenA = registerAndLogin("speechownA");
        String tokenB = registerAndLogin("speechownB");

        String id = transcribeAndReturnId(tokenA,
                new MockMultipartFile("file", "private.wav", "audio/wav", new byte[]{1}), null);

        mockMvc.perform(get("/api/speech/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    void user_cannotSeeAnotherUsersHistory() throws Exception {
        String tokenA = registerAndLogin("speechhistA");
        String tokenB = registerAndLogin("speechhistB");
        transcribeAndReturnId(tokenA,
                new MockMultipartFile("file", "a.wav", "audio/wav", new byte[]{1}), null);

        mockMvc.perform(get("/api/speech")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(0))
                .andExpect(jsonPath("$.data.totalElements").value(0));
    }

    @Test
    void user_canDeleteOwnRecord() throws Exception {
        String token = registerAndLogin("speechdel1");
        String id = transcribeAndReturnId(token,
                new MockMultipartFile("file", "del.wav", "audio/wav", new byte[]{1}), null);

        mockMvc.perform(delete("/api/speech/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/speech/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void user_cannotDeleteAnotherUsersRecord() throws Exception {
        String tokenA = registerAndLogin("speechdelA");
        String tokenB = registerAndLogin("speechdelB");
        String id = transcribeAndReturnId(tokenA,
                new MockMultipartFile("file", "private.wav", "audio/wav", new byte[]{1}), null);

        mockMvc.perform(delete("/api/speech/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        // still present for the owner
        mockMvc.perform(get("/api/speech/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk());
    }

    @Test
    void history_pagination_newestFirst() throws Exception {
        String token = registerAndLogin("speechpage1");
        String id1 = transcribeAndReturnId(token,
                new MockMultipartFile("file", "first.wav", "audio/wav", new byte[]{1}), null);
        String id2 = transcribeAndReturnId(token,
                new MockMultipartFile("file", "second.wav", "audio/wav", new byte[]{1}), null);
        String id3 = transcribeAndReturnId(token,
                new MockMultipartFile("file", "third.wav", "audio/wav", new byte[]{1}), null);

        String page0 = mockMvc.perform(get("/api/speech")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .param("page", "0").param("size", "2"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(2))
                .andExpect(jsonPath("$.data.totalElements").value(3))
                .andReturn().getResponse().getContentAsString();

        // newest first: third then second
        assertThat(objectMapper.readTree(page0).path("data").path("content").get(0).path("id").asText()).isEqualTo(id3);
        assertThat(objectMapper.readTree(page0).path("data").path("content").get(1).path("id").asText()).isEqualTo(id2);
    }


    // --- Translation integration ----------------------------------------------

    @Test
    void completedStt_canBeTranslated_throughExistingTranslationArchitecture() throws Exception {
        String token = registerAndLogin("speechnl1");
        String id = transcribeAndReturnId(token,
                new MockMultipartFile("file", "note.wav", "audio/wav", new byte[]{1}), "hi");

        mockMvc.perform(post("/api/speech/{id}/translate", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("targetLanguage", "en"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").exists())
                .andExpect(jsonPath("$.data.sourceLanguage").value("hi"))
                .andExpect(jsonPath("$.data.targetLanguage").value("en"))
                .andExpect(jsonPath("$.data.sourceText")
                        .value("[MOCK TRANSCRIPTION] Speech processed from note.wav"))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    }

    @Test
    void cannotTranslateAnotherUsersSpeechRecord_returns404() throws Exception {
        String tokenA = registerAndLogin("speechnlA");
        String tokenB = registerAndLogin("speechnlB");
        String id = transcribeAndReturnId(tokenA,
                new MockMultipartFile("file", "note.wav", "audio/wav", new byte[]{1}), "hi");

        mockMvc.perform(post("/api/speech/{id}/translate", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("targetLanguage", "en"))))
                .andExpect(status().isNotFound());
    }

    @Test
    void cannotTranslateTtsRecord_returns422() throws Exception {
        String token = registerAndLogin("speechnlT");
        String id = synthesizeAndReturnId(token, "hello", "en");

        mockMvc.perform(post("/api/speech/{id}/translate", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("targetLanguage", "hi"))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message")
                        .value("Only speech-to-text records can be translated"));
    }

    @Test
    void translate_invalidTargetLanguage_returns404() throws Exception {
        String token = registerAndLogin("speechnlI");
        String id = transcribeAndReturnId(token,
                new MockMultipartFile("file", "note.wav", "audio/wav", new byte[]{1}), "hi");

        mockMvc.perform(post("/api/speech/{id}/translate", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("targetLanguage", "zzun"))))
                .andExpect(status().isNotFound());
    }

    // --- Roles ----------------------------------------------------------------

    @Test
    void adminUser_usesTheSameEndpoints_andHistoryIsScopedToTheirAccount() throws Exception {
        // Register a normal account, then promote it to ADMIN directly in the DB
        // (the JWT filter re-reads the role on every request, so the same token
        // gains ADMIN rights immediately). Speech endpoints are available to any
        // authenticated user — there is no ADMIN-only speech route.
        String token = registerAndLogin("speechadmin1");
        User admin = userRepository.findByEmail("speechadmin1@example.com").orElseThrow();
        admin.setRole(UserRole.ADMIN);
        userRepository.saveAndFlush(admin);

        String id = transcribeAndReturnId(token,
                new MockMultipartFile("file", "admin.wav", "audio/wav", new byte[]{1}), null);

        mockMvc.perform(get("/api/speech")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].id").value(id))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }
}
