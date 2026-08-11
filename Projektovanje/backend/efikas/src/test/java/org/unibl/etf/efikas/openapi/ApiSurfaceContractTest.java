package org.unibl.etf.efikas.openapi;

import io.swagger.v3.oas.annotations.Hidden;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import org.junit.jupiter.api.Test;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.unibl.etf.efikas.configs.OpenApiConfig;
import org.unibl.etf.efikas.controllers.*;

import java.lang.reflect.Method;
import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ApiSurfaceContractTest {

    private static final List<Class<?>> API_CONTROLLERS = List.of(
            ApartmentController.class,
            ApartmentTypeController.class,
            ApartmentDamageController.class,
            ApartmentExpenseController.class,
            ApartmentTaskController.class,
            ApartmentTraitController.class,
            AppUserController.class,
            AuthController.class,
            BooksController.class,
            CashRegisterController.class,
            DemoReceiptController.class,
            ExpenseCategoryController.class,
            GuestController.class,
            HotelProfileController.class,
            LeaveRequestController.class,
            NotificationsController.class,
            OperationalExpenseController.class,
            PaymentController.class,
            ReservationController.class,
            S3Controller.class,
            SpecializationController.class,
            SettingsController.class,
            TaskController.class,
            UserManagementController.class,
            WorkforceController.class
    );

    @Test
    void everyApiControllerUsesTheV1BasePath() {
        assertThat(API_CONTROLLERS)
                .allSatisfy(controller -> {
                    RequestMapping mapping = controller.getAnnotation(RequestMapping.class);
                    assertThat(mapping).as(controller.getSimpleName()).isNotNull();
                    assertThat(mapping.value())
                            .as(controller.getSimpleName())
                            .allMatch(path -> path.startsWith(OpenApiConfig.API_V1_PATH));
                });
    }

    @Test
    void removedLegacySurfacesAreHiddenFromTheExecutableContract() throws Exception {
        assertThat(ApartmentExpenseController.class).hasAnnotation(Hidden.class);
        assertThat(CashRegisterController.class).hasAnnotation(Hidden.class);
        assertThat(ApartmentTaskController.class).hasAnnotation(Hidden.class);
        assertThat(AuthController.class.getDeclaredMethod("register",
                org.unibl.etf.efikas.models.requests.RegistrationRequest.class)
                .isAnnotationPresent(Hidden.class)).isTrue();
        assertThat(AppUserController.class.getDeclaredMethod("register",
                org.unibl.etf.efikas.models.requests.RegistrationRequest.class)
                .isAnnotationPresent(Hidden.class)).isTrue();
        assertThat(AppUserController.class.getDeclaredMethod("registerStore",
                org.unibl.etf.efikas.models.requests.CreateStoreRequest.class)
                .isAnnotationPresent(Hidden.class)).isTrue();
        assertThat(AppUserController.class.getDeclaredMethod("getAccountStoreInfo")
                .isAnnotationPresent(Hidden.class)).isTrue();
        assertThat(AppUserController.class.getDeclaredMethod("deleteAccount")
                .isAnnotationPresent(Hidden.class)).isTrue();

        assertThat(BooksController.class.getDeclaredMethods())
                .noneMatch(ApiSurfaceContractTest::isLegacyBookWrite);
    }

    @Test
    void protectedControllerGroupsDeclareJwtSecurity() {
        List<Class<?>> protectedControllers = List.of(
                ApartmentController.class,
                ApartmentTypeController.class,
                ApartmentDamageController.class,
                ApartmentTraitController.class,
                BooksController.class,
                DemoReceiptController.class,
                ExpenseCategoryController.class,
                GuestController.class,
                HotelProfileController.class,
                LeaveRequestController.class,
                NotificationsController.class,
                OperationalExpenseController.class,
                PaymentController.class,
                ReservationController.class,
                S3Controller.class,
                SpecializationController.class,
                SettingsController.class,
                TaskController.class,
                UserManagementController.class,
                WorkforceController.class
        );

        assertThat(protectedControllers)
                .allSatisfy(controller -> {
                    SecurityRequirement requirement = controller.getAnnotation(SecurityRequirement.class);
                    assertThat(requirement).as(controller.getSimpleName()).isNotNull();
                    assertThat(requirement.name()).isEqualTo(OpenApiConfig.BEARER_AUTH);
                });
    }

    @Test
    void businessBooksExposeOnlyTheThreeReadModelsAndTheirExports() {
        assertThat(Arrays.stream(BooksController.class.getDeclaredMethods())
                .filter(method -> method.isAnnotationPresent(GetMapping.class))
                .map(method -> method.getAnnotation(GetMapping.class).value()[0]))
                .containsExactlyInAnyOrder(
                        "/domestic-guests", "/foreign-guests", "/income",
                        "/domestic-guests/export", "/foreign-guests/export", "/income/export");
    }

    private static boolean isLegacyBookWrite(Method method) {
        return method.isAnnotationPresent(PostMapping.class) || method.isAnnotationPresent(PutMapping.class);
    }
}
