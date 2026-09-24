package org.unibl.etf.blueStars.services;

import org.unibl.etf.blueStars.exceptions.DomainConflictException;
import org.unibl.etf.blueStars.models.entities.AppUser;
import org.unibl.etf.blueStars.models.enums.UserRole;

/**
 * Central policy for roles permitted to use workforce self-service.
 */
public final class WorkforceParticipantPolicy {
    private WorkforceParticipantPolicy() {
    }

    public static boolean isWorkforceParticipant(UserRole role) {
        return role == UserRole.AGENT || role == UserRole.OPERATIONAL_WORKER;
    }

    public static AppUser requireActiveParticipant(AppUser user) {
        if (!user.isActive() || !isWorkforceParticipant(user.getRole())) {
            throw new DomainConflictException("Only an active workforce participant can use self workforce actions.");
        }
        return user;
    }

    public static void requireWorkforceParticipantRole(UserRole role) {
        if (!isWorkforceParticipant(role)) {
            throw new IllegalArgumentException("Role must be AGENT or OPERATIONAL_WORKER.");
        }
    }
}
