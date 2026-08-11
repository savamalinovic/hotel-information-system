package org.unibl.etf.efikas.models.responses;

import lombok.Data;
import org.unibl.etf.efikas.models.enums.UserRole;

@Data
public class AppUserResponse {
    private String name;
    private String surname;
    private String jmbg;
    private String email;
    private String address;
    private UserRole role;
}
