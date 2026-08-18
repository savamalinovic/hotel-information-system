import { ReservationListFilters } from "@/src/api/services/reservationWorkflowService";
import { Icon } from "@/src/components/atoms/Icon/Icon";
import { EmptyOrErrorState, FilterChip, ReservationStatusBadge } from "@/src/components/screens/ReservationWorkflowScreen/ReservationWorkflowUi";
import {
  formatDateKey,
  formatMoney,
  getCalendarMarks,
  getLocalDateKey,
  getMonthRange,
  getReservationsForDate,
  isStayPeriodValid,
} from "@/src/components/screens/ReservationWorkflowScreen/reservationWorkflowHelpers";
import { useReservationList } from "@/src/hooks/useReservationWorkflows";
import { useTheme } from "@/src/providers/ThemeProvider";
import { ReservationDetails, ReservationStatus } from "@/src/types/types";
import { router } from "expo-router";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";

const reservationStatuses: ReservationStatus[] = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"];

export default function ReservationListCalendarScreen() {
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();
  const [status, setStatus] = useState<ReservationStatus>();
  const [apartmentText, setApartmentText] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [calendarMonth, setCalendarMonth] = useState(getLocalDateKey());
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<string>();

  const apartmentId = Number(apartmentText);
  const hasValidApartmentId = apartmentText.trim() === "" || (Number.isInteger(apartmentId) && apartmentId > 0);
  const hasPeriodInput = Boolean(from || to);
  const hasValidPeriod = !hasPeriodInput || isStayPeriodValid(from, to);
  const filters = useMemo<Omit<ReservationListFilters, "page">>(
    () => ({
      size: 20,
      sort: "checkInDate,asc",
      ...(status ? { status } : {}),
      ...(apartmentText.trim() && hasValidApartmentId ? { apartmentId } : {}),
      ...(hasPeriodInput && hasValidPeriod ? { from, to } : {}),
    }),
    [apartmentId, apartmentText, from, hasPeriodInput, hasValidApartmentId, hasValidPeriod, status, to]
  );
  const monthRange = useMemo(() => getMonthRange(calendarMonth), [calendarMonth]);
  const calendarFilters = useMemo<Omit<ReservationListFilters, "page">>(
    () => ({
      size: 100,
      sort: "checkInDate,asc",
      from: monthRange.from,
      to: monthRange.to,
      ...(status ? { status } : {}),
      ...(apartmentText.trim() && hasValidApartmentId ? { apartmentId } : {}),
    }),
    [apartmentId, apartmentText, hasValidApartmentId, monthRange.from, monthRange.to, status]
  );
  const list = useReservationList(filters);
  const calendar = useReservationList(calendarFilters);
  const calendarMarks = useMemo(
    () => getCalendarMarks(calendar.reservations, selectedCalendarDate, Colors),
    [Colors, calendar.reservations, selectedCalendarDate]
  );
  const selectedDayReservations = useMemo(
    () => (selectedCalendarDate ? getReservationsForDate(calendar.reservations, selectedCalendarDate) : []),
    [calendar.reservations, selectedCalendarDate]
  );
  const hasFilters = Boolean(status || apartmentText || from || to);

  const resetFilters = () => {
    setStatus(undefined);
    setApartmentText("");
    setFrom("");
    setTo("");
  };

  const refresh = () => {
    void Promise.all([list.refetch(), calendar.refetch()]);
  };

  const openReservation = (reservationId: number) => {
    router.push({ pathname: "/(home)/reservations/[id]", params: { id: String(reservationId) } });
  };

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
      <FlatList
        data={list.reservations}
        keyExtractor={(reservation) => String(reservation.reservationId)}
        renderItem={({ item }) => <ReservationCard reservation={item} onPress={() => openReservation(item.reservationId)} />}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerContent}>
            <View style={styles.headingRow}>
              <View style={styles.headingCopy}>
                <Text style={[styles.title, { color: Colors.textPrimary }]}>{t("reservationWorkflow.list.title")}</Text>
                <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>{t("reservationWorkflow.list.subtitle")}</Text>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("reservationWorkflow.list.create")}
                onPress={() => router.push("/(home)/reservations/addReservation")}
                style={[styles.createButton, { backgroundColor: Colors.primary }]}
              >
                <Icon name="Plus" size={20} color={Colors.textLight} />
              </Pressable>
            </View>

            <View style={[styles.filterCard, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>
              <View style={styles.filterHeading}>
                <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("reservationWorkflow.filters.title")}</Text>
                {hasFilters ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={t("reservationWorkflow.filters.reset")} onPress={resetFilters}>
                    <Text style={[styles.reset, { color: Colors.primary }]}>{t("reservationWorkflow.filters.reset")}</Text>
                  </Pressable>
                ) : null}
              </View>
              <Text style={[styles.fieldLabel, { color: Colors.textSecondary }]}>{t("reservationWorkflow.filters.status")}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                <FilterChip label={t("reservationWorkflow.filters.allStatuses")} selected={!status} onPress={() => setStatus(undefined)} />
                {reservationStatuses.map((item) => (
                  <FilterChip key={item} label={t(`reservationWorkflow.status.${item}`)} selected={status === item} onPress={() => setStatus(item)} />
                ))}
              </ScrollView>
              <Text style={[styles.fieldLabel, { color: Colors.textSecondary }]}>{t("reservationWorkflow.filters.apartment")}</Text>
              <TextInput
                value={apartmentText}
                onChangeText={setApartmentText}
                keyboardType="number-pad"
                placeholder={t("reservationWorkflow.filters.apartmentPlaceholder")}
                placeholderTextColor={Colors.tertiary}
                accessibilityLabel={t("reservationWorkflow.filters.apartment")}
                style={[styles.input, { color: Colors.textPrimary, borderColor: hasValidApartmentId ? Colors.divider : Colors.error, backgroundColor: Colors.screenBackground }]}
              />
              <Text style={[styles.fieldLabel, { color: Colors.textSecondary }]}>{t("reservationWorkflow.filters.period")}</Text>
              <View style={styles.periodRow}>
                <TextInput
                  value={from}
                  onChangeText={setFrom}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.tertiary}
                  accessibilityLabel={t("reservationWorkflow.filters.from")}
                  style={[styles.input, styles.periodInput, { color: Colors.textPrimary, borderColor: hasValidPeriod ? Colors.divider : Colors.error, backgroundColor: Colors.screenBackground }]}
                />
                <TextInput
                  value={to}
                  onChangeText={setTo}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.tertiary}
                  accessibilityLabel={t("reservationWorkflow.filters.to")}
                  style={[styles.input, styles.periodInput, { color: Colors.textPrimary, borderColor: hasValidPeriod ? Colors.divider : Colors.error, backgroundColor: Colors.screenBackground }]}
                />
              </View>
              {!hasValidApartmentId ? <Text style={[styles.validation, { color: Colors.error }]}>{t("reservationWorkflow.validation.apartment")}</Text> : null}
              {!hasValidPeriod ? <Text style={[styles.validation, { color: Colors.error }]}>{t("reservationWorkflow.validation.period")}</Text> : null}
            </View>

            <View style={[styles.calendarCard, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>
              <View style={styles.calendarHeading}>
                <View>
                  <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("reservationWorkflow.calendar.title")}</Text>
                  <Text style={[styles.calendarHint, { color: Colors.textSecondary }]}>{t("reservationWorkflow.calendar.hint")}</Text>
                </View>
                {calendar.isFetching ? <ActivityIndicator color={Colors.primary} /> : null}
              </View>
              {calendar.isPending ? (
                <View style={styles.calendarLoading}>
                  <ActivityIndicator color={Colors.primary} />
                  <Text style={{ color: Colors.textSecondary }}>{t("reservationWorkflow.calendar.loading")}</Text>
                </View>
              ) : calendar.isError ? (
                <EmptyOrErrorState
                  icon="CircleAlert"
                  title={t("reservationWorkflow.errors.calendarTitle")}
                  description={t("reservationWorkflow.errors.calendarDescription")}
                  retryLabel={t("reservationWorkflow.common.retry")}
                  onRetry={() => void calendar.refetch()}
                />
              ) : (
                <>
                  <Calendar
                current={calendarMonth}
                markingType="multi-dot"
                markedDates={calendarMarks}
                onMonthChange={(month) => {
                  setCalendarMonth(month.dateString);
                  setSelectedCalendarDate(undefined);
                }}
                onDayPress={(day) => setSelectedCalendarDate(day.dateString)}
                theme={{
                  calendarBackground: Colors.background,
                  dayTextColor: Colors.textPrimary,
                  monthTextColor: Colors.textPrimary,
                  textDisabledColor: Colors.tertiary,
                  arrowColor: Colors.primary,
                  todayTextColor: Colors.primary,
                  textDayFontWeight: "500",
                  textMonthFontWeight: "700",
                }}
                  />
                  <CalendarLegend />
                  {calendar.hasNextPage ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("reservationWorkflow.calendar.loadMore")}
                  onPress={() => void calendar.fetchNextPage()}
                  disabled={calendar.isFetchingNextPage}
                  style={styles.loadMoreCalendar}
                >
                  <Text style={{ color: Colors.primary, fontWeight: "700" }}>{t("reservationWorkflow.calendar.loadMore")}</Text>
                </Pressable>
                  ) : null}
                  {selectedCalendarDate ? (
                <View style={styles.selectedDay}>
                  <Text style={[styles.selectedDayTitle, { color: Colors.textPrimary }]}>{formatDateKey(selectedCalendarDate, i18n.language)}</Text>
                  {selectedDayReservations.length === 0 ? (
                    <Text style={{ color: Colors.textSecondary }}>{t("reservationWorkflow.calendar.emptyDay")}</Text>
                  ) : (
                    selectedDayReservations.map((reservation) => (
                      <Pressable key={reservation.reservationId} accessibilityRole="button" onPress={() => openReservation(reservation.reservationId)} style={[styles.selectedRow, { borderColor: Colors.divider }]}>
                        <View style={styles.selectedRowCopy}>
                          <Text style={[styles.selectedApartment, { color: Colors.textPrimary }]}>{reservation.apartmentName}</Text>
                          <Text style={{ color: Colors.textSecondary }}>{reservation.guestCount} · {reservation.nights} {t("reservationWorkflow.common.nights")}</Text>
                        </View>
                        <ReservationStatusBadge status={reservation.status} />
                      </Pressable>
                    ))
                  )}
                </View>
                  ) : null}
                </>
              )}
            </View>
            <Text style={[styles.listTitle, { color: Colors.textPrimary }]}>{t("reservationWorkflow.list.results")}</Text>
          </View>
        }
        ListEmptyComponent={
          list.isPending ? <LoadingRows /> : list.isError ? (
            <EmptyOrErrorState icon="CircleAlert" title={t("reservationWorkflow.errors.listTitle")} description={t("reservationWorkflow.errors.listDescription")} retryLabel={t("reservationWorkflow.common.retry")} onRetry={() => void list.refetch()} />
          ) : <EmptyOrErrorState icon="CalendarX2" title={t("reservationWorkflow.list.emptyTitle")} description={t("reservationWorkflow.list.emptyDescription")} />
        }
        ListFooterComponent={
          list.isFetchingNextPage ? <View style={styles.loadingMore}><ActivityIndicator color={Colors.primary} /></View> : null
        }
        onEndReached={() => {
          if (list.hasNextPage && !list.isFetchingNextPage && !list.isFetching) {
            void list.fetchNextPage();
          }
        }}
        onEndReachedThreshold={0.35}
        refreshControl={<RefreshControl refreshing={list.isRefetching || calendar.isRefetching} onRefresh={refresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

function CalendarLegend() {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const legend: ReservationStatus[] = ["CONFIRMED", "CHECKED_IN", "CHECKED_OUT", "CANCELLED", "NO_SHOW"];
  return (
    <View style={styles.legend}>
      {legend.map((status) => <ReservationStatusBadge key={status} status={status} />)}
      <Text style={[styles.exclusiveHint, { color: Colors.textSecondary }]}>{t("reservationWorkflow.calendar.exclusiveHint")}</Text>
    </View>
  );
}

function ReservationCard({ reservation, onPress }: { reservation: ReservationDetails; onPress: () => void }) {
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={t("reservationWorkflow.list.open", { apartment: reservation.apartmentName })} onPress={onPress} style={[styles.reservationCard, { backgroundColor: Colors.background, borderColor: Colors.divider }]}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardTitleCopy}>
          <Text style={[styles.apartmentName, { color: Colors.textPrimary }]} numberOfLines={1}>{reservation.apartmentName}</Text>
          <Text style={[styles.dateText, { color: Colors.textSecondary }]}>{formatDateKey(reservation.checkInDate, i18n.language)} — {formatDateKey(reservation.checkOutDate, i18n.language)}</Text>
        </View>
        <Icon name="ChevronRight" size={22} color={Colors.tertiary} />
      </View>
      <ReservationStatusBadge status={reservation.status} />
      <View style={styles.cardDetails}>
        <Text style={{ color: Colors.textSecondary }}>{reservation.nights} {t("reservationWorkflow.common.nights")} · {reservation.guestCount} {t("reservationWorkflow.common.guests")}</Text>
        <Text style={[styles.total, { color: Colors.textPrimary }]}>{formatMoney(reservation.totalPrice, t("reservationWorkflow.common.currency"))}</Text>
      </View>
      {reservation.checkInClaimedByUserId ? (
        <View style={styles.claimRow}><Icon name="BookmarkCheck" size={16} color={Colors.primary} /><Text style={{ color: Colors.primary, fontSize: 12, fontWeight: "700" }}>{t("reservationWorkflow.list.claimed")}</Text></View>
      ) : null}
    </Pressable>
  );
}

