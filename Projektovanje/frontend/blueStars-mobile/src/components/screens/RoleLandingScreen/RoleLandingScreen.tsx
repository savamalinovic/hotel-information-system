import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";
import { BasicButton } from "@/src/components/atoms/BasicButton/BasicButton";
import { useAuth } from "@/src/hooks/useAuth";
import { useTheme } from "@/src/providers/ThemeProvider";

type RoleLandingScreenProps = {
  role: "OPERATIONAL_WORKER" | "MANAGER";
};

export const RoleLandingScreen = ({ role }: RoleLandingScreenProps) => {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const { logout, isLoggingOut } = useAuth();
  const isOperationalWorker = role === "OPERATIONAL_WORKER";

  return (
    <View style={[styles.container, { backgroundColor: Colors.screenBackground }]}>
      <Text style={[styles.title, { color: Colors.textPrimary }]}>
        {t(isOperationalWorker ? "session.worker.title" : "session.manager.title")}
      </Text>
      <Text style={[styles.description, { color: Colors.textSecondary }]}>
        {t(isOperationalWorker ? "session.worker.description" : "session.manager.description")}
      </Text>
      <BasicButton
        disabled={isLoggingOut}
        onPress={() => void logout()}
        title={isLoggingOut ? t("session.logoutLoading") : t("session.logout")}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 32,
    textAlign: "center",
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 16,
    textAlign: "center",
  },
});
