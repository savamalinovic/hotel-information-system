import { t } from "i18next";
import { z } from "zod";

const REQUIRED_FIELD_ERROR = t("auth.errors.requiredFieldError");
const LENGTH_MIN_ERROR = (minLength: number) => t("common.errors.lengthMinError", { length: minLength });

export namespace StoreValidation {
  export const schema = z.object({
    name: z.string(REQUIRED_FIELD_ERROR)
      .min(2, t("profile.store.validation.nameError")),
    address: z.string(REQUIRED_FIELD_ERROR)
      .min(5, t("profile.store.validation.addressError")),
    activity: z.string(REQUIRED_FIELD_ERROR)
      .min(2, t("profile.store.validation.activityError")),
    activityCode: z.string(REQUIRED_FIELD_ERROR)
      .regex(/^\d+(\.\d+)*$/, t("profile.store.validation.activityCodeError")),
    jib: z.string(REQUIRED_FIELD_ERROR)
      .length(13, t("profile.store.validation.jibLengthError"))
      .regex(/^\d+$/, t("profile.store.validation.jibFormatError")),
  });

  export type FormValues = z.infer<typeof schema>;
}

export namespace LoginValidation {
  export const schema = z.object({
    email: z.email(t("auth.errors.emailError")).min(10, LENGTH_MIN_ERROR(10)),
    password: z.string(REQUIRED_FIELD_ERROR).min(8, t("auth.errors.passwordLengthError")),
  });

  export type FormValues = z.infer<typeof schema>;
}

export namespace RegistrationValidation {
  export const schema = z
    .object({
      name: z.string(REQUIRED_FIELD_ERROR).min(2, t("profile.store.validation.nameError")),
      surname: z.string(REQUIRED_FIELD_ERROR).min(2, t("profile.store.validation.nameError")),
      email: z.email(t("auth.errors.emailError")).min(10, t("auth.errors.emailError", { length: 10 })),
      password: z.string(REQUIRED_FIELD_ERROR).min(8, t("auth.errors.passwordLengthError")),
      repeatPassword: z.string(REQUIRED_FIELD_ERROR).min(8, t("auth.errors.passwordLengthError")),
      jmbg: z.string(REQUIRED_FIELD_ERROR).length(13, t("auth.errors.jmbgLengthError")).regex(/^\d+$/, t("auth.errors.jmbgFormatError")),
      address: z.string(REQUIRED_FIELD_ERROR).min(5, t("auth.errors.addressLengthError", { length: 5 })),
      phoneNumber: z.string(REQUIRED_FIELD_ERROR).min(11, t("auth.errors.phoneNumberLengthError"))
        .regex(
          /^06[0-9]\/\d{3}-\d{3}$/,
          t("auth.errors.phoneNumberFormatError"),
        ),
    })
    .refine((data) => data.password === data.repeatPassword, {
      message: t("auth.errors.passwordMismatchError"),
      path: ["repeatPassword"],
    });

  export type FormValues = z.infer<typeof schema>;
}

export namespace ResetPasswordValidation {
  export const schema = z
    .object({
      email: z.email(t("auth.errors.emailError")).min(10, LENGTH_MIN_ERROR(10)),
      password: z.string(REQUIRED_FIELD_ERROR).min(8, t("auth.errors.passwordLengthError")),
      repeatPassword: z.string(REQUIRED_FIELD_ERROR).min(8, t("auth.errors.passwordLengthError")),
    })
    .refine((data) => data.password === data.repeatPassword, {
      message: t("auth.errors.passwordMismatchError"),
      path: ["repeatPassword"],
    });

  export type FormValues = z.infer<typeof schema>;
}
