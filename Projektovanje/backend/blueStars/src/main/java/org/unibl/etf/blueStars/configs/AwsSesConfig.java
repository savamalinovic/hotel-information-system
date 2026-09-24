package org.unibl.etf.blueStars.configs;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.unibl.etf.blueStars.configs.properties.SesProperties;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ses.SesClient;

@Configuration
@Lazy
@ConditionalOnProperty(name = "ses.enabled", havingValue = "true")
public class AwsSesConfig {
    private final SesProperties sesProperties;

    public AwsSesConfig(SesProperties sesProperties) {
        this.sesProperties = sesProperties;
    }

    @Bean
    public SesClient sesClient() {
        AwsBasicCredentials awsBasicCredentials = AwsBasicCredentials.create(
                required(sesProperties.getCredentials(), "credentials").getAccessKeyId(),
                required(sesProperties.getCredentials(), "credentials").getSecretAccessKey()
        );

        return SesClient.builder()
                .region(Region.of(required(sesProperties.getRegion(), "region")))
                .credentialsProvider(StaticCredentialsProvider.create(
                        awsBasicCredentials
                ))
                .build();
    }

    private String required(String value, String property) {
        if (value == null || value.isBlank()) {
            throw new IllegalStateException("SES " + property + " must be configured when SES is enabled.");
        }
        return value;
    }

    private SesProperties.Credentials required(SesProperties.Credentials value, String property) {
        if (value == null) {
            throw new IllegalStateException("SES " + property + " must be configured when SES is enabled.");
        }
        required(value.getAccessKeyId(), "access key ID");
        required(value.getSecretAccessKey(), "secret access key");
        return value;
    }
}
