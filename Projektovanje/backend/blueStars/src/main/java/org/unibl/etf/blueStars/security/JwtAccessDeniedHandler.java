package org.unibl.etf.blueStars.security;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.stereotype.Component;
import org.unibl.etf.blueStars.models.responses.errors.ApiErrorCode;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtAccessDeniedHandler implements AccessDeniedHandler {
    private final ApiErrorResponseWriter errorWriter;

    @Override
    public void handle(
            HttpServletRequest request,
            HttpServletResponse response,
            AccessDeniedException accessDeniedException
    ) throws IOException, ServletException {
        errorWriter.write(
                request,
                response,
                HttpServletResponse.SC_FORBIDDEN,
                ApiErrorCode.ACCESS_DENIED,
                "Access is denied.");
    }
}
