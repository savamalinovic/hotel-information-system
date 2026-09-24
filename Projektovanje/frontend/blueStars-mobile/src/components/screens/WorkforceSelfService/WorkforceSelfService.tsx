import DateTimePicker from "@/src/components/organisms/DateTimePicker/DateTimePicker";
import { DateField } from "@/src/components/molecules/DateField/DateField";
import {
  AvailabilityBadge,
  DetailRow,
  formatTaskDate,
  LoadMore,
  WorkflowButton,
  WorkflowCard,
  WorkflowChip,
  WorkflowState,
} from "@/src/components/screens/TaskWorkflowScreen/TaskWorkflowUi";
import {
  useAttendanceHistory,
  useAvailabilityOverrides,
  useCancelLeaveRequest,
  useClearAvailabilityOverride,
  useClockIn,
  useClockOut,
  useCreateAvailabilityOverride,
  useCreateLeaveRequest,
  useEndBreak,
  useLeaveRequests,
  useStartBreak,
  useWorkerAvailability,
  workforceStateMayHaveChanged,
} from "@/src/hooks/useWorkforce";
import { useTheme } from "@/src/providers/ThemeProvider";
import { AvailabilityOverride, AttendanceSession, LeaveRequest, WorkerAvailability } from "@/src/types/types";
import { getUserFacingErrorMessage } from "@/src/util/apiError";
import { formatLeaveDate, isValidInclusiveLeavePeriod } from "@/src/util/leaveDate";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type SelfServiceSection = "overview" | "attendance" | "overrides" | "leave";

const sections: SelfServiceSection[] = ["overview", "attendance", "overrides", "leave"];

const getWorkforceActionErrorMessage = (error: unknown, fallback: string, refreshedStateMessage: string) =>
  workforceStateMayHaveChanged(error) ? refreshedStateMessage : getUserFacingErrorMessage(error, fallback);

export default function WorkforceSelfServiceScreen() {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const [section, setSection] = useState<SelfServiceSection>("overview");
  const availability = useWorkerAvailability();
  const refresh = () => void availability.refetch();

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={availability.isRefetching} onRefresh={refresh} tintColor={Colors.primary} />}
      >
        <View style={styles.heading}>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>{t("taskWorkforce.selfService.title")}</Text>
          <Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.selfService.subtitle")}</Text>
        </View>
        {availability.isPending ? <WorkflowState icon="LoaderCircle" title={t("taskWorkforce.common.loading")} description={t("taskWorkforce.selfService.loadingStatus")} /> : null}
        {availability.isError ? <WorkflowState icon="CircleAlert" title={t("taskWorkforce.common.errorTitle")} description={t("taskWorkforce.selfService.statusError")} actionLabel={t("taskWorkforce.common.retry")} onAction={refresh} /> : null}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
          {sections.map((item) => <WorkflowChip key={item} label={t(`taskWorkforce.selfService.sections.${item}`)} selected={section === item} onPress={() => setSection(item)} />)}
        </ScrollView>
        {section === "overview" ? <SelfServiceOverview availability={availability.data} onNavigate={setSection} /> : null}
        {section === "attendance" ? <AttendanceSection availability={availability.data} /> : null}
        {section === "overrides" ? <AvailabilityOverridesSection /> : null}
        {section === "leave" ? <LeaveRequestsSection /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function SelfServiceOverview({ availability, onNavigate }: { availability?: WorkerAvailability; onNavigate: (section: SelfServiceSection) => void }) {
  const { t } = useTranslation();
  const { Colors } = useTheme();

  return <View style={styles.stack}>
    <WorkforceStatusCard availability={availability} protectAgentBusy />
    <WorkflowCard>
      <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("taskWorkforce.selfService.attendanceActions")}</Text>
      <AttendanceActions availability={availability} />
    </WorkflowCard>
    <View style={styles.overviewActions}>
      <WorkflowButton label={t("taskWorkforce.selfService.openOverrides")} onPress={() => onNavigate("overrides")} variant="secondary" />
      <WorkflowButton label={t("taskWorkforce.selfService.openLeave")} onPress={() => onNavigate("leave")} variant="secondary" />
    </View>
  </View>;
}

