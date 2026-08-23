import * as DocumentPicker from "expo-document-picker";
import * as WebBrowser from "expo-web-browser";
import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { WorkflowButton, WorkflowCard, WorkflowState, TaskStatusBadge, PriorityBadge, DetailRow, formatTaskDate, AvailabilityBadge } from "@/src/components/screens/TaskWorkflowScreen/TaskWorkflowUi";
import { useTaskAttachments, useTaskDetail, useTaskHistory, useBlockTask, useCancelTask, useClaimTask, useCompleteTask, useResumeTask, useStartTask, useUploadTaskAttachment } from "@/src/hooks/useTaskWorkflows";
import { useWorkerAvailability } from "@/src/hooks/useWorkforce";
import { useSession } from "@/src/providers/SessionProvider";
import { useTheme } from "@/src/providers/ThemeProvider";
import { OperationalTask, TaskAttachment, TaskStatus } from "@/src/types/types";
import { getUserFacingErrorMessage } from "@/src/util/apiError";
import { InvalidRouteState } from "@/src/components/screens/InvalidRouteState";
import { parsePositiveId } from "@/src/util/idParams";

const terminalStatuses: TaskStatus[] = ["COMPLETED", "CANCELLED"];

export default function TaskDetailScreen() {
  const { t, i18n } = useTranslation();
  const { Colors } = useTheme();
  const { session } = useSession();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const taskId = parsePositiveId(params.id);
  const task = useTaskDetail(taskId);
  const history = useTaskHistory(taskId);
  const attachments = useTaskAttachments(taskId);
  const isWorker = session?.role === "OPERATIONAL_WORKER";
  const refresh = () => void Promise.all([task.refetch(), history.refetch(), attachments.refetch()]);

  if (taskId === null) {
    return isWorker
      ? <InvalidRouteState fallbackHref="/(worker)" fallbackKind="home" />
      : <InvalidRouteState fallbackHref="/(home)/tasks" />;
  }
  if (task.isPending) {
    return <SafeAreaView style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><WorkflowState icon="LoaderCircle" title={t("taskWorkforce.common.loading")} description={t("taskWorkforce.detail.loading")} /></SafeAreaView>;
  }
  if (task.isError || !task.data) {
    return <SafeAreaView style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><WorkflowState icon="CircleAlert" title={t("taskWorkforce.common.errorTitle")} description={t("taskWorkforce.detail.loadError")} actionLabel={t("taskWorkforce.common.retry")} onAction={() => void task.refetch()} /></SafeAreaView>;
  }

  return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <View style={styles.titleRow}><View style={styles.titleCopy}><Text style={[styles.title, { color: Colors.textPrimary }]}>{task.data.title}</Text><Text style={{ color: Colors.textSecondary }}>#{task.data.taskId}</Text></View><WorkflowButton label={t("taskWorkforce.common.refresh")} onPress={refresh} variant="secondary" icon="RefreshCw" /></View>
    <TaskDetails task={task.data} locale={i18n.language} isWorker={isWorker} />
    {isWorker ? <WorkerTaskActions task={task.data} onRefresh={refresh} /> : <AgentTaskActions task={task.data} onRefresh={refresh} />}
    <TaskAttachmentsSection taskId={taskId} attachments={attachments.data ?? []} loading={attachments.isPending} error={attachments.isError} canUpload={!isWorker || task.data.assignedWorkerId !== null} onRefresh={() => void attachments.refetch()} />
    <TaskHistorySection taskId={taskId} loading={history.isPending} error={history.isError} history={history.data ?? []} locale={i18n.language} onRefresh={() => void history.refetch()} />
  </ScrollView></SafeAreaView>;
}

