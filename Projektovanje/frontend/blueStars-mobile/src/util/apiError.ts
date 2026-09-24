import { isAxiosError } from "axios";
import type { TFunction } from "i18next";
import { ApiErrorResponse } from "@/src/types/types";

const isApiErrorResponse = (value: unknown): value is ApiErrorResponse => {
  if (!value || typeof value !== "object") {
    return false;
  }

  const error = value as Partial<ApiErrorResponse>;
  return typeof error.message === "string" && error.message.trim().length > 0;
};

export const getUserFacingErrorMessage = (error: unknown, fallback: string) => {
  if (isAxiosError(error) && isApiErrorResponse(error.response?.data)) {
    return error.response.data.message;
  }

  return fallback;
};

/** Maps transport and HTTP failures without exposing infrastructure details. */
export const getAuthErrorMessage = (error: unknown, t: TFunction) => {
  if (!isAxiosError(error)) {
    return t("auth.errors.server");
  }

  if (error.code === "ECONNABORTED" || error.code === "ETIMEDOUT") {
    return t("auth.errors.timeout");
  }

  if (!error.response) {
    return t("auth.errors.network");
  }

  if (error.response.status === 401) {
    return t("auth.errors.invalidCredentials");
  }

  if (error.response.status >= 500) {
    return t("auth.errors.server");
  }

  if (error.response.status >= 400 && isApiErrorResponse(error.response.data)) {
    return error.response.data.message;
  }

  return t("auth.errors.server");
};
