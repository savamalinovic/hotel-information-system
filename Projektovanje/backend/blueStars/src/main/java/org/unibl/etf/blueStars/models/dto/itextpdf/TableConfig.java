package org.unibl.etf.blueStars.models.dto.itextpdf;

import lombok.Builder;
import lombok.Data;

import java.util.List;

/**
 * Represents the configuration DTO for a table
 * */
@Data
@Builder
public class TableConfig {
    private float[] columnWidths;
    private boolean hasTitleRow;
    private boolean hasTotalRow;
    private String title;
    private List<MergedCell> mergedCells;
}
