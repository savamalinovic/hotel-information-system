package org.unibl.etf.efikas.configs.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "aws")
@Data
public class AwsProperties {
    private String region;
    private String endpoint;
    private boolean pathStyleAccessEnabled;
    private Credentials credentials;

    @Data
    public static class Credentials {
        private String accessKeyId;
        private String secretAccessKey;
    }
}
