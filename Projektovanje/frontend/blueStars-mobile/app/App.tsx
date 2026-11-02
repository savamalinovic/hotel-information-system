import "@/global.css";
import { GluestackUIProvider } from "@/src/components/ui/gluestack-ui-provider";
import { SessionProvider, useSession } from "@/src/providers/SessionProvider";
import { useTheme } from "@/src/providers/ThemeProvider";
import { ToastConfig } from "@/src/util/ToastConfig";
import { OverlayProvider } from "@gluestack-ui/overlay";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as NavigationBar from "expo-navigation-bar";
import { useEffect } from "react";
import { Platform } from "react-native";
import Toast from "react-native-toast-message";
import * as Notifications from "expo-notifications";
import { notificationsService } from "@/src/services/notificationsService";
import NotificationLifecycle from "@/src/components/notifications/NotificationLifecycle";

const queryClient = new QueryClient();

if (notificationsService.isNativePushPlatform()) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: false,
      shouldShowList: true,
    }),
  });
}

const AppNavigator = () => {
  const { status, session } = useSession();
  const isAuthenticated = status === "authenticated";
  const { theme, Colors } = useTheme();
  const segments = useSegments();
  const isAuth = segments[0] === "(auth)" && status === "unauthenticated";

  useEffect(() => {
    if (Platform.OS === "android") {
      void NavigationBar.setButtonStyleAsync(theme === "dark" ? "light" : "dark").catch(() => {});
    }
  }, [theme]);

  return (
    <>
    <StatusBar style={isAuth || theme === "dark" ? "light" : "dark"} translucent backgroundColor="transparent" />
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.screenBackground } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />

      <Stack.Protected guard={status === "unauthenticated"}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated && session?.role === "AGENT"}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(home)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated && (session?.role === "AGENT" || session?.role === "OPERATIONAL_WORKER")}>
        <Stack.Screen name="(menu)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated && session?.role === "OPERATIONAL_WORKER"}>
        <Stack.Screen name="(worker)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Protected guard={isAuthenticated && session?.role === "MANAGER"}>
        <Stack.Screen name="(manager)" options={{ headerShown: false }} />
      </Stack.Protected>

      <Stack.Screen name="+not-found" options={{ headerShown: false }} />
    </Stack>
    </>
  );
};

export default function App() {
  const { theme } = useTheme();

  return (
    <GluestackUIProvider mode={theme}>
      <OverlayProvider>
        <QueryClientProvider client={queryClient}>
          <SessionProvider>
            <AppNavigator />
            <NotificationLifecycle />
            <Toast config={ToastConfig} />
          </SessionProvider>
        </QueryClientProvider>
      </OverlayProvider>
    </GluestackUIProvider>
  );
}
