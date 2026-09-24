package org.unibl.etf.blueStars.design_patterns.strategy.impl;

import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.Property;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import org.springframework.stereotype.Component;
import org.unibl.etf.blueStars.design_patterns.strategy.interfaces.TableStrategy;
import org.unibl.etf.blueStars.models.dto.itextpdf.TableConfig;
import org.unibl.etf.blueStars.models.dto.itextpdf.TableData;
import org.unibl.etf.blueStars.models.enums.TableType;
import org.unibl.etf.blueStars.util.Constants;

import java.util.List;

/**
 * ConcreteStrategy for the financial table
 * */
@Component
public class FinancialTableStrategy implements TableStrategy {

    @Override
    public Table createTable(TableData tableData) {
        TableConfig config = tableData.getConfig();
        float[] columnWidths = config.getColumnWidths() != null
                ? config.getColumnWidths()
                : new float[]{50}; // default 50pt

        // Create table with absolute widths
        Table table = new Table(UnitValue.createPercentArray(config.getColumnWidths()));

        // Add title if needed
        if (config != null && config.isHasTitleRow() && tableData.getTitle() != null) {
            int colSpan = columnWidths.length;
            Paragraph paragraph = new Paragraph(tableData.getTitle());
            paragraph.setFontSize(Constants.PdfFonts.FINANCIAL_TABLE_HEADER_FONT_SIZE);
            Cell titleCell = new Cell(1, colSpan)
                    .add(paragraph)
                    .setTextAlignment(TextAlignment.CENTER)
                    .simulateBold()
                    .setBorder(Border.NO_BORDER)
                    .setMaxWidth(UnitValue.createPercentValue(colSpan))
                    .setBackgroundColor(ColorConstants.WHITE);
            table.addHeaderCell(titleCell);
        }

        // Add headers
        tableData.getHeaders().forEach(header ->
                table.addHeaderCell(createHeaderCell(header)));

        // Add column indices
        for(int i = 1; i <= columnWidths.length; i++){
            Cell cell = createCell(i + "", 1, 1);
            cell.setTextAlignment(TextAlignment.CENTER);
            table.addCell(cell);
        }

        // Add data rows
        tableData.getRows().forEach(rowData ->
                addDataRow(table, rowData, config.getColumnWidths().length));

        return table;
    }

    @Override
    public TableType getTableType() {
        return TableType.FINANCIAL;
    }



    private void addDataRow(Table table, List<String> rowData, int totalColumns) {
        for (int i = 0; i < totalColumns; i++) {
            String value = i < rowData.size() ? rowData.get(i) : "";
            TextAlignment alignment = getAlignment(i);

            Cell cell = createCell(value, 1, 1).setTextAlignment(alignment);
            table.addCell(cell);
        }
    }

    private TextAlignment getAlignment(int column) {
        if(column >= 0 && column <= 1) return TextAlignment.CENTER;
        else if(column == 2) return TextAlignment.LEFT;
        else return TextAlignment.RIGHT;
    }

    private Cell createCell(String content, int colSpan, int rowSpan) {
        Paragraph paragraph = new Paragraph(content == null ? "" : content);
        paragraph.setFontSize(Constants.PdfFonts.FINANCIAL_TABLE_FONT_SIZE)
                .setProperty(Property.FLEX_WRAP, TextAlignment.LEFT);
        return new Cell(rowSpan, colSpan).add(paragraph);
    }

    private Cell createHeaderCell(String text) {
        return createCell(text, 1, 1)
                .setBackgroundColor(ColorConstants.LIGHT_GRAY)
                .setTextAlignment(TextAlignment.CENTER)
                .setFontSize(Constants.PdfFonts.FINANCIAL_TABLE_FONT_SIZE);
    }
}
