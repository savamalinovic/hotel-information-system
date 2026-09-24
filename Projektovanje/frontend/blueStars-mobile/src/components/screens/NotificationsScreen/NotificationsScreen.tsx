import { Icon } from "@/src/components/atoms/Icon/Icon";
import { useMarkNotificationRead, useNotificationInbox, flattenNotifications } from "@/src/hooks/useNotifications";
import { usePushNotificationSettings } from "@/src/hooks/usePushNotificationSettings";
import { notificationTaskId } from "@/src/notifications/notificationNavigation";
import { useSession } from "@/src/providers/SessionProvider";
import { useTheme } from "@/src/providers/ThemeProvider";
import { PushSetupError } from "@/src/services/notificationsService";
import { LucideIconName, NotificationItem } from "@/src/types/types";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type InboxFilter = "all" | "unread";

const typePresentation = (type: string): { icon: LucideIconName; key: string } => {
  switch (type) {
    case "TASK_AVAILABLE": return { icon: "ClipboardList", key: "taskAvailable" };
    case "DAMAGE_REPORTED": return { icon: "TriangleAlert", key: "damageReported" };
    case "LEAVE_REQUEST_SUBMITTED": return { icon: "CalendarClock", key: "leaveRequestSubmitted" };
    case "LEAVE_REQUEST_DECIDED": return { icon: "CalendarCheck", key: "leaveRequestDecided" };
    default: return { icon: "Bell", key: "unknown" };
  }
};

