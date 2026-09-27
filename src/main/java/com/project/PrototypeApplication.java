package com.project;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.ConfigurationPropertiesScan;

/**
 * Entry point of the Prototype backend — an AI-powered Vernacular Education and
 * Real-Time Translation platform for Indian languages.
 *
 * <p>Architecture: MODULAR MONOLITH.
 * Controllers → Services → Repositories → PostgreSQL. Domain modules live in
 * sibling packages inside {@code com.project} and share the {@code common} and
 * {@code config} packages.
 */
@SpringBootApplication
@ConfigurationPropertiesScan
public class PrototypeApplication {

    public static void main(String[] args) {
        SpringApplication.run(PrototypeApplication.class, args);
    }
}