export function WorkforceStatusCard({ availability, protectAgentBusy = false }: { availability?: WorkerAvailability; protectAgentBusy?: boolean }) {
  const { t, i18n } = useTranslation();
  const { Colors } = useTheme();
  const hasUnexpectedBusy = protectAgentBusy && availability?.status === "BUSY";

  return <WorkflowCard>
    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("taskWorkforce.selfService.currentStatus")}</Text>
    {!availability ? <Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.common.notAvailable")}</Text> : hasUnexpectedBusy ? <>
      <Text style={[styles.mismatchTitle, { color: Colors.error }]}>{t("taskWorkforce.selfService.statusMismatch")}</Text>
      <Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.selfService.statusMismatchDescription")}</Text>
    </> : <>
      <AvailabilityBadge status={availability.status} />
      <DetailRow label={t("taskWorkforce.selfService.clockedIn")} value={formatTaskDate(availability.clockedInAt, i18n.language)} />
      {availability.breakStartedAt ? <DetailRow label={t("taskWorkforce.selfService.activeBreak")} value={formatTaskDate(availability.breakStartedAt, i18n.language)} /> : null}
      {availability.unavailabilityReason ? <DetailRow label={t("taskWorkforce.selfService.activeOverride")} value={availability.unavailabilityReason} /> : null}
      {availability.leaveReason ? <DetailRow label={t("taskWorkforce.selfService.activeLeave")} value={availability.leaveReason} /> : null}
      <Text style={{ color: Colors.textSecondary }}>{t(`taskWorkforce.selfService.availabilityDescription.${availability.status}`)}</Text>
    </>}
  </WorkflowCard>;
}

export function AttendanceSection({ availability }: { availability?: WorkerAvailability }) {
  const { t, i18n } = useTranslation();
  const { Colors } = useTheme();
  const sessions = useAttendanceHistory({ size: 20, sort: "clockedInAt,desc" });

  return <View style={styles.stack}>
    <WorkflowCard>
      <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("taskWorkforce.selfService.attendanceActions")}</Text>
      <AttendanceActions availability={availability} />
    </WorkflowCard>
    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("taskWorkforce.selfService.attendanceHistory")}</Text>
    {sessions.isPending ? <WorkflowState icon="LoaderCircle" title={t("taskWorkforce.common.loading")} description={t("taskWorkforce.selfService.loadingAttendance")} /> : null}
    {sessions.isError ? <WorkflowState icon="CircleAlert" title={t("taskWorkforce.common.errorTitle")} description={t("taskWorkforce.selfService.attendanceError")} actionLabel={t("taskWorkforce.common.retry")} onAction={() => void sessions.refetch()} /> : null}
    {!sessions.isPending && !sessions.isError && sessions.rows.length === 0 ? <WorkflowState icon="ClipboardList" title={t("taskWorkforce.selfService.attendanceEmptyTitle")} description={t("taskWorkforce.selfService.attendanceEmptyDescription")} /> : null}
    {sessions.rows.map((session) => <AttendanceCard key={session.attendanceSessionId} session={session} locale={i18n.language} />)}
    <LoadMore visible={Boolean(sessions.hasNextPage)} loading={sessions.isFetchingNextPage} onPress={() => void sessions.fetchNextPage()} />
    <WorkflowButton label={t("taskWorkforce.common.refresh")} onPress={() => void sessions.refetch()} variant="secondary" />
  </View>;
}

