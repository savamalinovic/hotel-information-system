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

import { DemoReceipt } from "@/src/types/types";
import { formatDateKey, formatMoney } from "@/src/components/screens/ReservationWorkflowScreen/reservationWorkflowHelpers";
import { EmptyOrErrorState, PrimaryButton } from "@/src/components/screens/ReservationWorkflowScreen/ReservationWorkflowUi";
import { useDemoReceipt, useGenerateDemoReceipt } from "@/src/hooks/useDemoReceipt";
import { useReservationGuests } from "@/src/hooks/useGuestCheckIn";
import { usePaymentSummary } from "@/src/hooks/usePaymentWorkflows";
import { useProfile } from "@/src/hooks/useProfile";
import { useReservationDetail } from "@/src/hooks/useReservationWorkflows";
import { useTheme } from "@/src/providers/ThemeProvider";
import { getUserFacingErrorMessage } from "@/src/util/apiError";

const parseReservationId = (id: string | undefined) => {
  const parsed = Number(id);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
};

const formatTimestamp = (value: string, locale: string) => new Date(value).toLocaleString(locale);

const compactFingerprint = (fingerprint: string) =>
  fingerprint.length > 18 ? `${fingerprint.slice(0, 12)}…${fingerprint.slice(-6)}` : fingerprint;

