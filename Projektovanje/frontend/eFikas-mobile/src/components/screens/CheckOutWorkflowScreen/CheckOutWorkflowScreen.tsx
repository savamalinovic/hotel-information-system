import { formatDateKey, formatMoney, getLocalDateKey } from "@/src/components/screens/ReservationWorkflowScreen/reservationWorkflowHelpers";
import { useApartmentCatalogDetail, useApartmentStatusHistory } from "@/src/hooks/useApartmentCatalog";
import {
  useCheckOut,
  useCheckOutTask,
  useCheckOutTaskHistory,
  useExistingCleaningTask,
} from "@/src/hooks/useCheckOutWorkflow";
import { useReservationGuests } from "@/src/hooks/useGuestCheckIn";
import { usePaymentSummary } from "@/src/hooks/usePaymentWorkflows";
import { useProfile } from "@/src/hooks/useProfile";
import { useReservationDetail, useReservationStatusHistory } from "@/src/hooks/useReservationWorkflows";
import { useTheme } from "@/src/providers/ThemeProvider";
import { CheckOutResponse, OperationalTask, TaskStatusHistory } from "@/src/types/types";
import { getUserFacingErrorMessage } from "@/src/util/apiError";
import { InvalidRouteState } from "@/src/components/screens/InvalidRouteState";
import { parsePositiveId } from "@/src/util/idParams";
import { isAxiosError } from "axios";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

const formatTimestamp = (value: string | null | undefined, locale: string) =>
  value ? new Date(value).toLocaleString(locale) : "—";

const toLocalDateKey = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return getLocalDateKey();
  }

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const isNonZeroDecimal = (value: string | undefined) => Boolean(value && !/^0(?:\.0+)?$/.test(value.trim()));

