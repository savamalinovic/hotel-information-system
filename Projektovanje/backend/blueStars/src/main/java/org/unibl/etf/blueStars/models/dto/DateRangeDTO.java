package org.unibl.etf.blueStars.models.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DateRangeDTO {
    /**
     * "from" date will be 01.01 of current fiscal year (or any selected)
     * */
    @Builder.Default
    private LocalDate from = LocalDate.of(LocalDate.now().getYear(), 1, 1);
    /**
     * "to" date will be the current day of current fiscal year (or any selected)
     * */
    @Builder.Default
    private LocalDate to = LocalDate.now();
}
