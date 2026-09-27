package com.project;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Verifies that the full Spring application context (web, security, JPA,
 * actuator, OpenAPI) starts without errors.
 */
@SpringBootTest
class PrototypeApplicationTests {

    @Test
    void contextLoads() {
        // Context started successfully — that is the assertion.
    }
}