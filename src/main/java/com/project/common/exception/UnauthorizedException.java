package com.project.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Thrown when a request cannot be authenticated (HTTP 401 Unauthorized).
 *
 * <p>Used for failed logins, invalid/expired refresh tokens, and similar
 * authentication failures. Messages are intentionally generic so attackers
 * cannot learn whether an email address or account exists.</p>
 */
@ResponseStatus(HttpStatus.UNAUTHORIZED)
public class UnauthorizedException extends RuntimeException {

    public UnauthorizedException(String message) {
        super(message);
    }

    public UnauthorizedException(String message, Throwable cause) {
        super(message, cause);
    }
}