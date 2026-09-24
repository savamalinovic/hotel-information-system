package org.unibl.etf.blueStars.design_patterns.factory;

import com.itextpdf.layout.element.Table;
import org.springframework.stereotype.Component;
import org.unibl.etf.blueStars.design_patterns.strategy.interfaces.TableStrategy;
import org.unibl.etf.blueStars.models.dto.itextpdf.TableData;
import org.unibl.etf.blueStars.models.enums.TableType;

import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Factory class for generating different types of book tables (info/financial) for PDF files.
 * */
@Component
public class BookTableFactory {
    private final Map<TableType, TableStrategy> strategies;

    public BookTableFactory(List<TableStrategy> strategyList) {
        this.strategies = strategyList.stream()
                .collect(Collectors.toMap(
                        TableStrategy::getTableType,
                        Function.identity()
                ));
    }

    public Table createTable(TableType tableType, TableData tableData) {
        TableStrategy strategy = strategies.get(tableType);
        if (strategy == null) {
            throw new IllegalArgumentException("Unknown table type: " + tableType);
        }

        return strategy.createTable(tableData);
    }
}
