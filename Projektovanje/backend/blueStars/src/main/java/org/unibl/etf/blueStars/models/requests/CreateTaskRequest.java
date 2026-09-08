package org.unibl.etf.blueStars.models.requests;
import jakarta.validation.constraints.*; import org.unibl.etf.blueStars.models.enums.TaskPriority;
public record CreateTaskRequest(@NotNull Short specializationId, Integer apartmentId, Integer reservationId, @NotBlank @Size(max=120) String title, @NotBlank @Size(max=1000) String description, @NotNull TaskPriority priority) {}
