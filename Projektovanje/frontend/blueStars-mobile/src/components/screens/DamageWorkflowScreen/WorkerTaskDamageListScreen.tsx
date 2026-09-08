import { formatMoney, formatTimestamp } from "@/src/components/screens/ExpenseWorkflowScreen/expenseWorkflowHelpers";
import { WorkflowButton, WorkflowCard, WorkflowState } from "@/src/components/screens/TaskWorkflowScreen/TaskWorkflowUi";
import { useDamages } from "@/src/hooks/useDamages";
import { useTaskDetail } from "@/src/hooks/useTaskWorkflows";
import { useTheme } from "@/src/providers/ThemeProvider";
import { InvalidRouteState } from "@/src/components/screens/InvalidRouteState";
import { parsePositiveId } from "@/src/util/idParams";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { isAxiosError } from "axios";

const relevantStatuses = ["ASSIGNED", "IN_PROGRESS", "BLOCKED"] as const;
const filters = { size: 20 };

export default function WorkerTaskDamageListScreen() {
  const { t, i18n } = useTranslation(); const { Colors } = useTheme(); const { id } = useLocalSearchParams<{ id?: string | string[] }>(); const taskId = parsePositiveId(id); const task = useTaskDetail(taskId);
  const canAccess = Boolean(task.data?.apartmentId && task.data.assignedWorkerId !== null && relevantStatuses.includes(task.data?.status as typeof relevantStatuses[number])); const damages = useDamages(canAccess ? task.data?.apartmentId : undefined, filters);
  const accessRequestFailed = isAxiosError(damages.error) && (damages.error.response?.status === 403 || damages.error.response?.status === 404);
  useEffect(() => { if (taskId === null) return; const timer = setInterval(() => void task.refetch(), 20_000); return () => clearInterval(timer); }, [task, taskId]);
  if (taskId === null) return <InvalidRouteState fallbackHref="/(worker)" fallbackKind="home" />;
  if (task.isPending) return <SafeAreaView style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><WorkflowState icon="LoaderCircle" title={t("damageWorkflow.common.loading")} description={t("damageWorkflow.worker.checkingAccess")} /></SafeAreaView>;
  if (task.isError || !canAccess) return <SafeAreaView style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><WorkflowState icon="CircleAlert" title={t("damageWorkflow.worker.accessLostTitle")} description={t("damageWorkflow.worker.accessLost")} actionLabel={t("damageWorkflow.common.retry")} onAction={() => void task.refetch()} /></SafeAreaView>;
  if (accessRequestFailed) return <SafeAreaView style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><WorkflowState icon="CircleAlert" title={t("damageWorkflow.worker.accessLostTitle")} description={t("damageWorkflow.worker.accessLost")} actionLabel={t("damageWorkflow.common.retry")} onAction={() => void task.refetch()} /></SafeAreaView>;
  const apartmentId = task.data!.apartmentId!; const refresh = () => void Promise.all([task.refetch(), damages.refetch()]);
  return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><FlatList data={damages.damages} keyExtractor={(item) => String(item.damageId)} contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={task.isRefetching || damages.isRefetching} onRefresh={refresh} tintColor={Colors.primary} />} ListHeaderComponent={<WorkflowCard><Text style={[styles.title, { color: Colors.textPrimary }]}>{t("damageWorkflow.worker.title")}</Text><Text style={{ color: Colors.textSecondary }}>{t("damageWorkflow.worker.hint", { id: apartmentId })}</Text></WorkflowCard>} renderItem={({ item }) => <Pressable accessibilityRole="button" accessibilityLabel={t("damageWorkflow.list.open", { title: item.title })} onPress={() => router.push({ pathname: "/(worker)/tasks/[id]/damages/[damageId]", params: { id: String(taskId), damageId: String(item.damageId), apartmentId: String(apartmentId) } })} style={[styles.item, { backgroundColor: Colors.background, borderColor: Colors.divider }]}><View style={styles.itemCopy}><Text style={[styles.itemTitle, { color: Colors.textPrimary }]}>{item.title}</Text><Text style={{ color: Colors.textSecondary }} numberOfLines={2}>{item.description}</Text><Text style={{ color: Colors.textSecondary }}>{formatTimestamp(item.createdAt, i18n.language)}</Text></View>{item.estimatedAmount ? <Text style={{ color: Colors.textPrimary, fontWeight: "800" }}>{formatMoney(item.estimatedAmount, t("damageWorkflow.common.currency"))}</Text> : null}</Pressable>} ListEmptyComponent={damages.isPending ? <WorkflowState icon="LoaderCircle" title={t("damageWorkflow.common.loading")} description={t("damageWorkflow.list.loading")} /> : damages.isError ? <WorkflowState icon="CircleAlert" title={t("damageWorkflow.common.errorTitle")} description={t("damageWorkflow.list.loadError")} actionLabel={t("damageWorkflow.common.retry")} onAction={refresh} /> : <WorkflowState icon="SearchX" title={t("damageWorkflow.list.emptyTitle")} description={t("damageWorkflow.list.empty")} />} ListFooterComponent={damages.hasNextPage ? <WorkflowButton label={t("damageWorkflow.list.loadMore")} onPress={() => void damages.fetchNextPage()} variant="secondary" loading={damages.isFetchingNextPage} /> : null} /></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 16, paddingBottom: 32, gap: 12, flexGrow: 1 }, title: { fontSize: 21, fontWeight: "800" }, item: { borderWidth: 1, borderRadius: 14, padding: 14, flexDirection: "row", gap: 12, justifyContent: "space-between" }, itemCopy: { flex: 1, gap: 4 }, itemTitle: { fontSize: 16, fontWeight: "800" } });
