import { useTheme } from "@/src/providers/ThemeProvider";
import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function MenuRootLayout() {
    const { t } = useTranslation();
    const { Colors } = useTheme();

    return (
        <Stack screenOptions={{ 
            headerShown: true,
            headerTintColor: Colors.textPrimary,
            headerStyle: {
                backgroundColor: Colors.tabBackground, // Set your desired background color here
            },
        }} >
            <Stack.Screen name="(profile)/profile" options={{ title: t('menu.stackNavigation.profile') }} />
            <Stack.Screen name="(profile)/notifications" options={{ title: t('menu.stackNavigation.notifications') }} />
            <Stack.Screen name="(mainSettings)/settings" options={{ title: t('menu.stackNavigation.settingsMain') }} />
            <Stack.Screen name="(mainSettings)/aboutApp" options={{ title: t('menu.stackNavigation.aboutApp') }} />
        </Stack>
    );
}
