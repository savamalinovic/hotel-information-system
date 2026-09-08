import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

export type PushPlatform = "android" | "ios";
export type PushAvailability = "ready" | "permission-undetermined" | "permission-denied" | "web" | "physical-device-required" | "project-id-missing";

export class PushSetupError extends Error {
  constructor(public readonly availability: Exclude<PushAvailability, "ready">) {
    super(availability);
  }
}

const getNativePlatform = (): PushPlatform | null => {
  if (Platform.OS === "android" || Platform.OS === "ios") {
    return Platform.OS;
  }
  return null;
};

const getProjectId = (): string | null => {
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  return typeof projectId === "string" && projectId.trim().length > 0 ? projectId : null;
};

const getBaseAvailability = (): Exclude<PushAvailability, "ready" | "permission-undetermined" | "permission-denied"> | null => {
  if (!getNativePlatform()) return "web";
  if (!Device.isDevice) return "physical-device-required";
  if (!getProjectId()) return "project-id-missing";
  return null;
};

const configureAndroidChannel = async () => {
  if (Platform.OS !== "android") return;
  await Notifications.setNotificationChannelAsync("default", {
    name: "default",
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: "#FF231F7C",
  });
};

export const notificationsService = {
  isNativePushPlatform: () => getNativePlatform() !== null,
  getPlatform: (): PushPlatform | null => getNativePlatform(),

  getAvailability: async (): Promise<PushAvailability> => {
    const baseAvailability = getBaseAvailability();
    if (baseAvailability) return baseAvailability;

    const permissions = await Notifications.getPermissionsAsync();
    if (permissions.status === "granted") return "ready";
    return permissions.status === "denied" ? "permission-denied" : "permission-undetermined";
  },

  requestPushToken: async (): Promise<{ token: string; platform: PushPlatform }> => {
    const platform = getNativePlatform();
    const baseAvailability = getBaseAvailability();
    if (!platform || baseAvailability) throw new PushSetupError(baseAvailability ?? "web");

    await configureAndroidChannel();
    const currentPermissions = await Notifications.getPermissionsAsync();
    const permissions = currentPermissions.status === "granted"
      ? currentPermissions
      : await Notifications.requestPermissionsAsync();
    if (permissions.status !== "granted") {
      throw new PushSetupError(permissions.status === "denied" ? "permission-denied" : "permission-undetermined");
    }

    const projectId = getProjectId();
    if (!projectId) throw new PushSetupError("project-id-missing");
    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    if (!token) throw new Error("Expo did not return a push token.");
    return { token, platform };
  },
};
