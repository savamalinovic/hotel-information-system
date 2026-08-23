import { GuestIdentity, ActionButton, ScreenState, Section } from "@/src/components/screens/GuestCheckInScreen/GuestCheckInUi";
import { getGuestCompletenessErrors, getGuestFormValues, getTodayDateKey, toGuestRequest } from "@/src/components/screens/GuestCheckInScreen/guestCheckInHelpers";
import { useRemoveReservationGuest, useReservationGuests, useUpdateReservationGuest } from "@/src/hooks/useGuestCheckIn";
import { useProfile } from "@/src/hooks/useProfile";
import { useReservationDetail } from "@/src/hooks/useReservationWorkflows";
import { useTheme } from "@/src/providers/ThemeProvider";
import { InvalidRouteState } from "@/src/components/screens/InvalidRouteState";
import { parsePositiveId } from "@/src/util/idParams";
import { getUserFacingErrorMessage } from "@/src/util/apiError";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ReservationGuestListScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const reservationId = parsePositiveId(id);
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const { profile } = useProfile();
  const reservation = useReservationDetail(reservationId);
  const guests = useReservationGuests(reservationId);
  const updateGuest = useUpdateReservationGuest();
  const removeGuest = useRemoveReservationGuest();
  const [errorMessage, setErrorMessage] = useState("");

  const refresh = () => {
    void Promise.all([reservation.refetch(), guests.refetch()]);
  };

  if (reservationId === null) {
    return <InvalidRouteState fallbackHref="/(home)/reservations" />;
  }

  if (reservation.isPending || guests.isPending) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><ScreenState title={t("guestCheckIn.common.loading")} loading /></SafeAreaView>;
  }

  if (reservation.isError || guests.isError || !reservation.data) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><ScreenState title={t("guestCheckIn.errors.guestsUnavailable")} description={t("guestCheckIn.errors.guestsUnavailableDescription")} onRetry={refresh} /></SafeAreaView>;
  }

  const reservationData = reservation.data;
  const reservationGuests = guests.data ?? [];
  const canEdit = reservationData.status === "CONFIRMED" && profile?.role === "AGENT";
  const capacityReached = reservationGuests.length >= reservationData.guestCount;
  const primaryCount = reservationGuests.filter((entry) => entry.primaryGuest).length;

  const makePrimary = (guestId: number) => {
    const entry = reservationGuests.find((candidate) => candidate.guest.guestId === guestId);
    if (!entry || entry.primaryGuest) {
      return;
    }
    updateGuest.mutate(
      { reservationId, guestId, request: { guest: toGuestRequest(getGuestFormValues(entry.guest)), primaryGuest: true } },
      { onError: (error) => setErrorMessage(getUserFacingErrorMessage(error, t("guestCheckIn.errors.updateGuest"))) }
    );
  };

  const remove = (guestId: number, name: string) => {
    Alert.alert(t("guestCheckIn.guest.removeTitle"), t("guestCheckIn.guest.removeMessage", { name }), [
      { text: t("guestCheckIn.common.cancel"), style: "cancel" },
      {
        text: t("guestCheckIn.guest.remove"),
        style: "destructive",
        onPress: () => removeGuest.mutate(
          { reservationId, guestId },
          { onError: (error) => setErrorMessage(getUserFacingErrorMessage(error, t("guestCheckIn.errors.removeGuest"))) }
        ),
      },
    ]);
  };

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={reservation.isRefetching || guests.isRefetching} onRefresh={refresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.heading}>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>{t("guestCheckIn.guest.title")}</Text>
          <Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.guest.reservation", { id: reservationId })}</Text>
        </View>
        {errorMessage ? <View style={[styles.errorBox, { borderColor: Colors.error }]}><Text style={{ color: Colors.error }}>{errorMessage}</Text></View> : null}
        <Section title={t("guestCheckIn.guest.coverage")}>
          <View style={styles.coverage}><Metric label={t("guestCheckIn.guest.recorded")} value={`${reservationGuests.length}/${reservationData.guestCount}`} /><Metric label={t("guestCheckIn.guest.missing")} value={String(Math.max(reservationData.guestCount - reservationGuests.length, 0))} /><Metric label={t("guestCheckIn.guest.primaryCount")} value={String(primaryCount)} /></View>
          {!canEdit ? <Text style={{ color: Colors.textSecondary }}>{reservationData.status !== "CONFIRMED" ? t("guestCheckIn.guest.locked") : t("guestCheckIn.guest.readOnly")}</Text> : null}
        </Section>
        {canEdit ? <Section title={t("guestCheckIn.guest.addTitle")}>
          <ActionButton label={t("guestCheckIn.guest.addNew")} onPress={() => router.push({ pathname: "/reservations/[id]/guest-form", params: { id: String(reservationId) } })} disabled={capacityReached} icon="Plus" />
          <ActionButton label={t("guestCheckIn.guest.addExisting")} onPress={() => router.push({ pathname: "/reservations/[id]/guest-search", params: { id: String(reservationId) } })} disabled={capacityReached} variant="secondary" icon="Search" />
          {capacityReached ? <Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.guest.capacityReached")}</Text> : null}
        </Section> : null}
        <Section title={t("guestCheckIn.guest.listTitle")}>
          {reservationGuests.length === 0 ? <Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.guest.empty")}</Text> : reservationGuests.map((entry) => {
            const completeness = getGuestCompletenessErrors(entry.guest, reservationData, getTodayDateKey());
            return <View key={entry.reservationGuestId} style={[styles.guestCard, { borderColor: Colors.divider }]}>
              <GuestIdentity guest={entry.guest} primary={entry.primaryGuest} />
              {completeness.length > 0 ? <Text style={{ color: Colors.error }}>{t("guestCheckIn.guest.incomplete")}</Text> : <Text style={{ color: Colors.success }}>{t("guestCheckIn.guest.complete")}</Text>}
              {canEdit ? <View style={styles.actions}>
                <ActionButton label={t("guestCheckIn.guest.edit")} onPress={() => router.push({ pathname: "/reservations/[id]/guest-form", params: { id: String(reservationId), guestId: String(entry.guest.guestId), primaryGuest: String(entry.primaryGuest) } })} variant="secondary" />
                {!entry.primaryGuest ? <ActionButton label={t("guestCheckIn.guest.makePrimary")} onPress={() => makePrimary(entry.guest.guestId)} loading={updateGuest.isPending} variant="secondary" /> : null}
                <ActionButton label={t("guestCheckIn.guest.remove")} onPress={() => remove(entry.guest.guestId, `${entry.guest.name} ${entry.guest.surname}`)} loading={removeGuest.isPending} variant="danger" icon="UserMinus" />
              </View> : null}
            </View>;
          })}
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const { Colors } = useTheme();
  return <View style={styles.metric}><Text style={[styles.metricValue, { color: Colors.textPrimary }]}>{value}</Text><Text style={{ color: Colors.textSecondary }}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  heading: { gap: 3 },
  title: { fontSize: 24, fontWeight: "800" },
  errorBox: { borderWidth: 1, borderRadius: 12, padding: 11 },
  coverage: { flexDirection: "row", gap: 8 },
  metric: { flex: 1, gap: 2 },
  metricValue: { fontSize: 19, fontWeight: "800" },
  guestCard: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 11, gap: 9 },
  actions: { gap: 8 },
});
