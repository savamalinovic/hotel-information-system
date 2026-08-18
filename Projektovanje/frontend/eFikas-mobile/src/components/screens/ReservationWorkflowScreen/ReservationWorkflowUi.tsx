import { Icon } from "@/src/components/atoms/Icon/Icon";
import { useTheme } from "@/src/providers/ThemeProvider";
import { ReservationStatus } from "@/src/types/types";
import { getStatusColor } from "./reservationWorkflowHelpers";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";

export function ReservationStatusBadge({ status }: { status: ReservationStatus }) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const color = getStatusColor(status, Colors);

  return (
    <View style={[styles.statusBadge, { backgroundColor: `${color}20` }]}>
      <View style={[styles.statusDot, { backgroundColor: color }]} />
      <Text style={[styles.statusText, { color }]}>{t(`reservationWorkflow.status.${status}`)}</Text>
    </View>
  );
}

export function FilterChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { Colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.chip,
        { borderColor: selected ? Colors.primary : Colors.divider, backgroundColor: selected ? Colors.primary : Colors.background },
      ]}
    >
      <Text style={[styles.chipText, { color: selected ? Colors.textLight : Colors.textPrimary }]}>{label}</Text>
    </Pressable>
  );
}

export function PrimaryButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: "Plus" | "RefreshCw" | "ChevronRight" | "Save";
}) {
  const { Colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled, busy: loading }}
      disabled={disabled || loading}
      onPress={onPress}
      style={[styles.primaryButton, { backgroundColor: Colors.primary }, (disabled || loading) && styles.disabledButton]}
    >
      {loading ? <ActivityIndicator color={Colors.textLight} /> : icon ? <Icon name={icon} size={18} color={Colors.textLight} /> : null}
      <Text style={[styles.primaryButtonText, { color: Colors.textLight }]}>{label}</Text>
    </Pressable>
  );
}

export function EmptyOrErrorState({
  icon,
  title,
  description,
  retryLabel,
  onRetry,
}: {
  icon: "CalendarX2" | "CircleAlert" | "SearchX";
  title: string;
  description: string;
  retryLabel?: string;
  onRetry?: () => void;
}) {
  const { Colors } = useTheme();
  return (
    <View style={[styles.state, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>
      <Icon name={icon} size={34} color={icon === "CircleAlert" ? Colors.error : Colors.primary} />
      <Text style={[styles.stateTitle, { color: Colors.textPrimary }]}>{title}</Text>
      <Text style={[styles.stateDescription, { color: Colors.textSecondary }]}>{description}</Text>
      {onRetry && retryLabel ? <PrimaryButton label={retryLabel} onPress={onRetry} icon="RefreshCw" /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  statusBadge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  statusDot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12, fontWeight: "700" },
  chip: { borderWidth: 1, borderRadius: 999, minHeight: 36, paddingHorizontal: 12, justifyContent: "center" },
  chipText: { fontSize: 13, fontWeight: "600" },
  primaryButton: { minHeight: 46, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 16 },
  primaryButtonText: { fontSize: 15, fontWeight: "700" },
  disabledButton: { opacity: 0.55 },
  state: { borderWidth: 1, borderRadius: 16, padding: 22, alignItems: "center", gap: 9 },
  stateTitle: { fontSize: 17, fontWeight: "700", textAlign: "center" },
  stateDescription: { fontSize: 14, lineHeight: 20, textAlign: "center" },
});
