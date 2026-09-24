import { AuthenticationResponse, LoginRequest, OAuthLoginResponse, OtpSendRequest, OtpVerifyRequest, ResetPasswordRequest } from "@/src/types/types";
import { API_URLS } from "@/src/util/apiConstants";
import { AxiosResponse } from "axios";
import axiosInstance from "../axiosInstance";

export const authService = {

  // Google OAuth Authentication
  googleLogin: async (googleToken: string): Promise<AxiosResponse<OAuthLoginResponse>> => {
    const response = await axiosInstance.post<OAuthLoginResponse>(API_URLS.auth.googleLogin, { token: googleToken });
    return response;
  },

  login: async (loginRequest: LoginRequest): Promise<AxiosResponse<AuthenticationResponse>> => {
    const response = await axiosInstance.post<AuthenticationResponse>(API_URLS.auth.login, loginRequest);
    return response;
  },

  requestOtp: async (sendOtpRequest: OtpSendRequest): Promise<AxiosResponse> => {
    const response = await axiosInstance.post<void>(API_URLS.auth.requestOtp, sendOtpRequest);
    return response;
  },

  verifyOtp: async (verifyOtpRequest: OtpVerifyRequest): Promise<AxiosResponse> => {
    const response = await axiosInstance.post<void>(API_URLS.auth.verifyOtp, verifyOtpRequest);
    return response;
  },

  resetPassword: async (request: ResetPasswordRequest): Promise<AxiosResponse> => {
    const response = await axiosInstance.put<void>(API_URLS.auth.resetPassword, request);
    return response;
  }
};