export default function CheckOutWorkflowScreen() {
  const { id, taskId: taskIdParam } = useLocalSearchParams<{ id?: string | string[]; taskId?: string | string[] }>();
  const reservationId = parsePositiveId(id);
  const routeTaskId = parsePositiveId(taskIdParam);
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const reservation = useReservationDetail(reservationId);
  const reservationHistory = useReservationStatusHistory(reservationId);
  const payments = usePaymentSummary(reservationId);
  const guests = useReservationGuests(reservationId);
  const profile = useProfile();
  const apartmentId = reservation.data?.apartmentId;
  const apartment = useApartmentCatalogDetail(apartmentId);
  const apartmentHistory = useApartmentStatusHistory(apartmentId);
  const [result, setResult] = useState<CheckOutResponse>();
  const [recoveredOutcome, setRecoveredOutcome] = useState(false);
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const submittingRef = useRef(false);
  const checkOut = useCheckOut();
  const isAlreadyCheckedOut = reservation.data?.status === "CHECKED_OUT";
  const existingCleaningTask = useExistingCleaningTask(
    reservationId,
    isAlreadyCheckedOut && !result?.cleaningTaskId && !routeTaskId
  );
  const resolvedTaskId = result?.cleaningTaskId ?? routeTaskId ?? existingCleaningTask.data?.taskId;
  const cleaningTask = useCheckOutTask(resolvedTaskId);
  const taskHistory = useCheckOutTaskHistory(resolvedTaskId);

  const primaryGuest = useMemo(
    () => guests.data?.find((guest) => guest.primaryGuest)?.guest,
    [guests.data]
  );
  const checkedOutAt = result?.checkedOutAt ?? reservation.data?.checkedOutAt;
  const checkedOutBy = result?.checkedOutByUserId ?? reservation.data?.checkedOutByUserId;
  const apartmentStatus = result?.apartmentStatus ?? apartment.data?.operationalStatus;
  const isEarlyDeparture = reservation.data && checkedOutAt
    ? toLocalDateKey(checkedOutAt) < reservation.data.checkOutDate
    : reservation.data
      ? getLocalDateKey() < reservation.data.checkOutDate
      : false;
  const canCheckOut = Boolean(
    reservation.data?.status === "CHECKED_IN" && profile.profile?.role === "AGENT"
  );
  const operationSucceeded = Boolean(result || recoveredOutcome || isAlreadyCheckedOut);

  const refresh = () => {
    const baseQueries = [
      reservation.refetch(),
      reservationHistory.refetch(),
      payments.refetch(),
      guests.refetch(),
      apartment.refetch(),
      apartmentHistory.refetch(),
      profile.refetch(),
    ];
    const cleaningQueries = operationSucceeded
      ? [
        ...(resolvedTaskId ? [cleaningTask.refetch(), taskHistory.refetch()] : [existingCleaningTask.refetch()]),
      ]
      : [];

    void Promise.all([...baseQueries, ...cleaningQueries]);
  };

  const retryCleaningData = () => {
    const queries = resolvedTaskId
      ? [cleaningTask.refetch(), taskHistory.refetch()]
      : [existingCleaningTask.refetch()];
    void Promise.all(queries);
  };

  const reconcileUnknownOutcome = async () => {
    const refreshed = await reservation.refetch();
    if (refreshed.data?.status === "CHECKED_OUT") {
      setRecoveredOutcome(true);
      setConfirmationVisible(false);
      setErrorMessage("");
      void existingCleaningTask.refetch();
      return true;
    }

    return false;
  };

  const submitCheckOut = () => {
    if (!canCheckOut || checkOut.isPending || submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setErrorMessage("");
    checkOut.mutate(reservationId, {
      onSuccess: (response) => {
        submittingRef.current = false;
        setResult(response);
        setRecoveredOutcome(false);
        setConfirmationVisible(false);
      },
      onError: async (error) => {
        submittingRef.current = false;
        const status = isAxiosError(error) ? error.response?.status : undefined;
        const shouldReconcile = status === 409 || status === undefined;

        if (shouldReconcile && await reconcileUnknownOutcome()) {
          return;
        }

        const fallback = status === 403
          ? t("checkOutWorkflow.errors.forbidden")
          : status === 404
            ? t("checkOutWorkflow.errors.notFound")
            : status === 409
              ? t("checkOutWorkflow.errors.conflict")
              : status === undefined
                ? t("checkOutWorkflow.errors.unknownOutcome")
                : t("checkOutWorkflow.errors.submit");
        setErrorMessage(getUserFacingErrorMessage(error, fallback));
      },
    });
  };

  if (reservationId === null) {
    return <InvalidRouteState fallbackHref="/(home)/reservations" />;
  }

  if (reservation.isPending) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /><Text style={{ color: Colors.textSecondary }}>{t("checkOutWorkflow.common.loading")}</Text></View></SafeAreaView>;
  }

  if (reservation.isError || !reservation.data) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><CenteredState title={t("checkOutWorkflow.errors.reservationTitle")} description={t("checkOutWorkflow.errors.reservationDescription")} actionLabel={t("checkOutWorkflow.common.retry")} onAction={() => void reservation.refetch()} /></SafeAreaView>;
  }

  const reservationData = reservation.data;
  const outstandingBalance = payments.data?.outstandingBalance;
  const paymentHasOutstandingBalance = Boolean(
    payments.data && payments.data.status !== "PAID" && isNonZeroDecimal(outstandingBalance)
  );
  const isRefreshing = reservation.isRefetching || reservationHistory.isRefetching || payments.isRefetching
    || guests.isRefetching || apartment.isRefetching || apartmentHistory.isRefetching
    || existingCleaningTask.isRefetching || cleaningTask.isRefetching || taskHistory.isRefetching;

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={refresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>{t("checkOutWorkflow.title")}</Text>
          <Text style={{ color: Colors.textSecondary }}>{t("checkOutWorkflow.reference", { id: reservationData.reservationId })}</Text>
        </View>
        {errorMessage ? <MessageBox color={Colors.error} message={errorMessage} /> : null}
        {operationSucceeded ? <CheckOutResult
          checkedOutAt={checkedOutAt}
          checkedOutBy={checkedOutBy}
          apartmentStatus={apartmentStatus}
          cleaningTaskId={resolvedTaskId}
          paymentHasOutstandingBalance={paymentHasOutstandingBalance}
          outstandingBalance={outstandingBalance}
          isEarlyDeparture={isEarlyDeparture}
          onOpenPayments={() => router.push({ pathname: "/reservations/[id]/payments", params: { id: String(reservationId) } })}
          onBackToReservation={() => router.replace({ pathname: "/reservations/[id]", params: { id: String(reservationId) } })}
        /> : <CheckOutReadiness
          reservation={reservationData}
          primaryGuestName={primaryGuest ? `${primaryGuest.name} ${primaryGuest.surname}` : undefined}
          apartmentStatus={apartment.data?.operationalStatus}
          apartmentPending={apartment.isPending}
          paymentStatus={payments.data?.status}
          totalDue={payments.data?.totalDue}
          netPaid={payments.data?.netPaid}
          outstandingBalance={outstandingBalance}
          paymentPending={payments.isPending}
          paymentError={payments.isError}
          isEarlyDeparture={isEarlyDeparture}
          isSignedInAgent={profile.profile?.role === "AGENT"}
          onOpenPayments={() => router.push({ pathname: "/reservations/[id]/payments", params: { id: String(reservationId) } })}
        />}
        {operationSucceeded ? <CleaningTaskSection
          taskId={resolvedTaskId}
          task={cleaningTask.data}
          taskPending={cleaningTask.isPending || existingCleaningTask.isPending}
          taskError={cleaningTask.isError || existingCleaningTask.isError || existingCleaningTask.data === null}
          history={taskHistory.data}
          historyPending={taskHistory.isPending}
          historyError={taskHistory.isError}
          onRetry={retryCleaningData}
        /> : null}
        {!operationSucceeded ? <Section title={t("checkOutWorkflow.readiness.title")}>
          {reservationData.status !== "CHECKED_IN" ? <MessageBox color={Colors.error} message={t("checkOutWorkflow.readiness.statusBlocked")} /> : null}
          {profile.isLoading ? <Text style={{ color: Colors.textSecondary }}>{t("checkOutWorkflow.readiness.loadingSession")}</Text> : null}
          {profile.isError || profile.profile?.role !== "AGENT" ? <MessageBox color={Colors.error} message={t("checkOutWorkflow.readiness.agentRequired")} /> : null}
          <Text style={[styles.hint, { color: Colors.textSecondary }]}>{t("checkOutWorkflow.readiness.serverValidation")}</Text>
          <ActionButton label={t("checkOutWorkflow.actions.checkOut")} onPress={() => setConfirmationVisible(true)} disabled={!canCheckOut} loading={checkOut.isPending} variant="primary" />
        </Section> : null}
      </ScrollView>
      <CheckOutConfirmation
        visible={confirmationVisible}
        reservation={reservationData}
        paymentStatus={payments.data?.status}
        outstandingBalance={outstandingBalance}
        isEarlyDeparture={isEarlyDeparture}
        submitting={checkOut.isPending}
        onCancel={() => setConfirmationVisible(false)}
        onConfirm={submitCheckOut}
      />
    </SafeAreaView>
  );
}

