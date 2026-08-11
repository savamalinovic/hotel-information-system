package org.unibl.etf.efikas.configs;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springdoc.core.models.GroupedOpenApi;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {
    public static final String API_GROUP = "v1";
    public static final String API_VERSION = "1.0.0";
    public static final String API_V1_PATH = "/api/v1";
    public static final String BEARER_AUTH = "bearerAuth";

    @Bean
    public OpenAPI efikasOpenApi() {
        return new OpenAPI()
                .info(new Info()
                        .title("eFikas Hotel Information System API")
                        .version(API_VERSION)
                        .description("Versioned HTTP API for the operational work of one hotel."))
                .components(new Components().addSecuritySchemes(
                        BEARER_AUTH,
                        new SecurityScheme()
                                .name(BEARER_AUTH)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")));
    }

    @Bean
    public GroupedOpenApi v1OpenApi() {
        return GroupedOpenApi.builder()
                .group(API_GROUP)
                .packagesToScan("org.unibl.etf.efikas.controllers")
                .pathsToMatch(API_V1_PATH + "/**")
                .build();
    }
}
