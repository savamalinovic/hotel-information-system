package org.unibl.etf.blueStars.configs.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;

@Component
@ConfigurationProperties(prefix = "efikas.cors")
@Data
public class CorsProperties {
    private List<String> allowedOrigins = new ArrayList<>();
}
