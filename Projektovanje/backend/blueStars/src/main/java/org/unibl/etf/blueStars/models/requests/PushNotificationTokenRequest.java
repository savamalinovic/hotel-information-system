package org.unibl.etf.blueStars.models.requests;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PushNotificationTokenRequest {
    @NotBlank @Size(max = 150) private String token;
    @NotBlank @Pattern(regexp = "android|ios") private String platform;
}
