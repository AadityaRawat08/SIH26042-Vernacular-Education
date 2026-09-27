package com.project.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Login request payload.
 *
 * <p>The {@code password} field is used only for credential verification and is
 * never logged or echoed back in any response.</p>
 *
 * @param email    the account's email address
 * @param password the raw password
 */
public record LoginRequest(
        @NotBlank(message = "email must not be blank")
        @Email(message = "email must be a valid email address")
        @Size(max = 254, message = "email must be at most 254 characters")
        String email,

        @NotBlank(message = "password must not be blank")
        @Size(max = 100, message = "password must be at most 100 characters")
        String password) {
}