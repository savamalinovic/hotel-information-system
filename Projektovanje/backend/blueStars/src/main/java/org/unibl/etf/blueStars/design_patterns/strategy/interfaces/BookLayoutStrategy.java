package org.unibl.etf.blueStars.design_patterns.strategy.interfaces;

import org.unibl.etf.blueStars.models.dto.itextpdf.TableConfig;

import java.util.List;

public interface BookLayoutStrategy<T> {
    String generateTitle();
    List<String> generateHeaders();
    TableConfig generateTableConfig();
    List<List<String>> getTableData(T request);
}
