import { Redirect, Stack } from "expo-router";
import { useTranslation } from "react-i18next";
import { useTheme } from "@/src/providers/ThemeProvider";
import { useSession } from "@/src/providers/SessionProvider";

export default function HomeRootLayout() {
    const { t } = useTranslation();
    const { Colors } = useTheme();
    const { session, status } = useSession();

    if (status !== "authenticated" || session?.role !== "AGENT") {
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
            <Stack.Screen name="apartments" options={{ title: t('dashboard.navigation.apartmentsTitle') }} />
            <Stack.Screen name="apartments/[id]" options={{ title: t('dashboard.navigation.apartmentsTitle') }} />
            <Stack.Screen name="reservations/[id]" options={{ title: t('reservationWorkflow.navigation.detailTitle') }} />
            <Stack.Screen name="reservations/[id]/guests" options={{ title: t('guestCheckIn.navigation.guests') }} />
            <Stack.Screen name="reservations/[id]/guest-form" options={{ title: t('guestCheckIn.navigation.guestForm') }} />
            <Stack.Screen name="reservations/[id]/guest-search" options={{ title: t('guestCheckIn.navigation.guestSearch') }} />
            <Stack.Screen name="reservations/[id]/check-in" options={{ title: t('guestCheckIn.navigation.checkIn') }} />
            <Stack.Screen name="reservations/[id]/payments" options={{ title: t('paymentWorkflow.navigation.title') }} />
            <Stack.Screen name="reservations/addReservation" options={{ title: t('reservationWorkflow.navigation.createTitle') }} />
            <Stack.Screen name="expenses" options={{ title: t('dashboard.navigation.expensesTitle') }} />
            <Stack.Screen name="expenses/create" options={{ title: t('expenseWorkflow.create.title') }} />
            <Stack.Screen name="expenses/[id]" options={{ title: t('expenseWorkflow.detail.title') }} />
            <Stack.Screen name="tasks" options={{ title: t('dashboard.navigation.tasksTitle') }} />
            <Stack.Screen name="tasks/create" options={{ title: t('taskWorkforce.agent.createTitle') }} />
            <Stack.Screen name="tasks/[id]" options={{ title: t('taskWorkforce.detail.title') }} />
            <Stack.Screen name="workforce" options={{ title: t('taskWorkforce.selfService.title') }} />
            <Stack.Screen name="damages" options={{ title: t('dashboard.navigation.damagesTitle') }} />
            <Stack.Screen name="damages/create" options={{ title: t('damageWorkflow.create.title') }} />
            <Stack.Screen name="damages/[id]" options={{ title: t('damageWorkflow.detail.title') }} />
        </Stack>
    );
}
