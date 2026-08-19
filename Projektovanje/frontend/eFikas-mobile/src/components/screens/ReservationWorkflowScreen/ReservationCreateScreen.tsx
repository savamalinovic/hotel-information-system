import { ReservationAvailabilityFilters } from "@/src/api/services/reservationWorkflowService";
import { Icon } from "@/src/components/atoms/Icon/Icon";
import { EmptyOrErrorState, FilterChip, PrimaryButton } from "@/src/components/screens/ReservationWorkflowScreen/ReservationWorkflowUi";
import {
  formatDateKey,
  formatMoney,
  getLocalDateKey,
  getNights,
  isStayPeriodValid,
  isValidDecimalAmount,
  normalizeDecimalInput,
} from "@/src/components/screens/ReservationWorkflowScreen/reservationWorkflowHelpers";
import { useApartmentTypes } from "@/src/hooks/useApartmentCatalog";
import { useCreateReservation, useReservationAvailability } from "@/src/hooks/useReservationWorkflows";
import { useTheme } from "@/src/providers/ThemeProvider";
import { AvailableApartment, ReservationCreateRequest } from "@/src/types/types";
import { getUserFacingErrorMessage } from "@/src/util/apiError";
import { isAxiosError } from "axios";
import { router } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Calendar } from "react-native-calendars";
import { SafeAreaView } from "react-native-safe-area-context";

type FormStep = 1 | 2 | 3;
type DateField = "checkIn" | "checkOut";

