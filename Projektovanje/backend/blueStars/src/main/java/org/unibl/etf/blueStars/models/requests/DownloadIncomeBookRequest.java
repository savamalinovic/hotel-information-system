package org.unibl.etf.blueStars.models.requests;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.unibl.etf.blueStars.models.dto.DateRangeDTO;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DownloadIncomeBookRequest {
    private int taxpayerId;
    private int storeId;
    private DateRangeDTO period;
}
