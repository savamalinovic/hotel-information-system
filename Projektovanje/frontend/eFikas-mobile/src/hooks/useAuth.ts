import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { authService } from "@/src/api/services/authService";
import { useSession } from "@/src/providers/SessionProvider";
import { toastService } from "@/src/services/toastService";
import { LoginRequest, ResetPasswordRequest } from "@/src/types/types";
import { getUserFacingErrorMessage } from "@/src/util/apiError";

export const useAuth = () => {
  const { t } = useTranslation();
  const { signIn, signOut } = useSession();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => signIn(credentials),
    onSuccess: () => {
      toastService.success(
        t("auth.login.toastMessages.successTitle"),
        t("auth.login.toastMessages.successMsg")
      );
      router.replace("/");
    },
    onError: (error: unknown) => {
      toastService.error(
        t("auth.login.toastMessages.errorTitle"),
        getUserFacingErrorMessage(error, t("auth.login.toastMessages.errorMsg"))
      );
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (request: ResetPasswordRequest) => authService.resetPassword(request),
    onSuccess: (response) => {
      if (response.status !== 200) {
        throw new Error("Password reset failed.");
      }

      toastService.success(
        t("auth.forgotPassword.toastMessages.successTitle"),
        t("auth.forgotPassword.toastMessages.successMsg")
      );
      router.replace("/(auth)");
    },
    onError: (error: unknown) => {
      toastService.error(
        t("auth.forgotPassword.toastMessages.errorTitle"),
        getUserFacingErrorMessage(error, t("auth.forgotPassword.toastMessages.errorMsg"))
      );
    },
  });

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await signOut();
      toastService.success(
        t("auth.logout.toastMessages.successTitle"),
        t("auth.logout.toastMessages.successMsg")
      );
      router.replace("/");
    } finally {
      setIsLoggingOut(false);
    }
  };

  return {
    login: loginMutation.mutate,
    logout,
    resetPassword: resetPasswordMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isLoggingOut,
    isResettingPassword: resetPasswordMutation.isPending,
    loginError: loginMutation.error,
    resetPasswordError: resetPasswordMutation.error,
  };
};
