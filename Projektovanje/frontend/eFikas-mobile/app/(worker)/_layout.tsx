import { useSession } from "@/src/providers/SessionProvider";
import { useTheme } from "@/src/providers/ThemeProvider";
import { Redirect, Stack } from "expo-router";
import { useTranslation } from "react-i18next";

export default function WorkerLayout() {
  const { session, status } = useSession();
  const { Colors } = useTheme();
  const { t } = useTranslation();
  if (status !== "authenticated" || session?.role !== "OPERATIONAL_WORKER") {
    return <Redirect href="/" />;
  }
  return <Stack screenOptions={{ headerTintColor: Colors.textPrimary, headerStyle: { backgroundColor: Colors.tabBackground } }}>
    <Stack.Screen name="index" options={{ title: t("taskWorkforce.worker.homeTitle") }} />
    <Stack.Screen name="notifications" options={{ title: t("notifications.inbox") }} />
    <Stack.Screen name="tasks/[id]" options={{ title: t("taskWorkforce.detail.title") }} />
    <Stack.Screen name="tasks/[id]/damages/index" options={{ title: t("damageWorkflow.worker.title") }} />
    <Stack.Screen name="tasks/[id]/damages/[damageId]" options={{ title: t("damageWorkflow.detail.title") }} />
  </Stack>;
}
