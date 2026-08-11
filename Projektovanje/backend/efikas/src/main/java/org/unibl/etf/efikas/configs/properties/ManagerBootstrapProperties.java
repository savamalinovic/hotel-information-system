package org.unibl.etf.efikas.configs.properties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "efikas.bootstrap.manager")
@Data
public class ManagerBootstrapProperties {
    private String email;
    private String password;
    private String name;
    private String surname;
    private String jmbg;
    private String address;
    private String phoneNumber;
}