function CheckOutReadiness({
  reservation,
  primaryGuestName,
  apartmentStatus,
  apartmentPending,
  paymentStatus,
  totalDue,
  netPaid,
  outstandingBalance,
  paymentPending,
  paymentError,
  isEarlyDeparture,
  isSignedInAgent,
  onOpenPayments,
}: {
  reservation: { reservationId: number; apartmentName: string; checkInDate: string; checkOutDate: string; status: string };
  primaryGuestName: string | undefined;
  apartmentStatus: string | undefined;
  apartmentPending: boolean;
  paymentStatus: string | undefined;
  totalDue: string | undefined;
  netPaid: string | undefined;
  outstandingBalance: string | undefined;
  paymentPending: boolean;
  paymentError: boolean;
  isEarlyDeparture: boolean;
  isSignedInAgent: boolean;
  onOpenPayments: () => void;
}) {
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();
  const hasDebt = paymentStatus !== undefined && paymentStatus !== "PAID";

  return <>
    <Section title={t("checkOutWorkflow.readiness.summaryTitle")}>
      <InfoRow label={t("checkOutWorkflow.readiness.apartment")} value={reservation.apartmentName} />
      <InfoRow label={t("checkOutWorkflow.readiness.primaryGuest")} value={primaryGuestName ?? t("checkOutWorkflow.common.notAvailable")} />
      <InfoRow label={t("checkOutWorkflow.readiness.period")} value={`${formatDateKey(reservation.checkInDate, i18n.language)} – ${formatDateKey(reservation.checkOutDate, i18n.language)}`} />
      <InfoRow label={t("checkOutWorkflow.readiness.plannedCheckOut")} value={formatDateKey(reservation.checkOutDate, i18n.language)} />
      <InfoRow label={t("checkOutWorkflow.readiness.reservationStatus")} value={t(`checkOutWorkflow.reservationStatuses.${reservation.status}`)} />
      <InfoRow label={t("checkOutWorkflow.readiness.apartmentStatus")} value={apartmentPending ? t("checkOutWorkflow.common.loading") : apartmentStatus ? t(`checkOutWorkflow.apartmentStatuses.${apartmentStatus}`) : t("checkOutWorkflow.common.notAvailable")} />
    </Section>
    {isEarlyDeparture ? <MessageBox color={Colors.accent} message={t("checkOutWorkflow.readiness.earlyDeparture")} /> : null}
    <Section title={t("checkOutWorkflow.payment.title")}>
      {paymentPending ? <ActivityIndicator color={Colors.primary} /> : paymentError ? <MessageBox color={Colors.error} message={t("checkOutWorkflow.payment.unavailable")} /> : <>
        <InfoRow label={t("checkOutWorkflow.payment.status")} value={paymentStatus ? t(`checkOutWorkflow.paymentStatuses.${paymentStatus}`) : t("checkOutWorkflow.common.notAvailable")} />
        <InfoRow label={t("checkOutWorkflow.payment.totalDue")} value={totalDue ? formatMoney(totalDue, t("checkOutWorkflow.common.currency")) : t("checkOutWorkflow.common.notAvailable")} />
        <InfoRow label={t("checkOutWorkflow.payment.netPaid")} value={netPaid ? formatMoney(netPaid, t("checkOutWorkflow.common.currency")) : t("checkOutWorkflow.common.notAvailable")} />
        <InfoRow label={t("checkOutWorkflow.payment.outstanding")} value={outstandingBalance ? formatMoney(outstandingBalance, t("checkOutWorkflow.common.currency")) : t("checkOutWorkflow.common.notAvailable")} emphasized />
        {hasDebt ? <MessageBox color={Colors.accent} message={t("checkOutWorkflow.payment.debtWarning")} /> : null}
      </>}
      <ActionButton label={t("checkOutWorkflow.actions.openPayments")} onPress={onOpenPayments} variant="secondary" />
    </Section>
    <Section title={t("checkOutWorkflow.readiness.checksTitle")}>
      <ReadinessRow ready={reservation.status === "CHECKED_IN"} label={t("checkOutWorkflow.readiness.reservationCheck")} />
      <ReadinessRow ready={isSignedInAgent} label={t("checkOutWorkflow.readiness.agentCheck")} />
      <ReadinessRow ready label={t("checkOutWorkflow.readiness.paymentCheck")} />
    </Section>
  </>;
}

