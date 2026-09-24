package org.unibl.etf.blueStars.models.enums;

public enum UserRole {
    MANAGER,
    AGENT,
    OPERATIONAL_WORKER;

    public String asAuthority() {
        return "ROLE_" + name();
    }
}