export function AttendanceActions({ availability }: { availability?: WorkerAvailability }) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const clockIn = useClockIn();
  const startBreak = useStartBreak();
  const endBreak = useEndBreak();
  const clockOut = useClockOut();
  const [clockOutConfirmation, setClockOutConfirmation] = useState(false);
  const [attendanceError, setAttendanceError] = useState("");
  const [clockOutError, setClockOutError] = useState("");
  const actionError = (requestError: unknown) => setAttendanceError(getWorkforceActionErrorMessage(requestError, t("taskWorkforce.selfService.attendanceActionError"), t("workforceFeedback.refreshStateAfterAction")));

  useEffect(() => {
    if (clockOutConfirmation && availability && !availability.attendanceSessionId) {
      setClockOutConfirmation(false);
      setClockOutError("");
    }
  }, [availability, clockOutConfirmation]);

  const runAttendanceAction = (mutate: (options: { onSuccess: () => void; onError: (requestError: unknown) => void }) => void) => {
    setAttendanceError("");
    mutate({ onSuccess: () => setAttendanceError(""), onError: actionError });
  };

  const openClockOutConfirmation = () => {
    setAttendanceError("");
    setClockOutError("");
    setClockOutConfirmation(true);
  };

  const closeClockOutConfirmation = () => {
    if (!clockOut.isPending) {
      setClockOutConfirmation(false);
      setClockOutError("");
    }
  };

  const confirmClockOut = () => {
    setClockOutError("");
    clockOut.mutate(undefined, {
      onSuccess: () => {
        setClockOutConfirmation(false);
        setClockOutError("");
        setAttendanceError("");
      },
      onError: (requestError) => setClockOutError(getWorkforceActionErrorMessage(requestError, t("taskWorkforce.selfService.attendanceActionError"), t("workforceFeedback.refreshStateAfterAction"))),
    });
  };

  if (!availability) {
    return null;
  }

  return <View style={styles.stack}>
    {attendanceError ? <Text style={{ color: Colors.error }}>{attendanceError}</Text> : null}
    {!availability.attendanceSessionId ? <WorkflowButton label={t("taskWorkforce.selfService.clockIn")} onPress={() => runAttendanceAction((options) => clockIn.mutate(undefined, options))} loading={clockIn.isPending} icon="Clock" /> : null}
    {availability.attendanceSessionId && !availability.breakStartedAt ? <WorkflowButton label={t("taskWorkforce.selfService.startBreak")} onPress={() => runAttendanceAction((options) => startBreak.mutate(undefined, options))} loading={startBreak.isPending} variant="secondary" /> : null}
    {availability.breakStartedAt ? <WorkflowButton label={t("taskWorkforce.selfService.endBreak")} onPress={() => runAttendanceAction((options) => endBreak.mutate(undefined, options))} loading={endBreak.isPending} /> : null}
    {availability.attendanceSessionId && !availability.breakStartedAt ? <WorkflowButton label={t("taskWorkforce.selfService.clockOut")} onPress={openClockOutConfirmation} loading={clockOut.isPending} variant="danger" /> : null}
    <ConfirmationDialog
      visible={clockOutConfirmation}
      title={t("taskWorkforce.selfService.clockOutTitle")}
      description={t("taskWorkforce.selfService.clockOutDescription")}
      confirmLabel={t("taskWorkforce.selfService.confirmClockOut")}
      confirming={clockOut.isPending}
      error={clockOutError}
      onClose={closeClockOutConfirmation}
      onConfirm={confirmClockOut}
    />
  </View>;
}

function AttendanceCard({ session, locale }: { session: AttendanceSession; locale: string }) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  return <WorkflowCard>
    <DetailRow label={t("taskWorkforce.selfService.clockedIn")} value={formatTaskDate(session.clockedInAt, locale)} />
    <DetailRow label={t("taskWorkforce.selfService.clockedOut")} value={formatTaskDate(session.clockedOutAt, locale)} />
    <Text style={[styles.subTitle, { color: Colors.textPrimary }]}>{t("taskWorkforce.selfService.breaks")}</Text>
    {session.breaks.length ? session.breaks.map((period) => <DetailRow key={period.breakPeriodId} label={formatTaskDate(period.startedAt, locale)} value={formatTaskDate(period.endedAt, locale)} />) : <Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.selfService.noBreaks")}</Text>}
  </WorkflowCard>;
}