export default function ReservationCreateScreen() {
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();
  const today = getLocalDateKey();
  const [step, setStep] = useState<FormStep>(1);
  const [dateField, setDateField] = useState<DateField>("checkIn");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guestCountText, setGuestCountText] = useState("1");
  const [apartmentTypeId, setApartmentTypeId] = useState<number>();
  const [selectedApartment, setSelectedApartment] = useState<AvailableApartment>();
  const [nightlyRate, setNightlyRate] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState("");

  const guestCount = Number(guestCountText);
  const hasValidGuests = Number.isInteger(guestCount) && guestCount > 0;
  const hasValidDates = isStayPeriodValid(checkInDate, checkOutDate);
  const isPastCheckIn = Boolean(checkInDate) && checkInDate < today;
  const availabilityFilters = useMemo<Omit<ReservationAvailabilityFilters, "page">>(
    () => ({
      checkInDate,
      checkOutDate,
      guestCount: hasValidGuests ? guestCount : 1,
      size: 20,
      sort: "name,asc",
      ...(apartmentTypeId ? { apartmentTypeId } : {}),
    }),
    [apartmentTypeId, checkInDate, checkOutDate, guestCount, hasValidGuests]
  );
  const availability = useReservationAvailability(availabilityFilters, hasValidDates && !isPastCheckIn && hasValidGuests);
  const apartmentTypes = useApartmentTypes();
  const createReservation = useCreateReservation();
  const normalizedNightlyRate = normalizeDecimalInput(nightlyRate);
  const hasCustomRate = normalizedNightlyRate.length > 0;

  useEffect(() => {
    setSelectedApartment(undefined);
  }, [apartmentTypeId, checkInDate, checkOutDate, guestCount]);

  const validateStay = () => {
    if (isPastCheckIn) {
      setFormError(t("reservationWorkflow.validation.pastCheckIn"));
      return false;
    }
    if (!hasValidDates) {
      setFormError(t("reservationWorkflow.validation.period"));
      return false;
    }
    if (!hasValidGuests) {
      setFormError(t("reservationWorkflow.validation.guests"));
      return false;
    }
    setFormError("");
    return true;
  };

  const selectDate = (dateString: string) => {
    if (dateField === "checkIn") {
      setCheckInDate(dateString);
      if (!checkOutDate || !isStayPeriodValid(dateString, checkOutDate)) {
        setCheckOutDate("");
        setDateField("checkOut");
      }
      return;
    }

    if (checkInDate && isStayPeriodValid(checkInDate, dateString)) {
      setCheckOutDate(dateString);
    } else {
      setFormError(t("reservationWorkflow.validation.period"));
    }
  };

  const continueToAvailability = () => {
    if (validateStay()) {
      setStep(2);
    }
  };

  const submit = () => {
    if (!selectedApartment) {
      setFormError(t("reservationWorkflow.validation.chooseApartment"));
      return;
    }
    if (hasCustomRate && !isValidDecimalAmount(normalizedNightlyRate)) {
      setFormError(t("reservationWorkflow.validation.nightlyRate"));
      return;
    }
    if (note.length > 256) {
      setFormError(t("reservationWorkflow.validation.note"));
      return;
    }

    const request: ReservationCreateRequest = {
      apartmentId: selectedApartment.apartmentId,
      checkInDate,
      checkOutDate,
      guestCount,
      ...(hasCustomRate ? { nightlyRate: normalizedNightlyRate } : {}),
      ...(note.trim() ? { note: note.trim() } : {}),
    };

    setFormError("");
    createReservation.mutate(request, {
      onSuccess: (reservation) => {
        router.replace({ pathname: "/(home)/reservations/[id]", params: { id: String(reservation.reservationId) } });
      },
      onError: (error) => {
        if (isAxiosError(error) && error.response?.status === 409) {
          setStep(2);
          setSelectedApartment(undefined);
          setFormError(t("reservationWorkflow.errors.availabilityChanged"));
          void availability.refetch();
          return;
        }
        setFormError(getUserFacingErrorMessage(error, t("reservationWorkflow.errors.create")));
      },
    });
  };

  return (
    <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
      <KeyboardAvoidingView behavior={Platform.select({ ios: "padding", default: undefined })} style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Text style={[styles.title, { color: Colors.textPrimary }]}>{t("reservationWorkflow.create.title")}</Text>
          <Text style={[styles.subtitle, { color: Colors.textSecondary }]}>{t("reservationWorkflow.create.subtitle")}</Text>
          <StepIndicator currentStep={step} />
          {formError ? <View style={[styles.errorBox, { borderColor: Colors.error }]}><Icon name="CircleAlert" size={18} color={Colors.error} /><Text style={{ color: Colors.error, flex: 1 }}>{formError}</Text></View> : null}
          {step === 1 ? (
            <StayStep
              checkInDate={checkInDate}
              checkOutDate={checkOutDate}
              guestCountText={guestCountText}
              apartmentTypeId={apartmentTypeId}
              dateField={dateField}
              today={today}
              onDateFieldChange={setDateField}
              onDateSelect={selectDate}
              onCheckInChange={setCheckInDate}
              onCheckOutChange={setCheckOutDate}
              onGuestsChange={setGuestCountText}
              onTypeChange={setApartmentTypeId}
              apartmentTypes={apartmentTypes.data?.content ?? []}
              typesLoading={apartmentTypes.isPending}
              onContinue={continueToAvailability}
            />
          ) : null}
          {step === 2 ? (
            <AvailabilityStep
              apartments={availability.apartments}
              selectedApartmentId={selectedApartment?.apartmentId}
              isLoading={availability.isPending}
              isError={availability.isError}
              hasNextPage={availability.hasNextPage}
              isLoadingMore={availability.isFetchingNextPage}
              onRetry={() => void availability.refetch()}
              onLoadMore={() => void availability.fetchNextPage()}
              onSelect={setSelectedApartment}
              onBack={() => setStep(1)}
              onContinue={() => selectedApartment && setStep(3)}
            />
          ) : null}
          {step === 3 && selectedApartment ? (
            <ConfirmationStep
              apartment={selectedApartment}
              checkInDate={checkInDate}
              checkOutDate={checkOutDate}
              guestCount={guestCount}
              nightlyRate={nightlyRate}
              note={note}
              locale={i18n.language}
              isSubmitting={createReservation.isPending}
              onNightlyRateChange={setNightlyRate}
              onNoteChange={setNote}
              onBack={() => setStep(2)}
              onSubmit={submit}
            />
          ) : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function StepIndicator({ currentStep }: { currentStep: FormStep }) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  return <View style={styles.steps}>{([1, 2, 3] as FormStep[]).map((step) => <View key={step} style={styles.stepItem}><View style={[styles.stepCircle, { backgroundColor: step <= currentStep ? Colors.primary : Colors.divider }]}><Text style={[styles.stepNumber, { color: step <= currentStep ? Colors.textLight : Colors.textSecondary }]}>{step}</Text></View><Text style={[styles.stepLabel, { color: Colors.textSecondary }]}>{t(`reservationWorkflow.create.steps.${step}`)}</Text></View>)}</View>;
}

function StayStep({
  checkInDate, checkOutDate, guestCountText, apartmentTypeId, dateField, today, onDateFieldChange, onDateSelect, onCheckInChange, onCheckOutChange, onGuestsChange, onTypeChange, apartmentTypes, typesLoading, onContinue,
}: {
  checkInDate: string; checkOutDate: string; guestCountText: string; apartmentTypeId?: number; dateField: DateField; today: string;
  onDateFieldChange: (value: DateField) => void; onDateSelect: (value: string) => void; onCheckInChange: (value: string) => void; onCheckOutChange: (value: string) => void; onGuestsChange: (value: string) => void; onTypeChange: (value?: number) => void;
  apartmentTypes: { apartmentTypeId: number; name: string }[]; typesLoading: boolean; onContinue: () => void;
}) {
  const { Colors } = useTheme();
  const { t, i18n } = useTranslation();
  return <View style={styles.stepContent}>
    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("reservationWorkflow.create.stayTitle")}</Text>
    <View style={styles.dateButtons}>
      <DateButton label={t("reservationWorkflow.create.checkIn")} value={checkInDate ? formatDateKey(checkInDate, i18n.language) : t("reservationWorkflow.create.chooseDate")} selected={dateField === "checkIn"} onPress={() => onDateFieldChange("checkIn")} />
      <DateButton label={t("reservationWorkflow.create.checkOut")} value={checkOutDate ? formatDateKey(checkOutDate, i18n.language) : t("reservationWorkflow.create.chooseDate")} selected={dateField === "checkOut"} onPress={() => onDateFieldChange("checkOut")} />
    </View>
    <Calendar
      minDate={today}
      markedDates={{
        ...(checkInDate ? { [checkInDate]: { selected: true, selectedColor: Colors.primary } } : {}),
        ...(checkOutDate ? { [checkOutDate]: { selected: true, selectedColor: Colors.accent } } : {}),
      }}
      onDayPress={(day) => onDateSelect(day.dateString)}
      theme={{ calendarBackground: Colors.background, dayTextColor: Colors.textPrimary, monthTextColor: Colors.textPrimary, arrowColor: Colors.primary, todayTextColor: Colors.primary }}
    />
    <Text style={[styles.fieldLabel, { color: Colors.textSecondary }]}>{t("reservationWorkflow.create.guestCount")}</Text>
    <TextInput value={guestCountText} onChangeText={onGuestsChange} keyboardType="number-pad" accessibilityLabel={t("reservationWorkflow.create.guestCount")} style={[styles.input, { color: Colors.textPrimary, borderColor: Colors.divider, backgroundColor: Colors.background }]} />
    <Text style={[styles.fieldLabel, { color: Colors.textSecondary }]}>{t("reservationWorkflow.create.type")}</Text>
    {typesLoading ? <ActivityIndicator color={Colors.primary} /> : <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}><FilterChip label={t("reservationWorkflow.create.allTypes")} selected={!apartmentTypeId} onPress={() => onTypeChange(undefined)} />{apartmentTypes.map((type) => <FilterChip key={type.apartmentTypeId} label={type.name} selected={apartmentTypeId === type.apartmentTypeId} onPress={() => onTypeChange(type.apartmentTypeId)} />)}</ScrollView>}
    <PrimaryButton label={t("reservationWorkflow.create.searchAvailability")} onPress={onContinue} icon="ChevronRight" />
  </View>;
}