function TaskDetails({ task, locale, isWorker }: { task: OperationalTask; locale: string; isWorker: boolean }) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const specialization = t(`taskWorkforce.specialization.${task.specializationCode}`, { defaultValue: task.specializationCode });
  return <WorkflowCard>
    <View style={styles.badges}><TaskStatusBadge status={task.status} /><PriorityBadge priority={task.priority} /></View>
    <Text style={[styles.description, { color: Colors.textPrimary }]}>{task.description || t("taskWorkforce.common.notAvailable")}</Text>
    <DetailRow label={t("taskWorkforce.detail.specialization")} value={specialization} />
    <DetailRow label={t("taskWorkforce.detail.apartment")} value={task.apartmentId ? t("taskWorkforce.agent.apartmentValue", { id: task.apartmentId }) : t("taskWorkforce.common.notAvailable")} />
    <DetailRow label={t("taskWorkforce.detail.reservation")} value={task.reservationId ? t("taskWorkforce.agent.reservationValue", { id: task.reservationId }) : t("taskWorkforce.common.notAvailable")} />
    <DetailRow label={t("taskWorkforce.detail.worker")} value={task.assignedWorkerId ? t("taskWorkforce.agent.workerValue", { id: task.assignedWorkerId }) : t("taskWorkforce.agent.unclaimed")} />
    <DetailRow label={t("taskWorkforce.detail.createdAt")} value={formatTaskDate(task.createdAt, locale)} />
    <DetailRow label={t("taskWorkforce.detail.updatedAt")} value={formatTaskDate(task.updatedAt, locale)} />
    {!isWorker && (task.apartmentId || task.reservationId) ? <View style={styles.linkRow}>{task.apartmentId ? <WorkflowButton label={t("taskWorkforce.detail.openApartment")} onPress={() => router.push({ pathname: "/(home)/apartments/[id]", params: { id: String(task.apartmentId) } })} variant="secondary" /> : null}{task.reservationId ? <WorkflowButton label={t("taskWorkforce.detail.openReservation")} onPress={() => router.push({ pathname: "/(home)/reservations/[id]", params: { id: String(task.reservationId) } })} variant="secondary" /> : null}</View> : null}
  </WorkflowCard>;
}

function AgentTaskActions({ task, onRefresh }: { task: OperationalTask; onRefresh: () => void }) {
  const { t } = useTranslation();
  const cancel = useCancelTask();
  const [visible, setVisible] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const canCancel = !terminalStatuses.includes(task.status);
  const submit = () => {
    const cleaned = reason.trim();
    if (!cleaned || cleaned.length > 300) {
      setError(t("taskWorkforce.detail.reasonValidation"));
      return;
    }
    cancel.mutate({ taskId: task.taskId, reason: cleaned }, {
      onSuccess: () => { setVisible(false); setReason(""); setError(""); onRefresh(); },
      onError: (requestError) => setError(getUserFacingErrorMessage(requestError, t("taskWorkforce.detail.cancelError"))),
    });
  };
  if (!canCancel) {
    return null;
  }
  return <WorkflowCard><Text>{t("taskWorkforce.detail.agentActions")}</Text><WorkflowButton label={t("taskWorkforce.detail.cancelTask")} onPress={() => setVisible(true)} variant="danger" /><ReasonDialog visible={visible} title={t("taskWorkforce.detail.cancelTitle")} description={t("taskWorkforce.detail.cancelDescription")} reason={reason} error={error} submitting={cancel.isPending} confirmLabel={t("taskWorkforce.detail.confirmCancel")} onReasonChange={setReason} onClose={() => !cancel.isPending && setVisible(false)} onConfirm={submit} /></WorkflowCard>;
}

