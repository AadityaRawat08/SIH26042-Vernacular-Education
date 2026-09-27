package com.project.common.exception;

import com.project.auth.JwtService;
import com.project.security.DatabaseUserDetailsService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Web-slice tests proving that {@link GlobalExceptionHandler} produces the
 * standard {@link com.project.common.dto.ErrorResponse} body for validation
 * failures, resource-not-found, and unexpected errors.
 */
@WebMvcTest(controllers = StubTestController.class)
@AutoConfigureMockMvc(addFilters = false)
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    /**
     * The Web MVC slice picks up {@code JwtAuthenticationFilter} (any {@code Filter}
     * bean is a slice candidate) but not the auth module that provides its
     * dependencies — so they are mocked here. {@code addFilters = false} keeps the
     * filter out of request processing entirely.
     */
    @MockitoBean
    private JwtService jwtService;
    @MockitoBean
    private DatabaseUserDetailsService userDetailsService;

    @Test
    void invalidRequestBody_returns400WithFieldErrors() throws Exception {
        mockMvc.perform(post("/stub/echo")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.error").value("Bad Request"))
                .andExpect(jsonPath("$.message").value("Validation failed"))
                .andExpect(jsonPath("$.path").value("/stub/echo"))
                .andExpect(jsonPath("$.fieldErrors.name").value("must not be blank"));
    }

    @Test
    void validRequestBody_returns200() throws Exception {
        mockMvc.perform(post("/stub/echo")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Primary Education\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void missingResource_returns404WithStandardErrorBody() throws Exception {
        mockMvc.perform(get("/stub/missing/42"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404))
                .andExpect(jsonPath("$.message").value("Resource with id 42 was not found"))
                .andExpect(jsonPath("$.path").value("/stub/missing/42"));
    }

    @Test
    void unexpectedError_returns500WithoutInternals() throws Exception {
        mockMvc.perform(get("/stub/boom"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.status").value(500))
                .andExpect(jsonPath("$.message").value("An unexpected error occurred"))
                .andExpect(jsonPath("$.stacktrace").doesNotExist());
    }
}