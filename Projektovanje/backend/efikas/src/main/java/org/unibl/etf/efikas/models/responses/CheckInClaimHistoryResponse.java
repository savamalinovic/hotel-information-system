package org.unibl.etf.efikas.models.responses;

import org.unibl.etf.efikas.models.enums.CheckInClaimAction;

import java.time.Instant;

public record CheckInClaimHistoryResponse(
        Long historyId,
        CheckInClaimAction action,
        Integer previousClaimedByUserId,
        Integer claimedByUserId,
        Integer performedByUserId,
        Instant performedAt
) {
}