function WorkerTaskActions({ task, onRefresh }: { task: OperationalTask; onRefresh: () => void }) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const availability = useWorkerAvailability();
  const claim = useClaimTask();
  const start = useStartTask();
  const resume = useResumeTask();
  const complete = useCompleteTask();
  const block = useBlockTask();
  const [claimVisible, setClaimVisible] = useState(false);
  const [blockVisible, setBlockVisible] = useState(false);
  const [completeVisible, setCompleteVisible] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const mutate = (operation: { mutate: (id: number, options: { onSuccess: () => void; onError: (error: unknown) => void }) => void }, fallback: string) => operation.mutate(task.taskId, { onSuccess: onRefresh, onError: (requestError) => { setError(getUserFacingErrorMessage(requestError, fallback)); onRefresh(); } });
  const requestClaim = () => {
    if (availability.data?.status !== "AVAILABLE") {
      setError(t("taskWorkforce.worker.claimUnavailable", { status: availability.data ? t(`taskWorkforce.availability.${availability.data.status}`) : t("taskWorkforce.common.notAvailable") }));
      return;
    }
    setClaimVisible(true);
  };
  const claimTask = () => claim.mutate(task.taskId, { onSuccess: () => { setClaimVisible(false); onRefresh(); }, onError: (requestError) => { setClaimVisible(false); setError(getUserFacingErrorMessage(requestError, t("taskWorkforce.worker.claimConflict"))); onRefresh(); } });
  const submitBlock = () => {
    const cleaned = reason.trim();
    if (!cleaned || cleaned.length > 300) { setError(t("taskWorkforce.detail.reasonValidation")); return; }
    block.mutate({ taskId: task.taskId, reason: cleaned }, { onSuccess: () => { setBlockVisible(false); setReason(""); setError(""); onRefresh(); }, onError: (requestError) => { setError(getUserFacingErrorMessage(requestError, t("taskWorkforce.worker.actionError"))); onRefresh(); } });
  };
  const finish = () => complete.mutate(task.taskId, { onSuccess: () => { setCompleteVisible(false); onRefresh(); }, onError: (requestError) => { setError(getUserFacingErrorMessage(requestError, t("taskWorkforce.worker.actionError"))); onRefresh(); } });
  return <WorkflowCard>
    <Text style={{ color: Colors.textPrimary, fontWeight: "800" }}>{t("taskWorkforce.detail.workerActions")}</Text>
    {availability.data ? <AvailabilityBadge status={availability.data.status} /> : null}
    {error ? <Text style={{ color: Colors.error }}>{error}</Text> : null}
    {task.apartmentId && task.assignedWorkerId !== null && ["ASSIGNED", "IN_PROGRESS", "BLOCKED"].includes(task.status) ? <WorkflowButton label={t("damageWorkflow.worker.openFromTask")} onPress={() => router.push({ pathname: "/(worker)/tasks/[id]/damages", params: { id: String(task.taskId) } })} variant="secondary" /> : null}
    {task.specializationCode === "CLEANING" ? <Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.worker.cleaningHint")}</Text> : null}
    {task.status === "NEW" ? <WorkflowButton label={t("taskWorkforce.worker.claim")} onPress={requestClaim} loading={claim.isPending} /> : null}
    {task.status === "ASSIGNED" ? <WorkflowButton label={t("taskWorkforce.worker.start")} onPress={() => mutate(start, t("taskWorkforce.worker.actionError"))} loading={start.isPending} /> : null}
    {task.status === "IN_PROGRESS" ? <><WorkflowButton label={t("taskWorkforce.worker.block")} onPress={() => setBlockVisible(true)} variant="secondary" loading={block.isPending} /><WorkflowButton label={t("taskWorkforce.worker.complete")} onPress={() => setCompleteVisible(true)} loading={complete.isPending} /></> : null}
    {task.status === "BLOCKED" ? <WorkflowButton label={t("taskWorkforce.worker.resume")} onPress={() => mutate(resume, t("taskWorkforce.worker.actionError"))} loading={resume.isPending} /> : null}
    <ReasonDialog visible={blockVisible} title={t("taskWorkforce.worker.blockTitle")} description={t("taskWorkforce.worker.blockDescription")} reason={reason} error={error} submitting={block.isPending} confirmLabel={t("taskWorkforce.worker.confirmBlock")} onReasonChange={setReason} onClose={() => !block.isPending && setBlockVisible(false)} onConfirm={submitBlock} />
    <ConfirmationDialog visible={claimVisible} title={t("taskWorkforce.worker.claimTitle")} description={t("taskWorkforce.worker.claimDescription")} confirming={claim.isPending} confirmLabel={t("taskWorkforce.worker.confirmClaim")} onClose={() => !claim.isPending && setClaimVisible(false)} onConfirm={claimTask} />
    <ConfirmationDialog visible={completeVisible} title={t("taskWorkforce.worker.completeTitle")} description={t("taskWorkforce.worker.completeDescription")} confirming={complete.isPending} confirmLabel={t("taskWorkforce.worker.confirmComplete")} onClose={() => !complete.isPending && setCompleteVisible(false)} onConfirm={finish} />
  </WorkflowCard>;
}

