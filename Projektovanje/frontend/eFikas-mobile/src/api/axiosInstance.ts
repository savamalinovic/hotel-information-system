import axios, { AxiosError } from "axios";
import { sessionStore } from "@/src/session/sessionStore";
import { API_BASE_URL } from "@/src/util/apiConstants";

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
  baseURL: API_BASE_URL,
});

axiosInstance.interceptors.request.use(
  (config) => {
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