function AvailabilityStep({ apartments, selectedApartmentId, isLoading, isError, hasNextPage, isLoadingMore, onRetry, onLoadMore, onSelect, onBack, onContinue }: {
  apartments: AvailableApartment[]; selectedApartmentId?: number; isLoading: boolean; isError: boolean; hasNextPage: boolean; isLoadingMore: boolean; onRetry: () => void; onLoadMore: () => void; onSelect: (value: AvailableApartment) => void; onBack: () => void; onContinue: () => void;
}) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  return <View style={styles.stepContent}>
    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("reservationWorkflow.create.availabilityTitle")}</Text>
    {isLoading ? <View style={styles.centered}><ActivityIndicator size="large" color={Colors.primary} /><Text style={{ color: Colors.textSecondary }}>{t("reservationWorkflow.create.loadingAvailability")}</Text></View> : isError ? <EmptyOrErrorState icon="CircleAlert" title={t("reservationWorkflow.errors.availabilityTitle")} description={t("reservationWorkflow.errors.availabilityDescription")} retryLabel={t("reservationWorkflow.common.retry")} onRetry={onRetry} /> : apartments.length === 0 ? <EmptyOrErrorState icon="SearchX" title={t("reservationWorkflow.create.emptyAvailabilityTitle")} description={t("reservationWorkflow.create.emptyAvailabilityDescription")} /> : <View style={styles.availableList}>{apartments.map((apartment) => <AvailableApartmentCard key={apartment.apartmentId} apartment={apartment} selected={apartment.apartmentId === selectedApartmentId} onPress={() => onSelect(apartment)} />)}{hasNextPage ? <Pressable accessibilityRole="button" onPress={onLoadMore} disabled={isLoadingMore}><Text style={{ color: Colors.primary, fontWeight: "700" }}>{isLoadingMore ? t("reservationWorkflow.common.loading") : t("reservationWorkflow.create.loadMore")}</Text></Pressable> : null}</View>}
    <View style={styles.actionRow}><SecondaryButton label={t("reservationWorkflow.common.back")} onPress={onBack} /><View style={styles.actionGrow}><PrimaryButton label={t("reservationWorkflow.common.continue")} onPress={onContinue} disabled={!selectedApartmentId} icon="ChevronRight" /></View></View>
  </View>;
}

