package org.unibl.etf.efikas.controllers;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.unibl.etf.efikas.services.AnalyticsService;
import org.unibl.etf.efikas.security.JwtUtil;
import org.unibl.etf.efikas.security.JwtAccessDeniedHandler;
import org.unibl.etf.efikas.security.JwtAuthenticationEntryPoint;
import org.unibl.etf.efikas.security.ApiErrorResponseWriter;

import java.time.LocalDate;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AnalyticsController.class)
@Import(ApiErrorResponseWriter.class)
class B16AnalyticsControllerTest {
    @Autowired MockMvc mockMvc;
    @MockitoBean AnalyticsService service;
    @MockitoBean JwtUtil jwtUtil;
    @MockitoBean UserDetailsService userDetailsService;
    @MockitoBean JwtAuthenticationEntryPoint authenticationEntryPoint;
    @MockitoBean JwtAccessDeniedHandler accessDeniedHandler;

    @Test
    @WithMockUser(username = "manager@example.test", roles = "MANAGER")
    void passesExplicitAndMissingPeriodsToService() throws Exception {
        mockMvc.perform(get("/api/v1/analytics")
                        .param("from", "2026-08-01").param("to", "2026-08-12"))
                .andExpect(status().isOk());
        verify(service).summary("manager@example.test",
                LocalDate.of(2026, 8, 1), LocalDate.of(2026, 8, 12));

        mockMvc.perform(get("/api/v1/analytics")).andExpect(status().isOk());
        verify(service).summary("manager@example.test", null, null);
    }

    @Test
    @WithMockUser(username = "manager@example.test", roles = "MANAGER")
    void invalidPeriodUsesStandardBadRequestEnvelope() throws Exception {
        when(service.summary(eq("manager@example.test"), any(), any()))
                .thenThrow(new IllegalArgumentException("Analytics from must not be after to."));

        mockMvc.perform(get("/api/v1/analytics")
                        .param("from", "2026-08-12").param("to", "2026-08-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("BUSINESS_RULE_VIOLATION"));
    }
}
