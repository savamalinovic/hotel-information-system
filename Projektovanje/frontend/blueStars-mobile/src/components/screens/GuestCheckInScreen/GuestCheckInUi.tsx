import { Icon } from "@/src/components/atoms/Icon/Icon";
import { useTheme } from "@/src/providers/ThemeProvider";
import { Guest } from "@/src/types/types";
import { formatDateKey } from "@/src/components/screens/ReservationWorkflowScreen/reservationWorkflowHelpers";
import { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

export function ScreenState({
  title,
  description,
  onRetry,
  loading = false,
}: {
  title: string;
  description?: string;
  onRetry?: () => void;
  loading?: boolean;
}) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  return (
    <View style={[styles.state, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>
      {loading ? <ActivityIndicator color={Colors.primary} size="large" /> : <Icon name="CircleAlert" color={Colors.error} size={32} />}
      <Text style={[styles.stateTitle, { color: Colors.textPrimary }]}>{title}</Text>
      {description ? <Text style={[styles.stateDescription, { color: Colors.textSecondary }]}>{description}</Text> : null}
      {onRetry ? <ActionButton label={t("guestCheckIn.common.retry")} onPress={onRetry} variant="secondary" /> : null}
    </View>
  );
}

export function ActionButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary" | "danger";
  icon?: "Plus" | "Search" | "RefreshCw" | "Save" | "ClipboardCheck" | "UserCheck" | "UserMinus";
}) {
  const { Colors } = useTheme();
  const backgroundColor = variant === "primary" ? Colors.primary : "transparent";
  const borderColor = variant === "danger" ? Colors.deleteColor : variant === "secondary" ? Colors.divider : Colors.primary;
  const textColor = variant === "primary" ? Colors.textLight : variant === "danger" ? Colors.deleteColor : Colors.textPrimary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.button, { backgroundColor, borderColor }, (disabled || loading) && styles.disabled]}
    >
      {loading ? <ActivityIndicator color={textColor} /> : icon ? <Icon name={icon} size={18} color={textColor} /> : null}
      <Text style={[styles.buttonText, { color: textColor }]}>{label}</Text>
    </Pressable>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  const { Colors } = useTheme();
  return <View style={[styles.section, { backgroundColor: Colors.background, borderColor: Colors.divider }]}><Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{title}</Text><View style={styles.sectionBody}>{children}</View></View>;
}

export function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  required = false,
  maxLength,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "phone-pad" | "numbers-and-punctuation";
  required?: boolean;
  maxLength?: number;
}) {
  const { Colors } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: Colors.textPrimary }]}>{label}{required ? " *" : ""}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.tertiary}
        keyboardType={keyboardType}
        accessibilityLabel={label}
        maxLength={maxLength}
        style={[styles.input, { color: Colors.textPrimary, borderColor: Colors.divider, backgroundColor: Colors.screenBackground }]}
      />
    </View>
  );
}

export function ChoiceChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { Colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected }} onPress={onPress} style={[styles.choice, { borderColor: selected ? Colors.primary : Colors.divider, backgroundColor: selected ? Colors.primary : Colors.background }]}><Text style={{ color: selected ? Colors.textLight : Colors.textPrimary, fontWeight: "700" }}>{label}</Text></Pressable>;
}

export function GuestIdentity({ guest, primary = false }: { guest: Guest; primary?: boolean }) {
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();
  return (
    <View style={styles.identity}>
      <View style={styles.identityCopy}>
        <Text style={[styles.identityName, { color: Colors.textPrimary }]}>{guest.name} {guest.surname}</Text>
        <Text style={{ color: Colors.textSecondary }}>{guest.citizenId} · {guest.local ? t("guestCheckIn.guest.domestic") : t("guestCheckIn.guest.foreign")}</Text>
        <Text style={{ color: Colors.textSecondary }}>{formatDateKey(guest.birthDate, i18n.language)}</Text>
      </View>
      {primary ? <View style={[styles.primaryBadge, { backgroundColor: `${Colors.primary}20` }]}><Text style={{ color: Colors.primary, fontWeight: "800" }}>{t("guestCheckIn.guest.primary")}</Text></View> : null}
    </View>
  );
}

export const styles = StyleSheet.create({
  state: { margin: 16, borderWidth: 1, borderRadius: 16, padding: 22, alignItems: "center", gap: 9 },
  stateTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  stateDescription: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  button: { minHeight: 46, borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14 },
  buttonText: { fontSize: 15, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  sectionBody: { gap: 10 },
  field: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: "700" },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 15 },
  choice: { minHeight: 40, borderWidth: 1, borderRadius: 999, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  identity: { flexDirection: "row", gap: 10, justifyContent: "space-between", alignItems: "flex-start" },
  identityCopy: { flex: 1, gap: 3 },
  identityName: { fontSize: 16, fontWeight: "800" },
  primaryBadge: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
});
