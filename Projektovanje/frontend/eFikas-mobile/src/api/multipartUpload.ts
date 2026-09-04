import { getAdapter, type AxiosAdapter } from "axios";
import axiosInstance from "@/src/api/axiosInstance";

const fetchAdapter = getAdapter("fetch");

const boundarySafeFetchAdapter: AxiosAdapter = (config) => {
  // Axios assigns a default form content type after request interceptors run.
  // Let Fetch inspect FormData and generate the matching boundary instead.
  config.headers.setContentType(undefined);
  return fetchAdapter(config);
};

export const postMultipart = <T>(url: string, formData: FormData) =>
  axiosInstance.post<T>(url, formData, {
    adapter: boundarySafeFetchAdapter,
    timeout: 60_000,
  });
