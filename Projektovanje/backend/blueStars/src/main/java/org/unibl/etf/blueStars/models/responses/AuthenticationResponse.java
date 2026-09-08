package org.unibl.etf.blueStars.models.responses;

import lombok.AllArgsConstructor;
import lombok.Data;
import org.unibl.etf.blueStars.models.dto.UserDTO;

@Data
@AllArgsConstructor
public class AuthenticationResponse {
    private UserDTO userDTO;
    private String accessToken;
}
