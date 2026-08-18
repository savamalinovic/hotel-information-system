package org.unibl.etf.efikas.controllers;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.unibl.etf.efikas.models.responses.NotificationResponse;
import org.unibl.etf.efikas.models.responses.PageResponse;
import org.unibl.etf.efikas.security.JwtAccessDeniedHandler;
import org.unibl.etf.efikas.security.JwtAuthenticationEntryPoint;
import org.unibl.etf.efikas.security.JwtUtil;
import org.unibl.etf.efikas.services.interfaces.NotificationService;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NotificationsController.class)
class B17NotificationControllerTest {
    @Autowired MockMvc mockMvc;
    @MockitoBean NotificationService service;
    @MockitoBean JwtUtil jwtUtil;
    @MockitoBean UserDetailsService userDetailsService;
    @MockitoBean JwtAuthenticationEntryPoint authenticationEntryPoint;
    @MockitoBean JwtAccessDeniedHandler accessDeniedHandler;

    @Test
    @WithMockUser(username = "worker@example.test", roles = "OPERATIONAL_WORKER")
    void inboxSerializesTaskDeepLinkIdAndNullForExistingNotifications() throws Exception {
        when(service.list(eq("worker@example.test"), eq(false), any())).thenReturn(new PageResponse<>(List.of(
                new NotificationResponse(123L, "TASK_AVAILABLE", "Novi zadatak je dostupan",
                        "Provjera — Inspekcija", Instant.parse("2026-08-18T10:00:00Z"), null, 456L),
                new NotificationResponse(124L, "LEAVE_APPROVED", "Odsustvo", "Odobreno",
                        Instant.parse("2026-08-18T10:01:00Z"), null, null)
        ), 0, 20, 2, 1));

        mockMvc.perform(get("/api/v1/notifications"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].taskId").value(456))
                .andExpect(jsonPath("$.content[1].taskId").isEmpty());
    }
}
