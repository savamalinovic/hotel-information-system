package org.unibl.etf.efikas.openapi;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.boot.autoconfigure.flyway.FlywayAutoConfiguration;
import org.springframework.boot.autoconfigure.jdbc.DataSourceAutoConfiguration;
import org.springframework.boot.autoconfigure.orm.jpa.HibernateJpaAutoConfiguration;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.unibl.etf.efikas.configs.OpenApiConfig;
import org.unibl.etf.efikas.controllers.AppUserController;
import org.unibl.etf.efikas.controllers.AuthController;
import org.unibl.etf.efikas.controllers.HotelProfileController;
import org.unibl.etf.efikas.controllers.NotificationsController;
import org.unibl.etf.efikas.controllers.SpecializationController;
import org.unibl.etf.efikas.controllers.UserManagementController;
import org.unibl.etf.efikas.security.JwtUtil;
import org.unibl.etf.efikas.services.AppUserService;
import org.unibl.etf.efikas.services.HotelProfileService;
import org.unibl.etf.efikas.services.SpecializationService;
import org.unibl.etf.efikas.services.StoreService;
import org.unibl.etf.efikas.services.UserManagementService;
import org.unibl.etf.efikas.services.interfaces.NotificationService;
import org.unibl.etf.efikas.services.interfaces.OAuthService;
import org.unibl.etf.efikas.services.interfaces.OtpService;

import static org.hamcrest.Matchers.hasItems;
import static org.hamcrest.Matchers.startsWith;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(classes = OpenApiContractTest.ContractTestApplication.class)
@AutoConfigureMockMvc(addFilters = false)
@ActiveProfiles("openapi-contract")
class OpenApiContractTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AppUserService appUserService;

    @MockitoBean
    private StoreService storeService;

    @MockitoBean
    private OtpService otpService;

    @MockitoBean
    private OAuthService oAuthService;

    @MockitoBean
    private JwtUtil jwtUtil;

    @MockitoBean
    private HotelProfileService hotelProfileService;

    @MockitoBean
    private SpecializationService specializationService;

    @MockitoBean
    private UserManagementService userManagementService;

    @MockitoBean
    private NotificationService notificationService;

    @Test
    void generatedV1ContractContainsVersionedTypedLoginAndStableErrors() throws Exception {
        mockMvc.perform(get("/v3/api-docs/v1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openapi", startsWith("3.")))
                .andExpect(jsonPath("$.info.title").value("eFikas Hotel Information System API"))
                .andExpect(jsonPath("$.info.version").value(OpenApiConfig.API_VERSION))
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.type").value("http"))
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.scheme").value("bearer"))
                .andExpect(jsonPath("$.components.securitySchemes.bearerAuth.bearerFormat").value("JWT"))
                .andExpect(jsonPath("$.paths['/api/v1/auth/login'].post").exists())
                .andExpect(jsonPath("$.paths['/api/v1/auth/login'].post.requestBody.content['application/json'].schema.$ref")
                        .value("#/components/schemas/LoginRequest"))
                .andExpect(jsonPath("$.paths['/api/v1/auth/login'].post.responses['200'].content['application/json'].schema.$ref")
                        .value("#/components/schemas/LoginResponse"))
                .andExpect(jsonPath("$.paths['/api/v1/auth/login'].post.responses['400'].content['application/json'].schema.$ref")
                        .value("#/components/schemas/ApiErrorResponse"))
                .andExpect(jsonPath("$.components.schemas.LoginRequest.required", hasItems("email", "password")))
                .andExpect(jsonPath("$.components.schemas.ApiErrorResponse.properties.violations.type")
                        .value("array"))
                .andExpect(jsonPath("$.paths['/api/v1/hotel-profile'].get").exists())
                .andExpect(jsonPath("$.paths['/api/v1/hotel-profile'].put").exists())
                .andExpect(jsonPath("$.paths['/api/v1/users'].get").exists())
                .andExpect(jsonPath("$.paths['/api/v1/users'].post").exists())
                .andExpect(jsonPath("$.paths['/api/v1/users/{userId}/status'].patch").exists())
                .andExpect(jsonPath("$.paths['/api/v1/users/{userId}/specializations'].put").exists())
                .andExpect(jsonPath("$.paths['/api/v1/users/me'].get.responses['200'].content['*/*'].schema.$ref")
                        .value("#/components/schemas/AppUserResponse"))
                .andExpect(jsonPath("$.components.schemas.AppUserResponse.required", hasItems("userId")))
                .andExpect(jsonPath("$.components.schemas.AppUserResponse.properties.userId.type").value("integer"))
                .andExpect(jsonPath("$.paths['/api/v1/specializations'].get").exists())
                .andExpect(jsonPath("$.components.schemas.CreateManagedUserRequest.properties.password.writeOnly")
                        .value(true))
                .andExpect(jsonPath("$.components.schemas.ManagedUserResponse.properties.password").doesNotExist())
                .andExpect(jsonPath("$.paths['/api/v1/notifications'].get").exists())
                .andExpect(jsonPath("$.components.schemas.NotificationResponse.properties.taskId.type")
                        .value("integer"))
                .andExpect(jsonPath("$.components.schemas.LoginResponse.properties.userId").doesNotExist())
                .andExpect(jsonPath("$.paths['/api/v1/auth/register']").doesNotExist());
    }

    @SpringBootConfiguration
    @EnableAutoConfiguration(exclude = {
            DataSourceAutoConfiguration.class,
            HibernateJpaAutoConfiguration.class,
            FlywayAutoConfiguration.class
    })
    @Import({OpenApiConfig.class, AuthController.class, AppUserController.class, HotelProfileController.class,
            SpecializationController.class, UserManagementController.class, NotificationsController.class})
    static class ContractTestApplication {
    }
}