export function AvailabilityOverridesSection() {
  const { t, i18n } = useTranslation();
  const { Colors } = useTheme();
  const [startsAt, setStartsAt] = useState<Date>();
  const [endsAt, setEndsAt] = useState<Date>();
  const [reason, setReason] = useState("");
  const [picker, setPicker] = useState<"start" | "end">();
  const [formError, setFormError] = useState("");
  const [overrideToClear, setOverrideToClear] = useState<AvailabilityOverride>();
  const [clearOverrideError, setClearOverrideError] = useState("");
  const overrides = useAvailabilityOverrides({ size: 20, sort: "startsAt,desc" });
  const create = useCreateAvailabilityOverride();
  const clear = useClearAvailabilityOverride();

  useEffect(() => {
    if (overrideToClear && !overrides.rows.some((item) => item.availabilityOverrideId === overrideToClear.availabilityOverrideId && !item.clearedAt)) {
      setOverrideToClear(undefined);
      setClearOverrideError("");
    }
  }, [overrideToClear, overrides.rows]);

  const submit = () => {
    const cleanedReason = reason.trim();
    const effectiveStart = startsAt ?? new Date();
    if (!cleanedReason || cleanedReason.length > 300) {
      setFormError(t("taskWorkforce.selfService.overrideReasonValidation"));
      return;
    }
    if (endsAt && endsAt <= effectiveStart) {
      setFormError(t("taskWorkforce.selfService.periodValidation"));
      return;
    }
    create.mutate(
      { ...(startsAt ? { startsAt: startsAt.toISOString() } : {}), ...(endsAt ? { endsAt: endsAt.toISOString() } : {}), reason: cleanedReason },
      {
        onSuccess: () => {
          setReason("");
          setStartsAt(undefined);
          setEndsAt(undefined);
          setFormError("");
        },
        onError: (requestError) => setFormError(getUserFacingErrorMessage(requestError, t("taskWorkforce.selfService.overrideError"))),
      },
    );
  };

  const openClearConfirmation = (override: AvailabilityOverride) => {
    setClearOverrideError("");
    setOverrideToClear(override);
  };

  const closeClearConfirmation = () => {
    if (!clear.isPending) {
      setOverrideToClear(undefined);
      setClearOverrideError("");
    }
  };

  const confirmClear = () => {
    if (!overrideToClear) {
      return;
    }
    setClearOverrideError("");
    clear.mutate(overrideToClear.availabilityOverrideId, {
      onSuccess: () => {
        setOverrideToClear(undefined);
        setClearOverrideError("");
      },
      onError: (requestError) => setClearOverrideError(getWorkforceActionErrorMessage(requestError, t("taskWorkforce.selfService.clearOverrideError"), t("workforceFeedback.refreshStateAfterAction"))),
    });
  };

  return <View style={styles.stack}>
    <WorkflowCard>
      <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("taskWorkforce.selfService.overrideTitle")}</Text>
      <Text style={{ color: Colors.textSecondary }}>{t("taskWorkforce.selfService.overrideHint")}</Text>
      <InstantField label={t("taskWorkforce.selfService.startsAtOptional")} value={startsAt} locale={i18n.language} onPress={() => setPicker("start")} onClear={() => setStartsAt(undefined)} />
      <InstantField label={t("taskWorkforce.selfService.endsAtOptional")} value={endsAt} locale={i18n.language} onPress={() => setPicker("end")} onClear={() => setEndsAt(undefined)} />
      <TextInput accessibilityLabel={t("taskWorkforce.selfService.reason")} value={reason} onChangeText={setReason} maxLength={300} multiline textAlignVertical="top" placeholder={t("taskWorkforce.selfService.reason")} placeholderTextColor={Colors.tertiary} style={[styles.reasonInput, { color: Colors.textPrimary, backgroundColor: Colors.screenBackground, borderColor: Colors.divider }]} />
      <Text style={{ color: Colors.textSecondary }}>{reason.length}/300</Text>
      {formError ? <Text style={{ color: Colors.error }}>{formError}</Text> : null}
      <WorkflowButton label={t("taskWorkforce.selfService.submitOverride")} onPress={submit} loading={create.isPending} />
    </WorkflowCard>
    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("taskWorkforce.selfService.overrideHistory")}</Text>
    {overrides.isPending ? <WorkflowState icon="LoaderCircle" title={t("taskWorkforce.common.loading")} description={t("taskWorkforce.selfService.loadingOverrides")} /> : null}
    {overrides.isError ? <WorkflowState icon="CircleAlert" title={t("taskWorkforce.common.errorTitle")} description={t("taskWorkforce.selfService.overrideLoadError")} actionLabel={t("taskWorkforce.common.retry")} onAction={() => void overrides.refetch()} /> : null}
    {!overrides.isPending && !overrides.isError && overrides.rows.length === 0 ? <WorkflowState icon="ClipboardList" title={t("taskWorkforce.selfService.overrideEmptyTitle")} description={t("taskWorkforce.selfService.overrideEmptyDescription")} /> : null}
    {overrides.rows.map((override) => <OverrideCard key={override.availabilityOverrideId} item={override} locale={i18n.language} onClear={() => openClearConfirmation(override)} clearing={clear.isPending && overrideToClear?.availabilityOverrideId === override.availabilityOverrideId} />)}
    <LoadMore visible={Boolean(overrides.hasNextPage)} loading={overrides.isFetchingNextPage} onPress={() => void overrides.fetchNextPage()} />
    <WorkflowButton label={t("taskWorkforce.common.refresh")} onPress={() => void overrides.refetch()} variant="secondary" />
    <DateTimePicker visible={picker !== undefined} initialValue={picker === "start" ? startsAt ?? null : endsAt ?? null} onClose={() => setPicker(undefined)} onConfirm={(value) => picker === "start" ? setStartsAt(value) : setEndsAt(value)} />
    <ConfirmationDialog
      visible={Boolean(overrideToClear)}
      title={t("taskWorkforce.selfService.clearOverrideTitle")}
      description={t("taskWorkforce.selfService.clearOverrideDescription")}
      confirmLabel={t("taskWorkforce.selfService.clearOverride")}
      confirming={clear.isPending}
      error={clearOverrideError}
      onClose={closeClearConfirmation}
      onConfirm={confirmClear}
    />
  </View>;
}

