package org.unibl.etf.blueStars.design_patterns.factory;

import org.springframework.stereotype.Component;
import org.unibl.etf.blueStars.models.enums.BookType;
import org.unibl.etf.blueStars.models.requests.BookRequest;
import org.unibl.etf.blueStars.services.impl.books.BaseBookPdfService;
import org.unibl.etf.blueStars.handlers.BookTypeHandler;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * Factory class for generating different types of BookPdfServices
 * */
@Component
public class BookPdfFactory {
    private final Map<BookType, BaseBookPdfService<? extends BookRequest>> registry;

    // Sva sreca pa Spring manage-uje bean-ovima, da se automatski populiše
    public BookPdfFactory(List<BookTypeHandler> handlers) {
        this.registry = handlers.stream()
                .collect(Collectors.toMap(
                        BookTypeHandler::getSupportedType,
                        handler -> (BaseBookPdfService<?>) handler
                ));
    }

    @SuppressWarnings("unchecked")
    public <R extends BookRequest> BaseBookPdfService<R> get(BookType type) {
        return (BaseBookPdfService<R>) registry.get(type);
    }
}
