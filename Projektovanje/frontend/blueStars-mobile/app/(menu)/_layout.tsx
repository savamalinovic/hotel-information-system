import { useTheme } from "@/src/providers/ThemeProvider";
import { useSession } from "@/src/providers/SessionProvider";
import { Redirect, Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function MenuRootLayout() {
    const { t } = useTranslation();
    const { Colors } = useTheme();
    const { session, status } = useSession();
    if (status !== "authenticated" || (session?.role !== "AGENT" && session?.role !== "OPERATIONAL_WORKER")) {
        return <Redirect href="/" />;
    }

    return (
        <Stack screenOptions={{ 
            headerShown: true,
            headerTintColor: Colors.textPrimary,
            headerStyle: {
                backgroundColor: Colors.tabBackground, // Set your desired background color here
            },
        }} >
            <Stack.Screen name="index" options={{ title: t('tabs.menu') }} />
            <Stack.Screen name="(profile)/profile" options={{ title: t('menu.stackNavigation.profile') }} />
            <Stack.Screen name="(profile)/notifications" options={{ title: t('menu.stackNavigation.notifications') }} />
            <Stack.Screen name="workforce" options={{ title: t('taskWorkforce.selfService.title') }} />
            <Stack.Screen name="(mainSettings)/settings" options={{ title: t('menu.stackNavigation.settingsMain') }} />
            <Stack.Screen name="(mainSettings)/aboutApp" options={{ title: t('menu.stackNavigation.aboutApp') }} />
        </Stack>
    );
}
