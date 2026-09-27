package com.project.ocr;

import com.project.user.User;
import com.project.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * JPA slice tests for the OCR repository (H2 in PostgreSQL mode).
 *
 * <p>{@code @DataJpaTest} does not run {@code CommandLineRunner} seeders, so
 * users are created explicitly here.</p>
 */
@DataJpaTest
class OcrRepositoryTest {

    @Autowired
    private OcrRepository ocrRepository;
    @Autowired
    private UserRepository userRepository;

    private User createUser(String username) {
        return userRepository.saveAndFlush(User.builder()
                .username(username)
                .email(username + "@example.com")
                .password("not-a-real-hash")
                .build());
    }

    private OcrDocument saveDocument(User user, String fileName) {
        return ocrRepository.saveAndFlush(OcrDocument.builder()
                .user(user)
                .originalFileName(fileName)
                .contentType("image/png")
                .fileSize(123L)
                .extractedText("text from " + fileName)
                .status(OcrStatus.COMPLETED)
                .provider("mock-ocr")
                .build());
    }

    @Test
    void savePersistsUuidAndTimestamps() {
        User user = createUser("ocrrepo1");
        OcrDocument document = saveDocument(user, "page.png");

        assertThat(document.getId()).isNotNull();
        assertThat(document.getCreatedAt()).isNotNull();
        assertThat(document.getUpdatedAt()).isNotNull();
        assertThat(document.getUser().getId()).isEqualTo(user.getId());
    }

    @Test
    void findByUserId_returnsOnlyThatUsersDocuments_paginated() {
        User userA = createUser("ocrrepoA");
        User userB = createUser("ocrrepoB");
        saveDocument(userA, "a1.png");
        saveDocument(userA, "a2.png");
        saveDocument(userB, "b1.png");

        Page<OcrDocument> page = ocrRepository.findByUserId(userA.getId(),
                PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt")));

        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent()).extracting(OcrDocument::getOriginalFileName)
                .containsExactlyInAnyOrder("a1.png", "a2.png");

        Page<OcrDocument> bPage = ocrRepository.findByUserId(userB.getId(),
                PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt")));
        assertThat(bPage.getTotalElements()).isEqualTo(1);
        assertThat(bPage.getContent().get(0).getOriginalFileName()).isEqualTo("b1.png");
    }
}