export default function DemoReceiptScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reservationId = parseReservationId(id);
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();
  const reservation = useReservationDetail(reservationId ?? 0);
  const payments = usePaymentSummary(reservationId ?? 0);
  const guests = useReservationGuests(reservationId ?? 0);
  const profile = useProfile();
  const demoReceipt = useDemoReceipt(reservationId ?? 0);
  const generateReceipt = useGenerateDemoReceipt();
  const [confirmationVisible, setConfirmationVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [showFullFingerprint, setShowFullFingerprint] = useState(false);
  const submittingRef = useRef(false);

  const primaryGuestName = useMemo(() => {
    const primaryGuest = guests.data?.find((entry) => entry.primaryGuest)?.guest;
    return primaryGuest ? `${primaryGuest.name} ${primaryGuest.surname}` : undefined;
  }, [guests.data]);

  const refresh = () => {
    void Promise.all([
      reservation.refetch(),
      payments.refetch(),
      guests.refetch(),
      profile.refetch(),
      demoReceipt.refetch(),
    ]);
  };

  const reconcileUnknownOutcome = async () => {
    const result = await demoReceipt.refetch();
    if (result.data) {
      setConfirmationVisible(false);
      setErrorMessage("");
      setSuccessMessage(t("demoReceipt.success.recovered"));
      return true;
    }

    return false;
  };

  const submitGeneration = () => {
    if (!reservationId || demoReceipt.isPending || !canGenerate(reservation.data?.status, payments.data?.status, profile.profile?.role) || generateReceipt.isPending || submittingRef.current) {
      return;
    }

    submittingRef.current = true;
    setErrorMessage("");
    setSuccessMessage("");
    generateReceipt.mutate(reservationId, {
      onSuccess: () => {
        submittingRef.current = false;
        setConfirmationVisible(false);
        setSuccessMessage(t("demoReceipt.success.generated"));
      },
      onError: async (error) => {
        submittingRef.current = false;
        const status = isAxiosError(error) ? error.response?.status : undefined;
        const shouldReconcile = status === 409 || status === undefined;

        if (shouldReconcile && await reconcileUnknownOutcome()) {
          return;
        }

        const fallback = status === 403
          ? t("demoReceipt.errors.forbiddenGenerate")
          : status === 409
            ? t("demoReceipt.errors.conflict")
            : status === undefined
              ? t("demoReceipt.errors.unknownOutcome")
              : t("demoReceipt.errors.generate");
        setErrorMessage(getUserFacingErrorMessage(error, fallback));
      },
    });
  };

  if (!reservationId) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><EmptyOrErrorState icon="CircleAlert" title={t("demoReceipt.errors.invalidTitle")} description={t("demoReceipt.errors.invalidDescription")} retryLabel={t("demoReceipt.common.back")} onRetry={() => router.back()} /></SafeAreaView>;
  }

  if (reservation.isPending) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /><Text style={{ color: Colors.textSecondary }}>{t("demoReceipt.common.loading")}</Text></View></SafeAreaView>;
  }

  if (reservation.isError || !reservation.data) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><EmptyOrErrorState icon="CircleAlert" title={t("demoReceipt.errors.reservationTitle")} description={t("demoReceipt.errors.reservationDescription")} retryLabel={t("demoReceipt.common.retry")} onRetry={() => void reservation.refetch()} /></SafeAreaView>;
  }

  const reservationData = reservation.data;
  const receipt = demoReceipt.data;
  const receiptUnavailable = demoReceipt.isError;
  const readyToGenerate = !demoReceipt.isPending && canGenerate(reservationData.status, payments.data?.status, profile.profile?.role);

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={reservation.isRefetching || payments.isRefetching || guests.isRefetching || profile.isLoading || demoReceipt.isRefetching} onRefresh={refresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>{t("demoReceipt.title")}</Text>
          <Text style={{ color: Colors.textSecondary }}>{t("demoReceipt.reference", { id: reservationId })}</Text>
        </View>
        <View style={[styles.demoBanner, { borderColor: Colors.error, backgroundColor: Colors.background }]}><Text style={[styles.demoBannerText, { color: Colors.error }]}>{t("demoReceipt.label")}</Text></View>
        {errorMessage ? <MessageBox color={Colors.error} message={errorMessage} /> : null}
        {successMessage ? <MessageBox color={Colors.success} message={successMessage} /> : null}
        <ReadinessSummary
          reservationStatus={reservationData.status}
          paymentStatus={payments.data?.status}
          totalDue={payments.data?.totalDue}
          netPaid={payments.data?.netPaid}
          outstandingBalance={payments.data?.outstandingBalance}
          paymentPending={payments.isPending}
          paymentError={payments.isError}
          receiptState={demoReceipt.isPending ? "loading" : receiptUnavailable ? "error" : receipt ? "issued" : "absent"}
          isAgent={profile.profile?.role === "AGENT"}
          onOpenCheckOut={() => router.push({ pathname: "/reservations/[id]/check-out", params: { id: String(reservationId) } })}
          onOpenPayments={() => router.push({ pathname: "/reservations/[id]/payments", params: { id: String(reservationId) } })}
        />
        {receiptUnavailable ? <EmptyOrErrorState icon="CircleAlert" title={t("demoReceipt.errors.metadataTitle")} description={t("demoReceipt.errors.metadataDescription")} retryLabel={t("demoReceipt.common.retry")} onRetry={() => void demoReceipt.refetch()} /> : receipt ? <ReceiptMetadata receipt={receipt} locale={i18n.language} showFullFingerprint={showFullFingerprint} onToggleFingerprint={() => setShowFullFingerprint((visible) => !visible)} onOpenPdf={() => router.push({ pathname: "/reservations/[id]/demo-receipt-pdf", params: { id: String(reservationId) } })} /> : <GenerationAction
          reservationStatus={reservationData.status}
          paymentStatus={payments.data?.status}
          paymentPending={payments.isPending}
          profilePending={profile.isLoading}
          isAgent={profile.profile?.role === "AGENT"}
          readyToGenerate={readyToGenerate}
          onGenerate={() => setConfirmationVisible(true)}
        />}
      </ScrollView>
      <GenerationConfirmation
        visible={confirmationVisible}
        reservationId={reservationId}
        apartmentName={reservationData.apartmentName}
        primaryGuestName={primaryGuestName}
        checkInDate={reservationData.checkInDate}
        checkOutDate={reservationData.checkOutDate}
        totalAmount={payments.data?.totalDue ?? reservationData.totalPrice}
        currency={payments.data?.status ? t("demoReceipt.common.currency") : t("reservationWorkflow.common.currency")}
        submitting={generateReceipt.isPending}
        onCancel={() => setConfirmationVisible(false)}
        onConfirm={submitGeneration}
      />
    </SafeAreaView>
  );
}

