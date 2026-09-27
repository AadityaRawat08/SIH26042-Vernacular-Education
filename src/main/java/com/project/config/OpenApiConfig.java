package com.project.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * OpenAPI / Swagger documentation settings.
 *
 * <p>Swagger UI: {@code /swagger-ui.html}
 * <br>OpenAPI spec: {@code /v3/api-docs}
 */
@Configuration
public class OpenApiConfig {

    @Bean
    public OpenAPI prototypeOpenAPI(
            @Value("${info.app.name}") String appName,
            @Value("${info.app.version}") String appVersion,
            @Value("${info.app.description}") String description) {

        final String bearerScheme = "bearerAuth";
        return new OpenAPI()
                .info(new Info()
                        .title(appName)
                        .description(description)
                        .version(appVersion)
                        .contact(new Contact()
                                .name("Prototype Backend Team")
                                .email("backend@example.com")))
                // Bearer JWT security scheme — applied per-endpoint via
                // @SecurityRequirement on protected controllers (e.g. AuthController).
                .components(new Components().addSecuritySchemes(bearerScheme,
                        new SecurityScheme()
                                .name(bearerScheme)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")))
                .addSecurityItem(new SecurityRequirement().addList(bearerScheme));
    }
}