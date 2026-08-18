import { useQuery } from '@tanstack/react-query';
import { profileService } from "@/src/api/services/profileService";
import { UserProfile } from "@/src/types/types";

export const useProfile = () => {
    const {
        data: profile,
        isLoading: isLoadingProfile,
        isError: isProfileError,
        error: profileError,
        refetch,
    } = useQuery<UserProfile, Error>({
        queryKey: ["profile"],
        queryFn: profileService.fetchProfile,
        retry: 1,
    });

    return {
        profile,
        isLoading: isLoadingProfile,
        isError: isProfileError,
        error: (profileError as Error)?.message ?? null,
        refetch,
    };
};
