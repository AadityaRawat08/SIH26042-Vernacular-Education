package com.project.common.exception;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.ResponseStatus;

/**
 * Base class for expected business-rule violations (HTTP 422 Unprocessable Entity).
 *
 * <p>Domain modules should extend this instead of throwing raw {@link RuntimeException}s
 * so callers get a consistent, debuggable error contract.
 */
@ResponseStatus(HttpStatus.UNPROCESSABLE_ENTITY)
public class BusinessException extends RuntimeException {

    public BusinessException(String message) {
        super(message);
    }

    public BusinessException(String message, Throwable cause) {
        super(message, cause);
    }
}