import { Icon } from "@/src/components/atoms/Icon/Icon";
import { useAgentDashboard } from "@/src/hooks/useAgentDashboard";
import { useUnreadNotificationCount } from "@/src/hooks/useNotifications";
import { useTheme } from "@/src/providers/ThemeProvider";
import { TodayAgendaItem } from "@/src/types/types";
import { router } from "expo-router";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const MAX_AGENDA_ITEMS = 5;

const getDisplayDate = (date: string, language: string) => {
  const locale = language.startsWith("sr") ? "sr-Latn-BA" : "en-GB";
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00`));
};

export default function DashboardScreen() {
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();
  const dashboardQuery = useAgentDashboard();
  const unreadNotifications = useUnreadNotificationCount();

  const goToFeature = (feature: "expenses" | "tasks" | "damages" | "workforce") => {
      router.push(feature === "workforce" ? "/(menu)/workforce" : `/(home)/${feature}`);
  };

  const goToReservations = () => router.push("/(tabs)/reservations");

  if (dashboardQuery.isPending) {
    return (
      <View style={[styles.centered, { backgroundColor: Colors.screenBackground }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={[styles.stateText, { color: Colors.textPrimary }]}>
          {t("agentDashboard.loading")}
        </Text>
      </View>
    );
  }

  if (dashboardQuery.isError || !dashboardQuery.data) {
    return (
      <View style={[styles.centered, { backgroundColor: Colors.screenBackground }]}>
        <Icon name="CircleAlert" size={38} color={Colors.primary} />
        <Text style={[styles.stateTitle, { color: Colors.textPrimary }]}>
          {t("agentDashboard.error.title")}
        </Text>
        <Text style={[styles.stateText, { color: Colors.textSecondary }]}>
          {t("agentDashboard.error.description")}
        </Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => void dashboardQuery.refetch()}
          style={[styles.retryButton, { backgroundColor: Colors.primary }]}
        >
          <Text style={[styles.retryButtonText, { color: Colors.background }]}>
            {t("agentDashboard.retry")}
          </Text>
        </Pressable>
      </View>
    );
  }

  const data = dashboardQuery.data;
  const fullName = [data.profile.name, data.profile.surname]
    .filter(Boolean)
    .join(" ") || data.profile.email;
  const agenda = data.agenda.slice(0, MAX_AGENDA_ITEMS);
  const hasNoOperationalItems = data.arrivals === 0
    && data.departures === 0
    && data.checkedIn === 0
    && data.newTasks === 0
    && data.blockedTasks === 0
    && unreadNotifications.data === 0;

  const metrics = [
    { key: "arrivals", icon: "LogIn", label: t("agentDashboard.metrics.arrivals"), value: data.arrivals },
    { key: "departures", icon: "LogOut", label: t("agentDashboard.metrics.departures"), value: data.departures },
    { key: "checkedIn", icon: "Users", label: t("agentDashboard.metrics.checkedIn"), value: data.checkedIn },
    { key: "newTasks", icon: "ClipboardList", label: t("agentDashboard.metrics.newTasks"), value: data.newTasks },
    { key: "blockedTasks", icon: "CircleAlert", label: t("agentDashboard.metrics.blockedTasks"), value: data.blockedTasks },
    { key: "notifications", icon: "Bell", label: t("agentDashboard.metrics.notifications"), value: unreadNotifications.isError ? null : unreadNotifications.data },
  ] as const;

  const quickActions = [
    { key: "reservations", icon: "BookOpen", label: t("agentDashboard.actions.reservations"), onPress: goToReservations },
    { key: "tasks", icon: "Wrench", label: t("agentDashboard.actions.tasks"), onPress: () => goToFeature("tasks") },
    { key: "expenses", icon: "Wallet", label: t("agentDashboard.actions.expenses"), onPress: () => goToFeature("expenses") },
    { key: "damages", icon: "TriangleAlert", label: t("agentDashboard.actions.damages"), onPress: () => goToFeature("damages") },
    { key: "workforce", icon: "Clock", label: t("agentDashboard.actions.workforce"), onPress: () => goToFeature("workforce") },
  ] as const;

  return (
    <ScrollView
      style={{ backgroundColor: Colors.screenBackground }}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={dashboardQuery.isRefetching}
          onRefresh={() => void Promise.all([dashboardQuery.refetch(), unreadNotifications.refetch()])}
          tintColor={Colors.primary}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.headerRow}>
        <View style={styles.headerCopy}>
          <Text style={[styles.greeting, { color: Colors.primary }]}>{t("agentDashboard.greeting")}</Text>
          <Text style={[styles.name, { color: Colors.textPrimary }]} numberOfLines={1}>{fullName}</Text>
          <Text style={[styles.date, { color: Colors.textSecondary }]}>{getDisplayDate(data.today, i18n.language)}</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("agentDashboard.refresh")}
          onPress={() => void dashboardQuery.refetch()}
          style={[styles.refreshButton, { borderColor: Colors.divider }]}
        >
          {({ pressed }) => <>
            {pressed ? <View pointerEvents="none" style={[StyleSheet.absoluteFillObject, styles.refreshButtonPressed]} /> : null}
            <Icon name="RefreshCw" size={22} color={Colors.primary} />
          </>}
        </Pressable>
      </View>

      <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("agentDashboard.overview")}</Text>
      <View style={styles.metricGrid}>
        {metrics.map((metric) => (
          <View key={metric.key} style={[styles.metricCard, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>
            <Icon name={metric.icon} size={20} color={Colors.primary} />
            <Text style={[styles.metricValue, { color: Colors.textPrimary }]}>
              {metric.value ?? "—"}
            </Text>
            <Text style={[styles.metricLabel, { color: Colors.textSecondary }]}>{metric.label}</Text>
            {metric.value === null && (
              <Text style={[styles.metricUnavailable, { color: Colors.textSecondary }]}>
                {t("agentDashboard.unavailable")}
              </Text>
            )}
          </View>
        ))}
      </View>
      {hasNoOperationalItems && (
        <View style={[styles.emptyCard, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>
          <Text style={[styles.emptyText, { color: Colors.textSecondary }]}>{t("agentDashboard.empty")}</Text>
        </View>
      )}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("agentDashboard.agenda.title")}</Text>
      </View>
      {agenda.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>
          <Icon name="CalendarDays" size={26} color={Colors.primary} />
          <Text style={[styles.emptyText, { color: Colors.textSecondary }]}>{t("agentDashboard.agenda.empty")}</Text>
        </View>
      ) : (
        <View style={[styles.agendaCard, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>
          {agenda.map((item, index) => (
            <AgendaRow
              key={item.reservation.reservationId}
              item={item}
              showDivider={index < agenda.length - 1}
            />
          ))}
        </View>
      )}

      <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("agentDashboard.actions.title")}</Text>
      <View style={styles.actionGrid}>
        {quickActions.map((action) => (
          <Pressable
            key={action.key}
            accessibilityRole="button"
            onPress={action.onPress}
            style={[styles.actionCard, { backgroundColor: Colors.background, borderColor: Colors.divider }]}
          >
            <Icon name={action.icon} size={25} color={Colors.primary} />
            <Text style={[styles.actionLabel, { color: Colors.textPrimary }]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
}

function AgendaRow({ item, showDivider }: { item: TodayAgendaItem; showDivider: boolean }) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const { reservation, kind } = item;
  const kindLabel = kind === "arrival"
    ? t("agentDashboard.agenda.arrival")
    : kind === "departure"
      ? t("agentDashboard.agenda.departure")
      : t("agentDashboard.agenda.arrivalAndDeparture");

  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t("agentDashboard.agenda.openReservation", { apartment: reservation.apartmentName })} onPress={() => router.push({ pathname: "/(home)/reservations/[id]", params: { id: String(reservation.reservationId) } })} style={({ pressed }) => pressed && styles.pressed}>
      <View style={[styles.agendaRow, showDivider && { borderBottomColor: Colors.divider, borderBottomWidth: StyleSheet.hairlineWidth }]}>
        <View style={styles.agendaCopy}>
          <Text style={[styles.agendaApartment, { color: Colors.textPrimary }]} numberOfLines={1}>{reservation.apartmentName}</Text>
          <Text style={[styles.agendaDates, { color: Colors.textSecondary }]}>
            {reservation.checkInDate} — {reservation.checkOutDate}
          </Text>
          <Text style={[styles.agendaStatus, { color: Colors.textSecondary }]}>
            {t(`agentDashboard.status.${reservation.status}`)}
          </Text>
        </View>
        <View style={[styles.agendaBadge, { backgroundColor: Colors.screenBackground }]}>
          <Text style={[styles.agendaBadgeText, { color: Colors.primary }]}>{kindLabel}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 18 },
  centered: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 },
  headerRow: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  headerCopy: { flex: 1, gap: 3 },
  greeting: { fontSize: 14, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  name: { fontSize: 26, fontWeight: "700" },
  date: { fontSize: 14, textTransform: "capitalize" },
  refreshButton: { width: 44, height: 44, borderWidth: 1, borderRadius: 22, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  refreshButtonPressed: { backgroundColor: "rgba(0, 0, 0, 0.16)" },
  sectionTitle: { fontSize: 18, fontWeight: "700", flexShrink: 1 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  metricCard: { width: "31%", minWidth: 96, flexGrow: 1, borderWidth: 1, borderRadius: 14, padding: 12, gap: 4 },
  metricValue: { fontSize: 24, fontWeight: "700", marginTop: 2 },
  metricLabel: { fontSize: 12, lineHeight: 16 },
  metricUnavailable: { fontSize: 10, marginTop: 1 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, marginTop: 4 },
  emptyCard: { borderWidth: 1, borderRadius: 14, padding: 22, alignItems: "center", gap: 10 },
  emptyText: { textAlign: "center", fontSize: 14 },
  agendaCard: { borderWidth: 1, borderRadius: 14, overflow: "hidden" },
  agendaRow: { flexDirection: "row", alignItems: "center", padding: 14, gap: 12 },
  pressed: { opacity: 0.65 },
  agendaCopy: { flex: 1, gap: 3 },
  agendaApartment: { fontSize: 16, fontWeight: "600" },
  agendaDates: { fontSize: 13 },
  agendaStatus: { fontSize: 12, fontWeight: "600" },
  agendaBadge: { borderRadius: 12, paddingHorizontal: 9, paddingVertical: 6, maxWidth: 108 },
  agendaBadgeText: { fontSize: 12, fontWeight: "700", textAlign: "center" },
  actionGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  actionCard: { width: "31%", minWidth: 96, flexGrow: 1, minHeight: 100, borderWidth: 1, borderRadius: 14, padding: 12, justifyContent: "space-between", gap: 10 },
  actionLabel: { fontSize: 14, fontWeight: "600" },
  stateTitle: { fontSize: 19, fontWeight: "700", textAlign: "center" },
  stateText: { fontSize: 14, textAlign: "center" },
  retryButton: { borderRadius: 10, paddingHorizontal: 18, paddingVertical: 11, marginTop: 4 },
  retryButtonText: { fontSize: 14, fontWeight: "700" },
});
