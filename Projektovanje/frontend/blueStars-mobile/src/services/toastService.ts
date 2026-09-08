import Toast from "react-native-toast-message";

const VISIBILITY_DURATION = 3000;
export const toastService = {
    success(message: string, description?: string) {
        Toast.show({
            type: "success",
            text1: message,
            text2: description,
            position: "top",
            visibilityTime: VISIBILITY_DURATION,
        });
    },

    error(message: string, description?: string) {
        Toast.show({
            type: "error",
            text1: message,
            text2: description,
            position: "top",
            visibilityTime: VISIBILITY_DURATION,
        });
    },

    warning(message: string, description?: string) {
        Toast.show({
            type: "info",
            text1: `⚠️  ${message}`,
            text2: description,
            position: "top",
            visibilityTime: VISIBILITY_DURATION,
        });
    },

    info(message: string, description?: string) {
        Toast.show({
            type: "info",
            text1: message,
            text2: description,
            position: "top",
            visibilityTime: VISIBILITY_DURATION,
        });
    },

    custom(
        type: "success" | "error" | "info",
        config: Record<string, any>
    ) {
        Toast.show({
            type,
            ...config,
        });
    },
} as const;