function ReadinessSummary({
  reservationStatus,
  paymentStatus,
  totalDue,
  netPaid,
  outstandingBalance,
  paymentPending,
  paymentError,
  receiptState,
  isAgent,
  onOpenCheckOut,
  onOpenPayments,
}: {
  reservationStatus: string;
  paymentStatus: string | undefined;
  totalDue: string | undefined;
  netPaid: string | undefined;
  outstandingBalance: string | undefined;
  paymentPending: boolean;
  paymentError: boolean;
  receiptState: "loading" | "error" | "issued" | "absent";
  isAgent: boolean;
  onOpenCheckOut: () => void;
  onOpenPayments: () => void;
}) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const currency = t("demoReceipt.common.currency");

  return <>
    <Section title={t("demoReceipt.readiness.title")}>
      <InfoRow label={t("demoReceipt.readiness.reservationStatus")} value={t(`demoReceipt.reservationStatuses.${reservationStatus}`)} />
      {paymentPending ? <ActivityIndicator color={Colors.primary} /> : paymentError ? <MessageBox color={Colors.error} message={t("demoReceipt.readiness.paymentUnavailable")} /> : <>
        <InfoRow label={t("demoReceipt.readiness.paymentStatus")} value={paymentStatus ? t(`demoReceipt.paymentStatuses.${paymentStatus}`) : t("demoReceipt.common.notAvailable")} />
        <InfoRow label={t("demoReceipt.readiness.totalDue")} value={totalDue ? formatMoney(totalDue, currency) : t("demoReceipt.common.notAvailable")} />
        <InfoRow label={t("demoReceipt.readiness.netPaid")} value={netPaid ? formatMoney(netPaid, currency) : t("demoReceipt.common.notAvailable")} />
        <InfoRow label={t("demoReceipt.readiness.outstanding")} value={outstandingBalance ? formatMoney(outstandingBalance, currency) : t("demoReceipt.common.notAvailable")} emphasized />
      </>}
      <InfoRow label={t("demoReceipt.readiness.existingReceipt")} value={receiptState === "loading" ? t("demoReceipt.common.loading") : receiptState === "error" ? t("demoReceipt.common.notAvailable") : receiptState === "issued" ? t("demoReceipt.readiness.issued") : t("demoReceipt.readiness.notIssued")} />
      {!isAgent ? <Text style={[styles.hint, { color: Colors.textSecondary }]}>{t("demoReceipt.readiness.agentRequired")}</Text> : null}
    </Section>
    {reservationStatus !== "CHECKED_OUT" ? <Section title={t("demoReceipt.readiness.nextStepTitle")}><Text style={[styles.hint, { color: Colors.textSecondary }]}>{t("demoReceipt.readiness.checkOutRequired")}</Text>{reservationStatus === "CHECKED_IN" ? <PrimaryButton label={t("demoReceipt.actions.openCheckOut")} onPress={onOpenCheckOut} /> : null}</Section> : null}
    {reservationStatus === "CHECKED_OUT" && !paymentPending && !paymentError && paymentStatus !== "PAID" ? <Section title={t("demoReceipt.readiness.nextStepTitle")}><Text style={[styles.hint, { color: Colors.textSecondary }]}>{t("demoReceipt.readiness.paymentRequired")}</Text><PrimaryButton label={t("demoReceipt.actions.openPayments")} onPress={onOpenPayments} /></Section> : null}
  </>;
}

function GenerationAction({
  reservationStatus,
  paymentStatus,
  paymentPending,
  profilePending,
  isAgent,
  readyToGenerate,
  onGenerate,
}: {
  reservationStatus: string;
  paymentStatus: string | undefined;
  paymentPending: boolean;
  profilePending: boolean;
  isAgent: boolean;
  readyToGenerate: boolean;
  onGenerate: () => void;
}) {
  const { Colors } = useTheme();
  const { t } = useTranslation();

  return <Section title={t("demoReceipt.actions.title")}>
    {reservationStatus === "CHECKED_OUT" && paymentStatus === "PAID" ? <MessageBox color={Colors.success} message={t("demoReceipt.readiness.ready")} /> : null}
    {paymentPending || profilePending ? <Text style={{ color: Colors.textSecondary }}>{t("demoReceipt.readiness.checking")}</Text> : null}
    {!isAgent && !profilePending ? <MessageBox color={Colors.error} message={t("demoReceipt.readiness.agentRequired")} /> : null}
    <Text style={[styles.hint, { color: Colors.textSecondary }]}>{t("demoReceipt.actions.serverValidation")}</Text>
    <PrimaryButton label={t("demoReceipt.actions.generate")} onPress={onGenerate} disabled={!readyToGenerate} />
  </Section>;
}

