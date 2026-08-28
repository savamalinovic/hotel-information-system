import { Icon } from "@/src/components/atoms/Icon/Icon";
import { useTheme } from "@/src/providers/ThemeProvider";
import { TaskPriority, TaskStatus, WorkerAvailabilityStatus } from "@/src/types/types";
import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { useTranslation } from "react-i18next";

export const formatTaskDate = (value: string | null | undefined, locale: string) => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export function WorkflowButton({
  label,
  onPress,
  variant = "primary",
  disabled = false,
  loading = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  disabled?: boolean;
  loading?: boolean;
  icon?: "Plus" | "RefreshCw" | "Upload" | "ExternalLink" | "ChevronRight" | "Clock";
}) {
  const { Colors } = useTheme();
  const backgroundColor = variant === "primary" ? Colors.primary : variant === "danger" ? Colors.deleteColor : "transparent";
  const color = variant === "secondary" ? Colors.textPrimary : Colors.textLight;

  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled: disabled || loading, busy: loading }}
    disabled={disabled || loading}
    onPress={onPress}
    style={[
      styles.button,
      { backgroundColor, borderColor: variant === "secondary" ? Colors.divider : backgroundColor },
      (disabled || loading) && styles.disabled,
    ]}
  >
    {({ pressed }) => <>
      {pressed ? <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.pressedOverlay]} /> : null}
      {loading ? <ActivityIndicator color={color} /> : icon ? <Icon name={icon} size={18} color={color} /> : null}
      <Text style={[styles.buttonText, { color }]}>{label}</Text>
    </>}
  </Pressable>;
}

export function WorkflowCard({ children }: { children: ReactNode }) {
  const { Colors } = useTheme();
  return <View style={[styles.card, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>{children}</View>;
}

export function WorkflowState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: "CircleAlert" | "SearchX" | "ClipboardList" | "LoaderCircle";
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const { Colors } = useTheme();
  return <View style={[styles.state, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>
    {icon === "LoaderCircle" ? <ActivityIndicator size="large" color={Colors.primary} /> : <Icon name={icon} size={34} color={icon === "CircleAlert" ? Colors.error : Colors.primary} />}
    <Text style={[styles.stateTitle, { color: Colors.textPrimary }]}>{title}</Text>
    <Text style={[styles.stateDescription, { color: Colors.textSecondary }]}>{description}</Text>
    {actionLabel && onAction ? <WorkflowButton label={actionLabel} onPress={onAction} variant="secondary" icon="RefreshCw" /> : null}
  </View>;
}

export function WorkflowChip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const { Colors } = useTheme();
  return <Pressable
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ selected }}
    onPress={onPress}
    style={[styles.chip, { borderColor: selected ? Colors.primary : Colors.divider, backgroundColor: selected ? Colors.primary : Colors.background }]}
  >
    <Text style={{ color: selected ? Colors.textLight : Colors.textPrimary, fontSize: 13, fontWeight: "700" }}>{label}</Text>
  </Pressable>;
}

const taskStatusColors: Record<TaskStatus, "primary" | "warning" | "success" | "danger"> = {
  NEW: "primary",
  ASSIGNED: "primary",
  IN_PROGRESS: "warning",
  BLOCKED: "danger",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const token = taskStatusColors[status];
  const color = token === "success" ? Colors.success : token === "warning" ? Colors.accent : token === "danger" ? Colors.error : Colors.primary;
  return <View style={[styles.badge, { backgroundColor: `${color}20` }]}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={{ color, fontSize: 12, fontWeight: "800" }}>{t(`taskWorkforce.status.${status}`)}</Text></View>;
}

export function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const color = priority === "URGENT" ? Colors.error : priority === "HIGH" ? Colors.accent : Colors.textSecondary;
  return <Text style={[styles.priority, { color }]}>{t(`taskWorkforce.priority.${priority}`)}</Text>;
}

export function AvailabilityBadge({ status }: { status: WorkerAvailabilityStatus }) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const color = status === "AVAILABLE" ? Colors.success : status === "BUSY" || status === "ON_BREAK" ? Colors.accent : status === "OFF_DUTY" ? Colors.textSecondary : Colors.error;
  return <View style={[styles.badge, { backgroundColor: `${color}20` }]}><View style={[styles.dot, { backgroundColor: color }]} /><Text style={{ color, fontSize: 12, fontWeight: "800" }}>{t(`taskWorkforce.availability.${status}`)}</Text></View>;
}

export function DetailRow({ label, value }: { label: string; value: string }) {
  const { Colors } = useTheme();
  return <View style={styles.detailRow}><Text style={[styles.detailLabel, { color: Colors.textSecondary }]}>{label}</Text><Text style={[styles.detailValue, { color: Colors.textPrimary }]}>{value}</Text></View>;
}

export function LoadMore({ visible, loading, onPress }: { visible: boolean; loading: boolean; onPress: () => void }) {
  const { t } = useTranslation();
  if (!visible) {
    return null;
  }
  return <WorkflowButton label={loading ? t("taskWorkforce.common.loading") : t("taskWorkforce.common.loadMore")} onPress={onPress} variant="secondary" loading={loading} />;
}

const styles = StyleSheet.create({
  button: { minHeight: 44, paddingHorizontal: 14, borderRadius: 12, borderWidth: 1, alignItems: "center", justifyContent: "center", flexDirection: "row", gap: 8, flexShrink: 1, overflow: "hidden" },
  buttonText: { fontSize: 14, fontWeight: "800", flexShrink: 1, textAlign: "center" },
  pressedOverlay: { backgroundColor: "rgba(0, 0, 0, 0.16)" },
  disabled: { opacity: 0.55 },
  card: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  state: { borderWidth: 1, borderRadius: 16, padding: 24, gap: 10, alignItems: "center" },
  stateTitle: { fontSize: 17, fontWeight: "800", textAlign: "center" },
  stateDescription: { fontSize: 14, lineHeight: 20, textAlign: "center" },
  chip: { borderWidth: 1, borderRadius: 999, minHeight: 36, paddingHorizontal: 12, justifyContent: "center" },
  badge: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 999 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  priority: { fontSize: 12, fontWeight: "800" },
  detailRow: { flexDirection: "row", gap: 16, justifyContent: "space-between" },
  detailLabel: { flex: 1, fontSize: 13 },
  detailValue: { flex: 1.25, fontSize: 13, fontWeight: "700", textAlign: "right" },
});
