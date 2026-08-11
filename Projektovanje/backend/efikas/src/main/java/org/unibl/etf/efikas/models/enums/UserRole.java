package org.unibl.etf.efikas.models.enums;

public enum UserRole {
    MANAGER,
    AGENT,
    OPERATIONAL_WORKER;

    public String asAuthority() {
        return "ROLE_" + name();
    }
}
