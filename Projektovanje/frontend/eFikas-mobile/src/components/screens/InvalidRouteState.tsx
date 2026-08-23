import { Icon } from "@/src/components/atoms/Icon/Icon";
import { useTheme } from "@/src/providers/ThemeProvider";
import { Href, router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type InvalidRouteStateProps = {
  fallbackHref: Href;
  fallbackKind?: "list" | "home";
};

export function InvalidRouteState({ fallbackHref, fallbackKind = "list" }: InvalidRouteStateProps) {
  const { t } = useTranslation();
  const { Colors } = useTheme();

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
      <Icon name="CircleAlert" size={40} color={Colors.error} />
      <Text style={[styles.title, { color: Colors.textPrimary }]}>{t("routeValidation.invalidLink.title")}</Text>
      <Text style={[styles.description, { color: Colors.textSecondary }]}>{t("routeValidation.invalidLink.description")}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t(`routeValidation.invalidLink.backTo${fallbackKind === "home" ? "Home" : "List"}`)}
        onPress={() => router.replace(fallbackHref)}
        style={[styles.action, { backgroundColor: Colors.primary }]}
      >
        <Text style={[styles.actionText, { color: Colors.textLight }]}>{t(`routeValidation.invalidLink.backTo${fallbackKind === "home" ? "Home" : "List"}`)}</Text>
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 24 },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  description: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  action: { minHeight: 44, justifyContent: "center", borderRadius: 10, marginTop: 4, paddingHorizontal: 18 },
  actionText: { fontSize: 14, fontWeight: "700" },
});