function CheckOutResult({
  checkedOutAt,
  checkedOutBy,
  apartmentStatus,
  cleaningTaskId,
  paymentHasOutstandingBalance,
  outstandingBalance,
  isEarlyDeparture,
  onOpenPayments,
  onBackToReservation,
}: {
  checkedOutAt: string | null | undefined;
  checkedOutBy: number | null | undefined;
  apartmentStatus: string | undefined;
  cleaningTaskId: number | undefined;
  paymentHasOutstandingBalance: boolean;
  outstandingBalance: string | undefined;
  isEarlyDeparture: boolean;
  onOpenPayments: () => void;
  onBackToReservation: () => void;
}) {
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();

  return <>
    <MessageBox color={Colors.success} message={t("checkOutWorkflow.result.success")} />
    <Section title={t("checkOutWorkflow.result.title")}>
      <InfoRow label={t("checkOutWorkflow.result.reservationStatus")} value={t("checkOutWorkflow.reservationStatuses.CHECKED_OUT")} />
      <InfoRow label={t("checkOutWorkflow.result.actualDeparture")} value={formatTimestamp(checkedOutAt, i18n.language)} />
      <InfoRow label={t("checkOutWorkflow.result.performedBy")} value={checkedOutBy ? t("checkOutWorkflow.result.agent", { id: checkedOutBy }) : t("checkOutWorkflow.common.notAvailable")} />
      <InfoRow label={t("checkOutWorkflow.result.apartmentStatus")} value={apartmentStatus ? t(`checkOutWorkflow.apartmentStatuses.${apartmentStatus}`) : t("checkOutWorkflow.common.notAvailable")} />
      <InfoRow label={t("checkOutWorkflow.result.cleaningTask")} value={cleaningTaskId ? String(cleaningTaskId) : t("checkOutWorkflow.common.notAvailable")} emphasized />
      <Text style={[styles.hint, { color: Colors.textSecondary }]}>{t("checkOutWorkflow.result.cleaningPublished")}</Text>
      {isEarlyDeparture ? <MessageBox color={Colors.accent} message={t("checkOutWorkflow.result.earlyDeparture")} /> : null}
    </Section>
    {paymentHasOutstandingBalance ? <Section title={t("checkOutWorkflow.payment.outstandingTitle")}>
      <MessageBox color={Colors.accent} message={t("checkOutWorkflow.payment.demoReceiptBlocked", { amount: outstandingBalance ? formatMoney(outstandingBalance, t("checkOutWorkflow.common.currency")) : t("checkOutWorkflow.common.notAvailable") })} />
      <ActionButton label={t("checkOutWorkflow.actions.openPayments")} onPress={onOpenPayments} variant="secondary" />
    </Section> : null}
    <ActionButton label={t("checkOutWorkflow.actions.backToReservation")} onPress={onBackToReservation} variant="secondary" />
  </>;
}

