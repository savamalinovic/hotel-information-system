import { useExpenseDetail } from "@/src/hooks/useExpenses";
import { useTheme } from "@/src/providers/ThemeProvider";
import { InvalidRouteState } from "@/src/components/screens/InvalidRouteState";
import { parsePositiveId } from "@/src/util/idParams";
import { useLocalSearchParams } from "expo-router";
import { useTranslation } from "react-i18next";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DetailRow, WorkflowCard, WorkflowState } from "@/src/components/screens/TaskWorkflowScreen/TaskWorkflowUi";
import { formatDate, formatMoney, formatTimestamp } from "./expenseWorkflowHelpers";

export default function ExpenseDetailScreen() {
  const { t, i18n } = useTranslation();
  const { Colors } = useTheme();
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const expenseId = parsePositiveId(id);
  const expense = useExpenseDetail(expenseId);

  if (expenseId === null) {
    return <InvalidRouteState fallbackHref="/(home)/expenses" />;
  }
  if (expense.isPending) {
    return <SafeAreaView style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><WorkflowState icon="LoaderCircle" title={t("expenseWorkflow.common.loading")} description={t("expenseWorkflow.detail.loading")} /></SafeAreaView>;
  }
  if (expense.isError || !expense.data) {
    return <SafeAreaView style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><WorkflowState icon="CircleAlert" title={t("expenseWorkflow.common.errorTitle")} description={t("expenseWorkflow.detail.loadError")} actionLabel={t("expenseWorkflow.common.retry")} onAction={() => void expense.refetch()} /></SafeAreaView>;
  }
  const data = expense.data;
  const author = [data.authorName, data.authorSurname].filter(Boolean).join(" ") || `#${data.createdBy}`;

  return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><ScrollView contentContainerStyle={styles.content}><Text style={[styles.title, { color: Colors.textPrimary }]}>{data.name}</Text><WorkflowCard>
    {data.voided ? <View style={[styles.voidBadge, { backgroundColor: `${Colors.error}20` }]}><Text style={{ color: Colors.error, fontWeight: "800" }}>{t("expenseWorkflow.detail.voided")}</Text></View> : <View style={[styles.activeBadge, { backgroundColor: `${Colors.success}20` }]}><Text style={{ color: Colors.success, fontWeight: "800" }}>{t("expenseWorkflow.detail.active")}</Text></View>}
    <DetailRow label={t("expenseWorkflow.detail.category")} value={data.categoryName} />
    <DetailRow label={t("expenseWorkflow.detail.amount")} value={formatMoney(data.amount, t("expenseWorkflow.common.currency"))} />
    <DetailRow label={t("expenseWorkflow.detail.date")} value={formatDate(data.expenseDate, i18n.language)} />
    <DetailRow label={t("expenseWorkflow.detail.author")} value={author} />
    <DetailRow label={t("expenseWorkflow.detail.createdAt")} value={formatTimestamp(data.createdAt, i18n.language)} />
    <Text style={[styles.label, { color: Colors.textSecondary }]}>{t("expenseWorkflow.detail.description")}</Text><Text style={{ color: Colors.textPrimary }}>{data.description || t("expenseWorkflow.common.notAvailable")}</Text>
    {data.voided ? <><DetailRow label={t("expenseWorkflow.detail.voidedBy")} value={data.voidedBy ? `#${data.voidedBy}` : "—"} /><DetailRow label={t("expenseWorkflow.detail.voidedAt")} value={formatTimestamp(data.voidedAt, i18n.language)} /><Text style={[styles.label, { color: Colors.textSecondary }]}>{t("expenseWorkflow.detail.voidReason")}</Text><Text style={{ color: Colors.textPrimary }}>{data.voidReason || t("expenseWorkflow.common.notAvailable")}</Text></> : null}
  </WorkflowCard></ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1, padding: 16 }, content: { gap: 12, paddingBottom: 32 }, title: { fontSize: 24, fontWeight: "800" }, label: { fontSize: 13, fontWeight: "800", marginTop: 2 }, voidBadge: { alignSelf: "flex-start", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 }, activeBadge: { alignSelf: "flex-start", borderRadius: 99, paddingHorizontal: 10, paddingVertical: 6 } });
