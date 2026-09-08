package org.unibl.etf.blueStars.configs;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ObjectMapperConfigTest {

    private final ObjectMapper objectMapper = new ObjectMapperConfig().objectMapper();

    @Test
    void serializesJavaTimeValuesUsingTheOpenApiStringFormats() throws Exception {
        JsonNode json = objectMapper.valueToTree(Map.of(
                "date", LocalDate.of(2026, 8, 27),
                "timestamp", Instant.parse("2026-08-27T15:30:45Z")
        ));

        assertThat(json.get("date").isTextual()).isTrue();
        assertThat(json.get("date").textValue()).isEqualTo("2026-08-27");
        assertThat(json.get("timestamp").isTextual()).isTrue();
        assertThat(json.get("timestamp").textValue()).isEqualTo("2026-08-27T15:30:45Z");
    }
}
