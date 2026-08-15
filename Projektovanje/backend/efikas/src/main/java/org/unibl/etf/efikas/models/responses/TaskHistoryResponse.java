package org.unibl.etf.efikas.models.responses;
import org.unibl.etf.efikas.models.enums.TaskStatus; import java.time.Instant;
public record TaskHistoryResponse(Long id, TaskStatus fromStatus, TaskStatus toStatus, Integer actorId, String reason, Instant changedAt) {}
