import { Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/providers/ThemeProvider";

export default function HomeRootLayout() {
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
            <Stack.Screen name="apartments" options={{ title: t('dashboard.navigation.apartmentsTitle') }} />
            <Stack.Screen name="apartments/[id]" options={{ title: t('dashboard.navigation.apartmentsTitle') }} />
            <Stack.Screen name="reservations" options={{ title: t('dashboard.navigation.reservationsTitle') }} />
            <Stack.Screen name="reservations/[id]" options={{ title: t('reservationWorkflow.navigation.detailTitle') }} />
            <Stack.Screen name="reservations/addReservation" options={{ title: t('reservationWorkflow.navigation.createTitle') }} />
            <Stack.Screen name="expenses" options={{ title: t('dashboard.navigation.expensesTitle') }} />
            <Stack.Screen name="tasks" options={{ title: t('dashboard.navigation.tasksTitle') }} />
            <Stack.Screen name="damages" options={{ title: t('dashboard.navigation.damagesTitle') }} />
        </Stack>
    );
}
