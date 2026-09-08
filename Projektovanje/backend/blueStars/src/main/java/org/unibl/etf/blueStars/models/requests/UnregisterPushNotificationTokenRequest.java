package org.unibl.etf.blueStars.models.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UnregisterPushNotificationTokenRequest {
    @NotBlank
    @Size(max = 150)
    private String token;
}