function TaskAttachmentsSection({ taskId, attachments, loading, error, canUpload, onRefresh }: { taskId: number; attachments: TaskAttachment[]; loading: boolean; error: boolean; canUpload: boolean; onRefresh: () => void }) {
  const { t, i18n } = useTranslation();
  const { Colors } = useTheme();
  const upload = useUploadTaskAttachment();
  const [uploadError, setUploadError] = useState("");
  const pick = async () => {
    const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true, multiple: false });
    if (result.canceled) { return; }
    const file = result.assets[0];
    if (!file || (file.size ?? 0) > 10 * 1024 * 1024) { setUploadError(t("taskWorkforce.attachments.sizeError")); return; }
    upload.mutate({ taskId, file: { uri: file.uri, name: file.name, mimeType: file.mimeType, size: file.size, ...(file.file ? { file: file.file } : {}) } }, { onSuccess: () => { setUploadError(""); onRefresh(); }, onError: (requestError) => setUploadError(getUserFacingErrorMessage(requestError, t("taskWorkforce.attachments.uploadError"))) });
  };
  return <WorkflowCard>
    <View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("taskWorkforce.attachments.title")}</Text><WorkflowButton label={t("taskWorkforce.common.refresh")} onPress={onRefresh} variant="secondary" icon="RefreshCw" /></View>
    {uploadError ? <Text style={{ color: Colors.error }}>{uploadError}</Text> : null}
    {canUpload ? <><Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.attachments.limit")}</Text><WorkflowButton label={t("taskWorkforce.attachments.add")} onPress={() => void pick()} loading={upload.isPending} icon="Upload" /></> : <Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.attachments.workerRestriction")}</Text>}
    {loading ? <ActivityIndicator color={Colors.primary} /> : error ? <WorkflowState icon="CircleAlert" title={t("taskWorkforce.common.errorTitle")} description={t("taskWorkforce.attachments.loadError")} actionLabel={t("taskWorkforce.common.retry")} onAction={onRefresh} /> : attachments.length === 0 ? <Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.attachments.empty")}</Text> : attachments.map((attachment) => <AttachmentItem key={attachment.id} attachment={attachment} locale={i18n.language} onExpired={onRefresh} />)}
  </WorkflowCard>;
}

function AttachmentItem({ attachment, locale, onExpired }: { attachment: TaskAttachment; locale: string; onExpired: () => void }) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const [opening, setOpening] = useState(false);
  const open = async () => {
    setOpening(true);
    try { await WebBrowser.openBrowserAsync(attachment.downloadUrl); } catch { onExpired(); } finally { setOpening(false); }
  };
  return <View style={[styles.attachment, { borderTopColor: Colors.divider }]}><View style={styles.attachmentCopy}><Text style={{ color: Colors.textPrimary, fontWeight: "800" }}>{attachment.originalName}</Text><Text style={{ color: Colors.textSecondary }}>{attachment.contentType} · {formatFileSize(attachment.sizeBytes)}</Text><Text style={{ color: Colors.textSecondary, fontSize: 12 }}>{t("taskWorkforce.attachments.uploaded", { id: attachment.uploadedBy, date: formatTaskDate(attachment.uploadedAt, locale) })}</Text></View><View style={styles.attachmentActions}><WorkflowButton label={t("taskWorkforce.attachments.open")} onPress={() => void open()} variant="secondary" loading={opening} icon="ExternalLink" /><Pressable accessibilityRole="button" accessibilityLabel={t("taskWorkforce.attachments.refreshUrl")} onPress={onExpired}><Text style={{ color: Colors.primary, fontWeight: "800" }}>{t("taskWorkforce.attachments.refreshUrl")}</Text></Pressable></View></View>;
}

