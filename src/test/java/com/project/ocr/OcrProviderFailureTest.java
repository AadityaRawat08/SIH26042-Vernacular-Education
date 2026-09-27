package com.project.ocr;

import com.project.common.exception.BusinessException;
import com.project.ocr.dto.OcrResponse;
import com.project.ocr.provider.OcrProvider;
import com.project.user.User;
import com.project.user.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

/**
 * Verifies that an OCR provider failure is handled gracefully: the attempt is
 * persisted as a FAILED record with a safe reason, the failure surfaces as a
 * generic {@link BusinessException}, and no internal exception escapes.
 *
 * <p>{@link MockitoBean} replaces the real {@code MockOcrProvider} with a stub
 * that throws, exercising the failure branch of
 * {@link OcrService#processFile} with a "failing" provider.</p>
 */
@SpringBootTest
class OcrProviderFailureTest {

    @Autowired
    private OcrService ocrService;
    @Autowired
    private OcrRepository ocrRepository;
    @Autowired
    private UserRepository userRepository;

    @MockitoBean
    private OcrProvider ocrProvider;

    @Test
    void providerFailure_persistsFailedRecordWithoutLeakingInternals() {
        User user = userRepository.save(User.builder()
                .username("ocrfailing")
                .email("ocrfailing@example.com")
                .password("x")
                .build());

        when(ocrProvider.name()).thenReturn("failing-ocr");
        when(ocrProvider.extractText(org.mockito.ArgumentMatchers.any()))
                .thenThrow(new RuntimeException("simulated OCR outage"));

        assertThatThrownBy(() -> ocrService.processFile(user.getId(),
                new MockMultipartFile("file", "bad.png", "image/png", new byte[]{1, 2}), null))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("OCR processing failed");

        // The FAILED attempt is still recorded for the user's history.
        assertThat(ocrRepository.findAll()).isNotEmpty();
        OcrDocument failed = ocrRepository.findAll().get(0);
        assertThat(failed.getStatus()).isEqualTo(OcrStatus.FAILED);
        assertThat(failed.getExtractedText()).isNull();
        assertThat(failed.getFailureReason()).isEqualTo("OCR provider 'failing-ocr' failed");
        // Internal details never leak.
        assertThat(failed.getFailureReason()).doesNotContain("simulated OCR outage");
    }
}