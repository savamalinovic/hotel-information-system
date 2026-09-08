package org.unibl.etf.blueStars.models.requests;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.util.Set;

public record AssignSpecializationsRequest(
        @NotNull Set<@Positive Short> specializationIds
) {
    public AssignSpecializationsRequest {
        specializationIds = specializationIds == null ? null : Set.copyOf(specializationIds);
    }
}
