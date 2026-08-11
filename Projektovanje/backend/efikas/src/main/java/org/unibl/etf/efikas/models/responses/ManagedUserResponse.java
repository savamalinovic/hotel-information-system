package org.unibl.etf.efikas.models.responses;

import org.unibl.etf.efikas.models.enums.UserRole;

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