function ReceiptMetadata({
  receipt,
  locale,
  showFullFingerprint,
  onToggleFingerprint,
  onOpenPdf,
}: {
  receipt: DemoReceipt;
  locale: string;
  showFullFingerprint: boolean;
  onToggleFingerprint: () => void;
  onOpenPdf: () => void;
}) {
  const { Colors } = useTheme();
  const { t } = useTranslation();

  return <>
    <Section title={t("demoReceipt.metadata.title")}>
      <Text style={[styles.demoLabel, { color: Colors.error }]}>{t("demoReceipt.label")}</Text>
      <InfoRow label={t("demoReceipt.metadata.number")} value={receipt.receiptNumber} emphasized />
      <InfoRow label={t("demoReceipt.metadata.issuedAt")} value={formatTimestamp(receipt.issuedAt, locale)} />
      <InfoRow label={t("demoReceipt.metadata.issuedBy")} value={t("demoReceipt.metadata.agent", { id: receipt.issuedByUserId })} />
      <InfoRow label={t("demoReceipt.metadata.hotel")} value={receipt.hotelName} />
      <InfoRow label={t("demoReceipt.metadata.address")} value={receipt.hotelAddress} />
      <InfoRow label={t("demoReceipt.metadata.taxId")} value={receipt.hotelTaxId} />
      <InfoRow label={t("demoReceipt.metadata.apartment")} value={receipt.apartmentName} />
      <InfoRow label={t("demoReceipt.metadata.primaryGuest")} value={receipt.primaryGuestName} />
      <InfoRow label={t("demoReceipt.metadata.period")} value={`${formatDateKey(receipt.checkInDate, locale)} – ${formatDateKey(receipt.checkOutDate, locale)}`} />
      <InfoRow label={t("demoReceipt.metadata.nights")} value={String(receipt.nights)} />
      <InfoRow label={t("demoReceipt.metadata.nightlyRate")} value={formatMoney(receipt.nightlyRate, receipt.currency)} />
      <InfoRow label={t("demoReceipt.metadata.totalAmount")} value={formatMoney(receipt.totalAmount, receipt.currency)} emphasized />
      <InfoRow label={t("demoReceipt.metadata.vat")} value={formatMoney(receipt.vatAmount, receipt.currency)} />
      <InfoRow label={t("demoReceipt.metadata.currency")} value={receipt.currency} />
      <View style={styles.fingerprintRow}><Text style={[styles.infoLabel, { color: Colors.textSecondary }]}>{t("demoReceipt.metadata.fingerprint")}</Text><Pressable accessibilityRole="button" accessibilityLabel={t("demoReceipt.metadata.toggleFingerprint")} onPress={onToggleFingerprint} style={[styles.fingerprintButton, { borderColor: Colors.divider }]}><Text selectable style={[styles.fingerprint, { color: Colors.textPrimary }]}>{showFullFingerprint ? receipt.pdfSha256 : compactFingerprint(receipt.pdfSha256)}</Text></Pressable></View>
      <Text style={[styles.hint, { color: Colors.textSecondary }]}>{t("demoReceipt.metadata.snapshotHint")}</Text>
    </Section>
    <Section title={t("demoReceipt.pdf.actionsTitle")}>
      <Text style={[styles.hint, { color: Colors.textSecondary }]}>{t("demoReceipt.pdf.actionHint")}</Text>
      <PrimaryButton label={t("demoReceipt.pdf.open")} onPress={onOpenPdf} />
    </Section>
  </>;
}

