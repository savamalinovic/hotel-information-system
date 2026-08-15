package org.unibl.etf.efikas.models.responses;
import org.unibl.etf.efikas.models.enums.*; import java.time.Instant;
public record TaskResponse(Long taskId, Short specializationId, String specializationCode, Integer apartmentId, Integer reservationId, Integer assignedWorkerId, String title, String description, TaskPriority priority, TaskStatus status, Instant createdAt, Instant updatedAt) {}
