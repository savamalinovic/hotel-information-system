import { EmptyOrErrorState, PrimaryButton, ReservationStatusBadge } from "@/src/components/screens/ReservationWorkflowScreen/ReservationWorkflowUi";
import { formatDateKey, formatMoney, getLocalDateKey, isStayPeriodValid } from "@/src/components/screens/ReservationWorkflowScreen/reservationWorkflowHelpers";
import { useReservationDetail, useReservationStatusHistory, useUpdateReservationStatus, useUpdateReservationStay } from "@/src/hooks/useReservationWorkflows";
import { useTheme } from "@/src/providers/ThemeProvider";
import { ReservationStatusHistory } from "@/src/types/types";
import { getUserFacingErrorMessage } from "@/src/util/apiError";
import { isAxiosError } from "axios";
import { useLocalSearchParams, router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, Alert, KeyboardAvoidingView, Modal, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

type StatusAction = "CANCELLED" | "NO_SHOW";

export default function ReservationWorkflowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const reservationId = Number(id);
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();
  const detail = useReservationDetail(reservationId);
  const history = useReservationStatusHistory(reservationId);
  const updateStay = useUpdateReservationStay();
  const updateStatus = useUpdateReservationStatus();
  const [newCheckOutDate, setNewCheckOutDate] = useState("");
  const [statusAction, setStatusAction] = useState<StatusAction>();
  const [reason, setReason] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const refresh = () => {
    void Promise.all([detail.refetch(), history.refetch()]);
  };

  if (!Number.isInteger(reservationId) || reservationId <= 0) {
    return (
      <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
        <View style={styles.invalidState}><EmptyOrErrorState icon="CircleAlert" title={t("reservationWorkflow.errors.invalidTitle")} description={t("reservationWorkflow.errors.invalidDescription")} retryLabel={t("reservationWorkflow.common.back")} onRetry={() => router.back()} /></View>
      </SafeAreaView>
    );
  }

  if (detail.isPending) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><View style={styles.loading}><ActivityIndicator size="large" color={Colors.primary} /><Text style={{ color: Colors.textSecondary }}>{t("reservationWorkflow.common.loading")}</Text></View></SafeAreaView>;
  }

  if (detail.isError || !detail.data) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><View style={styles.invalidState}><EmptyOrErrorState icon="CircleAlert" title={t("reservationWorkflow.errors.detailTitle")} description={t("reservationWorkflow.errors.detailDescription")} retryLabel={t("reservationWorkflow.common.retry")} onRetry={() => void detail.refetch()} /></View></SafeAreaView>;
  }

  const reservation = detail.data;
  const canUpdate = reservation.status === "CONFIRMED";
  const canMarkNoShow = canUpdate && reservation.checkInDate <= getLocalDateKey();

  const saveStay = () => {
    const candidate = newCheckOutDate.trim();
    if (!isStayPeriodValid(reservation.checkInDate, candidate)) {
      setErrorMessage(t("reservationWorkflow.validation.stayUpdate"));
      return;
    }
    Alert.alert(
      t("reservationWorkflow.detail.confirmStayTitle"),
      t("reservationWorkflow.detail.confirmStayMessage", { date: formatDateKey(candidate, i18n.language) }),
      [
        { text: t("reservationWorkflow.common.back"), style: "cancel" },
        {
          text: t("reservationWorkflow.detail.saveStay"),
          onPress: () => {
            setErrorMessage("");
            updateStay.mutate(
              { reservationId, request: { checkOutDate: candidate } },
              {
                onSuccess: () => setNewCheckOutDate(""),
                onError: (error) => {
                  setErrorMessage(
                    getUserFacingErrorMessage(error, t("reservationWorkflow.errors.stay"))
                  );
                },
              }
            );
          },
        },
      ]
    );
  };

  const submitStatus = () => {
    const trimmedReason = reason.trim();
    if (!statusAction || !trimmedReason || trimmedReason.length > 300) {
      setErrorMessage(t("reservationWorkflow.validation.reason"));
      return;
    }
    updateStatus.mutate(
      { reservationId, request: { status: statusAction, reason: trimmedReason } },
      {
        onSuccess: () => {
          setStatusAction(undefined);
          setReason("");
          setErrorMessage("");
        },
        onError: (error) => {
          const fallback = isAxiosError(error) && error.response?.status === 409
            ? t("reservationWorkflow.errors.statusConflict")
            : t("reservationWorkflow.errors.status");
          setErrorMessage(getUserFacingErrorMessage(error, fallback));
        },
      }
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={detail.isRefetching || history.isRefetching} onRefresh={refresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.titleRow}>
          <View style={styles.titleCopy}>
            <Text style={[styles.title, { color: Colors.textPrimary }]}>{reservation.apartmentName}</Text>
            <Text style={[styles.identifier, { color: Colors.textSecondary }]}>{t("reservationWorkflow.detail.reference", { id: reservation.reservationId })}</Text>
          </View>
          <ReservationStatusBadge status={reservation.status} />
        </View>
        {errorMessage ? <View style={[styles.errorBox, { borderColor: Colors.error }]}><Text style={{ color: Colors.error }}>{errorMessage}</Text></View> : null}
        <Section title={t("reservationWorkflow.detail.stay")}>
          <InfoRow label={t("reservationWorkflow.detail.checkIn")} value={formatDateKey(reservation.checkInDate, i18n.language)} />
          <InfoRow label={t("reservationWorkflow.detail.checkOut")} value={formatDateKey(reservation.checkOutDate, i18n.language)} />
          <InfoRow label={t("reservationWorkflow.detail.nights")} value={String(reservation.nights)} />
          <InfoRow label={t("reservationWorkflow.detail.guests")} value={String(reservation.guestCount)} />
        </Section>
        <Section title={t("reservationWorkflow.detail.pricing")}>
          <InfoRow label={t("reservationWorkflow.detail.nightlyRate")} value={formatMoney(reservation.nightlyRate, t("reservationWorkflow.common.currency"))} />
          <InfoRow label={t("reservationWorkflow.detail.total")} value={formatMoney(reservation.totalPrice, t("reservationWorkflow.common.currency"))} emphasized />
        </Section>
        <Section title={t("reservationWorkflow.detail.note")}>
          <Text style={{ color: Colors.textSecondary, lineHeight: 20 }}>{reservation.note || t("reservationWorkflow.detail.noNote")}</Text>
        </Section>
        <Section title={t("reservationWorkflow.detail.execution")}>
          <InfoRow label={t("reservationWorkflow.detail.createdBy")} value={String(reservation.createdByUserId)} />
          <InfoRow label={t("reservationWorkflow.detail.createdAt")} value={formatTimestamp(reservation.createdAt, i18n.language)} />
          {reservation.checkInClaimedByUserId ? <InfoRow label={t("reservationWorkflow.detail.claimedBy")} value={`${reservation.checkInClaimedByUserId} · ${formatTimestamp(reservation.checkInClaimedAt, i18n.language)}`} /> : null}
          {reservation.checkedInByUserId ? <InfoRow label={t("reservationWorkflow.detail.checkedInBy")} value={`${reservation.checkedInByUserId} · ${formatTimestamp(reservation.checkedInAt, i18n.language)}`} /> : null}
          {reservation.checkedOutByUserId ? <InfoRow label={t("reservationWorkflow.detail.checkedOutBy")} value={`${reservation.checkedOutByUserId} · ${formatTimestamp(reservation.checkedOutAt, i18n.language)}`} /> : null}
        </Section>
        <Section title={t("reservationWorkflow.detail.history")}>
          {history.isPending ? <ActivityIndicator color={Colors.primary} /> : history.isError ? <EmptyOrErrorState icon="CircleAlert" title={t("reservationWorkflow.errors.historyTitle")} description={t("reservationWorkflow.errors.historyDescription")} retryLabel={t("reservationWorkflow.common.retry")} onRetry={() => void history.refetch()} /> : <StatusHistory items={history.data ?? []} />}
        </Section>
        <Section title={t("guestCheckIn.detail.title")}>
          <Text style={[styles.actionHint, { color: Colors.textSecondary }]}>{t("guestCheckIn.detail.hint")}</Text>
          <PrimaryButton label={t("guestCheckIn.navigation.guests")} onPress={() => router.push({ pathname: "/reservations/[id]/guests", params: { id: String(reservationId) } })} icon="Users" />
          <PrimaryButton label={t("guestCheckIn.navigation.checkIn")} onPress={() => router.push({ pathname: "/reservations/[id]/check-in", params: { id: String(reservationId) } })} icon="ClipboardCheck" />
        </Section>
        <Section title={t("paymentWorkflow.detail.title")}>
          <Text style={[styles.actionHint, { color: Colors.textSecondary }]}>{t("paymentWorkflow.detail.hint")}</Text>
          <PrimaryButton label={t("paymentWorkflow.navigation.title")} onPress={() => router.push({ pathname: "/reservations/[id]/payments", params: { id: String(reservationId) } })} />
        </Section>
        {reservation.status === "CHECKED_IN" ? <Section title={t("checkOutWorkflow.detail.title")}>
          <Text style={[styles.actionHint, { color: Colors.textSecondary }]}>{t("checkOutWorkflow.detail.readyHint")}</Text>
          <PrimaryButton label={t("checkOutWorkflow.navigation.checkOut")} onPress={() => router.push({ pathname: "/reservations/[id]/check-out", params: { id: String(reservationId) } })} icon="ClipboardCheck" />
        </Section> : null}
        {reservation.status === "CHECKED_OUT" ? <Section title={t("checkOutWorkflow.detail.title")}>
          <Text style={[styles.actionHint, { color: Colors.textSecondary }]}>{t("checkOutWorkflow.detail.readOnlyHint")}</Text>
          <PrimaryButton label={t("checkOutWorkflow.navigation.viewResult")} onPress={() => router.push({ pathname: "/reservations/[id]/check-out", params: { id: String(reservationId) } })} icon="ClipboardCheck" />
        </Section> : null}
        {canUpdate ? <Section title={t("reservationWorkflow.detail.allowedActions")}>
          <Text style={[styles.actionHint, { color: Colors.textSecondary }]}>{t("reservationWorkflow.detail.stayHint")}</Text>
          <TextInput value={newCheckOutDate} onChangeText={setNewCheckOutDate} placeholder="YYYY-MM-DD" placeholderTextColor={Colors.tertiary} keyboardType="numbers-and-punctuation" accessibilityLabel={t("reservationWorkflow.detail.newCheckOut")} style={[styles.input, { color: Colors.textPrimary, borderColor: Colors.divider, backgroundColor: Colors.screenBackground }]} />
          <PrimaryButton label={t("reservationWorkflow.detail.saveStay")} onPress={saveStay} loading={updateStay.isPending} icon="Save" />
          <View style={styles.statusActions}><Pressable accessibilityRole="button" onPress={() => { setErrorMessage(""); setStatusAction("CANCELLED"); }} style={[styles.dangerButton, { borderColor: Colors.deleteColor }]}><Text style={{ color: Colors.deleteColor, fontWeight: "700" }}>{t("reservationWorkflow.detail.cancel")}</Text></Pressable>{canMarkNoShow ? <Pressable accessibilityRole="button" onPress={() => { setErrorMessage(""); setStatusAction("NO_SHOW"); }} style={[styles.dangerButton, { borderColor: Colors.deleteColor }]}><Text style={{ color: Colors.deleteColor, fontWeight: "700" }}>{t("reservationWorkflow.detail.noShow")}</Text></Pressable> : null}</View>
          {!canMarkNoShow ? <Text style={[styles.actionHint, { color: Colors.textSecondary }]}>{t("reservationWorkflow.detail.noShowUnavailable")}</Text> : null}
        </Section> : null}
      </ScrollView>
      <StatusReasonModal status={statusAction} reason={reason} isSubmitting={updateStatus.isPending} onReasonChange={setReason} onCancel={() => { setStatusAction(undefined); setReason(""); }} onSubmit={submitStatus} />
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { Colors } = useTheme();
  return <View style={[styles.section, { backgroundColor: Colors.background, borderColor: Colors.divider }]}><Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{title}</Text><View style={styles.sectionBody}>{children}</View></View>;
}

function InfoRow({ label, value, emphasized = false }: { label: string; value: string; emphasized?: boolean }) {
  const { Colors } = useTheme();
  return <View style={styles.infoRow}><Text style={[styles.infoLabel, { color: Colors.textSecondary }]}>{label}</Text><Text style={[styles.infoValue, { color: Colors.textPrimary }, emphasized && styles.emphasized]}>{value}</Text></View>;
}

function StatusHistory({ items }: { items: ReservationStatusHistory[] }) {
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();
  if (items.length === 0) {
    return <Text style={{ color: Colors.textSecondary }}>{t("reservationWorkflow.detail.emptyHistory")}</Text>;
  }
  return <View style={styles.historyList}>{items.map((item) => <View key={item.reservationStatusHistoryId} style={[styles.historyRow, { borderColor: Colors.divider }]}><ReservationStatusBadge status={item.status} /><Text style={{ color: Colors.textSecondary }}>{formatTimestamp(item.changedAt, i18n.language)}</Text><Text style={{ color: Colors.textSecondary }}>{t("reservationWorkflow.detail.changedBy", { id: item.changedByUserId ?? "—" })}</Text>{item.reason ? <Text style={{ color: Colors.textPrimary }}>{item.reason}</Text> : null}</View>)}</View>;
}

function StatusReasonModal({ status, reason, isSubmitting, onReasonChange, onCancel, onSubmit }: { status?: StatusAction; reason: string; isSubmitting: boolean; onReasonChange: (value: string) => void; onCancel: () => void; onSubmit: () => void }) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  return (
    <Modal visible={Boolean(status)} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", default: undefined })} style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: Colors.background }]}>
          <Text style={[styles.modalTitle, { color: Colors.textPrimary }]}>
            {status === "CANCELLED" ? t("reservationWorkflow.detail.cancel") : t("reservationWorkflow.detail.noShow")}
          </Text>
          <Text style={{ color: Colors.textSecondary }}>{t("reservationWorkflow.detail.reasonPrompt")}</Text>
          <TextInput value={reason} onChangeText={onReasonChange} maxLength={300} multiline autoFocus accessibilityLabel={t("reservationWorkflow.detail.reason")} style={[styles.input, styles.reasonInput, { color: Colors.textPrimary, borderColor: Colors.divider, backgroundColor: Colors.screenBackground }]} />
          <Text style={{ color: Colors.textSecondary, fontSize: 12 }}>{reason.length}/300</Text>
          <View style={styles.modalActions}>
            <Pressable accessibilityRole="button" onPress={onCancel} style={[styles.modalCancel, { borderColor: Colors.divider }]}>
              <Text style={{ color: Colors.textPrimary, fontWeight: "700" }}>{t("reservationWorkflow.common.back")}</Text>
            </Pressable>
            <View style={styles.modalSubmit}>
              <PrimaryButton label={t("reservationWorkflow.detail.confirmStatus")} onPress={onSubmit} loading={isSubmitting} />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const formatTimestamp = (value: string | null, locale: string) => value ? new Date(value).toLocaleString(locale) : "—";

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 16, paddingBottom: 32, gap: 12 }, loading: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 }, invalidState: { flex: 1, padding: 16, justifyContent: "center" }, titleRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }, titleCopy: { flex: 1, gap: 2 }, title: { fontSize: 24, fontWeight: "700" }, identifier: { fontSize: 13 }, errorBox: { borderWidth: 1, borderRadius: 12, padding: 11 }, section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 }, sectionTitle: { fontSize: 17, fontWeight: "700" }, sectionBody: { gap: 9 }, infoRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 }, infoLabel: { flex: 1, fontSize: 14 }, infoValue: { flex: 1, fontSize: 14, fontWeight: "600", textAlign: "right" }, emphasized: { fontSize: 16, fontWeight: "800" }, historyList: { gap: 9 }, historyRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 9, gap: 4 }, actionHint: { fontSize: 13, lineHeight: 19 }, input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 15 }, statusActions: { flexDirection: "row", gap: 9, flexWrap: "wrap" }, dangerButton: { minHeight: 44, borderWidth: 1, borderRadius: 12, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" }, modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)", justifyContent: "center", padding: 20 }, modalCard: { borderRadius: 16, padding: 18, gap: 11 }, modalTitle: { fontSize: 19, fontWeight: "700" }, reasonInput: { minHeight: 92, textAlignVertical: "top", paddingTop: 11 }, modalActions: { flexDirection: "row", alignItems: "center", gap: 10 }, modalCancel: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 15, alignItems: "center", justifyContent: "center" }, modalSubmit: { flex: 1 },
});
