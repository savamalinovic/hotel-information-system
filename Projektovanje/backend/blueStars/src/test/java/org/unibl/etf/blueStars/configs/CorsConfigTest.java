package org.unibl.etf.blueStars.configs;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.unibl.etf.blueStars.configs.properties.CorsProperties;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CorsConfigTest {
    private final CorsConfig corsConfig = new CorsConfig();

    @Test
    void onlyConfiguredOriginsAreAllowedWithExplicitBrowserPermissions() {
        CorsProperties properties = new CorsProperties();
        properties.setAllowedOrigins(List.of("https://manager.example.com"));

        CorsConfiguration configuration = corsConfig.corsConfigurationSource(properties)
                .getCorsConfiguration(new MockHttpServletRequest());

        assertThat(configuration.getAllowedOrigins()).containsExactly("https://manager.example.com");
        assertThat(configuration.getAllowedOrigins()).doesNotContain("*");
        assertThat(configuration.getAllowedMethods()).containsExactly("GET", "POST", "PUT", "DELETE", "OPTIONS");
        assertThat(configuration.getAllowedHeaders()).containsExactly("Authorization", "Content-Type", "Accept", "Origin");
        assertThat(configuration.getAllowCredentials()).isTrue();
    }

    @Test
    void emptyProductionConfigurationAllowsNoOrigins() {
        CorsConfiguration configuration = corsConfig.corsConfigurationSource(new CorsProperties())
                .getCorsConfiguration(new MockHttpServletRequest());

        assertThat(configuration.getAllowedOrigins()).isEmpty();
    }
}
