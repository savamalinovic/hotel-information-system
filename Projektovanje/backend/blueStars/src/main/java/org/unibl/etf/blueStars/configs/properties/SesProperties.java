package org.unibl.etf.blueStars.configs.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "ses")
@Data
public class SesProperties {
    private boolean enabled;
    private String region;
    private Credentials credentials;

    @Data
    public static class Credentials {
        private String accessKeyId;
        private String secretAccessKey;
    }
}
