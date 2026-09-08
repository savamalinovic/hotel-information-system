package org.unibl.etf.blueStars.configs;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.unibl.etf.blueStars.configs.properties.AwsProperties;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.ses.SesClient;

@Configuration
@Lazy
public class AwsSesConfig {
    private final AwsProperties awsProperties;

    public AwsSesConfig(AwsProperties awsProperties) {
        this.awsProperties = awsProperties;
    }

    @Bean
    public SesClient sesClient() {
        AwsBasicCredentials awsBasicCredentials = AwsBasicCredentials.create(
                awsProperties.getCredentials().getAccessKeyId(), awsProperties.getCredentials().getSecretAccessKey()
        );

        return SesClient.builder()
                .region(Region.of(awsProperties.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        awsBasicCredentials
                ))
                .build();
    }
}
