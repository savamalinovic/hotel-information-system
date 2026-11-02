import { StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { BasicButton } from "@/src/components/atoms/BasicButton/BasicButton";
import { useAuth } from "@/src/hooks/useAuth";
import { useTheme } from "@/src/providers/ThemeProvider";

export const ManagerFallbackScreen = () => {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const { logout, isLoggingOut } = useAuth();

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: Colors.screenBackground }]}>
      <Text style={[styles.title, { color: Colors.textPrimary }]}>
        {t("session.manager.title")}
      </Text>
      <Text style={[styles.description, { color: Colors.textSecondary }]}>
        {t("session.manager.description")}
      </Text>
      <BasicButton
        disabled={isLoggingOut}
        onPress={() => void logout()}
        title={isLoggingOut ? t("session.logoutLoading") : t("session.logout")}
      />
    </SafeAreaView>
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
