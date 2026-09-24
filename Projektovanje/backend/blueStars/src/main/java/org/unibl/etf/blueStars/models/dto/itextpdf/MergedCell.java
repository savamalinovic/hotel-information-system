package org.unibl.etf.blueStars.models.dto.itextpdf;

import com.itextpdf.layout.properties.TextAlignment;
import lombok.Builder;
import lombok.Data;

/**
 * Represents a merged cell DTO across rows and/or columns
 * */
@Data
@Builder
public class MergedCell {
    private int row;
    private int column;
    private int rowSpan;
    private int colSpan;
    private String content;
    private TextAlignment alignment;
}
