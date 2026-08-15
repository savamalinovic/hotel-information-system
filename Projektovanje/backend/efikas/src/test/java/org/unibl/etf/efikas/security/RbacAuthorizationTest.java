package org.unibl.etf.efikas.security;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.unibl.etf.efikas.configs.SecurityConfig;
import org.unibl.etf.efikas.models.enums.UserRole;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(RbacProbeController.class)
@Import({SecurityConfig.class, JwtAuthFilter.class, JwtAuthenticationEntryPoint.class,
        JwtAccessDeniedHandler.class, ApiErrorResponseWriter.class})
@ActiveProfiles("rbac-probe")
class RbacAuthorizationTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @Test
    void loginIsPublic() throws Exception {
        mockMvc.perform(post("/api/v1/auth/login"))
                .andExpect(status().isOk());
    }

    @Test
    void legacySelfRegistrationIsClosed() throws Exception {
        mockMvc.perform(post("/api/v1/auth/register").with(role(UserRole.MANAGER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void anonymousUserCannotReadApartments() throws Exception {
        mockMvc.perform(get("/api/v1/apartments"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.code").value("AUTHENTICATION_REQUIRED"))
                .andExpect(jsonPath("$.path").value("/api/v1/apartments"));
    }

    @Test
    void everyBusinessRoleCanReadApartmentCatalog() throws Exception {
        for (UserRole role : UserRole.values()) {
            mockMvc.perform(get("/api/v1/apartments").with(role(role)))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void onlyManagerCanCreateApartment() throws Exception {
        mockMvc.perform(post("/api/v1/apartments").with(role(UserRole.MANAGER)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/apartments").with(role(UserRole.AGENT)))
                .andExpect(status().isForbidden());
    }

    @Test
    void onlyManagerCanReadBooks() throws Exception {
        mockMvc.perform(get("/api/v1/books/report").with(role(UserRole.MANAGER)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/books/report").with(role(UserRole.AGENT)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/books/income").with(role(UserRole.MANAGER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void onlyManagerCanReadAuditLogs() throws Exception {
        mockMvc.perform(get("/api/v1/audit-logs").with(role(UserRole.MANAGER)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/audit-logs").with(role(UserRole.AGENT)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/audit-logs").with(role(UserRole.OPERATIONAL_WORKER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void reservationsAreUnavailableToOperationalWorker() throws Exception {
        mockMvc.perform(get("/api/v1/reservations/1").with(role(UserRole.AGENT)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/apartments/1/reservations").with(role(UserRole.AGENT)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/reservations/1").with(role(UserRole.OPERATIONAL_WORKER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(patch("/api/v1/reservations/1/status").with(role(UserRole.AGENT)))
                .andExpect(status().isOk());
        mockMvc.perform(patch("/api/v1/reservations/1/status").with(role(UserRole.OPERATIONAL_WORKER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void guestReadsAllowManagerAndAgentButCheckInWritesRequireAgent() throws Exception {
        mockMvc.perform(get("/api/v1/guests/1").with(role(UserRole.MANAGER)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/reservations/1/guests").with(role(UserRole.MANAGER)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/reservations/1/guests").with(role(UserRole.MANAGER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/reservations/1/check-in/claim").with(role(UserRole.MANAGER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/reservations/1/check-in").with(role(UserRole.AGENT)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/reservations/1/check-in").with(role(UserRole.OPERATIONAL_WORKER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/reservations/1/check-out").with(role(UserRole.AGENT)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/reservations/1/check-out").with(role(UserRole.MANAGER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/reservations/1/check-out").with(role(UserRole.OPERATIONAL_WORKER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void agentGeneratesDemoReceiptWhileManagerAndAgentCanReadIt() throws Exception {
        mockMvc.perform(post("/api/v1/reservations/1/demo-receipt").with(role(UserRole.AGENT)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/reservations/1/demo-receipt").with(role(UserRole.MANAGER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/reservations/1/demo-receipt").with(role(UserRole.MANAGER)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/reservations/1/demo-receipt/pdf").with(role(UserRole.AGENT)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/reservations/1/demo-receipt").with(role(UserRole.OPERATIONAL_WORKER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void paymentReadsAllowManagerAndAgentButLedgerWritesRequireAgent() throws Exception {
        mockMvc.perform(get("/api/v1/reservations/1/payments").with(role(UserRole.MANAGER)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/reservations/1/payments").with(role(UserRole.AGENT)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/reservations/1/payments").with(role(UserRole.OPERATIONAL_WORKER)))
                .andExpect(status().isForbidden());

        mockMvc.perform(post("/api/v1/reservations/1/payments").with(role(UserRole.AGENT)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/reservations/1/payments/1/corrections").with(role(UserRole.AGENT)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/reservations/1/payments/1/reversal").with(role(UserRole.AGENT)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/reservations/1/payments").with(role(UserRole.MANAGER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void legacyApartmentTasksAreClosedAndNewTaskActionsHaveExplicitRoles() throws Exception {
        mockMvc.perform(get("/api/v1/apartments/1/tasks").with(role(UserRole.OPERATIONAL_WORKER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/apartments/1/tasks").with(role(UserRole.AGENT)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/tasks").with(role(UserRole.AGENT))).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/tasks").with(role(UserRole.MANAGER))).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/tasks").with(role(UserRole.OPERATIONAL_WORKER))).andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/tasks/available").with(role(UserRole.OPERATIONAL_WORKER))).andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/tasks/1/claim").with(role(UserRole.OPERATIONAL_WORKER))).andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/tasks/1/claim").with(role(UserRole.AGENT))).andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/tasks/1/cancel").with(role(UserRole.AGENT))).andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/tasks/1/cancel").with(role(UserRole.OPERATIONAL_WORKER))).andExpect(status().isForbidden());
    }

    @Test
    void removedAndUnknownEndpointsAreDenied() throws Exception {
        mockMvc.perform(get("/api/v1/cash-registers").with(role(UserRole.MANAGER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/not-in-matrix").with(role(UserRole.MANAGER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void everyBusinessRoleCanReadOwnProfile() throws Exception {
        for (UserRole role : UserRole.values()) {
            mockMvc.perform(get("/api/v1/users/me").with(role(role)))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void onlyManagerCanManageUsers() throws Exception {
        mockMvc.perform(get("/api/v1/users").with(role(UserRole.MANAGER)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/users").with(role(UserRole.MANAGER)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/users").with(role(UserRole.AGENT)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/users").with(role(UserRole.OPERATIONAL_WORKER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void hotelProfileIsReadableByAllRolesButWritableOnlyByManager() throws Exception {
        for (UserRole role : UserRole.values()) {
            mockMvc.perform(get("/api/v1/hotel-profile").with(role(role)))
                    .andExpect(status().isOk());
            mockMvc.perform(get("/api/v1/specializations").with(role(role)))
                    .andExpect(status().isOk());
        }

        mockMvc.perform(put("/api/v1/hotel-profile").with(role(UserRole.MANAGER)))
                .andExpect(status().isOk());
        mockMvc.perform(put("/api/v1/hotel-profile").with(role(UserRole.AGENT)))
                .andExpect(status().isForbidden());
    }

    @Test
    void selfServiceCannotHardDeleteAccount() throws Exception {
        mockMvc.perform(delete("/api/v1/users/me").with(role(UserRole.MANAGER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void managerReadsWorkforceWhileOnlyWorkerUsesSelfAttendance() throws Exception {
        mockMvc.perform(get("/api/v1/workforce/availability").with(role(UserRole.MANAGER)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/workforce/availability").with(role(UserRole.OPERATIONAL_WORKER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/workforce/me/availability").with(role(UserRole.OPERATIONAL_WORKER)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/workforce/me/attendance/clock-in")
                        .with(role(UserRole.OPERATIONAL_WORKER)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/workforce/me/attendance/clock-in").with(role(UserRole.MANAGER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/workforce/me/availability").with(role(UserRole.AGENT)))
                .andExpect(status().isForbidden());
    }

    @Test
    void workerOwnsLeaveRequestsWhileOnlyManagerDecides() throws Exception {
        mockMvc.perform(post("/api/v1/workforce/me/leave-requests")
                        .with(role(UserRole.OPERATIONAL_WORKER)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/workforce/me/leave-requests").with(role(UserRole.MANAGER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/workforce/leave-requests").with(role(UserRole.MANAGER)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/workforce/leave-requests")
                        .with(role(UserRole.OPERATIONAL_WORKER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/workforce/leave-requests/1/approve")
                        .with(role(UserRole.MANAGER)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/workforce/leave-requests/1/approve")
                        .with(role(UserRole.AGENT)))
                .andExpect(status().isForbidden());
    }

    @Test
    void receptionReadsAndCreatesExpensesWhileOnlyManagerControlsCatalogAndVoids() throws Exception {
        mockMvc.perform(get("/api/v1/expense-categories").with(role(UserRole.AGENT)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/expense-categories").with(role(UserRole.AGENT)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/expense-categories").with(role(UserRole.MANAGER)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/expenses").with(role(UserRole.MANAGER)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/expenses").with(role(UserRole.AGENT)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/expenses/1/void").with(role(UserRole.AGENT)))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/api/v1/expenses/1/void").with(role(UserRole.MANAGER)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/expenses").with(role(UserRole.OPERATIONAL_WORKER)))
                .andExpect(status().isForbidden());
    }

    @Test
    void receptionReportsDamageWhileManagerUpdatesAndRelevantWorkerMayReadOrAttach() throws Exception {
        mockMvc.perform(get("/api/v1/apartments/1/damages").with(role(UserRole.MANAGER)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/apartments/1/damages").with(role(UserRole.OPERATIONAL_WORKER)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/apartments/1/damages").with(role(UserRole.AGENT)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/apartments/1/damages")
                        .with(role(UserRole.OPERATIONAL_WORKER)))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/v1/apartments/1/damages/1").with(role(UserRole.AGENT)))
                .andExpect(status().isForbidden());
        mockMvc.perform(put("/api/v1/apartments/1/damages/1").with(role(UserRole.MANAGER)))
                .andExpect(status().isOk());
        mockMvc.perform(post("/api/v1/apartments/1/damages/1/attachments")
                        .with(role(UserRole.OPERATIONAL_WORKER)))
                .andExpect(status().isOk());
    }

    private static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.UserRequestPostProcessor role(
            UserRole role
    ) {
        return user("rbac-test@example.invalid").roles(role.name());
    }

}
