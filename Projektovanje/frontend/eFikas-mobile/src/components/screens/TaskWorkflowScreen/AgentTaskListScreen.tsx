import { TaskListFilters } from "@/src/api/services/taskWorkflowService";
import { WorkflowCard, WorkflowChip, WorkflowState, TaskStatusBadge, PriorityBadge, LoadMore, formatTaskDate, WorkflowButton } from "@/src/components/screens/TaskWorkflowScreen/TaskWorkflowUi";
import { useAgentTasks, useSpecializations } from "@/src/hooks/useTaskWorkflows";
import { useTheme } from "@/src/providers/ThemeProvider";
import { OperationalTask, TaskStatus } from "@/src/types/types";
import { parsePositiveId } from "@/src/util/idParams";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const statuses: TaskStatus[] = ["NEW", "ASSIGNED", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"];

export default function AgentTaskListScreen() {
  const { t, i18n } = useTranslation();
  const { Colors } = useTheme();
  const [status, setStatus] = useState<TaskStatus>();
  const [specializationId, setSpecializationId] = useState<number>();
  const [apartmentIdText, setApartmentIdText] = useState("");
  const [reservationIdText, setReservationIdText] = useState("");
  const [workerIdText, setWorkerIdText] = useState("");
  const apartmentId = parsePositiveId(apartmentIdText);
  const reservationId = parsePositiveId(reservationIdText);
  const workerId = parsePositiveId(workerIdText);
  const filters = useMemo<Omit<TaskListFilters, "page">>(() => ({
    size: 20,
    sort: "updatedAt,desc",
    ...(status ? { status } : {}),
    ...(specializationId ? { specializationId } : {}),
    ...(apartmentId !== null ? { apartmentId } : {}),
    ...(reservationId !== null ? { reservationId } : {}),
    ...(workerId !== null ? { assignedWorkerId: workerId } : {}),
  }), [apartmentId, reservationId, specializationId, status, workerId]);
  const tasks = useAgentTasks(filters);
  const specializations = useSpecializations();
  const hasFilters = Boolean(status || specializationId || apartmentIdText || reservationIdText || workerIdText);

  const clearFilters = () => {
    setStatus(undefined);
    setSpecializationId(undefined);
    setApartmentIdText("");
    setReservationIdText("");
    setWorkerIdText("");
  };
  const refresh = () => void Promise.all([tasks.refetch(), specializations.refetch()]);

  return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
    <FlatList
      data={tasks.tasks}
      keyExtractor={(task) => String(task.taskId)}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => <AgentTaskCard task={item} locale={i18n.language} />}
      ListHeaderComponent={<View style={styles.header}>
        <View style={styles.titleRow}><View style={styles.titleCopy}><Text style={[styles.title, { color: Colors.textPrimary }]}>{t("taskWorkforce.agent.listTitle")}</Text><Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.agent.listSubtitle")}</Text></View><View style={styles.createButton}><WorkflowButton label={t("taskWorkforce.agent.create")} onPress={() => router.push("/(home)/tasks/create")} icon="Plus" /></View></View>
        <TaskFilters
          status={status}
          specializationId={specializationId}
          apartmentIdText={apartmentIdText}
          reservationIdText={reservationIdText}
          workerIdText={workerIdText}
          specializations={specializations.data ?? []}
          typesLoading={specializations.isPending}
          hasFilters={hasFilters}
          onStatusChange={setStatus}
          onSpecializationChange={setSpecializationId}
          onApartmentChange={setApartmentIdText}
          onReservationChange={setReservationIdText}
          onWorkerChange={setWorkerIdText}
          onClear={clearFilters}
        />
      </View>}
      ListEmptyComponent={tasks.isPending ? <WorkflowState icon="LoaderCircle" title={t("taskWorkforce.common.loading")} description={t("taskWorkforce.agent.loadingTasks")} /> : tasks.isError ? <WorkflowState icon="CircleAlert" title={t("taskWorkforce.common.errorTitle")} description={t("taskWorkforce.agent.loadError")} actionLabel={t("taskWorkforce.common.retry")} onAction={() => void tasks.refetch()} /> : <WorkflowState icon="ClipboardList" title={t("taskWorkforce.agent.emptyTitle")} description={t(hasFilters ? "taskWorkforce.agent.emptyFiltered" : "taskWorkforce.agent.emptyDescription")} />}
      ListFooterComponent={<LoadMore visible={Boolean(tasks.hasNextPage)} loading={tasks.isFetchingNextPage} onPress={() => void tasks.fetchNextPage()} />}
      onEndReached={() => tasks.hasNextPage && !tasks.isFetchingNextPage ? void tasks.fetchNextPage() : undefined}
      onEndReachedThreshold={0.4}
      refreshControl={<RefreshControl refreshing={tasks.isRefetching || specializations.isRefetching} onRefresh={refresh} tintColor={Colors.primary} />}
      showsVerticalScrollIndicator={false}
    />
  </SafeAreaView>;
}

