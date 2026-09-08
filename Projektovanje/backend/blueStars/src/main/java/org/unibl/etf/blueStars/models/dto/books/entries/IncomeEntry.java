package org.unibl.etf.blueStars.models.dto.books.entries;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.unibl.etf.blueStars.models.responses.ApartmentResponse;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Represents the raw data (rows) of the income table.
 * */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class IncomeEntry {
    @Builder.Default
    private Integer id = 0;
    private ApartmentResponse apartment;
    @Builder.Default
    private LocalDate accountingDate = LocalDate.now();
    @Builder.Default
    private String description = "";
    @Builder.Default
    private BigDecimal productSaleRevenue = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal goodsSaleRevenue = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal serviceSaleRevenue = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal otherRevenue = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal financialRevenue = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal totalRevenue = BigDecimal.ZERO;
    @Builder.Default
    private BigDecimal vatAmount = BigDecimal.ZERO;


}