function CleaningTaskSection({
  taskId,
  task,
  taskPending,
  taskError,
  history,
  historyPending,
  historyError,
  onRetry,
}: {
  taskId: number | undefined;
  task: OperationalTask | undefined;
  taskPending: boolean;
  taskError: boolean;
  history: TaskStatusHistory[] | undefined;
  historyPending: boolean;
  historyError: boolean;
  onRetry: () => void;
}) {
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();

  return <Section title={t("checkOutWorkflow.cleaning.title")}>
    {taskPending ? <View style={styles.inlineLoading}><ActivityIndicator color={Colors.primary} /><Text style={{ color: Colors.textSecondary }}>{t("checkOutWorkflow.cleaning.loading")}</Text></View> : null}
    {taskError ? <>
      <MessageBox color={Colors.error} message={t("checkOutWorkflow.cleaning.partialError")} />
      <ActionButton label={t("checkOutWorkflow.actions.retryCleaning")} onPress={onRetry} variant="secondary" />
    </> : null}
    {!taskPending && !taskError && task ? <>
      <InfoRow label={t("checkOutWorkflow.cleaning.taskId")} value={String(task.taskId)} />
      <InfoRow label={t("checkOutWorkflow.cleaning.titleLabel")} value={task.title} />
      <InfoRow label={t("checkOutWorkflow.cleaning.description")} value={task.description || t("checkOutWorkflow.common.notAvailable")} />
      <InfoRow label={t("checkOutWorkflow.cleaning.specialization")} value={t(`checkOutWorkflow.specializations.${task.specializationCode}`)} />
      <InfoRow label={t("checkOutWorkflow.cleaning.priority")} value={t(`checkOutWorkflow.taskPriorities.${task.priority}`)} />
      <InfoRow label={t("checkOutWorkflow.cleaning.status")} value={t(`checkOutWorkflow.taskStatuses.${task.status}`)} />
      <InfoRow label={t("checkOutWorkflow.cleaning.apartment")} value={task.apartmentId ? String(task.apartmentId) : t("checkOutWorkflow.common.notAvailable")} />
      <InfoRow label={t("checkOutWorkflow.cleaning.reservation")} value={task.reservationId ? String(task.reservationId) : t("checkOutWorkflow.common.notAvailable")} />
      <InfoRow label={t("checkOutWorkflow.cleaning.assignedWorker")} value={task.assignedWorkerId ? t("checkOutWorkflow.cleaning.worker", { id: task.assignedWorkerId }) : t("checkOutWorkflow.cleaning.unassigned")} />
      <InfoRow label={t("checkOutWorkflow.cleaning.createdAt")} value={formatTimestamp(task.createdAt, i18n.language)} />
      <InfoRow label={t("checkOutWorkflow.cleaning.updatedAt")} value={formatTimestamp(task.updatedAt, i18n.language)} />
      <TaskTimeline items={history} pending={historyPending} error={historyError} onRetry={onRetry} />
    </> : null}
    {!taskPending && !taskError && !task && taskId ? <MessageBox color={Colors.error} message={t("checkOutWorkflow.cleaning.partialError")} /> : null}
  </Section>;
}

