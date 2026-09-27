package com.project.speech.provider;

import com.project.config.VoiceServiceProperties;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequestFactory;
import org.springframework.http.client.JdkClientHttpRequestFactory;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;

import java.time.Duration;
import java.util.Map;

/**
 * {@link SpeechProvider} that delegates speech-to-text and text-to-speech to the
 * external voice services API (the Python FastAPI "Member 5" service).
 *
 * <p>Activated only when {@code speech.provider=http} is set; otherwise the
 * development {@link MockSpeechProvider} remains in use. The service is reached
 * at {@code voice-service.base-url} (default {@code http://localhost:8001}).</p>
 *
 * <p>Failures are surfaced as {@link RuntimeException}s; {@code SpeechService}
 * already catches those, persists a FAILED record, and returns a clean error to
 * the frontend without exposing Python internals.</p>
 */
@Component
@ConditionalOnProperty(name = "speech.provider", havingValue = "http")
public class HttpSpeechProvider implements SpeechProvider {

    public static final String PROVIDER_NAME = "voice-service";

    private final VoiceServiceProperties properties;
    private final RestClient restClient;

    public HttpSpeechProvider(VoiceServiceProperties properties) {
        this.properties = properties;
        this.restClient = RestClient.builder()
                .baseUrl(properties.baseUrl())
                .requestFactory(requestFactory(properties.timeoutSeconds()))
                .build();
    }

    @Override
    public String name() {
        return PROVIDER_NAME;
    }

    @Override
    public SpeechToTextResult transcribe(SpeechInput input) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("file", new ByteArrayResource(input.content()) {
            @Override
            public String getFilename() {
                return input.originalFileName();
            }
        });
        if (input.languageCode() != null && !input.languageCode().isBlank()) {
            builder.part("language", input.languageCode());
        }

        SttResponse response;
        try {
            response = restClient.post()
                    .uri("/stt/transcribe")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(builder.build())
                    .retrieve()
                    .body(SttResponse.class);
        } catch (RestClientException ex) {
            throw new RuntimeException("Voice service is unavailable", ex);
        }

        if (response == null || !Boolean.TRUE.equals(response.success())) {
            throw new RuntimeException("Voice service could not transcribe the audio");
        }
        if (response.text() == null || response.text().isBlank()) {
            throw new RuntimeException("Voice service returned an empty transcription");
        }

        return new SpeechToTextResult(response.text(), response.language());
    }

    @Override
    public TextToSpeechResult synthesize(SynthesisInput input) {
        Map<String, Object> body = Map.of(
                "text", input.text(),
                "language", input.languageCode() == null ? "en" : input.languageCode(),
                "gender", "male");

        TtsResponse response;
        try {
            response = restClient.post()
                    .uri("/tts/synthesize")
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(TtsResponse.class);
        } catch (RestClientException ex) {
            throw new RuntimeException("Voice service is unavailable", ex);
        }

        if (response == null || !Boolean.TRUE.equals(response.success())) {
            throw new RuntimeException("Voice service could not synthesize the audio");
        }

        long byteLength = response.audioByteLength() == null ? 0L : response.audioByteLength();
        String contentType = response.audioContentType() == null ? "audio/wav" : response.audioContentType();
        String description = response.description() == null ? "Synthesized speech" : response.description();

        return new TextToSpeechResult(contentType, byteLength, description);
    }

    @Override
    public TextToSpeechAudio synthesizeAudio(SynthesisInput input) {
        Map<String, Object> body = Map.of(
                "text", input.text(),
                "language", input.languageCode() == null ? "en" : input.languageCode(),
                "gender", "male");

        byte[] audio;
        try {
            audio = restClient.post()
                    .uri("/tts/synthesize/file")
                    .contentType(MediaType.APPLICATION_JSON)
                    .accept(MediaType.ALL)
                    .body(body)
                    .retrieve()
                    .body(byte[].class);
        } catch (RestClientException ex) {
            throw new RuntimeException("Voice service is unavailable", ex);
        }

        if (audio == null || audio.length == 0) {
            throw new RuntimeException("Voice service returned no audio");
        }

        return new TextToSpeechAudio("audio/wav", audio);
    }

    private static ClientHttpRequestFactory requestFactory(int timeoutSeconds) {
        java.net.http.HttpClient httpClient = java.net.http.HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(timeoutSeconds))
                .build();
        JdkClientHttpRequestFactory factory = new JdkClientHttpRequestFactory(httpClient);
        factory.setReadTimeout(Duration.ofSeconds(timeoutSeconds));
        return factory;
    }

    /** Parsed shape of the voice service {@code /stt/transcribe} response. */
    public record SttResponse(Boolean success, String text, String language, String error) {
    }

    /** Parsed shape of the voice service {@code /tts/synthesize} response. */
    public record TtsResponse(
            Boolean success,
            @com.fasterxml.jackson.annotation.JsonProperty("audio_content_type") String audioContentType,
            @com.fasterxml.jackson.annotation.JsonProperty("audio_byte_length") Long audioByteLength,
            String description, String error) {
    }
}
