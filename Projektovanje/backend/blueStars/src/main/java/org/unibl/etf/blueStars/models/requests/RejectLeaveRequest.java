package org.unibl.etf.blueStars.models.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RejectLeaveRequest(@NotBlank @Size(max = 300) String reason) {
}