function TaskTimeline({
  items,
  pending,
  error,
  onRetry,
}: {
  items: TaskStatusHistory[] | undefined;
  pending: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();

  return <View style={styles.timeline}>
    <Text style={[styles.subheading, { color: Colors.textPrimary }]}>{t("checkOutWorkflow.cleaning.history")}</Text>
    {pending ? <ActivityIndicator color={Colors.primary} /> : null}
    {error ? <><MessageBox color={Colors.error} message={t("checkOutWorkflow.cleaning.historyError")} /><ActionButton label={t("checkOutWorkflow.actions.retryCleaning")} onPress={onRetry} variant="secondary" /></> : null}
    {!pending && !error && (items?.length ?? 0) === 0 ? <Text style={{ color: Colors.textSecondary }}>{t("checkOutWorkflow.cleaning.emptyHistory")}</Text> : null}
    {!pending && !error ? items?.map((item) => <View key={item.id} style={[styles.timelineItem, { borderColor: Colors.divider }]}>
      <Text style={[styles.timelineStatus, { color: Colors.textPrimary }]}>{t(`checkOutWorkflow.taskStatuses.${item.toStatus}`)}</Text>
      <Text style={{ color: Colors.textSecondary }}>{t(`checkOutWorkflow.taskStatusDescriptions.${item.toStatus}`)}</Text>
      <Text style={{ color: Colors.textSecondary }}>{formatTimestamp(item.changedAt, i18n.language)}</Text>
      <Text style={{ color: Colors.textSecondary }}>{t("checkOutWorkflow.cleaning.changedBy", { id: item.actorId })}</Text>
      {item.reason ? <Text style={{ color: Colors.textPrimary }}>{item.reason}</Text> : null}
    </View>) : null}
  </View>;
}

function CheckOutConfirmation({
  visible,
  reservation,
  paymentStatus,
  outstandingBalance,
  isEarlyDeparture,
  submitting,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  reservation: { reservationId: number; apartmentName: string; checkOutDate: string };
  paymentStatus: string | undefined;
  outstandingBalance: string | undefined;
  isEarlyDeparture: boolean;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={submitting ? undefined : onCancel}>
    <View style={styles.modalOverlay}>
      <ScrollView contentContainerStyle={styles.modalScroll}>
        <View style={[styles.modalCard, { backgroundColor: Colors.background }]}>
          <Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>{t("checkOutWorkflow.confirm.title")}</Text>
          <Text style={{ color: Colors.textSecondary }}>{t("checkOutWorkflow.confirm.description")}</Text>
          <InfoRow label={t("checkOutWorkflow.confirm.apartment")} value={reservation.apartmentName} />
          <InfoRow label={t("checkOutWorkflow.confirm.reservation")} value={String(reservation.reservationId)} />
          <InfoRow label={t("checkOutWorkflow.confirm.plannedCheckOut")} value={formatDateKey(reservation.checkOutDate, i18n.language)} />
          <InfoRow label={t("checkOutWorkflow.confirm.paymentStatus")} value={paymentStatus ? t(`checkOutWorkflow.paymentStatuses.${paymentStatus}`) : t("checkOutWorkflow.common.notAvailable")} />
          <InfoRow label={t("checkOutWorkflow.confirm.outstanding")} value={outstandingBalance ? formatMoney(outstandingBalance, t("checkOutWorkflow.common.currency")) : t("checkOutWorkflow.common.notAvailable")} />
          {isEarlyDeparture ? <MessageBox color={Colors.accent} message={t("checkOutWorkflow.confirm.earlyDeparture")} /> : null}
          <MessageBox color={Colors.accent} message={t("checkOutWorkflow.confirm.apartmentDirty")} />
          <MessageBox color={Colors.accent} message={t("checkOutWorkflow.confirm.cleaningTask")} />
          <View style={styles.modalActions}>
            <ActionButton label={t("checkOutWorkflow.common.cancel")} onPress={onCancel} disabled={submitting} variant="secondary" />
            <View style={styles.modalConfirm}><ActionButton label={t("checkOutWorkflow.actions.confirm")} onPress={onConfirm} loading={submitting} variant="primary" /></View>
          </View>
        </View>
      </ScrollView>
    </View>
  </Modal>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { Colors } = useTheme();
  return <View style={[styles.section, { backgroundColor: Colors.background, borderColor: Colors.divider }]}><Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{title}</Text><View style={styles.sectionBody}>{children}</View></View>;
}

function InfoRow({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  const { Colors } = useTheme();
  return <View style={styles.infoRow}><Text style={[styles.infoLabel, { color: Colors.textSecondary }]}>{label}</Text><Text style={[styles.infoValue, { color: Colors.textPrimary }, emphasized && styles.emphasized]}>{value}</Text></View>;
}

function ReadinessRow({ ready, label }: { ready: boolean; label: string }) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  return <View style={styles.readinessRow}><Text style={{ color: Colors.textPrimary }}>{label}</Text><Text style={{ color: ready ? Colors.success : Colors.error, fontWeight: "700" }}>{ready ? t("checkOutWorkflow.readiness.ready") : t("checkOutWorkflow.readiness.notReady")}</Text></View>;
}

function ActionButton({
  label,
  onPress,
  disabled = false,
  loading = false,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  variant?: "primary" | "secondary";
}) {
  const { Colors } = useTheme();
  const primary = variant === "primary";
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading} onPress={onPress} style={[styles.button, { backgroundColor: primary ? Colors.primary : "transparent", borderColor: primary ? Colors.primary : Colors.divider }, (disabled || loading) && styles.disabled]}>{loading ? <ActivityIndicator color={primary ? Colors.textLight : Colors.textPrimary} /> : null}<Text style={[styles.buttonText, { color: primary ? Colors.textLight : Colors.textPrimary }]}>{label}</Text></Pressable>;
}

function MessageBox({ color, message }: { color: string; message: string }) {
  return <View style={[styles.messageBox, { borderColor: color }]}><Text style={{ color }}>{message}</Text></View>;
}

function CenteredState({ title, description, actionLabel, onAction }: { title: string; description: string; actionLabel: string; onAction: () => void }) {
  const { Colors } = useTheme();
  return <View style={styles.centered}><Text style={[styles.centeredTitle, { color: Colors.textPrimary }]}>{title}</Text><Text style={{ color: Colors.textSecondary, textAlign: "center" }}>{description}</Text><ActionButton label={actionLabel} onPress={onAction} variant="secondary" /></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  centeredTitle: { fontSize: 20, fontWeight: "800", textAlign: "center" },
  heading: { gap: 4 },
  title: { fontSize: 24, fontWeight: "800" },
  section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  subheading: { fontSize: 15, fontWeight: "800" },
  sectionBody: { gap: 10 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  infoLabel: { flex: 1, fontSize: 14 },
  infoValue: { flex: 1, fontSize: 14, fontWeight: "600", textAlign: "right" },
  emphasized: { fontSize: 16, fontWeight: "800" },
  readinessRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  hint: { fontSize: 13, lineHeight: 19 },
  messageBox: { borderWidth: 1, borderRadius: 12, padding: 11 },
  inlineLoading: { flexDirection: "row", gap: 8, alignItems: "center" },
  timeline: { gap: 9, marginTop: 4 },
  timelineItem: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 9, gap: 3 },
  timelineStatus: { fontWeight: "800" },
  button: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  buttonText: { fontSize: 14, fontWeight: "800" },
  disabled: { opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", padding: 20 },
  modalScroll: { flexGrow: 1, justifyContent: "center" },
  modalCard: { borderRadius: 16, padding: 18, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalActions: { flexDirection: "row", gap: 10 },
  modalConfirm: { flex: 1 },
});
