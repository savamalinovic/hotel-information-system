package org.unibl.etf.blueStars.models.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class ApartmentTaskNotificationDTO {
    private String name;
    private String token;
    private Instant dateTime;
    private boolean userEnabledNotification;
}