function ConfirmationStep({ apartment, checkInDate, checkOutDate, guestCount, nightlyRate, note, locale, isSubmitting, onNightlyRateChange, onNoteChange, onBack, onSubmit }: {
  apartment: AvailableApartment; checkInDate: string; checkOutDate: string; guestCount: number; nightlyRate: string; note: string; locale: string; isSubmitting: boolean; onNightlyRateChange: (value: string) => void; onNoteChange: (value: string) => void; onBack: () => void; onSubmit: () => void;
}) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  return <View style={styles.stepContent}>
    <Text style={[styles.sectionTitle, { color: Colors.textPrimary }]}>{t("reservationWorkflow.create.confirmTitle")}</Text>
    <View style={[styles.summaryCard, { borderColor: Colors.divider, backgroundColor: Colors.background }]}>
      <Text style={[styles.summaryApartment, { color: Colors.textPrimary }]}>{apartment.name}</Text>
      <Text style={{ color: Colors.textSecondary }}>{apartment.address}</Text>
      <Text style={{ color: Colors.textSecondary }}>{formatDateKey(checkInDate, locale)} — {formatDateKey(checkOutDate, locale)}</Text>
      <Text style={{ color: Colors.textSecondary }}>{getNights(checkInDate, checkOutDate)} {t("reservationWorkflow.common.nights")} · {guestCount} {t("reservationWorkflow.common.guests")}</Text>
      <Text style={{ color: Colors.textSecondary }}>{t("reservationWorkflow.create.defaultNightlyRate")}: {" "}{formatMoney(apartment.defaultNightlyRate, t("reservationWorkflow.common.currency"))}</Text>
    </View>
    <Text style={[styles.fieldLabel, { color: Colors.textSecondary }]}>{t("reservationWorkflow.create.overrideRate")}</Text>
    <TextInput value={nightlyRate} onChangeText={onNightlyRateChange} keyboardType="decimal-pad" placeholder={t("reservationWorkflow.create.overridePlaceholder")} placeholderTextColor={Colors.tertiary} accessibilityLabel={t("reservationWorkflow.create.overrideRate")} style={[styles.input, { color: Colors.textPrimary, borderColor: Colors.divider, backgroundColor: Colors.background }]} />
    <Text style={[styles.helper, { color: Colors.textSecondary }]}>{t("reservationWorkflow.create.overrideHint")}</Text>
    <Text style={[styles.fieldLabel, { color: Colors.textSecondary }]}>{t("reservationWorkflow.create.note")}</Text>
    <TextInput value={note} onChangeText={onNoteChange} maxLength={256} multiline accessibilityLabel={t("reservationWorkflow.create.note")} style={[styles.input, styles.noteInput, { color: Colors.textPrimary, borderColor: Colors.divider, backgroundColor: Colors.background }]} />
    <Text style={[styles.helper, { color: Colors.textSecondary }]}>{note.length}/256</Text>
    <View style={styles.actionRow}><SecondaryButton label={t("reservationWorkflow.common.back")} onPress={onBack} /><View style={styles.actionGrow}><PrimaryButton label={t("reservationWorkflow.create.create")} onPress={onSubmit} loading={isSubmitting} icon="Save" /></View></View>
  </View>;
}

