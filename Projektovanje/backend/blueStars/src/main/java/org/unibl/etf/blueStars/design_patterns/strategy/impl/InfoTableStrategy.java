package org.unibl.etf.blueStars.design_patterns.strategy.impl;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.springframework.stereotype.Component;
import org.unibl.etf.blueStars.design_patterns.strategy.interfaces.TableStrategy;
import org.unibl.etf.blueStars.models.dto.itextpdf.TableConfig;
import org.unibl.etf.blueStars.models.dto.itextpdf.TableData;
import org.unibl.etf.blueStars.models.enums.TableType;

import java.util.List;

/**
 * Creates information type table about the taxpayer
 * */
@Component
public class InfoTableStrategy implements TableStrategy {
    @Override
    public Table createTable(TableData tableData) {
        TableConfig config = tableData.getConfig();

        // Default to 1 column if not specified
        float[] columnWidths = config != null && config.getColumnWidths() != null
                ? config.getColumnWidths()
                : new float[]{1};

        Table table = new Table(UnitValue.createPercentArray(columnWidths));
        table.setWidth(UnitValue.createPercentValue(100));

        // Add title if needed
        if (config != null && config.isHasTitleRow() && tableData.getTitle() != null) {
            int colSpan = columnWidths.length;
            Cell titleCell = new Cell(1, colSpan)
                    .add(new Paragraph(tableData.getTitle()))
                    .setTextAlignment(TextAlignment.CENTER)
                    .simulateBold()
                    .setBorder(Border.NO_BORDER)
                    .setBackgroundColor(ColorConstants.WHITE);
            table.addHeaderCell(titleCell);
        }

        // Add data rows
        if (tableData.getRows() != null) {
            for (List<String> row : tableData.getRows()) {
                if (row.isEmpty()) continue;

                if (row.size() == 1) {
                    // Single column - use full width
                    Cell cell = new Cell(1, columnWidths.length)
                            .add(new Paragraph(row.get(0)))
                            .setPadding(5);

                    table.addCell(cell);
                } else {
                    // Multiple columns - add each separately
                    for (String value : row) {
                        table.addCell(new Cell()
                                .add(new Paragraph(value != null ? value : ""))
                                .setPadding(5));
                    }
                }
            }
        }

        return table;
    }

    @Override
    public TableType getTableType() {
        return TableType.INFO;
    }
}
