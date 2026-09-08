package org.unibl.etf.blueStars.models.responses;
import org.unibl.etf.blueStars.models.enums.*; import java.time.Instant;
public record TaskResponse(Long taskId, Short specializationId, String specializationCode, Integer apartmentId, Integer reservationId, Integer assignedWorkerId, String title, String description, TaskPriority priority, TaskStatus status, Instant createdAt, Instant updatedAt) {}
