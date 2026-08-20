import { Payment, PaymentStatus } from "@/src/types/types";
import { useCorrectPayment, usePaymentLedger, usePaymentSummary, useRecordPayment, useReversePayment } from "@/src/hooks/usePaymentWorkflows";
import { useProfile } from "@/src/hooks/useProfile";
import { useReservationDetail } from "@/src/hooks/useReservationWorkflows";
import { useTheme } from "@/src/providers/ThemeProvider";
import { getUserFacingErrorMessage } from "@/src/util/apiError";
import {
  exceedsPaymentAmount,
  formatPaymentAmount,
  isPositivePaymentAmount,
  isZeroPaymentAmount,
  normalizePaymentAmount,
  paymentAmountSign,
} from "@/src/components/screens/PaymentWorkflowScreen/paymentWorkflowHelpers";
import { isAxiosError } from "axios";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type PaymentForm = "record" | "correction" | "reversal";

export default function PaymentWorkflowScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reservationId = Number(id);
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();
  const { profile } = useProfile();
  const reservation = useReservationDetail(reservationId);
  const summary = usePaymentSummary(reservationId);
  const ledger = usePaymentLedger(reservationId);
  const recordPayment = useRecordPayment();
  const correctPayment = useCorrectPayment();
  const reversePayment = useReversePayment();
  const [activeForm, setActiveForm] = useState<PaymentForm>();
  const [selectedPayment, setSelectedPayment] = useState<Payment>();
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const refresh = () => {
    void Promise.all([reservation.refetch(), summary.refetch(), ledger.refetch()]);
  };

  const resetForm = () => {
    setActiveForm(undefined);
    setSelectedPayment(undefined);
    setAmount("");
    setReference("");
    setNote("");
    setReason("");
  };

  const showForm = (form: PaymentForm, payment?: Payment) => {
    setErrorMessage("");
    setSuccessMessage("");
    setSelectedPayment(payment);
    setActiveForm(form);
  };

  const reversedPaymentIds = useMemo(
    () => new Set((ledger.data ?? []).filter((payment) => payment.type === "REVERSAL" && payment.referencedPaymentId !== null)
      .map((payment) => payment.referencedPaymentId as number)),
    [ledger.data]
  );

  const isAgent = profile?.role === "AGENT";
  const reservationLocked = reservation.data?.status === "CANCELLED" || reservation.data?.status === "NO_SHOW";
  const canRecord = Boolean(
    isAgent && summary.data && !reservationLocked && summary.data.status !== "PAID" && !isZeroPaymentAmount(summary.data.outstandingBalance)
  );
  const isSubmitting = recordPayment.isPending || correctPayment.isPending || reversePayment.isPending;

  const mutationError = (error: unknown, fallback: string) => {
    setErrorMessage(getUserFacingErrorMessage(error, fallback));
    if (isAxiosError(error) && error.response?.status === 409) {
      setSuccessMessage("");
    }
  };

  const submitRecord = () => {
    const normalizedAmount = normalizePaymentAmount(amount);
    const trimmedReference = reference.trim();
    const trimmedNote = note.trim();
    if (!normalizedAmount || !isPositivePaymentAmount(normalizedAmount)) {
      setErrorMessage(t("paymentWorkflow.validation.recordAmount"));
      return;
    }
    if (summary.data && exceedsPaymentAmount(normalizedAmount, summary.data.outstandingBalance)) {
      setErrorMessage(t("paymentWorkflow.validation.exceedsOutstanding"));
      return;
    }
    if (trimmedReference.length > 100 || trimmedNote.length > 300) {
      setErrorMessage(t("paymentWorkflow.validation.referenceOrNote"));
      return;
    }

    Alert.alert(
      t("paymentWorkflow.confirm.recordTitle"),
      t("paymentWorkflow.confirm.recordMessage", { amount: formatPaymentAmount(normalizedAmount, t("reservationWorkflow.common.currency"), i18n.language) }),
      [
        { text: t("paymentWorkflow.common.cancel"), style: "cancel" },
        {
          text: t("paymentWorkflow.actions.record"),
          onPress: () => recordPayment.mutate(
            {
              reservationId,
              request: { amount: normalizedAmount, reference: trimmedReference || null, note: trimmedNote || null },
            },
            {
              onSuccess: () => {
                resetForm();
                setErrorMessage("");
                setSuccessMessage(t("paymentWorkflow.success.record"));
              },
              onError: (error) => mutationError(error, t("paymentWorkflow.errors.record")),
            }
          ),
        },
      ]
    );
  };

  const submitCorrection = () => {
    const normalizedAmount = normalizePaymentAmount(amount, true);
    const trimmedReason = reason.trim();
    if (!selectedPayment || !normalizedAmount || isZeroPaymentAmount(normalizedAmount)) {
      setErrorMessage(t("paymentWorkflow.validation.correctionAmount"));
      return;
    }
    if (!trimmedReason || trimmedReason.length > 300) {
      setErrorMessage(t("paymentWorkflow.validation.reason"));
      return;
    }

    Alert.alert(
      t("paymentWorkflow.confirm.correctionTitle"),
      t("paymentWorkflow.confirm.correctionMessage", { id: selectedPayment.paymentId, amount: formatPaymentAmount(normalizedAmount, t("reservationWorkflow.common.currency"), i18n.language) }),
      [
        { text: t("paymentWorkflow.common.cancel"), style: "cancel" },
        {
          text: t("paymentWorkflow.actions.correct"),
          onPress: () => correctPayment.mutate(
            { reservationId, paymentId: selectedPayment.paymentId, request: { amount: normalizedAmount, reason: trimmedReason } },
            {
              onSuccess: () => {
                resetForm();
                setErrorMessage("");
                setSuccessMessage(t("paymentWorkflow.success.correction"));
              },
              onError: (error) => mutationError(error, t("paymentWorkflow.errors.correction")),
            }
          ),
        },
      ]
    );
  };

  const submitReversal = () => {
    const trimmedReason = reason.trim();
    if (!selectedPayment || !trimmedReason || trimmedReason.length > 300) {
      setErrorMessage(t("paymentWorkflow.validation.reason"));
      return;
    }

    Alert.alert(
      t("paymentWorkflow.confirm.reversalTitle"),
      t("paymentWorkflow.confirm.reversalMessage", { id: selectedPayment.paymentId }),
      [
        { text: t("paymentWorkflow.common.cancel"), style: "cancel" },
        {
          text: t("paymentWorkflow.actions.reverse"),
          style: "destructive",
          onPress: () => reversePayment.mutate(
            { reservationId, paymentId: selectedPayment.paymentId, request: { reason: trimmedReason } },
            {
              onSuccess: () => {
                resetForm();
                setErrorMessage("");
                setSuccessMessage(t("paymentWorkflow.success.reversal"));
              },
              onError: (error) => mutationError(error, t("paymentWorkflow.errors.reversal")),
            }
          ),
        },
      ]
    );
  };

  if (!Number.isInteger(reservationId) || reservationId <= 0) {
    return (
      <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
        <View style={styles.centered}><Text style={{ color: Colors.textPrimary }}>{t("paymentWorkflow.errors.invalidReservation")}</Text><Text onPress={() => router.back()} style={[styles.retryText, { color: Colors.primary }]}>{t("paymentWorkflow.common.back")}</Text></View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={reservation.isRefetching || summary.isRefetching || ledger.isRefetching} onRefresh={refresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>{t("paymentWorkflow.title")}</Text>
          <Text style={{ color: Colors.textSecondary }}>{t("paymentWorkflow.reservation", { id: reservationId, apartment: reservation.data?.apartmentName ?? "—" })}</Text>
        </View>
        {errorMessage ? <MessageBox color={Colors.error} message={errorMessage} /> : null}
        {successMessage ? <MessageBox color={Colors.success} message={successMessage} /> : null}
        <PaymentSummaryCard
          status={summary.data?.status}
          totalDue={summary.data?.totalDue}
          netPaid={summary.data?.netPaid}
          outstandingBalance={summary.data?.outstandingBalance}
          loading={summary.isPending}
          error={summary.isError}
          onRetry={() => void summary.refetch()}
        />
        <Section title={t("paymentWorkflow.actions.title")}>
          {profile && !isAgent ? <Text style={{ color: Colors.textSecondary }}>{t("paymentWorkflow.actions.readOnly")}</Text> : null}
          {reservationLocked ? <Text style={{ color: Colors.textSecondary }}>{t("paymentWorkflow.actions.reservationLocked")}</Text> : null}
          {summary.data?.status === "PAID" || (summary.data && isZeroPaymentAmount(summary.data.outstandingBalance)) ? <Text style={{ color: Colors.success }}>{t("paymentWorkflow.actions.nothingOutstanding")}</Text> : null}
          {canRecord ? <ActionButton label={t("paymentWorkflow.actions.record")} onPress={() => showForm("record")} /> : null}
          {!profile ? <Text style={{ color: Colors.textSecondary }}>{t("paymentWorkflow.common.loading")}</Text> : null}
        </Section>
        <Section title={t("paymentWorkflow.ledger.title")}>
          <Text style={{ color: Colors.textSecondary }}>{t("paymentWorkflow.ledger.hint")}</Text>
          {ledger.isPending ? <ActivityIndicator color={Colors.primary} /> : null}
          {ledger.isError ? <InlineError message={t("paymentWorkflow.errors.ledgerUnavailable")} onRetry={() => void ledger.refetch()} /> : null}
          {!ledger.isPending && !ledger.isError && (ledger.data ?? []).length === 0 ? <Text style={{ color: Colors.textSecondary }}>{t("paymentWorkflow.ledger.empty")}</Text> : null}
          {(ledger.data ?? []).map((payment) => (
            <LedgerEntry
              key={payment.paymentId}
              payment={payment}
              reversed={reversedPaymentIds.has(payment.paymentId)}
              canManage={Boolean(isAgent && payment.type === "PAYMENT" && !reversedPaymentIds.has(payment.paymentId))}
              onCorrect={() => showForm("correction", payment)}
              onReverse={() => showForm("reversal", payment)}
            />
          ))}
        </Section>
      </ScrollView>
      <PaymentFormModal
        form={activeForm}
        payment={selectedPayment}
        amount={amount}
        reference={reference}
        note={note}
        reason={reason}
        isSubmitting={isSubmitting}
        onAmountChange={setAmount}
        onReferenceChange={setReference}
        onNoteChange={setNote}
        onReasonChange={setReason}
        onCancel={resetForm}
        onSubmit={activeForm === "record" ? submitRecord : activeForm === "correction" ? submitCorrection : submitReversal}
      />
    </SafeAreaView>
  );
}

function PaymentSummaryCard({
  status,
  totalDue,
  netPaid,
  outstandingBalance,
  loading,
  error,
  onRetry,
}: {
  status?: PaymentStatus;
  totalDue?: string;
  netPaid?: string;
  outstandingBalance?: string;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
}) {
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();
  const currency = t("reservationWorkflow.common.currency");
  return (
    <Section title={t("paymentWorkflow.summary.title")}>
      {loading ? <ActivityIndicator color={Colors.primary} /> : null}
      {error ? <InlineError message={t("paymentWorkflow.errors.summaryUnavailable")} onRetry={onRetry} /> : null}
      {status && totalDue && netPaid && outstandingBalance ? <>
        <View style={styles.summaryStatus}><Text style={[styles.statusBadge, { color: paymentStatusColor(status, Colors) }]}>{t(`paymentWorkflow.status.${status}`)}</Text></View>
        <SummaryRow label={t("paymentWorkflow.summary.totalDue")} value={formatPaymentAmount(totalDue, currency, i18n.language)} />
        <SummaryRow label={t("paymentWorkflow.summary.netPaid")} value={formatPaymentAmount(netPaid, currency, i18n.language)} />
        <SummaryRow label={t("paymentWorkflow.summary.outstanding")} value={formatPaymentAmount(outstandingBalance, currency, i18n.language)} strong />
      </> : null}
    </Section>
  );
}

function LedgerEntry({ payment, reversed, canManage, onCorrect, onReverse }: { payment: Payment; reversed: boolean; canManage: boolean; onCorrect: () => void; onReverse: () => void }) {
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();
  const accentColor = payment.type === "REVERSAL" || payment.amount.trim().startsWith("-")
    ? Colors.error
    : payment.type === "CORRECTION"
      ? Colors.accent
      : Colors.success;
  const amount = `${paymentAmountSign(payment.amount)}${formatPaymentAmount(payment.amount, t("reservationWorkflow.common.currency"), i18n.language)}`;
  return (
    <View style={[styles.ledgerEntry, { borderColor: Colors.divider }]}>
      <View style={styles.ledgerTopRow}>
        <Text style={[styles.ledgerType, { color: accentColor }]}>{t(`paymentWorkflow.type.${payment.type}`)}</Text>
        <Text style={[styles.ledgerAmount, { color: accentColor }]}>{amount}</Text>
      </View>
      <Text style={{ color: Colors.textSecondary }}>{new Date(payment.recordedAt).toLocaleString(i18n.language)}</Text>
      <Text style={{ color: Colors.textSecondary }}>{t("paymentWorkflow.ledger.agent", { id: payment.recordedByUserId })}</Text>
      {payment.referencedPaymentId !== null ? <Text style={{ color: Colors.textSecondary }}>{t("paymentWorkflow.ledger.original", { id: payment.referencedPaymentId })}</Text> : null}
      {payment.reference ? <Text style={{ color: Colors.textSecondary }}>{t("paymentWorkflow.ledger.reference", { reference: payment.reference })}</Text> : null}
      {payment.reason ? <Text style={{ color: Colors.textPrimary }}>{payment.reason}</Text> : null}
      {reversed ? <Text style={{ color: Colors.error, fontWeight: "700" }}>{t("paymentWorkflow.ledger.reversed")}</Text> : null}
      {canManage ? <View style={styles.entryActions}><ActionButton label={t("paymentWorkflow.actions.correct")} onPress={onCorrect} variant="secondary" /><ActionButton label={t("paymentWorkflow.actions.reverse")} onPress={onReverse} variant="danger" /></View> : null}
    </View>
  );
}

function PaymentFormModal({
  form,
  payment,
  amount,
  reference,
  note,
  reason,
  isSubmitting,
  onAmountChange,
  onReferenceChange,
  onNoteChange,
  onReasonChange,
  onCancel,
  onSubmit,
}: {
  form?: PaymentForm;
  payment?: Payment;
  amount: string;
  reference: string;
  note: string;
  reason: string;
  isSubmitting: boolean;
  onAmountChange: (value: string) => void;
  onReferenceChange: (value: string) => void;
  onNoteChange: (value: string) => void;
  onReasonChange: (value: string) => void;
  onCancel: () => void;
  onSubmit: () => void;
}) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const isRecord = form === "record";
  const isCorrection = form === "correction";
  const title = isRecord ? t("paymentWorkflow.forms.recordTitle") : isCorrection ? t("paymentWorkflow.forms.correctionTitle", { id: payment?.paymentId }) : t("paymentWorkflow.forms.reversalTitle", { id: payment?.paymentId });
  const submitLabel = isRecord ? t("paymentWorkflow.actions.record") : isCorrection ? t("paymentWorkflow.actions.correct") : t("paymentWorkflow.actions.reverse");
  return (
    <Modal visible={Boolean(form)} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", default: undefined })} style={styles.modalOverlay}>
        <ScrollView contentContainerStyle={styles.modalScroll} keyboardShouldPersistTaps="handled">
          <View style={[styles.modalCard, { backgroundColor: Colors.background }]}>
            <Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>{title}</Text>
            {isRecord ? <>
              <Text style={{ color: Colors.textSecondary }}>{t("paymentWorkflow.forms.recordHint")}</Text>
              <Field label={t("paymentWorkflow.forms.amount")} value={amount} onChangeText={onAmountChange} keyboardType="numbers-and-punctuation" required />
              <Field label={t("paymentWorkflow.forms.reference")} value={reference} onChangeText={onReferenceChange} maxLength={100} />
              <Field label={t("paymentWorkflow.forms.note")} value={note} onChangeText={onNoteChange} maxLength={300} multiline />
            </> : null}
            {isCorrection ? <>
              <Text style={{ color: Colors.textSecondary }}>{t("paymentWorkflow.forms.correctionHint")}</Text>
              <Field label={t("paymentWorkflow.forms.signedAmount")} value={amount} onChangeText={onAmountChange} keyboardType="numbers-and-punctuation" required />
              <Field label={t("paymentWorkflow.forms.reason")} value={reason} onChangeText={onReasonChange} maxLength={300} multiline required />
            </> : null}
            {form === "reversal" ? <>
              <Text style={{ color: Colors.error }}>{t("paymentWorkflow.forms.reversalHint")}</Text>
              <Field label={t("paymentWorkflow.forms.reason")} value={reason} onChangeText={onReasonChange} maxLength={300} multiline required />
            </> : null}
            <View style={styles.modalActions}>
              <ActionButton label={t("paymentWorkflow.common.cancel")} onPress={onCancel} variant="secondary" disabled={isSubmitting} />
              <ActionButton label={submitLabel} onPress={onSubmit} loading={isSubmitting} variant={form === "reversal" ? "danger" : "primary"} />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function Field({ label, value, onChangeText, keyboardType = "default", maxLength, multiline = false, required = false }: { label: string; value: string; onChangeText: (value: string) => void; keyboardType?: "default" | "numbers-and-punctuation"; maxLength?: number; multiline?: boolean; required?: boolean }) {
  const { Colors } = useTheme();
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: Colors.textPrimary }]}>{label}{required ? " *" : ""}</Text><TextInput value={value} onChangeText={onChangeText} keyboardType={keyboardType} maxLength={maxLength} multiline={multiline} textAlignVertical={multiline ? "top" : "center"} accessibilityLabel={label} style={[styles.input, multiline && styles.multilineInput, { color: Colors.textPrimary, borderColor: Colors.divider, backgroundColor: Colors.screenBackground }]} />{maxLength ? <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>{value.length}/{maxLength}</Text> : null}</View>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { Colors } = useTheme();
  return <View style={[styles.section, { backgroundColor: Colors.background, borderColor: Colors.divider }]}><Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{title}</Text><View style={styles.sectionBody}>{children}</View></View>;
}

