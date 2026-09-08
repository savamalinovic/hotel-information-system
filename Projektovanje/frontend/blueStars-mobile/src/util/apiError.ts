import { isAxiosError } from "axios";
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
