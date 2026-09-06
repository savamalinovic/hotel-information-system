import { Icon } from "@/src/components/atoms/Icon/Icon";
import {
  AttendanceActions,
  AttendanceSection,
  AvailabilityOverridesSection,
  LeaveRequestsSection,
  WorkforceStatusCard,
} from "@/src/components/screens/WorkforceSelfService/WorkforceSelfService";
import { AvailabilityBadge, LoadMore, PriorityBadge, TaskStatusBadge, WorkflowButton, WorkflowCard, WorkflowChip, WorkflowState } from "@/src/components/screens/TaskWorkflowScreen/TaskWorkflowUi";
import { useAuth } from "@/src/hooks/useAuth";
import { useUnreadNotificationCount } from "@/src/hooks/useNotifications";
import { useProfile } from "@/src/hooks/useProfile";
import { useAvailableTasks, useMyTasks } from "@/src/hooks/useTaskWorkflows";
import { useWorkerAvailability } from "@/src/hooks/useWorkforce";
import { useTheme } from "@/src/providers/ThemeProvider";
import { OperationalTask, TaskStatus, WorkerAvailability } from "@/src/types/types";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type WorkerSection = "overview" | "available" | "mine" | "attendance" | "overrides" | "leave";

const sections: WorkerSection[] = ["overview", "available", "mine", "attendance", "overrides", "leave"];
const taskStatuses: TaskStatus[] = ["ASSIGNED", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"];

export default function WorkerDashboardScreen() {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const { logout, isLoggingOut } = useAuth();
  const [section, setSection] = useState<WorkerSection>("overview");
  const availability = useWorkerAvailability();
  const profile = useProfile();
  const unreadNotifications = useUnreadNotificationCount();
  const refresh = () => void Promise.all([availability.refetch(), profile.refetch(), unreadNotifications.refetch()]);

  return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.heading}>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}>
            <Text style={[styles.title, { color: Colors.textPrimary }]}>{t("taskWorkforce.worker.homeTitle")}</Text>
            <Text style={{ color: Colors.textSecondary }}>{profile.profile ? t("taskWorkforce.worker.greeting", { name: profile.profile.name }) : t("taskWorkforce.worker.homeSubtitle")}</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityRole="button" accessibilityLabel={t("notifications.openInbox")} onPress={() => router.push("/(worker)/notifications")} style={[styles.notificationButton, { borderColor: Colors.divider, backgroundColor: Colors.background }]}>
              <Icon name="Bell" size={19} color={Colors.primary} />
              {unreadNotifications.data && unreadNotifications.data > 0 ? <Text style={[styles.notificationCount, { backgroundColor: Colors.primary, color: Colors.textLight }]}>{unreadNotifications.data > 99 ? "99+" : unreadNotifications.data}</Text> : null}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={t("session.logout")} disabled={isLoggingOut} onPress={() => void logout()} style={[styles.notificationButton, { borderColor: Colors.divider, backgroundColor: Colors.background }, isLoggingOut && styles.disabled]}>
              <Icon name="LogOut" size={19} color={Colors.primary} />
            </Pressable>
          </View>
        </View>
        {availability.data ? <AvailabilityBadge status={availability.data.status} /> : null}
      </View>
      {availability.isPending ? <WorkflowState icon="LoaderCircle" title={t("taskWorkforce.common.loading")} description={t("taskWorkforce.worker.loadingStatus")} /> : null}
      {availability.isError ? <WorkflowState icon="CircleAlert" title={t("taskWorkforce.common.errorTitle")} description={t("taskWorkforce.worker.statusError")} actionLabel={t("taskWorkforce.common.retry")} onAction={refresh} /> : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {sections.map((item) => <WorkflowChip key={item} label={t(`taskWorkforce.worker.sections.${item}`)} selected={section === item} onPress={() => setSection(item)} />)}
      </ScrollView>
      {section === "overview" ? <WorkerOverview availability={availability.data} onNavigate={setSection} /> : null}
      {section === "available" ? <AvailableTasks /> : null}
      {section === "mine" ? <MyTasks /> : null}
      {section === "attendance" ? <AttendanceSection availability={availability.data} /> : null}
      {section === "overrides" ? <AvailabilityOverridesSection /> : null}
      {section === "leave" ? <LeaveRequestsSection /> : null}
    </ScrollView>
  </SafeAreaView>;
}

