package org.unibl.etf.blueStars.models.dto;

import lombok.Builder;
import lombok.Data;

import java.util.Map;

@Data
@Builder
public class NotificationMessageDTO {
    private String recipientToken;
    private String title;
    private String body;
    private Map<String, String> data;
}
