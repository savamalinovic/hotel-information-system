package org.unibl.etf.blueStars.models.requests;
import jakarta.validation.constraints.*;
public record TaskReasonRequest(@NotBlank @Size(max=300) String reason) {}
