package org.unibl.etf.blueStars.models.dto.books;

import lombok.Builder;
import lombok.Data;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
public class IncomeBroughtStateDTO {
    private LocalDate periodStart;
    private LocalDate periodEnd;
    private int entryCount;
    private String description;
    private LocalDate accountingDate;
    private BigDecimal productSaleRevenue;
    private BigDecimal goodsSaleRevenue;
    private BigDecimal serviceSaleRevenue;
    private BigDecimal otherRevenue;
    private BigDecimal financialRevenue;
    private BigDecimal totalRevenue;
    private BigDecimal vatAmount;
}
