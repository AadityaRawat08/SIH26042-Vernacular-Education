package com.project.ocr;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.user.User;
import com.project.user.UserRepository;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end security and behaviour tests for the OCR module with the REAL
 * filter chain: unauthenticated -> 401, ownership isolation (IDOR), history
 * scoping, pagination, provider flow and OCR -> Translation integration.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class OcrApiSecurityE2eTest {

    @Autowired
    private MockMvc mockMvc;
    @Autowired
    private ObjectMapper objectMapper;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private OcrRepository ocrRepository;

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

    private String uploadAndReturnId(String token, MockMultipartFile file, String language) throws Exception {
        var builder = multipart("/api/ocr").file(file).header(HttpHeaders.AUTHORIZATION, "Bearer " + token);
        if (language != null) {
            builder.param("language", language);
        }
        MvcResult result = mockMvc.perform(builder)
                .andExpect(status().isCreated())
                .andReturn();
        return objectMapper.readTree(result.getResponse().getContentAsString())
                .path("data").path("id").asText();
    }

    // --- Unauthenticated ------------------------------------------------------

    @Test
    void unauthenticated_upload_returns401() throws Exception {
        mockMvc.perform(multipart("/api/ocr")
                        .file(new MockMultipartFile("file", "page.png", "image/png", new byte[]{1})))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Authentication required"));
    }

    @Test
    void unauthenticated_history_returns401() throws Exception {
        mockMvc.perform(get("/api/ocr"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void unauthenticated_detail_returns401() throws Exception {
        mockMvc.perform(get("/api/ocr/{id}", java.util.UUID.randomUUID()))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void authenticated_upload_succeeds_returnsCompleted() throws Exception {
        String token = registerAndLogin("ocruploader1");

        mockMvc.perform(multipart("/api/ocr")
                        .file(new MockMultipartFile("file", "page.png", "image/png", new byte[]{1, 2, 3}))
                        .param("language", "hi")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").exists())
                .andExpect(jsonPath("$.data.originalFileName").value("page.png"))
                .andExpect(jsonPath("$.data.contentType").value("image/png"))
                .andExpect(jsonPath("$.data.fileSize").value(3))
                .andExpect(jsonPath("$.data.extractedText").value("[MOCK OCR RESULT] Extracted text from page.png"))
                .andExpect(jsonPath("$.data.detectedLanguageCode").value("hi"))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"))
                .andExpect(jsonPath("$.data.provider").value("mock-ocr"));
    }

    @Test
    void authenticated_missingFile_returns400() throws Exception {
        String token = registerAndLogin("ocruploader2");

        mockMvc.perform(multipart("/api/ocr")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400));
    }

    @Test
    void authenticated_emptyFile_returns422() throws Exception {
        String token = registerAndLogin("ocruploader3");

        mockMvc.perform(multipart("/api/ocr")
                        .file(new MockMultipartFile("file", "empty.png", "image/png", new byte[0]))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.message").value("file must not be empty"));
    }

    @Test
    void authenticated_unsupportedContentType_returns422() throws Exception {
        String token = registerAndLogin("ocruploader4");

        mockMvc.perform(multipart("/api/ocr")
                        .file(new MockMultipartFile("file", "doc.pdf", "application/pdf", new byte[]{1, 2}))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("Unsupported file type")));
    }

    @Test
    void authenticated_oversizedFile_returns422() throws Exception {
        String token = registerAndLogin("ocruploader5");
        // test config caps uploads at 1MB; the service-level check rejects it.
        // (MockMvc bypasses the servlet multipart limit, so the application's own
        // size validation is what fires.)
        byte[] big = new byte[1024 * 1024 + 1];

        mockMvc.perform(multipart("/api/ocr")
                        .file(new MockMultipartFile("file", "big.png", "image/png", big))
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.status").value(422))
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("maximum allowed size")));
    }

    @Test
    void invalidLanguage_returns404() throws Exception {
        String token = registerAndLogin("ocruploader6");

        mockMvc.perform(multipart("/api/ocr")
                        .file(new MockMultipartFile("file", "page.png", "image/png", new byte[]{1}))
                        .param("language", "zz")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void user_canViewOwnRecord_andGetOwnHistory() throws Exception {
        String token = registerAndLogin("ocrown1");
        String id = uploadAndReturnId(token, new MockMultipartFile("file", "mine.png", "image/png", new byte[]{1}), null);

        mockMvc.perform(get("/api/ocr/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.id").value(id))
                .andExpect(jsonPath("$.data.originalFileName").value("mine.png"))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));

        mockMvc.perform(get("/api/ocr")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(1))
                .andExpect(jsonPath("$.data.content[0].id").value(id));
    }

    @Test
    void user_cannotViewAnotherUsersRecord_returns404() throws Exception {
        String tokenA = registerAndLogin("ocrownA");
        String tokenB = registerAndLogin("ocrownB");

        String id = uploadAndReturnId(tokenA, new MockMultipartFile("file", "private.png", "image/png", new byte[]{1}), null);

        mockMvc.perform(get("/api/ocr/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound());
    }

    @Test
    void user_cannotSeeAnotherUsersHistory() throws Exception {
        String tokenA = registerAndLogin("ocrhistA");
        String tokenB = registerAndLogin("ocrhistB");
        uploadAndReturnId(tokenA, new MockMultipartFile("file", "a.png", "image/png", new byte[]{1}), null);

        mockMvc.perform(get("/api/ocr")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(0))
                .andExpect(jsonPath("$.data.totalElements").value(0));
    }

    @Test
    void user_canDeleteOwnRecord() throws Exception {
        String token = registerAndLogin("ocrdel1");
        String id = uploadAndReturnId(token, new MockMultipartFile("file", "del.png", "image/png", new byte[]{1}), null);

        mockMvc.perform(delete("/api/ocr/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNoContent());

        mockMvc.perform(get("/api/ocr/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token))
                .andExpect(status().isNotFound());
    }

    @Test
    void user_cannotDeleteAnotherUsersRecord() throws Exception {
        String tokenA = registerAndLogin("ocrdelA");
        String tokenB = registerAndLogin("ocrdelB");
        String id = uploadAndReturnId(tokenA, new MockMultipartFile("file", "private.png", "image/png", new byte[]{1}), null);

        mockMvc.perform(delete("/api/ocr/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB))
                .andExpect(status().isNotFound());

        // still present for the owner
        mockMvc.perform(get("/api/ocr/{id}", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenA))
                .andExpect(status().isOk());
    }

    @Test
    void history_pagination_newestFirst() throws Exception {
        String token = registerAndLogin("ocrpage1");
        String id1 = uploadAndReturnId(token, new MockMultipartFile("file", "first.png", "image/png", new byte[]{1}), null);
        String id2 = uploadAndReturnId(token, new MockMultipartFile("file", "second.png", "image/png", new byte[]{1}), null);
        String id3 = uploadAndReturnId(token, new MockMultipartFile("file", "third.png", "image/png", new byte[]{1}), null);

        String page0 = mockMvc.perform(get("/api/ocr")
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

    @Test
    void completedOcr_canBeTranslated_throughExistingTranslationArchitecture() throws Exception {
        String token = registerAndLogin("ocrtxl1");
        String id = uploadAndReturnId(token,
                new MockMultipartFile("file", "note.png", "image/png", new byte[]{1}), "hi");

        mockMvc.perform(post("/api/ocr/{id}/translate", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("targetLanguage", "en"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.id").exists())
                .andExpect(jsonPath("$.data.sourceLanguage").value("hi"))
                .andExpect(jsonPath("$.data.targetLanguage").value("en"))
                .andExpect(jsonPath("$.data.sourceText").value("[MOCK OCR RESULT] Extracted text from note.png"))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    }

    @Test
    void cannotTranslateAnotherUsersOcrRecord_returns404() throws Exception {
        String tokenA = registerAndLogin("ocrtxlA");
        String tokenB = registerAndLogin("ocrtxlB");
        String id = uploadAndReturnId(tokenA,
                new MockMultipartFile("file", "note.png", "image/png", new byte[]{1}), "hi");

        mockMvc.perform(post("/api/ocr/{id}/translate", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("targetLanguage", "en"))))
                .andExpect(status().isNotFound());
    }

    @Test
    void cannotTranslateFailedOcrRecord_returns422() throws Exception {
        String token = registerAndLogin("ocrtxlF");
        String id = uploadAndReturnId(token,
                new MockMultipartFile("file", "note.png", "image/png", new byte[]{1}), "hi");

        // mark the record FAILED directly in the DB
        OcrDocument doc = ocrRepository.findById(java.util.UUID.fromString(id)).orElseThrow();
        doc.setStatus(OcrStatus.FAILED);
        doc.setExtractedText(null);
        ocrRepository.saveAndFlush(doc);

        mockMvc.perform(post("/api/ocr/{id}/translate", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("targetLanguage", "en"))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.message").value("OCR document is not completed and cannot be translated"));
    }

    @Test
    void translate_invalidTargetLanguage_returns404() throws Exception {
        String token = registerAndLogin("ocrtxlI");
        String id = uploadAndReturnId(token,
                new MockMultipartFile("file", "note.png", "image/png", new byte[]{1}), "hi");

        mockMvc.perform(post("/api/ocr/{id}/translate", id)
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of("targetLanguage", "zzun"))))
                .andExpect(status().isNotFound());
    }
}