function OverrideCard({ item, locale, onClear, clearing }: { item: AvailabilityOverride; locale: string; onClear: () => void; clearing: boolean }) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  return <WorkflowCard>
    <DetailRow label={t("taskWorkforce.selfService.startsAt")} value={formatTaskDate(item.startsAt, locale)} />
    <DetailRow label={t("taskWorkforce.selfService.endsAt")} value={formatTaskDate(item.endsAt, locale)} />
    <Text style={{ color: Colors.textPrimary }}>{item.reason}</Text>
    {item.clearedAt ? <DetailRow label={t("taskWorkforce.selfService.clearedAt")} value={formatTaskDate(item.clearedAt, locale)} /> : <WorkflowButton label={t("taskWorkforce.selfService.clearOverride")} onPress={onClear} loading={clearing} variant="secondary" />}
  </WorkflowCard>;
}

export function LeaveRequestsSection() {
  const { t, i18n } = useTranslation();
  const { Colors } = useTheme();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState("");
  const [leaveToCancel, setLeaveToCancel] = useState<LeaveRequest>();
  const [cancelLeaveError, setCancelLeaveError] = useState("");
  const leaves = useLeaveRequests({ size: 20, sort: "createdAt,desc" });
  const create = useCreateLeaveRequest();
  const cancel = useCancelLeaveRequest();

  useEffect(() => {
    if (leaveToCancel && !leaves.rows.some((item) => item.leaveRequestId === leaveToCancel.leaveRequestId && (item.status === "PENDING" || item.status === "APPROVED"))) {
      setLeaveToCancel(undefined);
      setCancelLeaveError("");
    }
  }, [leaveToCancel, leaves.rows]);

  const submit = () => {
    const cleanedReason = reason.trim();
    if (!isValidInclusiveLeavePeriod(startDate, endDate)) {
      setFormError(t("common.leave.invalidPeriod"));
      return;
    }
    if (!cleanedReason || cleanedReason.length > 300) {
      setFormError(t("taskWorkforce.selfService.leaveReasonValidation"));
      return;
    }
    create.mutate(
      { startDate, endDate, reason: cleanedReason },
      {
        onSuccess: () => {
          setStartDate("");
          setEndDate("");
          setReason("");
          setFormError("");
        },
        onError: (requestError) => setFormError(getUserFacingErrorMessage(requestError, t("taskWorkforce.selfService.leaveError"))),
      },
    );
  };

  const openCancelConfirmation = (leave: LeaveRequest) => {
    setCancelLeaveError("");
    setLeaveToCancel(leave);
  };

  const closeCancelConfirmation = () => {
    if (!cancel.isPending) {
      setLeaveToCancel(undefined);
      setCancelLeaveError("");
    }
  };

  const confirmCancel = () => {
    if (!leaveToCancel) {
      return;
    }
    setCancelLeaveError("");
    cancel.mutate(leaveToCancel.leaveRequestId, {
      onSuccess: () => {
        setLeaveToCancel(undefined);
        setCancelLeaveError("");
      },
      onError: (requestError) => setCancelLeaveError(getWorkforceActionErrorMessage(requestError, t("taskWorkforce.selfService.cancelLeaveError"), t("workforceFeedback.refreshStateAfterAction"))),
    });
  };

  return <View style={styles.stack}>
    <WorkflowCard>
      <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("taskWorkforce.selfService.leaveTitle")}</Text>
      <Text style={{ color: Colors.textSecondary }}>{t("common.leave.inclusiveHint")}</Text>
      <DateField label={t("common.leave.startDate")} value={startDate} onChange={setStartDate} required />
      <DateField label={t("common.leave.endDate")} value={endDate} onChange={setEndDate} required />
      <TextInput accessibilityLabel={t("taskWorkforce.selfService.reason")} value={reason} onChangeText={setReason} maxLength={300} multiline textAlignVertical="top" placeholder={t("taskWorkforce.selfService.reason")} placeholderTextColor={Colors.tertiary} style={[styles.reasonInput, { color: Colors.textPrimary, backgroundColor: Colors.screenBackground, borderColor: Colors.divider }]} />
      <Text style={{ color: Colors.textSecondary }}>{reason.length}/300</Text>
      {formError ? <Text style={{ color: Colors.error }}>{formError}</Text> : null}
      <WorkflowButton label={t("taskWorkforce.selfService.submitLeave")} onPress={submit} loading={create.isPending} />
    </WorkflowCard>
    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("taskWorkforce.selfService.leaveHistory")}</Text>
    {leaves.isPending ? <WorkflowState icon="LoaderCircle" title={t("taskWorkforce.common.loading")} description={t("taskWorkforce.selfService.loadingLeave")} /> : null}
    {leaves.isError ? <WorkflowState icon="CircleAlert" title={t("taskWorkforce.common.errorTitle")} description={t("taskWorkforce.selfService.leaveLoadError")} actionLabel={t("taskWorkforce.common.retry")} onAction={() => void leaves.refetch()} /> : null}
    {!leaves.isPending && !leaves.isError && leaves.rows.length === 0 ? <WorkflowState icon="ClipboardList" title={t("taskWorkforce.selfService.leaveEmptyTitle")} description={t("taskWorkforce.selfService.leaveEmptyDescription")} /> : null}
    {leaves.rows.map((leave) => <LeaveCard key={leave.leaveRequestId} item={leave} locale={i18n.language} onCancel={() => openCancelConfirmation(leave)} cancelling={cancel.isPending && leaveToCancel?.leaveRequestId === leave.leaveRequestId} />)}
    <LoadMore visible={Boolean(leaves.hasNextPage)} loading={leaves.isFetchingNextPage} onPress={() => void leaves.fetchNextPage()} />
    <WorkflowButton label={t("taskWorkforce.common.refresh")} onPress={() => void leaves.refetch()} variant="secondary" />
    <ConfirmationDialog
      visible={Boolean(leaveToCancel)}
      title={t("taskWorkforce.selfService.cancelLeaveTitle")}
      description={t("taskWorkforce.selfService.cancelLeaveDescription")}
      confirmLabel={t("taskWorkforce.selfService.cancelLeave")}
      confirming={cancel.isPending}
      error={cancelLeaveError}
      onClose={closeCancelConfirmation}
      onConfirm={confirmCancel}
    />
  </View>;
}

