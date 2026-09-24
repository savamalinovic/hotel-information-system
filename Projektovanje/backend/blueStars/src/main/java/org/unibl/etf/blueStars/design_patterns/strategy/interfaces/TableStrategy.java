package org.unibl.etf.blueStars.design_patterns.strategy.interfaces;

import com.itextpdf.layout.element.Table;
import org.unibl.etf.blueStars.models.dto.itextpdf.TableData;
import org.unibl.etf.blueStars.models.enums.TableType;

/**
 * Strategy interface for creating tables for PDF files
 * */
public interface TableStrategy {

    /**
     * Handles creation of iTextPdf tables based on table data.
     * @param tableData The table data to populate the table
     * */
    Table createTable(TableData tableData);

    /**
     * Gets the table type {@code TableType.INFO, TableType.FINANCIAL}
     * */
    TableType getTableType();
}
