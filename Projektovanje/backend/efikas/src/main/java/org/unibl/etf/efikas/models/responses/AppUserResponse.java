package org.unibl.etf.efikas.models.responses;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import org.unibl.etf.efikas.models.enums.UserRole;

@Data
public class AppUserResponse {
    @Schema(description = "Stable identifier of the authenticated user.", requiredMode = Schema.RequiredMode.REQUIRED)
    private Integer userId;
    private String name;
    private String surname;
    private String jmbg;
    private String email;
    private String address;
    private UserRole role;
}
