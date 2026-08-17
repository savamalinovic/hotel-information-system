import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { Redirect } from "expo-router";
import { useTranslation } from "react-i18next";
import { useSession } from "@/src/providers/SessionProvider";
import { useTheme } from "@/src/providers/ThemeProvider";

export default function Index() {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const { status, session } = useSession();

  if (status === "bootstrapping") {
    return (
      <View style={[styles.container, { backgroundColor: Colors.screenBackground }]}>
        <ActivityIndicator color={Colors.primary} size="large" />
        <Text style={[styles.message, { color: Colors.textSecondary }]}>
          {t("session.bootstrapping")}
        </Text>
      </View>
    );
  }

  if (status === "unauthenticated" || !session) {
    return <Redirect href="/(auth)" />;
  }

  if (session.role === "AGENT") {
    return <Redirect href="/(tabs)" />;
  }

  if (session.role === "OPERATIONAL_WORKER") {
    return <Redirect href="/(worker)" />;
  }

  return <Redirect href="/(manager)" />;
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
  },
  message: {
    fontSize: 16,
    marginTop: 16,
  },
});