function LeaveCard({ item, locale, onCancel, cancelling }: { item: LeaveRequest; locale: string; onCancel: () => void; cancelling: boolean }) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  const canCancel = item.status === "PENDING" || item.status === "APPROVED";
  return <WorkflowCard>
    <Text style={[styles.leaveStatus, { color: Colors.primary }]}>{t(`taskWorkforce.leaveStatus.${item.status}`)}</Text>
    <DetailRow label={t("common.leave.startDate")} value={formatLeaveDate(item.startDate, locale)} />
    <DetailRow label={t("common.leave.endDate")} value={formatLeaveDate(item.endDate, locale)} />
    <Text style={{ color: Colors.textPrimary }}>{item.reason}</Text>
    {item.decisionReason ? <DetailRow label={t("taskWorkforce.selfService.decisionReason")} value={item.decisionReason} /> : null}
    {item.decidedAt ? <DetailRow label={t("taskWorkforce.selfService.decidedAt")} value={formatTaskDate(item.decidedAt, locale)} /> : null}
    {canCancel ? <WorkflowButton label={t("taskWorkforce.selfService.cancelLeave")} onPress={onCancel} loading={cancelling} variant="secondary" /> : null}
  </WorkflowCard>;
}

function InstantField({ label, value, locale, onPress, onClear }: { label: string; value?: Date; locale: string; onPress: () => void; onClear?: () => void }) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  return <View style={styles.instantField}>
    <Text style={{ color: Colors.textSecondary, fontWeight: "700" }}>{label}</Text>
    <View style={styles.instantActions}>
      <View style={styles.instantButton}><WorkflowButton label={value ? formatTaskDate(value.toISOString(), locale) : t("taskWorkforce.selfService.chooseInstant")} onPress={onPress} variant="secondary" /></View>
      {onClear && value ? <Pressable accessibilityRole="button" accessibilityLabel={t("taskWorkforce.common.clear")} onPress={onClear}><Text style={{ color: Colors.primary, fontWeight: "800" }}>{t("taskWorkforce.common.clear")}</Text></Pressable> : null}
    </View>
  </View>;
}