function ActionButton({ label, onPress, disabled = false, loading = false, variant = "primary" }: { label: string; onPress: () => void; disabled?: boolean; loading?: boolean; variant?: "primary" | "secondary" | "danger" }) {
  const { Colors } = useTheme();
  const backgroundColor = variant === "primary" ? Colors.primary : "transparent";
  const borderColor = variant === "danger" ? Colors.deleteColor : variant === "secondary" ? Colors.divider : Colors.primary;
  const textColor = variant === "primary" ? Colors.textLight : variant === "danger" ? Colors.deleteColor : Colors.textPrimary;
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: disabled || loading, busy: loading }} disabled={disabled || loading} onPress={onPress} style={[styles.button, { backgroundColor, borderColor }, (disabled || loading) && styles.disabled]}>{loading ? <ActivityIndicator color={textColor} /> : null}<Text style={[styles.buttonText, { color: textColor }]}>{label}</Text></Pressable>;
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  const { Colors } = useTheme();
  return <View style={styles.summaryRow}><Text style={{ color: Colors.textSecondary }}>{label}</Text><Text style={[styles.summaryValue, { color: Colors.textPrimary }, strong && styles.strong]}>{value}</Text></View>;
}

function MessageBox({ color, message }: { color: string; message: string }) {
  return <View style={[styles.messageBox, { borderColor: color }]}><Text style={{ color }}>{message}</Text></View>;
}

