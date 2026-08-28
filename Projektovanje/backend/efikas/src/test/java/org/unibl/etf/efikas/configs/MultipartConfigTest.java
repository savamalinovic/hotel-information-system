package org.unibl.etf.efikas.configs;

import jakarta.servlet.MultipartConfigElement;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class MultipartConfigTest {
    @Test
    void configuresTenMegabyteFileLimitWithRequestOverhead() {
        MultipartConfigElement element = new MultipartConfig().multipartConfigElement();

        assertThat(element.getMaxFileSize()).isEqualTo(10L * 1024 * 1024);
        assertThat(element.getMaxRequestSize()).isEqualTo(11L * 1024 * 1024);
    }
}
