package org.unibl.etf.blueStars.models.requests;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import jakarta.validation.ValidatorFactory;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.unibl.etf.blueStars.models.dto.ChangePasswordDTO;
import org.unibl.etf.blueStars.models.enums.UserRole;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

class AuthenticationRequestValidationTest {
    private static ValidatorFactory validatorFactory;
    private static Validator validator;

    @BeforeAll
    static void createValidator() {
        validatorFactory = Validation.buildDefaultValidatorFactory();
        validator = validatorFactory.getValidator();
    }

    @AfterAll
    static void closeValidator() {
        validatorFactory.close();
    }

    @Test
    void loginRequiresValidEmailAndPasswordLength() {
        LoginRequest request = new LoginRequest("not-an-email", "short");

        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactlyInAnyOrder("email", "password");
    }

    @Test
    void registrationValidatesDatabaseBoundsAndPasswordConfirmation() {
        RegistrationRequest request = new RegistrationRequest();
        request.setEmail("agent@example.com");
        request.setPassword("password-one");
        request.setRepeatPassword("password-two");
        request.setName("Agent");
        request.setSurname("Example");
        request.setJmbg("123");
        request.setAddress("Hotel address");

        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactlyInAnyOrder("jmbg", "passwordConfirmed");
    }

    @Test
    void passwordResetRequiresSixDigitOtpAndMatchingPasswords() {
        ChangePasswordDTO request = new ChangePasswordDTO();
        request.setEmail("agent@example.com");
        request.setNewPassword("new-password");
        request.setConfirmPassword("other-password");
        request.setOtp("12AB");

        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .containsExactlyInAnyOrder("otp", "passwordConfirmed");
    }

    @Test
    void managedUserRequestValidatesIdentityAndPasswordBounds() {
        CreateManagedUserRequest request = new CreateManagedUserRequest(
                "invalid-email",
                "short",
                "A",
                "B",
                "123",
                "x",
                "abc",
                UserRole.OPERATIONAL_WORKER,
                Set.of((short) 0));

        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("email", "password", "name", "surname", "jmbg", "address", "phoneNumber",
                        "specializationIds[].<iterable element>");
    }
}