function InlineError({ message, onRetry }: { message: string; onRetry: () => void }) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  return <View style={styles.inlineError}><Text style={{ color: Colors.error, flex: 1 }}>{message}</Text><Text accessibilityRole="button" onPress={onRetry} style={[styles.retryText, { color: Colors.primary }]}>{t("paymentWorkflow.common.retry")}</Text></View>;
}

const paymentStatusColor = (status: PaymentStatus, colors: { success: string; accent: string; error: string }) => status === "PAID" ? colors.success : status === "PARTIALLY_PAID" ? colors.accent : colors.error;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24, gap: 12 },
  heading: { gap: 3 },
  title: { fontSize: 24, fontWeight: "800" },
  messageBox: { borderWidth: 1, borderRadius: 12, padding: 11 },
  section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  sectionBody: { gap: 10 },
  summaryStatus: { alignItems: "flex-start" },
  statusBadge: { fontSize: 13, fontWeight: "800" },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", gap: 16 },
  summaryValue: { flexShrink: 1, fontWeight: "600", textAlign: "right" },
  strong: { fontSize: 16, fontWeight: "800" },
  inlineError: { flexDirection: "row", alignItems: "center", gap: 10 },
  retryText: { fontWeight: "700" },
  ledgerEntry: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 11, gap: 4 },
  ledgerTopRow: { flexDirection: "row", justifyContent: "space-between", gap: 10 },
  ledgerType: { fontWeight: "800" },
  ledgerAmount: { fontWeight: "800", textAlign: "right" },
  entryActions: { flexDirection: "row", gap: 8, flexWrap: "wrap", marginTop: 4 },
  button: { minHeight: 44, borderWidth: 1, borderRadius: 12, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingHorizontal: 14 },
  buttonText: { fontSize: 14, fontWeight: "700" },
  disabled: { opacity: 0.5 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 },
  modalScroll: { flexGrow: 1, justifyContent: "center" },
  modalCard: { borderRadius: 16, padding: 18, gap: 12 },
  modalTitle: { fontSize: 19, fontWeight: "800" },
  field: { gap: 6 },
  fieldLabel: { fontSize: 14, fontWeight: "700" },
  input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 15 },
  multilineInput: { minHeight: 92, paddingTop: 11 },
  modalActions: { flexDirection: "row", gap: 10 },
});