function GenerationConfirmation({
  visible,
  reservationId,
  apartmentName,
  primaryGuestName,
  checkInDate,
  checkOutDate,
  totalAmount,
  currency,
  submitting,
  onCancel,
  onConfirm,
}: {
  visible: boolean;
  reservationId: number;
  apartmentName: string;
  primaryGuestName: string | undefined;
  checkInDate: string;
  checkOutDate: string;
  totalAmount: string;
  currency: string;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();

  return <Modal visible={visible} transparent animationType="fade" onRequestClose={submitting ? undefined : onCancel}>
    <View style={styles.modalOverlay}>
      <View style={[styles.modalCard, { backgroundColor: Colors.background }]}>
        <Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>{t("demoReceipt.confirm.title")}</Text>
        <Text style={{ color: Colors.textSecondary }}>{t("demoReceipt.confirm.description")}</Text>
        <InfoRow label={t("demoReceipt.confirm.reservation")} value={`#${reservationId}`} />
        <InfoRow label={t("demoReceipt.confirm.apartment")} value={apartmentName} />
        <InfoRow label={t("demoReceipt.confirm.primaryGuest")} value={primaryGuestName ?? t("demoReceipt.common.notAvailable")} />
        <InfoRow label={t("demoReceipt.confirm.period")} value={`${formatDateKey(checkInDate, i18n.language)} – ${formatDateKey(checkOutDate, i18n.language)}`} />
        <InfoRow label={t("demoReceipt.confirm.total")} value={formatMoney(totalAmount, currency)} emphasized />
        <Text style={[styles.confirmWarning, { color: Colors.error }]}>{t("demoReceipt.confirm.demoWarning")}</Text>
        <Text style={[styles.hint, { color: Colors.textSecondary }]}>{t("demoReceipt.confirm.incomeBook")}</Text>
        <Text style={[styles.hint, { color: Colors.textSecondary }]}>{t("demoReceipt.confirm.ledgerLocked")}</Text>
        <View style={styles.modalActions}>
          <Pressable accessibilityRole="button" accessibilityLabel={t("demoReceipt.common.cancel")} disabled={submitting} onPress={onCancel} style={[styles.cancelButton, { borderColor: Colors.divider }, submitting && styles.disabled]}><Text style={{ color: Colors.textPrimary, fontWeight: "700" }}>{t("demoReceipt.common.cancel")}</Text></Pressable>
          <View style={styles.confirmButton}><PrimaryButton label={t("demoReceipt.actions.generate")} onPress={onConfirm} loading={submitting} /></View>
        </View>
      </View>
    </View>
  </Modal>;
}

function canGenerate(reservationStatus: string | undefined, paymentStatus: string | undefined, role: string | undefined) {
  return reservationStatus === "CHECKED_OUT" && paymentStatus === "PAID" && role === "AGENT";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { Colors } = useTheme();
  return <View style={[styles.section, { backgroundColor: Colors.background, borderColor: Colors.divider }]}><Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{title}</Text><View style={styles.sectionBody}>{children}</View></View>;
}

function InfoRow({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  const { Colors } = useTheme();
  return <View style={styles.infoRow}><Text style={[styles.infoLabel, { color: Colors.textSecondary }]}>{label}</Text><Text selectable style={[styles.infoValue, { color: Colors.textPrimary }, emphasized && styles.emphasized]}>{value}</Text></View>;
}

function MessageBox({ color, message }: { color: string; message: string }) {
  return <View style={[styles.messageBox, { borderColor: color }]}><Text style={{ color }}>{message}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, padding: 20 },
  heading: { gap: 3 },
  title: { fontSize: 24, fontWeight: "700" },
  demoBanner: { borderWidth: 1, borderRadius: 12, padding: 12, alignItems: "center" },
  demoBannerText: { fontWeight: "800", textAlign: "center" },
  demoLabel: { fontWeight: "800", fontSize: 12 },
  section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  sectionBody: { gap: 9 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  infoLabel: { flex: 1, fontSize: 14 },
  infoValue: { flex: 1, fontSize: 14, fontWeight: "600", textAlign: "right" },
  emphasized: { fontSize: 16, fontWeight: "800" },
  hint: { fontSize: 13, lineHeight: 19 },
  messageBox: { borderWidth: 1, borderRadius: 12, padding: 11 },
  fingerprintRow: { gap: 6 },
  fingerprintButton: { borderWidth: 1, borderRadius: 10, padding: 10 },
  fingerprint: { fontFamily: "monospace", fontSize: 12, textAlign: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 },
  modalCard: { borderRadius: 16, padding: 18, gap: 11 },
  modalTitle: { fontSize: 19, fontWeight: "700" },
  confirmWarning: { fontWeight: "800", lineHeight: 20 },
  modalActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  cancelButton: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, alignItems: "center", justifyContent: "center" },
  confirmButton: { flex: 1 },
  disabled: { opacity: 0.55 },
});
