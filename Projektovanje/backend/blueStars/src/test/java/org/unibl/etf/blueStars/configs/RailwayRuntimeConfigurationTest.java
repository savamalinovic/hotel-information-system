package org.unibl.etf.blueStars.configs;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.bind.Bindable;
import org.springframework.boot.context.properties.bind.Binder;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.PropertiesPropertySource;
import org.springframework.core.env.PropertySourcesPropertyResolver;
import org.springframework.core.env.StandardEnvironment;
import org.unibl.etf.blueStars.configs.properties.AwsProperties;
import org.unibl.etf.blueStars.configs.properties.SesProperties;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Map;
import java.util.Properties;

import static org.assertj.core.api.Assertions.assertThat;

class RailwayRuntimeConfigurationTest {
    private final Properties properties = loadRuntimeProperties();

    @Test
    void bindsRailwayPortAndPostgresEnvironmentVariables() {
        assertThat(properties.getProperty("server.port")).isEqualTo("${PORT:8080}");
        PropertySourcesPropertyResolver resolver = resolverFor(Map.of(
                "POSTGRES_HOST", "postgres.internal",
                "POSTGRES_PORT", "5433",
                "POSTGRES_DB", "blue_stars",
                "POSTGRES_USER", "railway_user",
                "POSTGRES_PASSWORD", "not-a-real-password"));

        assertThat(resolver.resolveRequiredPlaceholders(properties.getProperty("spring.datasource.url")))
                .isEqualTo("jdbc:postgresql://postgres.internal:5433/blue_stars");
        assertThat(resolver.resolveRequiredPlaceholders(properties.getProperty("spring.datasource.username")))
                .isEqualTo("railway_user");
        assertThat(resolver.resolveRequiredPlaceholders(properties.getProperty("spring.datasource.password")))
                .isEqualTo("not-a-real-password");
        assertThat(properties.getProperty("spring.jpa.hibernate.ddl-auto")).isEqualTo("validate");
        assertThat(properties.getProperty("spring.flyway.default-schema")).isEqualTo("efikas");
    }

    @Test
    void bindsR2SettingsAndDoesNotContainRuntimeSecrets() {
        StandardEnvironment environment = environmentFor(Map.of(
                "BLUESTARS_AWS_REGION", "auto",
                "BLUESTARS_AWS_ENDPOINT", "https://account.r2.cloudflarestorage.com",
                "BLUESTARS_AWS_PATH_STYLE_ACCESS_ENABLED", "true",
                "BLUESTARS_AWS_ACCESS_KEY_ID", "not-a-real-access-key",
                "BLUESTARS_AWS_SECRET_ACCESS_KEY", "not-a-real-secret"));
        AwsProperties awsProperties = Binder.get(environment).bind("aws", Bindable.of(AwsProperties.class)).get();

        assertThat(awsProperties.getRegion()).isEqualTo("auto");
        assertThat(awsProperties.getEndpoint()).isEqualTo("https://account.r2.cloudflarestorage.com");
        assertThat(awsProperties.isPathStyleAccessEnabled()).isTrue();
        assertThat(awsProperties.getCredentials().getAccessKeyId()).isEqualTo("not-a-real-access-key");
        assertThat(awsProperties.getCredentials().getSecretAccessKey()).isEqualTo("not-a-real-secret");
        assertThat(properties.getProperty("aws.credentials.access-key-id")).isEqualTo("${BLUESTARS_AWS_ACCESS_KEY_ID}");
        assertThat(properties.getProperty("aws.credentials.secret-access-key"))
                .isEqualTo("${BLUESTARS_AWS_SECRET_ACCESS_KEY}");
        assertThat(properties.getProperty("jwt.secret")).isEqualTo("${BLUESTARS_JWT_SECRET}");
    }

    @Test
    void exposesOnlyHealthActuatorEndpoint() {
        assertThat(properties.getProperty("management.endpoints.web.exposure.include")).isEqualTo("health");
    }

    @Test
    void keepsSesDisabledAndSeparateFromR2ByDefault() {
        StandardEnvironment environment = environmentFor(Map.of(
                "BLUESTARS_AWS_REGION", "auto",
                "BLUESTARS_AWS_ACCESS_KEY_ID", "r2-access-key",
                "BLUESTARS_AWS_SECRET_ACCESS_KEY", "r2-secret"));
        SesProperties sesProperties = Binder.get(environment).bind("ses", Bindable.of(SesProperties.class)).get();

        assertThat(sesProperties.isEnabled()).isFalse();
        assertThat(sesProperties.getCredentials().getAccessKeyId()).isEmpty();
        assertThat(sesProperties.getCredentials().getSecretAccessKey()).isEmpty();
        assertThat(properties.getProperty("ses.credentials.access-key-id"))
                .isEqualTo("${BLUESTARS_SES_ACCESS_KEY_ID:}");
        assertThat(properties.getProperty("ses.credentials.secret-access-key"))
                .isEqualTo("${BLUESTARS_SES_SECRET_ACCESS_KEY:}");
    }

    private Properties loadRuntimeProperties() {
        Properties runtimeProperties = new Properties();
        try (InputStream stream = Files.newInputStream(Path.of("src", "main", "resources", "application.properties"))) {
            runtimeProperties.load(stream);
            return runtimeProperties;
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to load runtime application properties", exception);
        }
    }

    private PropertySourcesPropertyResolver resolverFor(Map<String, Object> environmentVariables) {
        return new PropertySourcesPropertyResolver(environmentFor(environmentVariables).getPropertySources());
    }

    private StandardEnvironment environmentFor(Map<String, Object> environmentVariables) {
        StandardEnvironment environment = new StandardEnvironment();
        environment.getPropertySources().addFirst(new MapPropertySource("testEnvironment", environmentVariables));
        environment.getPropertySources().addLast(new PropertiesPropertySource("runtimeProperties", properties));
        return environment;
    }
}
