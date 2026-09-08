package org.unibl.etf.blueStars.controllers;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.unibl.etf.blueStars.models.enums.UserRole;
import org.unibl.etf.blueStars.models.responses.AppUserResponse;
import org.unibl.etf.blueStars.security.JwtAccessDeniedHandler;
import org.unibl.etf.blueStars.security.JwtAuthenticationEntryPoint;
import org.unibl.etf.blueStars.security.JwtUtil;
import org.unibl.etf.blueStars.security.ApiErrorResponseWriter;
import org.unibl.etf.blueStars.services.AppUserService;
import org.unibl.etf.blueStars.services.StoreService;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AppUserController.class)
@Import(ApiErrorResponseWriter.class)
class C05CurrentUserIdentityControllerTest {
    @Autowired MockMvc mockMvc;
    @MockitoBean AppUserService appUserService;
    @MockitoBean StoreService storeService;
    @MockitoBean JwtUtil jwtUtil;
    @MockitoBean UserDetailsService userDetailsService;
    @MockitoBean JwtAuthenticationEntryPoint authenticationEntryPoint;
    @MockitoBean JwtAccessDeniedHandler accessDeniedHandler;

    @Test
    void eachBusinessRoleReceivesOnlyItsOwnProfileIdFromTheAuthenticationContext() throws Exception {
        Map<String, AppUserResponse> profiles = Map.of(
                "agent@example.invalid", profile(101, UserRole.AGENT, "Agent"),
                "manager@example.invalid", profile(202, UserRole.MANAGER, "Manager"),
                "worker@example.invalid", profile(303, UserRole.OPERATIONAL_WORKER, "Worker"));
        when(appUserService.getCurrentUserInfo(any(Authentication.class))).thenAnswer(invocation ->
                profiles.get(invocation.getArgument(0, Authentication.class).getName()));

        requestProfile("agent@example.invalid", UserRole.AGENT, 101);
        requestProfile("manager@example.invalid", UserRole.MANAGER, 202);
        requestProfile("worker@example.invalid", UserRole.OPERATIONAL_WORKER, 303);

        ArgumentCaptor<Authentication> authentication = ArgumentCaptor.forClass(Authentication.class);
        verify(appUserService, org.mockito.Mockito.times(3)).getCurrentUserInfo(authentication.capture());
        assertThat(authentication.getAllValues()).extracting(Authentication::getName)
                .containsExactly("agent@example.invalid", "manager@example.invalid", "worker@example.invalid");
    }

    @Test
    @WithMockUser(username = "agent@example.invalid", roles = "AGENT")
    void currentProfileKeepsExistingFieldsAlongsideTheStableUserId() throws Exception {
        when(appUserService.getCurrentUserInfo(any(Authentication.class))).thenReturn(
                profile(101, UserRole.AGENT, "Agent"));

        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(101))
                .andExpect(jsonPath("$.name").value("Agent"))
                .andExpect(jsonPath("$.surname").value("Surname"))
                .andExpect(jsonPath("$.jmbg").value("1234567890123"))
                .andExpect(jsonPath("$.email").value("agent@example.invalid"))
                .andExpect(jsonPath("$.address").value("Address"))
                .andExpect(jsonPath("$.role").value("AGENT"));
    }

    private void requestProfile(String email, UserRole role, int expectedUserId) throws Exception {
        mockMvc.perform(get("/api/v1/users/me")
                        .param("userId", "999")
                        .param("email", "someone-else@example.invalid")
                        .with(user(email).roles(role.name())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.userId").value(expectedUserId));
    }

    private static AppUserResponse profile(int userId, UserRole role, String name) {
        AppUserResponse response = new AppUserResponse();
        response.setUserId(userId); response.setName(name); response.setSurname("Surname");
        response.setJmbg("1234567890123"); response.setEmail(role.name().toLowerCase() + "@example.invalid");
        response.setAddress("Address"); response.setRole(role);
        return response;
    }
}
