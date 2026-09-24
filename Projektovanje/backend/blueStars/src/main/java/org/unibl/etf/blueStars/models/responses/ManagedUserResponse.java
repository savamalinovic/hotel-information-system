package org.unibl.etf.blueStars.models.responses;

import org.unibl.etf.blueStars.models.enums.UserRole;

import java.time.Instant;
import java.util.List;

public record ManagedUserResponse(
        Integer id,
        String email,
        String name,
        String surname,
        String jmbg,
        String address,
        String phoneNumber,
        UserRole role,
        boolean active,
        List<SpecializationResponse> specializations,
        Instant createdAt,
        Instant updatedAt
) {
}
