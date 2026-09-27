package com.project.language.dto;

import com.project.language.Script;

import java.util.UUID;

/**
 * Public view of a {@link Script} (writing system).
 *
 * @param id          unique id
 * @param name        English display name, e.g. "Devanagari"
 * @param code        ISO 15924 code, e.g. {@code Deva}
 * @param description optional description
 */
public record ScriptResponse(
        UUID id,
        String name,
        String code,
        String description) {

    public static ScriptResponse from(Script script) {
        return new ScriptResponse(
                script.getId(),
                script.getName(),
                script.getCode(),
                script.getDescription());
    }
}