package org.unibl.etf.blueStars.configs;

import org.junit.jupiter.api.Test;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.unibl.etf.blueStars.configs.properties.AwsProperties;
import org.unibl.etf.blueStars.configs.properties.SesProperties;
import org.unibl.etf.blueStars.services.impl.AwsEmailService;
import org.unibl.etf.blueStars.services.impl.DisabledEmailService;
import org.unibl.etf.blueStars.services.interfaces.EmailService;
import software.amazon.awssdk.services.ses.SesClient;
import software.amazon.awssdk.services.s3.S3Client;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SesConfigurationTest {
    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withUserConfiguration(TestConfiguration.class)
            .withPropertyValues(
                    "aws.region=auto",
                    "aws.endpoint=https://account.r2.cloudflarestorage.com",
                    "aws.path-style-access-enabled=true",
                    "aws.credentials.access-key-id=r2-access-key",
                    "aws.credentials.secret-access-key=r2-secret",
                    "aws.bucket-name=private-bucket");

    @Test
    void startsWithR2AndNoSesCredentialsWhenSesIsDisabled() {
        contextRunner.withPropertyValues("ses.enabled=false")
                .run(context -> {
                    assertThat(context).hasSingleBean(EmailService.class);
                    assertThat(context).hasSingleBean(DisabledEmailService.class);
                    assertThat(context).doesNotHaveBean(SesClient.class);
                    assertThat(context.getBean(S3Client.class)).isNotNull();
                });
    }

    @Test
    void enabledSesCreatesEmailServiceFromSeparateConfiguration() {
        contextRunner.withPropertyValues(
                        "ses.enabled=true",
                        "ses.region=eu-central-1",
                        "ses.credentials.access-key-id=ses-access-key",
                        "ses.credentials.secret-access-key=ses-secret",
                        "email.sender=no-reply@example.com")
                .run(context -> {
                    assertThat(context).hasSingleBean(AwsEmailService.class);
                    assertThat(context).hasSingleBean(SesClient.class);
                    assertThat(context.getBean(SesClient.class)).isNotNull();
                    SesProperties sesProperties = context.getBean(SesProperties.class);
                    assertThat(sesProperties.getRegion()).isEqualTo("eu-central-1");
                    assertThat(sesProperties.getCredentials().getAccessKeyId()).isEqualTo("ses-access-key");
                    assertThat(sesProperties.getCredentials().getSecretAccessKey()).isEqualTo("ses-secret");
                    assertThat(context.getBean(AwsProperties.class).getRegion()).isEqualTo("auto");
                });
    }

    @Test
    void disabledEmailServiceFailsWithoutPretendingToSend() {
        contextRunner.withPropertyValues("ses.enabled=false")
                .run(context -> assertThatThrownBy(() -> context.getBean(EmailService.class)
                        .sendEmail("user@example.com", "message"))
                        .isInstanceOf(org.unibl.etf.blueStars.exceptions.EmailServiceUnavailableException.class));
    }

    @Configuration(proxyBeanMethods = false)
    @EnableConfigurationProperties({AwsProperties.class, SesProperties.class})
    @Import({AwsS3Config.class, AwsSesConfig.class, AwsEmailService.class, DisabledEmailService.class})
    static class TestConfiguration {
    }
}
