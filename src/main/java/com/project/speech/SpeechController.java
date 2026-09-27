package com.project.speech;

import com.project.common.dto.ApiResponse;
import com.project.speech.dto.SpeechHistoryResponse;
import com.project.speech.dto.SpeechResponse;
import com.project.speech.dto.SpeechSynthesisRequest;
import com.project.speech.dto.SpeechTranslateRequest;
import com.project.security.UserPrincipal;
import com.project.translation.dto.TranslationResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.UUID;

/**
 * Authenticated speech processing endpoints.
 *
 * <p>Every route requires a valid Bearer access token (enforced by
 * {@code SecurityConfig}); the authenticated user is taken from the JWT subject
 * and used to scope all reads, deletes, history and translations — a user
 * can never access another user's speech records (404 on foreign ids).</p>
 */
@RestController
@RequestMapping("/api/speech")
@RequiredArgsConstructor
@SecurityRequirement(name = "bearerAuth")
@Tag(name = "Speech", description = "Speech-to-text and text-to-speech processing with per-user history (authenticated)")
public class SpeechController {

    private final SpeechService speechService;

    /**
     * POST /api/speech/transcribe — upload an audio file (multipart {@code file})
     * and transcribe it.
     */
    @PostMapping(value = "/transcribe", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Transcribe an audio file with speech-to-text",
            description = "Uploads an audio file as multipart `file` and runs it through the speech provider. "
                    + "Accepted content types: audio/wav, audio/x-wav, audio/mpeg, audio/mp4, audio/ogg, "
                    + "audio/webm. The file must be non-empty and within the configured size limit. The optional "
                    + "`language` query parameter (ISO 639 code, e.g. `hi`) records the language of the speech and "
                    + "must reference an existing, active language (404 unknown / 422 inactive). "
                    + "Requires a valid Bearer access token; the record is owned by the caller.")
    public ApiResponse<SpeechResponse> transcribe(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestPart("file") MultipartFile file,
            @RequestParam(required = false) String language) {
        return ApiResponse.of("Speech transcribed",
                speechService.transcribe(principal.getId(), file, language));
    }


    /**
     * POST /api/speech/synthesize — convert text to speech (metadata only for now).
     */
    @PostMapping(value = "/synthesize", consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Synthesize speech from text (text-to-speech)",
            description = "Converts the given non-blank `text` to speech through the speech provider. "
                    + "The `language` field (ISO 639 code) is required and must reference an existing, active "
                    + "language (404 unknown / 422 inactive). Returns deterministic provider output metadata "
                    + "(audio format, size, description); no audio binary is produced or stored at this stage. "
                    + "Requires a valid Bearer access token; the record is owned by the caller.")
    public ApiResponse<SpeechResponse> synthesize(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SpeechSynthesisRequest request) {
        return ApiResponse.of("Speech synthesized",
                speechService.synthesize(principal.getId(), request));
    }

    /**
     * POST /api/speech/synthesize/audio — text-to-speech that returns the audio.
     *
     * <p>Same request body as {@code /synthesize}; the difference is the
     * response: the synthesized WAV is streamed back so the browser can play it
     * in the Text → Speech and Speech → Speech modes. The attempt is recorded on
     * the caller's speech history exactly like the metadata-only endpoint.</p>
     */
    @PostMapping(value = "/synthesize/audio",
            consumes = MediaType.APPLICATION_JSON_VALUE,
            produces = "audio/wav")
    @Operation(summary = "Synthesize speech and return the audio",
            description = "Converts `{ text, language }` to speech and streams the resulting WAV "
                    + "(Content-Type audio/wav). Requires a valid Bearer access token; the attempt is "
                    + "recorded in the caller's speech history. Returns 422 when the text is blank, the "
                    + "language is unknown/inactive, or the speech provider cannot produce audio.")
    public ResponseEntity<byte[]> synthesizeAudio(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SpeechSynthesisRequest request) {
        SpeechService.AudioSynthesisResult result =
                speechService.synthesizeAudio(principal.getId(), request);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(result.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"speech.wav\"")
                .contentLength(result.content().length)
                .body(result.content());
    }

    /**
     * GET /api/speech — the current user's speech history, newest first.
     */
    @GetMapping
    @Operation(summary = "List my speech history",
            description = "Returns the authenticated user's speech records (both operations), newest first, as a "
                    + "paginated page. Supports `page` (0-based, default 0) and `size` (default 20, max 100). "
                    + "Audio binaries are never returned.")
    public ApiResponse<SpeechHistoryResponse> history(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.of(speechService.history(principal.getId(), page, size));
    }


    /**
     * GET /api/speech/{id} — a single speech record owned by the caller.
     */
    @GetMapping("/{id}")
    @Operation(summary = "Get a speech record",
            description = "Returns a single speech record. 404 when the id is unknown or belongs to "
                    + "another user (ownership is enforced server-side).")
    public ApiResponse<SpeechResponse> get(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        return ApiResponse.of(speechService.get(principal.getId(), id));
    }

    /**
     * POST /api/speech/{id}/translate — translate the transcribed text using the
     * existing translation architecture.
     */
    @PostMapping("/{id}/translate")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Translate the transcribed text of a speech-to-text record",
            description = "Translates the transcribed text of a COMPLETED speech-to-text record through the "
                    + "existing translation service (the result is persisted in the user's translation history). "
                    + "The source language is the speech record's language when available, otherwise "
                    + "`sourceLanguage` in the request body is used. 404 when the speech id is unknown or belongs "
                    + "to another user; 422 when the record is not a COMPLETED speech-to-text record, its text is "
                    + "blank, no source language could be determined, or target language rules are violated.")
    public ApiResponse<TranslationResponse> translate(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id,
            @Valid @RequestBody SpeechTranslateRequest request) {
        return ApiResponse.of("Translation created",
                speechService.translate(principal.getId(), id, request));
    }

    /**
     * DELETE /api/speech/{id} — deletes a speech record owned by the caller.
     */
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete a speech record",
            description = "Deletes a single speech record. 404 when the id is unknown or belongs to "
                    + "another user (ownership is enforced server-side).")
    public void delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        speechService.delete(principal.getId(), id);
    }
}
