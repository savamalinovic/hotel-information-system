package org.unibl.etf.blueStars.exceptions;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.unibl.etf.blueStars.security.JwtAccessDeniedHandler;
import org.unibl.etf.blueStars.security.JwtAuthFilter;
import org.unibl.etf.blueStars.security.JwtAuthenticationEntryPoint;
import org.unibl.etf.blueStars.security.JwtUtil;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(ErrorProbeController.class)
@AutoConfigureMockMvc(addFilters = false)
@Import(GlobalExceptionHandler.class)
@ActiveProfiles("error-probe")
class GlobalExceptionHandlerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private UserDetailsService userDetailsService;

    @MockitoBean
    private JwtAuthFilter jwtAuthFilter;

    @MockitoBean
    private JwtAuthenticationEntryPoint jwtAuthenticationEntryPoint;

    @MockitoBean
    private JwtAccessDeniedHandler jwtAccessDeniedHandler;

    @Test
    void validationErrorsUseStableEnvelopeAndSortedViolations() throws Exception {
        mockMvc.perform(post("/error-probe/validation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"name":"", "email":"invalid"}
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.timestamp").isNotEmpty())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.code").value("VALIDATION_FAILED"))
                .andExpect(jsonPath("$.message").value("One or more request fields are invalid."))
                .andExpect(jsonPath("$.path").value("/error-probe/validation"))
                .andExpect(jsonPath("$.violations", hasSize(2)))
                .andExpect(jsonPath("$.violations[0].field").value("email"))
                .andExpect(jsonPath("$.violations[1].field").value("name"));
    }

    @Test
    void malformedJsonUsesStableEnvelope() throws Exception {
        mockMvc.perform(post("/error-probe/json")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("MALFORMED_REQUEST"))
                .andExpect(jsonPath("$.violations", hasSize(0)));
    }

    @Test
    void domainConflictIsMappedToConflict() throws Exception {
        mockMvc.perform(get("/error-probe/domain-conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("RESOURCE_CONFLICT"))
                .andExpect(jsonPath("$.message")
                        .value("The resource changed before this request was applied."));
    }

    @Test
    void databaseConflictDoesNotLeakDatabaseDetails() throws Exception {
        mockMvc.perform(get("/error-probe/db-conflict"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("DATA_INTEGRITY_CONFLICT"))
                .andExpect(jsonPath("$.message").value("The request conflicts with existing data."))
                .andExpect(content().string(not(containsString("secret database detail"))));
    }

    @Test
    void missingResourceIsMappedToNotFound() throws Exception {
        mockMvc.perform(get("/error-probe/not-found"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("RESOURCE_NOT_FOUND"))
                .andExpect(jsonPath("$.message").value("Reservation not found."));
    }

    @Test
    void uploadTooLargeUsesStablePayloadTooLargeEnvelope() throws Exception {
        mockMvc.perform(get("/error-probe/upload-too-large"))
                .andExpect(status().isPayloadTooLarge())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.status").value(413))
                .andExpect(jsonPath("$.code").value("BUSINESS_RULE_VIOLATION"))
                .andExpect(jsonPath("$.message").value("Attachment must not exceed 10 MB."))
                .andExpect(jsonPath("$.path").value("/error-probe/upload-too-large"));
    }

    @Test
    void unexpectedFailureIsSanitized() throws Exception {
        mockMvc.perform(get("/error-probe/unexpected"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.code").value("INTERNAL_ERROR"))
                .andExpect(jsonPath("$.message").value("An unexpected error occurred."))
                .andExpect(content().string(not(containsString("secret implementation detail"))));
    }
}
