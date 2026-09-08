import axiosInstance from "../axiosInstance";
import { API_URLS } from "@/src/util/apiConstants";
import { UserProfile } from "@/src/types/types";

export const profileService = {
    fetchProfile: async (): Promise<UserProfile> => {
        const response = await axiosInstance.get<UserProfile>(API_URLS.profile.get);
        return response.data;
    },
};
