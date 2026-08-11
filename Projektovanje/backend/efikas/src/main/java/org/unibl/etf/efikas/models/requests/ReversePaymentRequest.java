package org.unibl.etf.efikas.models.requests;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReversePaymentRequest(
        @NotBlank @Size(max = 300) String reason
) {
}
