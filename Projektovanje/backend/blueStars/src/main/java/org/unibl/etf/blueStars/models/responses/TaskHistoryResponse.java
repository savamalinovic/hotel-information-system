package org.unibl.etf.blueStars.models.responses;
import org.unibl.etf.blueStars.models.enums.TaskStatus; import java.time.Instant;
public record TaskHistoryResponse(Long id, TaskStatus fromStatus, TaskStatus toStatus, Integer actorId, String reason, Instant changedAt) {}