function TaskHistorySection({ taskId, history, loading, error, locale, onRefresh }: { taskId: number; history: { id: number; toStatus: TaskStatus; actorId: number; changedAt: string; reason: string }[]; loading: boolean; error: boolean; locale: string; onRefresh: () => void }) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  return <WorkflowCard><View style={styles.sectionHeader}><Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("taskWorkforce.history.title")}</Text><WorkflowButton label={t("taskWorkforce.common.refresh")} onPress={onRefresh} variant="secondary" icon="RefreshCw" /></View>{loading ? <ActivityIndicator color={Colors.primary} /> : error ? <WorkflowState icon="CircleAlert" title={t("taskWorkforce.common.errorTitle")} description={t("taskWorkforce.history.loadError")} actionLabel={t("taskWorkforce.common.retry")} onAction={onRefresh} /> : history.length === 0 ? <Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.history.empty")}</Text> : history.map((item) => <View key={item.id} style={[styles.historyItem, { borderTopColor: Colors.divider }]}><TaskStatusBadge status={item.toStatus} /><Text style={{ color: Colors.textSecondary }}>{formatTaskDate(item.changedAt, locale)}</Text><Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.history.actor", { id: item.actorId })}</Text>{item.reason ? <Text style={{ color: Colors.textPrimary }}>{item.reason}</Text> : null}</View>)}</WorkflowCard>;
}

function ReasonDialog({ visible, title, description, reason, error, submitting, confirmLabel, onReasonChange, onClose, onConfirm }: { visible: boolean; title: string; description: string; reason: string; error: string; submitting: boolean; confirmLabel: string; onReasonChange: (value: string) => void; onClose: () => void; onConfirm: () => void }) {
  const { t } = useTranslation(); const { Colors } = useTheme();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.modalOverlay}><View style={[styles.modalCard, { backgroundColor: Colors.background }]}><Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>{title}</Text><Text style={{ color: Colors.textSecondary }}>{description}</Text><TextInput accessibilityLabel={t("taskWorkforce.detail.reason")} value={reason} onChangeText={onReasonChange} maxLength={300} multiline textAlignVertical="top" style={[styles.reasonInput, { color: Colors.textPrimary, backgroundColor: Colors.screenBackground, borderColor: Colors.divider }]} /><Text style={{ color: Colors.textSecondary }}>{reason.length}/300</Text>{error ? <Text style={{ color: Colors.error }}>{error}</Text> : null}<View style={styles.modalActions}><View style={styles.flex}><WorkflowButton label={t("taskWorkforce.common.close")} onPress={onClose} variant="secondary" disabled={submitting} /></View><View style={styles.flex}><WorkflowButton label={confirmLabel} onPress={onConfirm} variant="danger" loading={submitting} /></View></View></View></View></Modal>;
}

function ConfirmationDialog({ visible, title, description, confirming, confirmLabel, onClose, onConfirm }: { visible: boolean; title: string; description: string; confirming: boolean; confirmLabel: string; onClose: () => void; onConfirm: () => void }) {
  const { t } = useTranslation(); const { Colors } = useTheme();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}><View style={styles.modalOverlay}><View style={[styles.modalCard, { backgroundColor: Colors.background }]}><Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>{title}</Text><Text style={{ color: Colors.textSecondary }}>{description}</Text><View style={styles.modalActions}><View style={styles.flex}><WorkflowButton label={t("taskWorkforce.common.close")} onPress={onClose} variant="secondary" disabled={confirming} /></View><View style={styles.flex}><WorkflowButton label={confirmLabel} onPress={onConfirm} loading={confirming} /></View></View></View></View></Modal>;
}

const formatFileSize = (sizeBytes: number) => `${Math.ceil(sizeBytes / 1024)} KB`;
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 16, paddingBottom: 32, gap: 12 }, titleRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" }, titleCopy: { flex: 1, gap: 3 }, title: { fontSize: 24, fontWeight: "800" }, badges: { flexDirection: "row", gap: 8, flexWrap: "wrap" }, description: { fontSize: 15, lineHeight: 22 }, linkRow: { gap: 8 }, sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 }, sectionTitle: { fontSize: 17, fontWeight: "800" }, attachment: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 8 }, attachmentCopy: { gap: 3 }, attachmentActions: { gap: 8 }, historyItem: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 10, gap: 5 }, modalOverlay: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" }, modalCard: { borderRadius: 16, padding: 18, gap: 12 }, modalTitle: { fontSize: 20, fontWeight: "800" }, reasonInput: { minHeight: 100, borderWidth: 1, borderRadius: 12, padding: 11 }, modalActions: { flexDirection: "row", gap: 10 }, flex: { flex: 1 } });
