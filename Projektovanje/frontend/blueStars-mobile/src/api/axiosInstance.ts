import axios, { AxiosError } from "axios";
import { sessionStore } from "@/src/session/sessionStore";
import { API_BASE_PATH, apiEndpointService } from "@/src/services/apiEndpointService";

type UnauthorizedHandler = () => Promise<void> | void;

let unauthorizedHandler: UnauthorizedHandler | undefined;
let isHandlingUnauthorized = false;

export const setUnauthorizedHandler = (handler: UnauthorizedHandler | undefined) => {
  unauthorizedHandler = handler;
};

export const resetUnauthorizedHandling = () => {
  isHandlingUnauthorized = false;
};

const isLoginRequest = (url: string | undefined) => url?.endsWith("/auth/login") ?? false;

const axiosInstance = axios.create({
  baseURL: apiEndpointService.getBaseUrl(),
});

axiosInstance.interceptors.request.use(
  (config) => {
    // Rewrite the build-time API host to the locally selected test endpoint.
    // API paths remain unchanged while the device can switch networks at runtime.
    config.baseURL = apiEndpointService.getBaseUrl();
    if (typeof config.url === "string") {
      const apiPathStart = config.url.indexOf(API_BASE_PATH);
      if (apiPathStart >= 0) {
        config.url = config.url.slice(apiPathStart + API_BASE_PATH.length) || "/";
      }
    }

    const token = sessionStore.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error) => Promise.reject(error)
);

axiosInstance.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const shouldEndSession =
      error.response?.status === 401 &&
      !isLoginRequest(error.config?.url) &&
      Boolean(sessionStore.getToken()) &&
      !isHandlingUnauthorized;

    if (shouldEndSession) {
      isHandlingUnauthorized = true;
      await Promise.resolve(unauthorizedHandler?.());
    }

    return Promise.reject(error);
  }
);

export default axiosInstance;
