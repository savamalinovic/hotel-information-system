package org.unibl.etf.blueStars.models.requests;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ToggleNotificationRequest {
    @NotBlank @Size(max = 150) private String pushToken;
    private boolean enabled;
}
