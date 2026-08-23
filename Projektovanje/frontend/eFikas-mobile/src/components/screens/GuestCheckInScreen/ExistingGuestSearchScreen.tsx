import { ActionButton, GuestIdentity, InputField, ScreenState, Section } from "@/src/components/screens/GuestCheckInScreen/GuestCheckInUi";
import { useAddReservationGuest, useGuestSearch, useReservationGuests } from "@/src/hooks/useGuestCheckIn";
import { useProfile } from "@/src/hooks/useProfile";
import { useReservationDetail } from "@/src/hooks/useReservationWorkflows";
import { useTheme } from "@/src/providers/ThemeProvider";
import { InvalidRouteState } from "@/src/components/screens/InvalidRouteState";
import { parsePositiveId } from "@/src/util/idParams";
import { getUserFacingErrorMessage } from "@/src/util/apiError";
import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function ExistingGuestSearchScreen() {
  const { id } = useLocalSearchParams<{ id?: string | string[] }>();
  const reservationId = parsePositiveId(id);
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const { profile } = useProfile();
  const reservation = useReservationDetail(reservationId);
  const reservationGuests = useReservationGuests(reservationId);
  const [query, setQuery] = useState("");
  const search = useGuestSearch(query);
  const addGuest = useAddReservationGuest();
  const [errorMessage, setErrorMessage] = useState("");

  const currentGuestIds = useMemo(
    () => new Set((reservationGuests.data ?? []).map((entry) => entry.guest.guestId)),
    [reservationGuests.data]
  );
  const refresh = () => {
    void Promise.all([reservation.refetch(), reservationGuests.refetch(), search.refetch()]);
  };

  if (reservationId === null) {
    return <InvalidRouteState fallbackHref="/(home)/reservations" />;
  }

  if (reservation.isPending || reservationGuests.isPending) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><ScreenState title={t("guestCheckIn.common.loading")} loading /></SafeAreaView>;
  }

  if (reservation.isError || reservationGuests.isError || !reservation.data) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><ScreenState title={t("guestCheckIn.errors.guestsUnavailable")} onRetry={refresh} /></SafeAreaView>;
  }

  const canEdit = reservation.data.status === "CONFIRMED" && profile?.role === "AGENT";
  const capacityReached = (reservationGuests.data ?? []).length >= reservation.data.guestCount;
  const selectGuest = (guestId: number) => {
    addGuest.mutate(
      {
        reservationId,
        request: {
          existingGuestId: guestId,
          guest: null,
          primaryGuest: (reservationGuests.data ?? []).length === 0,
        },
      },
      {
        onSuccess: () => router.back(),
        onError: (error) => setErrorMessage(getUserFacingErrorMessage(error, t("guestCheckIn.errors.addGuest"))),
      }
    );
  };

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" refreshControl={<RefreshControl refreshing={search.isRefetching || reservationGuests.isRefetching} onRefresh={refresh} tintColor={Colors.primary} />}>
        <View style={styles.heading}><Text style={[styles.title, { color: Colors.textPrimary }]}>{t("guestCheckIn.search.title")}</Text><Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.search.subtitle")}</Text></View>
        {errorMessage ? <View style={[styles.errorBox, { borderColor: Colors.error }]}><Text style={{ color: Colors.error }}>{errorMessage}</Text></View> : null}
        <Section title={t("guestCheckIn.search.queryTitle")}>
          <InputField label={t("guestCheckIn.search.query")} value={query} onChangeText={setQuery} placeholder={t("guestCheckIn.search.placeholder")} />
          {search.debouncedQuery !== query.trim() ? <Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.search.searching")}</Text> : null}
        </Section>
        {!canEdit ? <View style={[styles.readOnly, { borderColor: Colors.divider }]}><Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.guest.locked")}</Text></View> : null}
        {query.trim() ? <Section title={t("guestCheckIn.search.results")}>
          {search.isPending ? <Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.common.loading")}</Text> : search.isError ? <ScreenState title={t("guestCheckIn.errors.searchUnavailable")} onRetry={() => void search.refetch()} /> : search.guests.length === 0 ? <Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.search.empty")}</Text> : search.guests.map((guest) => {
            const alreadyAdded = currentGuestIds.has(guest.guestId);
            return <View key={guest.guestId} style={[styles.guestCard, { borderColor: Colors.divider }]}>
              <GuestIdentity guest={guest} />
              {alreadyAdded ? <Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.search.alreadyAdded")}</Text> : <ActionButton label={t("guestCheckIn.search.select")} onPress={() => selectGuest(guest.guestId)} disabled={!canEdit || capacityReached} loading={addGuest.isPending} icon="UserCheck" />}
            </View>;
          })}
          {search.hasNextPage ? <ActionButton label={t("guestCheckIn.search.loadMore")} onPress={() => void search.fetchNextPage()} loading={search.isFetchingNextPage} variant="secondary" /> : null}
        </Section> : null}
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
  readOnly: { borderWidth: 1, borderRadius: 12, padding: 11 },
  guestCard: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 11, gap: 9 },
});
