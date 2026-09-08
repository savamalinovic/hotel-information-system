import { ActionButton, GuestIdentity, ScreenState, Section } from "@/src/components/screens/GuestCheckInScreen/GuestCheckInUi";
import { getReadinessChecks } from "@/src/components/screens/GuestCheckInScreen/guestCheckInHelpers";
import { useApartmentCatalogDetail } from "@/src/hooks/useApartmentCatalog";
import {
  useCheckInClaimHistory,
  useClaimCheckIn,
  usePerformCheckIn,
  useReleaseCheckIn,
  useReservationGuests,
  useTakeoverCheckIn,
} from "@/src/hooks/useGuestCheckIn";
import { useProfile } from "@/src/hooks/useProfile";
import { useReservationDetail } from "@/src/hooks/useReservationWorkflows";
import { useTheme } from "@/src/providers/ThemeProvider";
import { CheckInClaimResponse, CheckInResponse } from "@/src/types/types";
import { getUserFacingErrorMessage } from "@/src/util/apiError";
import { InvalidRouteState } from "@/src/components/screens/InvalidRouteState";
import { parsePositiveId } from "@/src/util/idParams";
import { isAxiosError } from "axios";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function CheckInScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const reservationId = parsePositiveId(id);
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();
  const { profile } = useProfile();
  const reservation = useReservationDetail(reservationId);
  const guests = useReservationGuests(reservationId);
  const apartment = useApartmentCatalogDetail(reservation.data?.apartmentId);
  const history = useCheckInClaimHistory(reservationId);
  const claim = useClaimCheckIn();
  const release = useReleaseCheckIn();
  const takeover = useTakeoverCheckIn();
  const performCheckIn = usePerformCheckIn();
  const [errorMessage, setErrorMessage] = useState("");
  const [claimResult, setClaimResult] = useState<CheckInClaimResponse>();
  const [checkInResult, setCheckInResult] = useState<CheckInResponse>();

  const refresh = () => {
    void Promise.all([reservation.refetch(), guests.refetch(), apartment.refetch(), history.refetch()]);
  };

  if (reservationId === null) {
    return <InvalidRouteState fallbackHref="/(tabs)/reservations" />;
  }

  if (reservation.isPending || guests.isPending) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><ScreenState title={t("guestCheckIn.common.loading")} loading /></SafeAreaView>;
  }

  if (reservation.isError || guests.isError || !reservation.data) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><ScreenState title={t("guestCheckIn.errors.checkInUnavailable")} onRetry={refresh} /></SafeAreaView>;
  }

  const reservationData = reservation.data;
  const readiness = getReadinessChecks(reservationData, guests.data ?? [], apartment.data);
  const allReady = readiness.every((item) => item.passed);
  const canOperate = profile?.role === "AGENT" && reservationData.status === "CONFIRMED";
  const activeClaimerId = reservationData.checkInClaimedByUserId;
  const ownClaim = activeClaimerId !== null && activeClaimerId === profile?.userId;

  const handleClaim = (kind: "claim" | "release" | "takeover") => {
    const mutation = kind === "claim" ? claim : kind === "release" ? release : takeover;
    mutation.mutate(reservationId, {
      onSuccess: (response) => {
        setClaimResult(response);
        setErrorMessage("");
      },
      onError: (error) => {
        const conflict = isAxiosError(error) && error.response?.status === 409;
        setErrorMessage(conflict ? t("guestCheckIn.claimConflict") : getUserFacingErrorMessage(error, t("guestCheckIn.errors.claim")));
        if (conflict) {
          refresh();
        }
      },
    });
  };

  const confirmCheckIn = () => {
    const primaryGuest = (guests.data ?? []).find((entry) => entry.primaryGuest)?.guest;
    Alert.alert(t("guestCheckIn.checkIn.confirmTitle"), t("guestCheckIn.checkIn.confirmMessage", {
      apartment: reservationData.apartmentName,
      checkIn: reservationData.checkInDate,
      checkOut: reservationData.checkOutDate,
      guests: reservationData.guestCount,
      primary: primaryGuest ? `${primaryGuest.name} ${primaryGuest.surname}` : "—",
    }), [
      { text: t("guestCheckIn.common.cancel"), style: "cancel" },
      {
        text: t("guestCheckIn.checkIn.confirm"),
        onPress: () => performCheckIn.mutate(reservationId, {
          onSuccess: (response) => {
            setCheckInResult(response);
            setErrorMessage("");
          },
          onError: (error) => {
            const fallback = isAxiosError(error) && error.response?.status === 409
              ? t("guestCheckIn.errors.checkInConflict")
              : t("guestCheckIn.errors.checkIn");
            setErrorMessage(getUserFacingErrorMessage(error, fallback));
          },
        }),
      },
    ]);
  };

  const confirmTakeover = () => {
    Alert.alert(t("guestCheckIn.takeoverConfirmTitle"), t("guestCheckIn.takeoverConfirmMessage", { id: activeClaimerId }), [
      { text: t("guestCheckIn.common.cancel"), style: "cancel" },
      { text: t("guestCheckIn.claim.takeover"), onPress: () => handleClaim("takeover") },
    ]);
  };

  const claimLoading = claim.isPending || release.isPending || takeover.isPending;
  return (
    <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={reservation.isRefetching || guests.isRefetching || apartment.isRefetching || history.isRefetching} onRefresh={refresh} tintColor={Colors.primary} />} showsVerticalScrollIndicator={false}>
        <View style={styles.heading}><Text style={[styles.title, { color: Colors.textPrimary }]}>{t("guestCheckIn.checkIn.title")}</Text><Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.checkIn.reservation", { id: reservationId, apartment: reservationData.apartmentName })}</Text></View>
        {errorMessage ? <View style={[styles.errorBox, { borderColor: Colors.error }]}><Text style={{ color: Colors.error }}>{errorMessage}</Text></View> : null}
        {checkInResult ? <View style={[styles.resultBox, { borderColor: Colors.success }]}><Text style={[styles.resultTitle, { color: Colors.success }]}>{t("guestCheckIn.checkIn.success")}</Text><Text style={{ color: Colors.textPrimary }}>{t("guestCheckIn.checkIn.entriesCreated", { count: checkInResult.guestBookEntriesCreated })}</Text><Text style={{ color: Colors.textSecondary }}>{new Date(checkInResult.checkedInAt).toLocaleString(i18n.language)}</Text></View> : null}
        <Section title={t("guestCheckIn.checkIn.readinessTitle")}>
          {readiness.map((item) => <View key={item.key} style={styles.readinessRow}><Text style={{ color: item.passed ? Colors.success : Colors.error }}>{item.passed ? "✓" : "×"}</Text><Text style={{ color: Colors.textPrimary, flex: 1 }}>{t(`guestCheckIn.readiness.${item.key}`)}</Text><Text style={{ color: item.passed ? Colors.success : Colors.error }}>{item.passed ? t("guestCheckIn.readiness.ready") : t("guestCheckIn.readiness.missing")}</Text></View>)}
          {apartment.isPending ? <Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.checkIn.loadingApartment")}</Text> : null}
          {apartment.isError ? <Text style={{ color: Colors.error }}>{t("guestCheckIn.checkIn.apartmentUnavailable")}</Text> : null}
        </Section>
        <Section title={t("guestCheckIn.checkIn.guestSummary")}>
          {(guests.data ?? []).length === 0 ? <Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.guest.empty")}</Text> : (guests.data ?? []).map((entry) => <GuestIdentity key={entry.reservationGuestId} guest={entry.guest} primary={entry.primaryGuest} />)}
          <ActionButton label={t("guestCheckIn.checkIn.openGuests")} onPress={() => router.push({ pathname: "/reservations/[id]/guests", params: { id: String(reservationId) } })} variant="secondary" />
        </Section>
        <Section title={t("guestCheckIn.claim.title")}>
          {activeClaimerId === null ? <Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.claim.none")}</Text> : ownClaim ? <Text style={{ color: Colors.success }}>{t("guestCheckIn.claimOwnAt", { at: formatTimestamp(reservationData.checkInClaimedAt, i18n.language) })}</Text> : <Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.claimOtherAt", { id: activeClaimerId, at: formatTimestamp(reservationData.checkInClaimedAt, i18n.language) })}</Text>}
          {claimResult ? <Text style={{ color: Colors.textSecondary }}>{claimResult.claimedByUserId === null ? t("guestCheckIn.claim.released") : t("guestCheckIn.claim.claimedBy", { name: claimResult.claimedByName ?? claimResult.claimedByUserId })}</Text> : null}
          {!canOperate ? <Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.claim.unavailable")}</Text> : activeClaimerId === null ? <ActionButton label={t("guestCheckIn.claim.claim")} onPress={() => handleClaim("claim")} loading={claimLoading} icon="UserCheck" /> : ownClaim ? <ActionButton label={t("guestCheckIn.claim.release")} onPress={() => handleClaim("release")} loading={claimLoading} variant="secondary" icon="UserMinus" /> : <ActionButton label={t("guestCheckIn.claim.takeover")} onPress={confirmTakeover} loading={claimLoading} variant="secondary" icon="UserCheck" />}
        </Section>
        <Section title={t("guestCheckIn.claim.historyTitle")}>
          {history.isPending ? <Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.common.loading")}</Text> : history.isError ? <ActionButton label={t("guestCheckIn.common.retry")} onPress={() => void history.refetch()} variant="secondary" /> : (history.data ?? []).length === 0 ? <Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.claim.emptyHistory")}</Text> : [...(history.data ?? [])].sort((first, second) => second.performedAt.localeCompare(first.performedAt)).map((entry) => <View key={entry.historyId} style={[styles.historyRow, { borderColor: Colors.divider }]}><Text style={{ color: Colors.textPrimary, fontWeight: "700" }}>{t(`guestCheckIn.claim.actions.${entry.action}`)}</Text><Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.claim.historyUsers", { previous: entry.previousClaimedByUserId ?? "—", claimed: entry.claimedByUserId ?? "—", performed: entry.performedByUserId })}</Text><Text style={{ color: Colors.textSecondary }}>{new Date(entry.performedAt).toLocaleString(i18n.language)}</Text></View>)}
        </Section>
        <Section title={t("guestCheckIn.checkIn.performTitle")}>
          <Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.checkIn.performHint")}</Text>
          <ActionButton label={t("guestCheckIn.checkIn.confirm")} onPress={confirmCheckIn} disabled={!canOperate || !allReady} loading={performCheckIn.isPending} icon="ClipboardCheck" />
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  heading: { gap: 3 },
  title: { fontSize: 24, fontWeight: "800" },
  errorBox: { borderWidth: 1, borderRadius: 12, padding: 11 },
  resultBox: { borderWidth: 1, borderRadius: 12, padding: 12, gap: 4 },
  resultTitle: { fontSize: 17, fontWeight: "800" },
  readinessRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  historyRow: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 9, gap: 3 },
});

const formatTimestamp = (value: string | null, locale: string) => value ? new Date(value).toLocaleString(locale) : "—";