function ConfirmationDialog({ visible, title, description, confirmLabel, confirming, error, onClose, onConfirm }: { visible: boolean; title: string; description: string; confirmLabel: string; confirming: boolean; error?: string; onClose: () => void; onConfirm: () => void }) {
  const { t } = useTranslation();
  const { Colors } = useTheme();
  return <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
    <View style={styles.modalOverlay}>
      <View style={[styles.modalCard, { backgroundColor: Colors.background }]}>
        <Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>{title}</Text>
        <Text style={{ color: Colors.textSecondary }}>{description}</Text>
        {error ? <View accessibilityLiveRegion="polite" style={[styles.modalError, { backgroundColor: `${Colors.error}18` }]}><Text style={{ color: Colors.error }}>{error}</Text></View> : null}
        <View style={styles.modalActions}>
          <View style={styles.flex}><WorkflowButton label={t("taskWorkforce.common.close")} onPress={onClose} variant="secondary" disabled={confirming} /></View>
          <View style={styles.flex}><WorkflowButton label={confirmLabel} onPress={onConfirm} loading={confirming} /></View>
        </View>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 14 },
  heading: { gap: 5 },
  title: { fontSize: 24, fontWeight: "800" },
  sectionTitle: { fontSize: 17, fontWeight: "800" },
  subTitle: { fontSize: 14, fontWeight: "800" },
  mismatchTitle: { fontSize: 15, fontWeight: "800" },
  leaveStatus: { alignSelf: "flex-start", fontSize: 12, fontWeight: "800" },
  stack: { gap: 10 },
  chips: { gap: 8, paddingRight: 4 },
  overviewActions: { gap: 8 },
  reasonInput: { minHeight: 96, borderWidth: 1, borderRadius: 12, padding: 11 },
  instantField: { gap: 6 },
  instantActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  instantButton: { flex: 1 },
  modalOverlay: { flex: 1, padding: 20, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.45)" },
  modalCard: { borderRadius: 16, padding: 18, gap: 12 },
  modalTitle: { fontSize: 20, fontWeight: "800" },
  modalError: { borderRadius: 10, padding: 10 },
  modalActions: { flexDirection: "row", gap: 10 },
  flex: { flex: 1 },
});