function LoadingRows() {
  const { Colors } = useTheme();
  return <View style={styles.skeletons}>{[0, 1, 2].map((item) => <View key={item} style={[styles.skeleton, { backgroundColor: Colors.secondary }]} />)}</View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 12, flexGrow: 1 },
  headerContent: { gap: 14 },
  headingRow: { flexDirection: "row", gap: 12, alignItems: "flex-start" },
  headingCopy: { flex: 1, gap: 2 },
  title: { fontSize: 24, fontWeight: "700" },
  subtitle: { fontSize: 14, lineHeight: 20 },
  createButton: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  filterCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  filterHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  sectionTitle: { fontSize: 17, fontWeight: "700" },
  reset: { fontSize: 14, fontWeight: "700" },
  fieldLabel: { fontSize: 13, fontWeight: "700", marginTop: 3 },
  chips: { gap: 8, paddingRight: 6 },
  input: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 15 },
  periodRow: { flexDirection: "row", gap: 8 },
  periodInput: { flex: 1 },
  validation: { fontSize: 12, fontWeight: "600" },
  calendarCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  calendarHeading: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  calendarHint: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  calendarLoading: { minHeight: 120, alignItems: "center", justifyContent: "center", gap: 10 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  exclusiveHint: { width: "100%", fontSize: 12, lineHeight: 17, marginTop: 2 },
  loadMoreCalendar: { alignSelf: "flex-start", paddingVertical: 4 },
  selectedDay: { gap: 8, paddingTop: 2 },
  selectedDayTitle: { fontSize: 15, fontWeight: "700" },
  selectedRow: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "space-between", borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 9 },
  selectedRowCopy: { flex: 1, gap: 2 },
  selectedApartment: { fontWeight: "700" },
  listTitle: { fontSize: 18, fontWeight: "700", marginTop: 2 },
  reservationCard: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10 },
  cardTopRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  cardTitleCopy: { flex: 1, gap: 3 },
  apartmentName: { fontSize: 17, fontWeight: "700" },
  dateText: { fontSize: 13, lineHeight: 18 },
  cardDetails: { flexDirection: "row", gap: 8, justifyContent: "space-between", alignItems: "center" },
  total: { fontWeight: "700" },
  claimRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  skeletons: { gap: 12 },
  skeleton: { height: 146, borderRadius: 16 },
  loadingMore: { paddingVertical: 8, alignItems: "center" },
});