function WorkerOverview({ availability, onNavigate }: { availability?: WorkerAvailability; onNavigate: (section: WorkerSection) => void }) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const available = useAvailableTasks({ size: 1, sort: "updatedAt,desc" });
  const assigned = useMyTasks({ status: "ASSIGNED", size: 1, sort: "updatedAt,desc" });
  const inProgress = useMyTasks({ status: "IN_PROGRESS", size: 1, sort: "updatedAt,desc" });
  const blocked = useMyTasks({ status: "BLOCKED", size: 1, sort: "updatedAt,desc" });
  const count = (data: { pages: { totalElements: number }[] } | undefined) => data?.pages[0]?.totalElements ?? 0;

  return <View style={styles.stack}>
    <WorkforceStatusCard availability={availability} />
    <View style={styles.metrics}>
      <Metric label={t("taskWorkforce.worker.availableCount")} value={count(available.data)} onPress={() => onNavigate("available")} />
      <Metric label={t("taskWorkforce.worker.activeCount")} value={count(assigned.data) + count(inProgress.data)} onPress={() => onNavigate("mine")} />
      <Metric label={t("taskWorkforce.worker.blockedCount")} value={count(blocked.data)} onPress={() => onNavigate("mine")} />
    </View>
    <WorkflowCard>
      <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("taskWorkforce.worker.attendanceActions")}</Text>
      <AttendanceActions availability={availability} />
    </WorkflowCard>
  </View>;
}

function Metric({ label, value, onPress }: { label: string; value: number; onPress: () => void }) {
  const { Colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.metric, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>
    <Text style={[styles.metricValue, { color: Colors.primary }]}>{value}</Text>
    <Text style={[styles.metricLabel, { color: Colors.textSecondary }]}>{label}</Text>
  </Pressable>;
}

function AvailableTasks() {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const tasks = useAvailableTasks({ size: 20, sort: "updatedAt,desc" });
  return <View style={styles.stack}>
    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("taskWorkforce.worker.availableTitle")}</Text>
    <Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.worker.availableHint")}</Text>
    {tasks.isPending ? <WorkflowState icon="LoaderCircle" title={t("taskWorkforce.common.loading")} description={t("taskWorkforce.worker.loadingTasks")} /> : null}
    {tasks.isError ? <WorkflowState icon="CircleAlert" title={t("taskWorkforce.common.errorTitle")} description={t("taskWorkforce.worker.availableError")} actionLabel={t("taskWorkforce.common.retry")} onAction={() => void tasks.refetch()} /> : null}
    {!tasks.isPending && !tasks.isError && tasks.tasks.length === 0 ? <WorkflowState icon="ClipboardList" title={t("taskWorkforce.worker.availableEmptyTitle")} description={t("taskWorkforce.worker.availableEmptyDescription")} /> : null}
    {tasks.tasks.map((task) => <WorkerTaskCard key={task.taskId} task={task} />)}
    <LoadMore visible={Boolean(tasks.hasNextPage)} loading={tasks.isFetchingNextPage} onPress={() => void tasks.fetchNextPage()} />
    <WorkflowButton label={t("taskWorkforce.common.refresh")} onPress={() => void tasks.refetch()} variant="secondary" icon="RefreshCw" />
  </View>;
}

