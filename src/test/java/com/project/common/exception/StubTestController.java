package com.project.common.exception;

import com.project.common.dto.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Minimal controller used only by {@link GlobalExceptionHandlerTest} to exercise
 * the exception-handling chain (validation, not-found, unexpected errors).
 *
 * <p>Lives in the test sources on purpose; it is not part of the application.
 */
@RestController
@RequestMapping("/stub")
public class StubTestController {

    public record EchoRequest(@NotBlank(message = "must not be blank") String name) {
    }

    @PostMapping("/echo")
    public ApiResponse<String> echo(@Valid @RequestBody EchoRequest request) {
        return ApiResponse.of("Echo", request.name());
    }

    @GetMapping("/missing/{id}")
    public ApiResponse<String> missing(@PathVariable long id) {
        throw new ResourceNotFoundException("Resource with id " + id + " was not found");
    }

    @GetMapping("/boom")
    public ApiResponse<String> boom() {
        throw new IllegalStateException("simulated internal failure");
    }
}