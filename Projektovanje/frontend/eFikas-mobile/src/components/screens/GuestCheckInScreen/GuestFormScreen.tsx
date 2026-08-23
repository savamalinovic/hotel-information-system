import { ActionButton, ChoiceChip, InputField, ScreenState, Section } from "@/src/components/screens/GuestCheckInScreen/GuestCheckInUi";
import { GuestFormValues, getGuestFormValues, getTodayDateKey, toGuestRequest, validateGuest } from "@/src/components/screens/GuestCheckInScreen/guestCheckInHelpers";
import { useAddReservationGuest, useGuestDetail, useUpdateReservationGuest } from "@/src/hooks/useGuestCheckIn";
import { useProfile } from "@/src/hooks/useProfile";
import { useReservationDetail } from "@/src/hooks/useReservationWorkflows";
import { useTheme } from "@/src/providers/ThemeProvider";
import { ApiErrorResponse } from "@/src/types/types";
import { getUserFacingErrorMessage } from "@/src/util/apiError";
import { InvalidRouteState } from "@/src/components/screens/InvalidRouteState";
import { parsePositiveId } from "@/src/util/idParams";
import { isAxiosError } from "axios";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

export default function GuestFormScreen() {
  const { id, guestId: guestIdParam, primaryGuest: primaryGuestParam } = useLocalSearchParams<{
    id?: string | string[];
    guestId?: string | string[];
    primaryGuest?: string | string[];
  }>();
  const reservationId = parsePositiveId(id);
  const guestId = parsePositiveId(guestIdParam);
  const hasGuestId = guestIdParam !== undefined;
  const invalidGuestId = hasGuestId && guestId === null;
  const editing = guestId !== null;
  const { Colors } = useTheme();
  const { t } = useTranslation();
  const { profile } = useProfile();
  const reservation = useReservationDetail(reservationId);
  const guest = useGuestDetail(guestId);
  const addGuest = useAddReservationGuest();
  const updateGuest = useUpdateReservationGuest();
  const [values, setValues] = useState<GuestFormValues>(() => getGuestFormValues());
  const [primaryGuest, setPrimaryGuest] = useState(primaryGuestParam === "true");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (editing && guest.data) {
      setValues(getGuestFormValues(guest.data));
    }
  }, [editing, guest.data]);

  const setValue = <Key extends keyof GuestFormValues>(key: Key, value: GuestFormValues[Key]) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  if (reservationId === null || invalidGuestId) {
    return <InvalidRouteState fallbackHref="/(home)/reservations" />;
  }

  if (reservation.isPending || (editing && guest.isPending)) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><ScreenState title={t("guestCheckIn.common.loading")} loading /></SafeAreaView>;
  }

  if (reservation.isError || !reservation.data || (editing && (guest.isError || !guest.data))) {
    return <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}><ScreenState title={t("guestCheckIn.errors.guestUnavailable")} onRetry={() => { void reservation.refetch(); void guest.refetch(); }} /></SafeAreaView>;
  }

  const canEdit = profile?.role === "AGENT" && reservation.data.status === "CONFIRMED";
  const wasPrimaryGuest = primaryGuestParam === "true";
  const validationMessage = (error: unknown, fallback: string) => {
    if (isAxiosError<ApiErrorResponse>(error) && error.response?.data.violations.length) {
      return error.response.data.violations
        .map((violation) => `${getFieldLabel(violation.field, t)}: ${violation.message}`)
        .join("\n");
    }
    return getUserFacingErrorMessage(error, fallback);
  };
  const save = () => {
    const validationErrors = validateGuest(values, reservation.data.checkInDate, getTodayDateKey());
    if (validationErrors.length > 0) {
      setErrorMessage(validationErrors.map((key) => t(`guestCheckIn.validation.${key}`)).join("\n"));
      return;
    }

    const request = toGuestRequest(values);
    if (guestId !== null) {
      updateGuest.mutate(
        { reservationId, guestId, request: { guest: request, primaryGuest } },
        {
          onSuccess: () => router.back(),
          onError: (error) => setErrorMessage(validationMessage(error, t("guestCheckIn.errors.updateGuest"))),
        }
      );
      return;
    }

    addGuest.mutate(
      { reservationId, request: { existingGuestId: null, guest: request, primaryGuest } },
      {
        onSuccess: () => router.back(),
        onError: (error) => {
          const duplicate = isAxiosError(error) && error.response?.status === 409;
          setErrorMessage(duplicate ? t("guestCheckIn.errors.duplicateGuest") : validationMessage(error, t("guestCheckIn.errors.addGuest")));
        },
      }
    );
  };

  const mutationPending = addGuest.isPending || updateGuest.isPending;
  return (
    <SafeAreaView edges={["bottom"]} style={[styles.screen, { backgroundColor: Colors.screenBackground }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.heading}><Text style={[styles.title, { color: Colors.textPrimary }]}>{editing ? t("guestCheckIn.form.editTitle") : t("guestCheckIn.form.addTitle")}</Text><Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.documentHintNull")}</Text></View>
          {errorMessage ? <View style={[styles.errorBox, { borderColor: Colors.error }]}><Text style={{ color: Colors.error }}>{errorMessage}</Text>{!editing && isAxiosError(addGuest.error) && addGuest.error.response?.status === 409 ? <ActionButton label={t("guestCheckIn.form.searchExisting")} onPress={() => router.replace({ pathname: "/reservations/[id]/guest-search", params: { id: String(reservationId) } })} variant="secondary" icon="Search" /> : null}</View> : null}
          {!canEdit ? <View style={[styles.readOnly, { borderColor: Colors.divider }]}><Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.guest.locked")}</Text></View> : null}
          <Section title={t("guestCheckIn.form.identity")}>
            <InputField label={t("guestCheckIn.form.citizenId")} value={values.citizenId} onChangeText={(value) => setValue("citizenId", value)} required maxLength={30} />
            <InputField label={t("guestCheckIn.form.name")} value={values.name} onChangeText={(value) => setValue("name", value)} required maxLength={50} />
            <InputField label={t("guestCheckIn.form.surname")} value={values.surname} onChangeText={(value) => setValue("surname", value)} required maxLength={50} />
            <Text style={[styles.choiceLabel, { color: Colors.textPrimary }]}>{t("guestCheckIn.form.gender")} *</Text>
            <View style={styles.choices}><ChoiceChip label={t("guestCheckIn.form.male")} selected={values.gender === "Male"} onPress={() => setValue("gender", "Male")} /><ChoiceChip label={t("guestCheckIn.form.female")} selected={values.gender === "Female"} onPress={() => setValue("gender", "Female")} /></View>
            <InputField label={t("guestCheckIn.form.phone")} value={values.phoneNumber} onChangeText={(value) => setValue("phoneNumber", value)} keyboardType="phone-pad" maxLength={30} />
          </Section>
          <Section title={t("guestCheckIn.form.birth")}>
            <InputField label={t("guestCheckIn.form.birthDate")} value={values.birthDate} onChangeText={(value) => setValue("birthDate", value)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" required maxLength={10} />
            <InputField label={t("guestCheckIn.form.birthPlace")} value={values.birthPlace} onChangeText={(value) => setValue("birthPlace", value)} required maxLength={50} />
            <InputField label={t("guestCheckIn.form.birthCountry")} value={values.birthCountry} onChangeText={(value) => setValue("birthCountry", value)} required maxLength={50} />
            <InputField label={t("guestCheckIn.form.address")} value={values.address} onChangeText={(value) => setValue("address", value)} required maxLength={100} />
          </Section>
          <Section title={t("guestCheckIn.form.residency")}>
            <View style={styles.choices}><ChoiceChip label={t("guestCheckIn.guest.domestic")} selected={values.local} onPress={() => setValue("local", true)} /><ChoiceChip label={t("guestCheckIn.guest.foreign")} selected={!values.local} onPress={() => setValue("local", false)} /></View>
            {values.local ? <InputField label={t("guestCheckIn.form.birthMunicipality")} value={values.birthMunicipality} onChangeText={(value) => setValue("birthMunicipality", value)} required maxLength={50} /> : <ForeignFields values={values} setValue={setValue} />}
          </Section>
          <Section title={t("guestCheckIn.form.reservationGuest")}>
            <View style={styles.choices}><ChoiceChip label={t("guestCheckIn.form.primaryYes")} selected={primaryGuest} onPress={() => setPrimaryGuest(true)} />{!wasPrimaryGuest ? <ChoiceChip label={t("guestCheckIn.form.primaryNo")} selected={!primaryGuest} onPress={() => setPrimaryGuest(false)} /> : null}</View>
            {wasPrimaryGuest ? <Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.primaryLocked")}</Text> : null}
            {editing ? <Text style={{ color: Colors.textSecondary }}>{t("guestCheckIn.profileHint")}</Text> : null}
          </Section>
          <ActionButton label={editing ? t("guestCheckIn.form.save") : t("guestCheckIn.form.add")} onPress={save} disabled={!canEdit} loading={mutationPending} icon="Save" />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function getFieldLabel(field: string, t: (key: string) => string) {
  const labels: Record<string, string> = {
    citizenId: t("guestCheckIn.form.citizenId"),
    name: t("guestCheckIn.form.name"),
    surname: t("guestCheckIn.form.surname"),
    phoneNumber: t("guestCheckIn.form.phone"),
    birthDate: t("guestCheckIn.form.birthDate"),
    birthPlace: t("guestCheckIn.form.birthPlace"),
    birthMunicipality: t("guestCheckIn.form.birthMunicipality"),
    birthCountry: t("guestCheckIn.form.birthCountry"),
    address: t("guestCheckIn.form.address"),
    citizenship: t("guestCheckIn.form.citizenship"),
    passportNumber: t("guestCheckIn.form.passportNumber"),
    passportIssuedDate: t("guestCheckIn.form.passportIssuedDate"),
    entryDate: t("guestCheckIn.form.entryDate"),
    entryPlace: t("guestCheckIn.form.entryPlace"),
    permittedResidenceDate: t("guestCheckIn.form.permittedResidenceDate"),
  };
  return labels[field] ?? field;
}

function ForeignFields({ values, setValue }: { values: GuestFormValues; setValue: <Key extends keyof GuestFormValues>(key: Key, value: GuestFormValues[Key]) => void }) {
  const { t } = useTranslation();
  return <View style={styles.foreignFields}>
    <InputField label={t("guestCheckIn.form.citizenship")} value={values.citizenship} onChangeText={(value) => setValue("citizenship", value)} required maxLength={50} />
    <InputField label={t("guestCheckIn.form.passportNumber")} value={values.passportNumber} onChangeText={(value) => setValue("passportNumber", value)} required maxLength={30} />
    <InputField label={t("guestCheckIn.form.passportIssuedDate")} value={values.passportIssuedDate} onChangeText={(value) => setValue("passportIssuedDate", value)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" required maxLength={10} />
    <InputField label={t("guestCheckIn.form.entryDate")} value={values.entryDate} onChangeText={(value) => setValue("entryDate", value)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" required maxLength={10} />
    <InputField label={t("guestCheckIn.form.entryPlace")} value={values.entryPlace} onChangeText={(value) => setValue("entryPlace", value)} required maxLength={50} />
    <InputField label={t("guestCheckIn.form.permittedResidenceDate")} value={values.permittedResidenceDate} onChangeText={(value) => setValue("permittedResidenceDate", value)} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" maxLength={10} />
    <InputField label={t("guestCheckIn.form.visaType")} value={values.visaType} onChangeText={(value) => setValue("visaType", value)} maxLength={30} />
    <InputField label={t("guestCheckIn.form.visaNumber")} value={values.visaNumber} onChangeText={(value) => setValue("visaNumber", value)} maxLength={30} />
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  heading: { gap: 3 },
  title: { fontSize: 24, fontWeight: "800" },
  errorBox: { borderWidth: 1, borderRadius: 12, padding: 11, gap: 9 },
  readOnly: { borderWidth: 1, borderRadius: 12, padding: 11 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choiceLabel: { fontSize: 14, fontWeight: "700" },
  foreignFields: { gap: 10 },
});