const formatNotificationDate = (value: string, language: string) => {
  const locale = language.startsWith("sr") ? "sr-Latn-BA" : "en-GB";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat(locale, {
    day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(date);
};

const pushStatusKey = (availability: string) => `notifications.push.status.${availability}`;

const NotificationsScreen = () => {
  const { t, i18n } = useTranslation();
  const { Colors } = useTheme();
  const { session } = useSession();
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [markingIds, setMarkingIds] = useState<Set<number>>(new Set());
  const [markReadFailedId, setMarkReadFailedId] = useState<number | null>(null);
  const [pushError, setPushError] = useState<string | null>(null);
  const inbox = useNotificationInbox(filter === "unread");
  const markRead = useMarkNotificationRead();
  const push = usePushNotificationSettings();
  const notifications = useMemo(() => flattenNotifications(inbox.data?.pages), [inbox.data?.pages]);
  const canChangePush = push.enabled || push.availability === "ready" || push.availability === "permission-undetermined";

  const markNotificationRead = async (notificationId: number) => {
    if (markingIds.has(notificationId)) return false;
    setMarkingIds((current) => new Set(current).add(notificationId));
    try {
      await markRead.mutateAsync(notificationId);
      setMarkReadFailedId((current) => current === notificationId ? null : current);
      return true;
    } catch {
      setMarkReadFailedId(notificationId);
      return false;
    } finally {
      setMarkingIds((current) => {
        const next = new Set(current);
        next.delete(notificationId);
        return next;
      });
    }
  };

  const openNotification = async (notification: NotificationItem) => {
    if (!notification.readAt) await markNotificationRead(notification.notificationId);
    const taskId = notificationTaskId(notification);
    if (session?.role === "OPERATIONAL_WORKER" && taskId !== null) {
      router.push({ pathname: "/(worker)/tasks/[id]", params: { id: String(taskId) } });
    }
  };

  const updatePushSetting = async (enabled: boolean) => {
    setPushError(null);
    try {
      await push.setEnabled(enabled);
    } catch (error) {
      if (error instanceof PushSetupError) {
        setPushError(t(pushStatusKey(error.availability)));
      } else {
        setPushError(t("notifications.push.updateError"));
      }
      await push.refresh();
    }
  };

  const renderNotification = ({ item }: { item: NotificationItem }) => {
    const presentation = typePresentation(item.type);
    const isUnread = item.readAt === null;
    const isMarking = markingIds.has(item.notificationId);
    return <View style={[styles.notificationWrap, isUnread && { borderLeftColor: Colors.primary, borderLeftWidth: 4 }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("notifications.open", { title: item.title })}
        onPress={() => void openNotification(item)}
        disabled={isMarking}
        style={[styles.notification, { backgroundColor: isUnread ? Colors.background : Colors.screenBackground, borderColor: Colors.divider }, isMarking && styles.disabled]}
      >
        <View style={[styles.iconWrap, { backgroundColor: `${Colors.primary}18` }]}><Icon name={presentation.icon} size={20} color={Colors.primary} /></View>
        <View style={styles.notificationCopy}>
          <View style={styles.row}><Text style={[styles.type, { color: Colors.primary }]}>{t(`notifications.types.${presentation.key}`)}</Text>{isUnread ? <View accessibilityLabel={t("notifications.unread")} style={[styles.unreadDot, { backgroundColor: Colors.primary }]} /> : null}</View>
          <Text style={[styles.notificationTitle, { color: Colors.textPrimary }]}>{item.title}</Text>
          <Text style={[styles.body, { color: Colors.textSecondary }]}>{item.body}</Text>
          <Text style={[styles.date, { color: Colors.textSecondary }]}>{formatNotificationDate(item.createdAt, i18n.language)}</Text>
          {isMarking ? <ActivityIndicator size="small" color={Colors.primary} /> : null}
        </View>
      </Pressable>
      {markReadFailedId === item.notificationId ? <Pressable accessibilityRole="button" onPress={() => void markNotificationRead(item.notificationId)} style={styles.retryRead}><Text style={{ color: Colors.primary, fontWeight: "700" }}>{t("notifications.markReadRetry")}</Text></Pressable> : null}
    </View>;
  };

  const isInitialLoading = inbox.isPending && notifications.length === 0;
  const isInitialError = inbox.isError && notifications.length === 0;

  return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
    <FlatList
      data={notifications}
      keyExtractor={(item) => String(item.notificationId)}
      renderItem={renderNotification}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={inbox.isRefetching} onRefresh={() => void inbox.refetch()} tintColor={Colors.primary} />}
      ListHeaderComponent={<View style={styles.header}>
        <Text style={[styles.title, { color: Colors.textPrimary }]}>{t("notifications.inbox")}</Text>
        <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>{t("notifications.inboxDescription")}</Text>
        <View style={styles.filters}>
          {(["all", "unread"] as InboxFilter[]).map((value) => <Pressable key={value} accessibilityRole="button" onPress={() => setFilter(value)} style={[styles.filter, { borderColor: value === filter ? Colors.primary : Colors.divider, backgroundColor: value === filter ? Colors.primary : Colors.background }]}><Text style={{ color: value === filter ? Colors.textLight : Colors.textPrimary, fontWeight: "700" }}>{t(`notifications.filters.${value}`)}</Text></Pressable>)}
        </View>
        <View style={[styles.pushCard, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>
          <View style={styles.pushTopRow}><View style={styles.pushCopy}><Text style={[styles.pushTitle, { color: Colors.textPrimary }]}>{t("notifications.push.title")}</Text></View><Switch accessibilityLabel={t("notifications.push.title")} value={push.enabled} disabled={!canChangePush || push.isLoading || push.isUpdating} onValueChange={(value) => void updatePushSetting(value)} trackColor={{ false: Colors.tertiary, true: Colors.primary }} /></View>
          <Text style={[styles.pushDescription, { color: Colors.textSecondary }]}>{t("notifications.push.localState")}</Text>
          <Text style={[styles.pushStatus, { color: Colors.textSecondary }]}>{t(pushStatusKey(push.availability))}</Text>
          {!push.hasStoredPreference && !push.isLoading ? <Text style={[styles.pushStatus, { color: Colors.textSecondary }]}>{t("notifications.push.stateUnknown")}</Text> : null}
          {pushError ? <Text style={[styles.pushStatus, { color: Colors.error }]}>{pushError}</Text> : null}
        </View>
      </View>}
      ListEmptyComponent={isInitialLoading ? <State icon="LoaderCircle" title={t("notifications.loadingTitle")} description={t("notifications.loading")} /> : isInitialError ? <State icon="CircleAlert" title={t("notifications.errorTitle")} description={t("notifications.error")} actionLabel={t("notifications.retry")} onAction={() => void inbox.refetch()} /> : <State icon="BellOff" title={t("notifications.emptyTitle")} description={filter === "unread" ? t("notifications.emptyUnread") : t("notifications.empty")} />}
      ListFooterComponent={inbox.hasNextPage ? <Pressable accessibilityRole="button" disabled={inbox.isFetchingNextPage} onPress={() => void inbox.fetchNextPage()} style={[styles.loadMore, { borderColor: Colors.divider }]}><Text style={{ color: Colors.primary, fontWeight: "700" }}>{inbox.isFetchingNextPage ? t("notifications.loading") : t("notifications.loadMore")}</Text></Pressable> : <View style={styles.footerSpace} />}
    />
  </SafeAreaView>;
};

function State({ icon, title, description, actionLabel, onAction }: { icon: LucideIconName; title: string; description: string; actionLabel?: string; onAction?: () => void }) {
  const { Colors } = useTheme();
  return <View style={[styles.state, { borderColor: Colors.divider, backgroundColor: Colors.background }]}><Icon name={icon} size={30} color={Colors.primary} /><Text style={[styles.stateTitle, { color: Colors.textPrimary }]}>{title}</Text><Text style={[styles.stateDescription, { color: Colors.textSecondary }]}>{description}</Text>{actionLabel && onAction ? <Pressable accessibilityRole="button" onPress={onAction}><Text style={{ color: Colors.primary, fontWeight: "700" }}>{actionLabel}</Text></Pressable> : null}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 16, gap: 12, flexGrow: 1 }, header: { gap: 10, marginBottom: 4 }, title: { fontSize: 24, fontWeight: "800" }, subtitle: { fontSize: 14, lineHeight: 20 }, filters: { flexDirection: "row", gap: 8 }, filter: { minHeight: 38, paddingHorizontal: 14, borderWidth: 1, borderRadius: 999, justifyContent: "center" }, pushCard: { borderWidth: 1, borderRadius: 14, padding: 14, marginTop: 4, gap: 6 }, pushTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 }, pushCopy: { flex: 1 }, pushTitle: { fontSize: 16, fontWeight: "800" }, pushDescription: { fontSize: 13, lineHeight: 18 }, pushStatus: { fontSize: 12, lineHeight: 17 }, notificationWrap: { borderRadius: 14, overflow: "hidden" }, notification: { borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: "row", gap: 12 }, iconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" }, notificationCopy: { flex: 1, gap: 4 }, row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }, type: { fontSize: 12, fontWeight: "800", textTransform: "uppercase", flex: 1 }, unreadDot: { width: 9, height: 9, borderRadius: 5 }, notificationTitle: { fontSize: 16, fontWeight: "800" }, body: { fontSize: 14, lineHeight: 20 }, date: { fontSize: 12, marginTop: 2 }, retryRead: { paddingVertical: 8, paddingHorizontal: 14, alignSelf: "flex-start" }, disabled: { opacity: 0.65 }, state: { marginTop: 14, borderWidth: 1, borderRadius: 14, padding: 24, gap: 8, alignItems: "center" }, stateTitle: { fontSize: 17, fontWeight: "800", textAlign: "center" }, stateDescription: { fontSize: 14, lineHeight: 20, textAlign: "center" }, loadMore: { minHeight: 46, borderWidth: 1, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 2 }, footerSpace: { height: 14 },
});

export default NotificationsScreen;
