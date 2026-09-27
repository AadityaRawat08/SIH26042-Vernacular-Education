package com.project.health;

import com.project.auth.JwtService;
import com.project.security.DatabaseUserDetailsService;
import com.project.translation.TranslationProviderStatusService;
import com.project.translation.TranslationServiceStatus;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Web-slice test for the application health endpoint.
 */
@WebMvcTest(HealthController.class)
@AutoConfigureMockMvc(addFilters = false)
class HealthControllerTest {

    @Autowired
    private MockMvc mockMvc;

    /**
     * The Web MVC slice picks up {@code JwtAuthenticationFilter} (any
     * {@code Filter} bean is a slice candidate) but not the auth module that
     * provides its dependencies — so they are mocked here. {@code addFilters
     * = false} keeps the filter out of request processing entirely.
     */
    @MockitoBean
    private JwtService jwtService;
    @MockitoBean
    private DatabaseUserDetailsService userDetailsService;

    /** The pipeline status source is a service (outside the Web slice), so it is mocked. */
    @MockitoBean
    private TranslationProviderStatusService translationProviderStatusService;

    @Test
    void health_returns200WithServiceMetadata() throws Exception {
        mockMvc.perform(get("/api/health"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("UP"))
                .andExpect(jsonPath("$.data.service").value("prototype-backend"))
                .andExpect(jsonPath("$.data.version").isNotEmpty())
                .andExpect(jsonPath("$.data.timestamp").isNotEmpty());
    }

    @Test
    void translationStatus_returns200AndReportsThePipelineMode() throws Exception {
        when(translationProviderStatusService.status()).thenReturn(new TranslationServiceStatus(
                "http", "http://localhost:8000", true, false, true, "demo",
                List.of("en", "hi", "sat"), "AI translation service has no Bhashini key."));

        mockMvc.perform(get("/api/health/translation"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/json"))
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.configuredProvider").value("http"))
                .andExpect(jsonPath("$.data.mode").value("demo"))
                .andExpect(jsonPath("$.data.aiServiceReachable").value(true))
                .andExpect(jsonPath("$.data.translationReady").value(false))
                .andExpect(jsonPath("$.data.demoFallbackActive").value(true))
                .andExpect(jsonPath("$.data.supportedLanguages[2]").value("sat"));
    }
}