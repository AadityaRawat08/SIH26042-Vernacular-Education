package com.project.speech;

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
 * JPA slice tests for the speech repository (H2 in PostgreSQL mode).
 *
 * <p>{@code @DataJpaTest} does not run {@code CommandLineRunner} seeders, so
 * users are created explicitly here.</p>
 */
@DataJpaTest
class SpeechRepositoryTest {

    @Autowired
    private SpeechRepository speechRepository;
    @Autowired
    private UserRepository userRepository;

    private User createUser(String username) {
        return userRepository.saveAndFlush(User.builder()
                .username(username)
                .email(username + "@example.com")
                .password("not-a-real-hash")
                .build());
    }

    private SpeechDocument saveStt(User user, String fileName) {
        return speechRepository.saveAndFlush(SpeechDocument.builder()
                .user(user)
                .operation(SpeechOperation.SPEECH_TO_TEXT)
                .originalFileName(fileName)
                .contentType("audio/wav")
                .fileSize(123L)
                .outputText("transcribed from " + fileName)
                .status(SpeechStatus.COMPLETED)
                .provider("mock-speech")
                .build());
    }

    @Test
    void savePersistsUuidOperationAndTimestamps() {
        User user = createUser("speechrepo1");
        SpeechDocument document = saveStt(user, "clip.wav");

        assertThat(document.getId()).isNotNull();
        assertThat(document.getOperation()).isEqualTo(SpeechOperation.SPEECH_TO_TEXT);
        assertThat(document.getCreatedAt()).isNotNull();
        assertThat(document.getUpdatedAt()).isNotNull();
        assertThat(document.getUser().getId()).isEqualTo(user.getId());
    }

    @Test
    void findByUserId_returnsOnlyThatUsersRecords_paginated() {
        User userA = createUser("speechrepoA");
        User userB = createUser("speechrepoB");
        saveStt(userA, "a1.wav");
        saveStt(userA, "a2.wav");
        saveStt(userB, "b1.wav");

        Page<SpeechDocument> page = speechRepository.findByUserId(userA.getId(),
                PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt")));

        assertThat(page.getTotalElements()).isEqualTo(2);
        assertThat(page.getContent()).extracting(SpeechDocument::getOriginalFileName)
                .containsExactlyInAnyOrder("a1.wav", "a2.wav");

        Page<SpeechDocument> bPage = speechRepository.findByUserId(userB.getId(),
                PageRequest.of(0, 10, Sort.by(Sort.Direction.DESC, "createdAt")));
        assertThat(bPage.getTotalElements()).isEqualTo(1);
        assertThat(bPage.getContent().get(0).getOriginalFileName()).isEqualTo("b1.wav");
    }
}
