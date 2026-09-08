import LabeledTextField from "@/src/components/molecules/LabeledTextField/LabeledTextField";
import ProfileSection from "@/src/components/organisms/ProfileSection/ProfileSection";
import ProfileTemplate from "@/src/components/templates/ProfileTemplate/ProfileTemplate";
import { useProfile } from "@/src/hooks/useProfile";
import { useTheme } from "@/src/providers/ThemeProvider";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

export default function ProfileScreen() {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const { profile, isLoading, isError, refetch } = useProfile();

  if (isLoading) {
    return (
      <ProfileTemplate content={
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ color: Colors.textSecondary }}>{t("profile.loading")}</Text>
        </View>
      } />
    );
  }

  if (isError || !profile) {
    return (
      <ProfileTemplate content={
        <View style={styles.centered}>
          <Text style={[styles.errorTitle, { color: Colors.textPrimary }]}>{t("profile.error.title")}</Text>
          <Text style={[styles.errorDescription, { color: Colors.textSecondary }]}>{t("profile.error.description")}</Text>
          <Pressable onPress={() => void refetch()} style={[styles.retryButton, { backgroundColor: Colors.primary }]}>
            <Text style={[styles.retryButtonText, { color: Colors.background }]}>{t("profile.retry")}</Text>
          </Pressable>
        </View>
      } />
    );
  }

  return (
    <ProfileTemplate content={
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ProfileSection title={t("profile.sectionTitle")}>
          <LabeledTextField label={t("profile.labels.firstName")} value={profile.name} size="xl" labelSize="lg" disabled inputProps={{ value: profile.name }} />
          <LabeledTextField label={t("profile.labels.lastName")} value={profile.surname} size="xl" labelSize="lg" disabled inputProps={{ value: profile.surname }} />
          <LabeledTextField label={t("profile.labels.email")} value={profile.email} size="xl" labelSize="lg" disabled inputProps={{ value: profile.email }} />
          <LabeledTextField label={t("profile.labels.address")} value={profile.address} size="xl" labelSize="lg" disabled inputProps={{ value: profile.address }} />
          <LabeledTextField label={t("profile.labels.role")} value={profile.role} size="xl" labelSize="lg" disabled inputProps={{ value: profile.role }} />
        </ProfileSection>
      </ScrollView>
    } />
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: 40 },
  centered: { minHeight: 260, alignItems: "center", justifyContent: "center", gap: 12 },
  errorTitle: { fontSize: 18, fontWeight: "700", textAlign: "center" },
  errorDescription: { fontSize: 14, textAlign: "center" },
  retryButton: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11 },
  retryButtonText: { fontWeight: "700" },
});