function MyTasks() {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const [status, setStatus] = useState<TaskStatus>();
  const filters = useMemo(() => ({ status, size: 20, sort: "updatedAt,desc" }), [status]);
  const tasks = useMyTasks(filters);
  return <View style={styles.stack}>
    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("taskWorkforce.worker.myTitle")}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
      <WorkflowChip label={t("taskWorkforce.common.all")} selected={!status} onPress={() => setStatus(undefined)} />
      {taskStatuses.map((item) => <WorkflowChip key={item} label={t(`taskWorkforce.status.${item}`)} selected={status === item} onPress={() => setStatus(item)} />)}
    </ScrollView>
    {tasks.isPending ? <WorkflowState icon="LoaderCircle" title={t("taskWorkforce.common.loading")} description={t("taskWorkforce.worker.loadingTasks")} /> : null}
    {tasks.isError ? <WorkflowState icon="CircleAlert" title={t("taskWorkforce.common.errorTitle")} description={t("taskWorkforce.worker.mineError")} actionLabel={t("taskWorkforce.common.retry")} onAction={() => void tasks.refetch()} /> : null}
    {!tasks.isPending && !tasks.isError && tasks.tasks.length === 0 ? <WorkflowState icon="ClipboardList" title={t("taskWorkforce.worker.mineEmptyTitle")} description={t("taskWorkforce.worker.mineEmptyDescription")} /> : null}
    {!tasks.isPending && !tasks.isError && tasks.tasks.length > 0 ? <TaskGroups tasks={tasks.tasks} /> : null}
    <LoadMore visible={Boolean(tasks.hasNextPage)} loading={tasks.isFetchingNextPage} onPress={() => void tasks.fetchNextPage()} />
    <WorkflowButton label={t("taskWorkforce.common.refresh")} onPress={() => void tasks.refetch()} variant="secondary" icon="RefreshCw" />
  </View>;
}

function TaskGroups({ tasks }: { tasks: OperationalTask[] }) {
  const { t } = useTranslation();
  const groups: { name: "active" | "blocked" | "history"; statuses: TaskStatus[] }[] = [
    { name: "active", statuses: ["ASSIGNED", "IN_PROGRESS"] },
    { name: "blocked", statuses: ["BLOCKED"] },
    { name: "history", statuses: ["COMPLETED", "CANCELLED"] },
  ];

  return <View style={styles.stack}>{groups.map((group) => {
    const items = tasks.filter((task) => group.statuses.includes(task.status));
    return items.length ? <View key={group.name} style={styles.stack}>
      <Text style={styles.groupTitle}>{t(`taskWorkforce.worker.groups.${group.name}`)}</Text>
      {items.map((task) => <WorkerTaskCard key={task.taskId} task={task} />)}
    </View> : null;
  })}</View>;
}

function WorkerTaskCard({ task }: { task: OperationalTask }) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={t("taskWorkforce.worker.openTask", { title: task.title })} onPress={() => router.push({ pathname: "/(worker)/tasks/[id]", params: { id: String(task.taskId) } })} style={[styles.taskCard, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>
    <View style={styles.taskTitleRow}>
      <Text style={[styles.taskTitle, { color: Colors.textPrimary }]}>{task.title}</Text>
      <Text style={{ color: Colors.primary }}>#{task.taskId}</Text>
    </View>
    <View style={styles.badges}><TaskStatusBadge status={task.status} /><PriorityBadge priority={task.priority} /></View>
    <Text style={{ color: Colors.textSecondary }}>{t(`taskWorkforce.specialization.${task.specializationCode}`, { defaultValue: task.specializationCode })}</Text>
    {task.apartmentId ? <Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.agent.apartmentValue", { id: task.apartmentId })}</Text> : null}
  </Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 16, paddingBottom: 32, gap: 14 }, heading: { gap: 5 },
  headingRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }, headingCopy: { flex: 1, gap: 4 }, headerActions: { flexDirection: "row", gap: 8 },
  notificationButton: { minWidth: 44, height: 44, borderWidth: 1, borderRadius: 22, alignItems: "center", justifyContent: "center" }, notificationCount: { position: "absolute", right: -7, top: -7, minWidth: 18, height: 18, paddingHorizontal: 3, borderRadius: 9, overflow: "hidden", textAlign: "center", fontSize: 10, fontWeight: "800", lineHeight: 18 }, disabled: { opacity: 0.65 },
  title: { fontSize: 24, fontWeight: "800" }, sectionTitle: { fontSize: 17, fontWeight: "800" }, groupTitle: { fontSize: 15, fontWeight: "800" }, stack: { gap: 10 }, chips: { gap: 8, paddingRight: 4 },
  metrics: { flexDirection: "row", gap: 8 }, metric: { flex: 1, minHeight: 92, borderWidth: 1, borderRadius: 14, padding: 10, justifyContent: "space-between" }, metricValue: { fontSize: 26, fontWeight: "800" }, metricLabel: { fontSize: 12, fontWeight: "700" },
  taskCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 }, taskTitleRow: { flexDirection: "row", gap: 12, justifyContent: "space-between" }, taskTitle: { flex: 1, fontSize: 16, fontWeight: "800" }, badges: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
});
