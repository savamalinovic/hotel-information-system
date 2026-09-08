package org.unibl.etf.blueStars.models.responses;

import lombok.Data;

@Data
public class ApartmentExpenseResponse {
    private Long apartmentId;
    private String name;
    private Double amount;
    private String note;
    private Boolean status;
    private String expenseType;
}
