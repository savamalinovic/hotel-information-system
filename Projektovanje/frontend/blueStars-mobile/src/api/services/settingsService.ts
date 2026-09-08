import { AppErrorDTO } from "@/src/types/types";
import axiosInstance from "../axiosInstance";
import { API_URLS } from "@/src/util/apiConstants";
import { AxiosResponse } from "axios";

export const settingsService = {
	registerAppError: async (appErrorDTO: AppErrorDTO): Promise<AxiosResponse> => {
		const response = await axiosInstance.post<AppErrorDTO>(API_URLS.settings.registerError, appErrorDTO);
		return response;
	}
}