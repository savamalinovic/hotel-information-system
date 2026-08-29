package org.unibl.etf.efikas.controllers;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.unibl.etf.efikas.models.enums.TaskPriority;
import org.unibl.etf.efikas.models.enums.TaskStatus;
import org.unibl.etf.efikas.models.responses.PageResponse;
import org.unibl.etf.efikas.models.responses.TaskResponse;
import org.unibl.etf.efikas.security.JwtAccessDeniedHandler;
import org.unibl.etf.efikas.security.JwtAuthenticationEntryPoint;
import org.unibl.etf.efikas.security.JwtUtil;
import org.unibl.etf.efikas.security.ApiErrorResponseWriter;
import org.unibl.etf.efikas.services.TaskService;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(TaskController.class)
@Import(ApiErrorResponseWriter.class)
class TaskMineControllerTest {
    @Autowired private MockMvc mockMvc;
    @MockitoBean private TaskService taskService;
    @MockitoBean private JwtUtil jwtUtil;
    @MockitoBean private UserDetailsService userDetailsService;
    @MockitoBean private JwtAuthenticationEntryPoint authenticationEntryPoint;
    @MockitoBean private JwtAccessDeniedHandler accessDeniedHandler;

    @Test
    void workerIdentityComesFromAuthenticationAndWorkerIdQueryIsIgnored() throws Exception {
        when(taskService.mine(eq("worker@example.invalid"), eq(TaskStatus.BLOCKED), any(Pageable.class)))
                .thenReturn(new PageResponse<>(List.of(response(7L, TaskStatus.BLOCKED)), 0, 20, 1, 1));

        mockMvc.perform(get("/api/v1/tasks/mine")
                        .param("status", "BLOCKED")
                        .param("workerId", "999")
                        .with(user("worker@example.invalid").roles("OPERATIONAL_WORKER")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].taskId").value(7))
                .andExpect(jsonPath("$.content[0].assignedWorkerId").value(41))
                .andExpect(jsonPath("$.content[0].status").value("BLOCKED"));

        ArgumentCaptor<Pageable> pageable = ArgumentCaptor.forClass(Pageable.class);
        verify(taskService).mine(eq("worker@example.invalid"), eq(TaskStatus.BLOCKED), pageable.capture());
        assertThat(pageable.getValue().getPageNumber()).isZero();
        assertThat(pageable.getValue().getPageSize()).isEqualTo(20);
        assertThat(pageable.getValue().getSort().getOrderFor("updatedAt").getDirection()).isEqualTo(Sort.Direction.DESC);
    }

    private static TaskResponse response(Long taskId, TaskStatus status) {
        Instant now = Instant.parse("2026-08-21T10:00:00Z");
        return new TaskResponse(taskId, (short) 1, "GENERAL_MAINTENANCE", null, null, 41,
                "Inspect equipment", "Inspect equipment in the boiler room.", TaskPriority.NORMAL, status, now, now);
    }
}
