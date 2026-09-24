package org.unibl.etf.blueStars.models.requests;

import lombok.Builder;
import lombok.Data;
import org.unibl.etf.blueStars.models.dto.DateRangeDTO;

@Data
@Builder
public class GuestsBookRequest {
    private DateRangeDTO period;
    private boolean active;
}