function DateButton({ label, value, selected, onPress }: { label: string; value: string; selected: boolean; onPress: () => void }) {
  const { Colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.dateButton, { borderColor: selected ? Colors.primary : Colors.divider, backgroundColor: Colors.background }]}><Text style={{ color: Colors.textSecondary, fontSize: 12, fontWeight: "700" }}>{label}</Text><Text style={{ color: Colors.textPrimary, fontWeight: "700" }} numberOfLines={1}>{value}</Text></Pressable>;
}

function AvailableApartmentCard({ apartment, selected, onPress }: { apartment: AvailableApartment; selected: boolean; onPress: () => void }) {
  const { Colors } = useTheme();
  const { t } = useTranslation();
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} accessibilityLabel={apartment.name} onPress={onPress} style={[styles.availableCard, { borderColor: selected ? Colors.primary : Colors.divider, backgroundColor: Colors.background }]}><View style={styles.availableCopy}><Text style={[styles.summaryApartment, { color: Colors.textPrimary }]}>{apartment.name}</Text><Text style={{ color: Colors.textSecondary }}>{apartment.apartmentTypeName} · {apartment.capacity} {t("reservationWorkflow.common.guests")}</Text><Text style={{ color: Colors.textSecondary }}>{formatMoney(apartment.defaultNightlyRate, t("reservationWorkflow.common.currency"))}</Text></View><Icon name={selected ? "CircleCheck" : "Circle"} size={24} color={selected ? Colors.primary : Colors.tertiary} /></Pressable>;
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { Colors } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={[styles.secondaryButton, { borderColor: Colors.divider }]}><Text style={{ color: Colors.textPrimary, fontWeight: "700" }}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 16, paddingBottom: 32, gap: 12 }, title: { fontSize: 24, fontWeight: "700" }, subtitle: { fontSize: 14, lineHeight: 20 }, steps: { flexDirection: "row", justifyContent: "space-between", gap: 8, marginVertical: 4 }, stepItem: { flex: 1, alignItems: "center", gap: 4 }, stepCircle: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" }, stepNumber: { fontSize: 13, fontWeight: "700" }, stepLabel: { fontSize: 11, fontWeight: "600", textAlign: "center" }, errorBox: { borderWidth: 1, borderRadius: 12, padding: 11, flexDirection: "row", gap: 8, alignItems: "center" }, stepContent: { gap: 10 }, sectionTitle: { fontSize: 18, fontWeight: "700" }, dateButtons: { flexDirection: "row", gap: 8 }, dateButton: { flex: 1, minHeight: 62, borderWidth: 1, borderRadius: 12, padding: 10, gap: 4 }, fieldLabel: { fontSize: 13, fontWeight: "700", marginTop: 2 }, input: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, fontSize: 15 }, noteInput: { minHeight: 94, textAlignVertical: "top", paddingTop: 11 }, chips: { gap: 8, paddingRight: 4 }, centered: { minHeight: 160, alignItems: "center", justifyContent: "center", gap: 12 }, availableList: { gap: 9 }, availableCard: { borderWidth: 1, borderRadius: 14, padding: 13, flexDirection: "row", alignItems: "center", gap: 12 }, availableCopy: { flex: 1, gap: 3 }, summaryCard: { borderWidth: 1, borderRadius: 14, padding: 14, gap: 5 }, summaryApartment: { fontSize: 16, fontWeight: "700" }, helper: { fontSize: 12, lineHeight: 17 }, actionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 5 }, actionGrow: { flex: 1 }, secondaryButton: { minHeight: 46, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
});
