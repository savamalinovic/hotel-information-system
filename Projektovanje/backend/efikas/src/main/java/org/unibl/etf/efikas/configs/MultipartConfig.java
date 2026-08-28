package org.unibl.etf.efikas.configs;

import jakarta.servlet.MultipartConfigElement;
import org.springframework.boot.web.servlet.MultipartConfigFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.unit.DataSize;

@Configuration
public class MultipartConfig {
    static final DataSize MAX_FILE_SIZE = DataSize.ofMegabytes(10);
    static final DataSize MAX_REQUEST_SIZE = DataSize.ofMegabytes(11);

    @Bean
    public MultipartConfigElement multipartConfigElement() {
        MultipartConfigFactory factory = new MultipartConfigFactory();
        factory.setMaxFileSize(MAX_FILE_SIZE);
        factory.setMaxRequestSize(MAX_REQUEST_SIZE);
        return factory.createMultipartConfig();
    }
}
