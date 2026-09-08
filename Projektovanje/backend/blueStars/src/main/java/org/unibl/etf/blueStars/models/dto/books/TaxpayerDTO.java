package org.unibl.etf.blueStars.models.dto.books;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TaxpayerDTO {
    private String fullName;
    private String jmbg;
    private String address;
}
