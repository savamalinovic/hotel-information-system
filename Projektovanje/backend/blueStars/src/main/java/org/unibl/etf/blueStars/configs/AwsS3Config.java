package org.unibl.etf.blueStars.configs;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Lazy;
import org.unibl.etf.blueStars.configs.properties.AwsProperties;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.S3ClientBuilder;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.S3Presigner.Builder;

import java.net.URI;

@Configuration
@Lazy
public class AwsS3Config {
    private final AwsProperties awsProperties;

    public AwsS3Config(AwsProperties awsProperties) {
        this.awsProperties = awsProperties;
    }

    @Bean
    public S3Client s3Client() {
        AwsBasicCredentials awsBasicCredentials = AwsBasicCredentials.create(
                awsProperties.getCredentials().getAccessKeyId(), awsProperties.getCredentials().getSecretAccessKey()
        );

        S3ClientBuilder builder = S3Client.builder()
                .region(Region.of(awsProperties.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(awsBasicCredentials));
        if (hasEndpointOverride()) {
            builder.endpointOverride(URI.create(awsProperties.getEndpoint()))
                    .serviceConfiguration(s3Configuration());
        }
        return builder.build();
    }

    @Bean
    public S3Presigner s3Presigner() {
        AwsBasicCredentials awsCredentials = AwsBasicCredentials.create(
                awsProperties.getCredentials().getAccessKeyId(), awsProperties.getCredentials().getSecretAccessKey()
        );

        Builder builder = S3Presigner.builder()
                .region(Region.of(awsProperties.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(awsCredentials));
        if (hasEndpointOverride()) {
            builder.endpointOverride(URI.create(awsProperties.getEndpoint()))
                    .serviceConfiguration(s3Configuration());
        }
        return builder.build();
    }

    private boolean hasEndpointOverride() {
        return awsProperties.getEndpoint() != null && !awsProperties.getEndpoint().isBlank();
    }

    private S3Configuration s3Configuration() {
        return S3Configuration.builder()
                .pathStyleAccessEnabled(awsProperties.isPathStyleAccessEnabled())
                .build();
    }

}
