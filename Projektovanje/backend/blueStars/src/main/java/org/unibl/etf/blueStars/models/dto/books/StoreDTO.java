package org.unibl.etf.blueStars.models.dto.books;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StoreDTO {
    private String name;
    private String address;
    private String activity;
    private String activityCode;
    private String jib;
}
