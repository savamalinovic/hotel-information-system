import { Icon } from "@/src/components/atoms/Icon/Icon";
import { useTheme } from "@/src/providers/ThemeProvider";
import { LucideIconName } from "@/src/types/types";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import { Pressable, StyleSheet, Text, View } from "react-native";

export type AgentFeature = "apartments" | "reservations" | "tasks" | "expenses" | "damages" | "notifications";

const featureIcons: Record<AgentFeature, LucideIconName> = {
  apartments: "House",
  reservations: "BookOpen",
  tasks: "Wrench",
  expenses: "Wallet",
  damages: "TriangleAlert",
  notifications: "Bell",
};

export default function AgentFeaturePlaceholder({ feature }: { feature: AgentFeature }) {
  const { Colors } = useTheme();
  const { t } = useTranslation();

  return (
    <View style={[styles.container, { backgroundColor: Colors.screenBackground }]}>
      <View style={[styles.card, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>
        <Icon name={featureIcons[feature]} size={34} color={Colors.primary} />
        <Text style={[styles.title, { color: Colors.textPrimary }]}>
          {t(`agentFeatures.features.${feature}`)}
        </Text>
        <Text style={[styles.description, { color: Colors.textSecondary }]}>
          {t("agentFeatures.description")}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/(tabs)")}
          style={[styles.button, { backgroundColor: Colors.primary }]}
        >
          <Text style={[styles.buttonText, { color: Colors.background }]}>{t("agentFeatures.backHome")}</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 20 },
  card: { borderWidth: 1, borderRadius: 16, padding: 24, alignItems: "center", gap: 14 },
  title: { fontSize: 20, fontWeight: "700", textAlign: "center" },
  description: { fontSize: 15, lineHeight: 22, textAlign: "center" },
  button: { marginTop: 6, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10 },
  buttonText: { fontSize: 14, fontWeight: "700" },
});
