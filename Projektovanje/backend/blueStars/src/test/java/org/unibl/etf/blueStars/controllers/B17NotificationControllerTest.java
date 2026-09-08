package org.unibl.etf.blueStars.controllers;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.unibl.etf.blueStars.models.responses.NotificationResponse;
import org.unibl.etf.blueStars.models.responses.PageResponse;
import org.unibl.etf.blueStars.security.JwtAccessDeniedHandler;
import org.unibl.etf.blueStars.security.JwtAuthenticationEntryPoint;
import org.unibl.etf.blueStars.security.JwtUtil;
import org.unibl.etf.blueStars.security.ApiErrorResponseWriter;
import org.unibl.etf.blueStars.services.interfaces.NotificationService;

import java.time.Instant;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.argThat;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(NotificationsController.class)
@Import(ApiErrorResponseWriter.class)
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

    @Test
    @WithMockUser(username = "worker@example.test", roles = "OPERATIONAL_WORKER")
    void unregisterUsesOnlyTheAuthenticatedIdentityAndReturnsNoContent() throws Exception {
        mockMvc.perform(post("/api/v1/notifications/push-token/unregister")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"ExponentPushToken[controller-test]\",\"userId\":999}"))
                .andExpect(status().isNoContent());

        verify(service).unregisterPushToken(eq("worker@example.test"),
                argThat(request -> "ExponentPushToken[controller-test]".equals(request.getToken())));
    }

    @Test
    @WithMockUser(username = "agent@example.test", roles = "AGENT")
    void unregisterRejectsAnEmptyToken() throws Exception {
        mockMvc.perform(post("/api/v1/notifications/push-token/unregister")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"token\":\"\"}"))
                .andExpect(status().isBadRequest());
    }
}
