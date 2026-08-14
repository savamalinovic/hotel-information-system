package org.unibl.etf.efikas.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.unibl.etf.efikas.models.responses.errors.ApiErrorCode;
import org.unibl.etf.efikas.models.responses.errors.ApiErrorResponse;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class ApiErrorResponseWriter {
    private final ObjectMapper objectMapper;

    public void write(
            HttpServletRequest request,
            HttpServletResponse response,
            int status,
            ApiErrorCode code,
            String message
    ) throws IOException {
        response.setStatus(status);
        response.setCharacterEncoding("UTF-8");
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        objectMapper.writeValue(
                response.getOutputStream(),
                ApiErrorResponse.of(status, code, message, request.getRequestURI()));
    }
}
