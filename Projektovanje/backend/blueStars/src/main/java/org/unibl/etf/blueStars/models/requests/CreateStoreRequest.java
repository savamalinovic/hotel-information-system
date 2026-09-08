package org.unibl.etf.blueStars.models.requests;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.unibl.etf.blueStars.models.dto.books.StoreDTO;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateStoreRequest {
    private String name;
    private String address;
    private String activity;
    private String activityCode;
    private String jib;
}