function TaskFilters({
  status, specializationId, apartmentIdText, reservationIdText, workerIdText, specializations, typesLoading, hasFilters,
  onStatusChange, onSpecializationChange, onApartmentChange, onReservationChange, onWorkerChange, onClear,
}: {
  status?: TaskStatus; specializationId?: number; apartmentIdText: string; reservationIdText: string; workerIdText: string;
  specializations: { id: number; code: string; name: string }[]; typesLoading: boolean; hasFilters: boolean;
  onStatusChange: (value?: TaskStatus) => void; onSpecializationChange: (value?: number) => void; onApartmentChange: (value: string) => void; onReservationChange: (value: string) => void; onWorkerChange: (value: string) => void; onClear: () => void;
}) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  return <WorkflowCard>
    <View style={styles.filterTitleRow}><Text style={[styles.filterTitle, { color: Colors.textPrimary }]}>{t("taskWorkforce.common.filters")}</Text>{hasFilters ? <Pressable accessibilityRole="button" accessibilityLabel={t("taskWorkforce.common.clear")} onPress={onClear}><Text style={{ color: Colors.primary, fontWeight: "800" }}>{t("taskWorkforce.common.clear")}</Text></Pressable> : null}</View>
    <Text style={[styles.filterLabel, { color: Colors.textSecondary }]}>{t("taskWorkforce.agent.statusFilter")}</Text>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}><WorkflowChip label={t("taskWorkforce.common.all")} selected={!status} onPress={() => onStatusChange(undefined)} />{statuses.map((value) => <WorkflowChip key={value} label={t(`taskWorkforce.status.${value}`)} selected={status === value} onPress={() => onStatusChange(value)} />)}</ScrollView>
    <Text style={[styles.filterLabel, { color: Colors.textSecondary }]}>{t("taskWorkforce.agent.specializationFilter")}</Text>
    {typesLoading ? <Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.common.loading")}</Text> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}><WorkflowChip label={t("taskWorkforce.common.all")} selected={!specializationId} onPress={() => onSpecializationChange(undefined)} />{specializations.map((value) => <WorkflowChip key={value.id} label={t(`taskWorkforce.specialization.${value.code}`, { defaultValue: value.name })} selected={specializationId === value.id} onPress={() => onSpecializationChange(value.id)} />)}</ScrollView>}
    <View style={styles.idInputs}><FilterInput label={t("taskWorkforce.agent.apartmentFilter")} value={apartmentIdText} onChangeText={onApartmentChange} /><FilterInput label={t("taskWorkforce.agent.reservationFilter")} value={reservationIdText} onChangeText={onReservationChange} /><FilterInput label={t("taskWorkforce.agent.workerFilter")} value={workerIdText} onChangeText={onWorkerChange} /></View>
  </WorkflowCard>;
}

function FilterInput({ label, value, onChangeText }: { label: string; value: string; onChangeText: (value: string) => void }) {
  const { Colors } = useTheme();
  return <TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} keyboardType="number-pad" placeholder={label} placeholderTextColor={Colors.tertiary} style={[styles.input, { color: Colors.textPrimary, borderColor: Colors.divider, backgroundColor: Colors.screenBackground }]} />;
}

function AgentTaskCard({ task, locale }: { task: OperationalTask; locale: string }) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const specialization = t(`taskWorkforce.specialization.${task.specializationCode}`, { defaultValue: task.specializationCode });
  return <Pressable accessibilityRole="button" accessibilityLabel={t("taskWorkforce.agent.openTask", { title: task.title })} onPress={() => router.push({ pathname: "/(home)/tasks/[id]", params: { id: String(task.taskId) } })} style={[styles.taskCard, { borderColor: Colors.divider, backgroundColor: Colors.background }]}>
    <View style={styles.taskHeader}><Text style={[styles.taskTitle, { color: Colors.textPrimary }]} numberOfLines={2}>{task.title}</Text><Text style={{ color: Colors.primary, fontWeight: "800" }}>#{task.taskId}</Text></View>
    <View style={styles.badges}><TaskStatusBadge status={task.status} /><PriorityBadge priority={task.priority} /></View>
    <Text style={{ color: Colors.textSecondary }}>{specialization}</Text>
    <Text style={{ color: Colors.textSecondary }}>{task.apartmentId ? t("taskWorkforce.agent.apartmentValue", { id: task.apartmentId }) : t("taskWorkforce.common.notAvailable")}{task.reservationId ? ` · ${t("taskWorkforce.agent.reservationValue", { id: task.reservationId })}` : ""}</Text>
    <Text style={{ color: Colors.textSecondary }}>{task.assignedWorkerId ? t("taskWorkforce.agent.workerValue", { id: task.assignedWorkerId }) : t("taskWorkforce.agent.unclaimed")}</Text>
    <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>{t("taskWorkforce.agent.updatedAt", { value: formatTaskDate(task.updatedAt, locale) })}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 16, paddingBottom: 32, gap: 12 }, header: { gap: 12 }, titleRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" }, titleCopy: { flex: 1, gap: 4 }, title: { fontSize: 24, fontWeight: "800" }, createButton: { minWidth: 102 }, filterTitleRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, filterTitle: { fontSize: 16, fontWeight: "800" }, filterLabel: { fontSize: 12, fontWeight: "800" }, chips: { gap: 8, paddingRight: 4 }, idInputs: { gap: 8 }, input: { minHeight: 44, borderWidth: 1, borderRadius: 11, paddingHorizontal: 11, fontSize: 14 }, taskCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 }, taskHeader: { flexDirection: "row", justifyContent: "space-between", gap: 12 }, taskTitle: { flex: 1, fontSize: 16, fontWeight: "800" }, badges: { flexDirection: "row", gap: 9, alignItems: "center", flexWrap: "wrap" },
});
