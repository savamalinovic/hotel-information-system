import {
  ApartmentDetails,
  Guest,
  GuestRequest,
  ReservationDetails,
  ReservationGuest,
} from "@/src/types/types";

export type GuestFormValues = {
  citizenId: string;
  local: boolean;
  name: string;
  surname: string;
  gender: "Male" | "Female";
  phoneNumber: string;
  birthDate: string;
  birthPlace: string;
  birthMunicipality: string;
  birthCountry: string;
  address: string;
  citizenship: string;
  passportNumber: string;
  passportIssuedDate: string;
  visaType: string;
  visaNumber: string;
  permittedResidenceDate: string;
  entryDate: string;
  entryPlace: string;
};

export type GuestValidationKey =
  | "required"
  | "date"
  | "birthDate"
  | "citizenId"
  | "name"
  | "surname"
  | "phone"
  | "birthPlace"
  | "birthMunicipality"
  | "birthCountry"
  | "address"
  | "citizenship"
  | "passportNumber"
  | "visa"
  | "entryPlace"
  | "passportDate"
  | "entryDate"
  | "permittedResidence";

export type ReadinessCheck = {
  key: "confirmed" | "stayWindow" | "guestCount" | "primary" | "guestFields" | "apartment";
  passed: boolean;
};

export const getTodayDateKey = () => {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};

const emptyToNull = (value: string) => {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
};

const asFormValues = (guest?: Guest): GuestFormValues => ({
  citizenId: guest?.citizenId ?? "",
  local: guest?.local ?? true,
  name: guest?.name ?? "",
  surname: guest?.surname ?? "",
  gender: guest?.gender ?? "Male",
  phoneNumber: guest?.phoneNumber ?? "",
  birthDate: guest?.birthDate ?? "",
  birthPlace: guest?.birthPlace ?? "",
  birthMunicipality: guest?.birthMunicipality ?? "",
  birthCountry: guest?.birthCountry ?? "",
  address: guest?.address ?? "",
  citizenship: guest?.citizenship ?? "",
  passportNumber: guest?.passportNumber ?? "",
  passportIssuedDate: guest?.passportIssuedDate ?? "",
  visaType: guest?.visaType ?? "",
  visaNumber: guest?.visaNumber ?? "",
  permittedResidenceDate: guest?.permittedResidenceDate ?? "",
  entryDate: guest?.entryDate ?? "",
  entryPlace: guest?.entryPlace ?? "",
});

export const getGuestFormValues = asFormValues;

export const toGuestRequest = (values: GuestFormValues): GuestRequest => ({
  citizenId: values.citizenId.trim(),
  local: values.local,
  personalDocumentUrl: null,
  name: values.name.trim(),
  surname: values.surname.trim(),
  gender: values.gender,
  phoneNumber: emptyToNull(values.phoneNumber),
  birthDate: values.birthDate.trim(),
  birthPlace: values.birthPlace.trim(),
  birthMunicipality: values.local ? emptyToNull(values.birthMunicipality) : null,
  birthCountry: values.birthCountry.trim(),
  address: values.address.trim(),
  citizenship: values.local ? null : emptyToNull(values.citizenship),
  passportNumber: values.local ? null : emptyToNull(values.passportNumber),
  passportIssuedDate: values.local ? null : emptyToNull(values.passportIssuedDate),
  visaType: values.local ? null : emptyToNull(values.visaType),
  visaNumber: values.local ? null : emptyToNull(values.visaNumber),
  permittedResidenceDate: values.local ? null : emptyToNull(values.permittedResidenceDate),
  entryDate: values.local ? null : emptyToNull(values.entryDate),
  entryPlace: values.local ? null : emptyToNull(values.entryPlace),
});

const isValidDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
};

const hasLengthAtMost = (value: string, maximum: number) => value.trim().length <= maximum;

export const validateGuest = (
  values: GuestFormValues,
  checkInDate: string,
  today: string
): GuestValidationKey[] => {
  const request = toGuestRequest(values);
  const errors: GuestValidationKey[] = [];
  const add = (condition: boolean, key: GuestValidationKey) => {
    if (condition && !errors.includes(key)) {
      errors.push(key);
    }
  };

  add(!request.citizenId || !hasLengthAtMost(request.citizenId, 30), "citizenId");
  add(!request.name || !hasLengthAtMost(request.name, 50), "name");
  add(!request.surname || !hasLengthAtMost(request.surname, 50), "surname");
  add(!hasLengthAtMost(request.phoneNumber ?? "", 30), "phone");
  add(!isValidDate(request.birthDate), "date");
  add(isValidDate(request.birthDate) && request.birthDate >= today, "birthDate");
  add(!request.birthPlace || !hasLengthAtMost(request.birthPlace, 50), "birthPlace");
  add(!request.birthCountry || !hasLengthAtMost(request.birthCountry, 50), "birthCountry");
  add(!request.address || !hasLengthAtMost(request.address, 100), "address");

  if (request.local) {
    add(!request.birthMunicipality || !hasLengthAtMost(request.birthMunicipality, 50), "birthMunicipality");
  } else {
    add(!request.citizenship || !hasLengthAtMost(request.citizenship, 50), "citizenship");
    add(!request.passportNumber || !hasLengthAtMost(request.passportNumber, 30), "passportNumber");
    add(!request.passportIssuedDate || !isValidDate(request.passportIssuedDate), "passportDate");
    add(
      request.passportIssuedDate !== null && isValidDate(request.passportIssuedDate) && request.passportIssuedDate > today,
      "passportDate"
    );
    add(!hasLengthAtMost(request.visaType ?? "", 30) || !hasLengthAtMost(request.visaNumber ?? "", 30), "visa");
    add(
      request.permittedResidenceDate !== null && !isValidDate(request.permittedResidenceDate),
      "date"
    );
    add(
      request.permittedResidenceDate !== null && request.permittedResidenceDate < checkInDate,
      "permittedResidence"
    );
    add(!request.entryDate || !isValidDate(request.entryDate) || request.entryDate > checkInDate, "entryDate");
    add(!request.entryPlace || !hasLengthAtMost(request.entryPlace, 50), "entryPlace");
  }

  return errors;
};

export const getGuestCompletenessErrors = (guest: Guest, reservation: ReservationDetails, today: string) =>
  validateGuest(getGuestFormValues(guest), reservation.checkInDate, today);

export const getReadinessChecks = (
  reservation: ReservationDetails,
  guests: ReservationGuest[],
  apartment?: ApartmentDetails,
  today = getTodayDateKey()
): ReadinessCheck[] => {
  const primaryGuests = guests.filter((reservationGuest) => reservationGuest.primaryGuest);
  const allGuestFieldsComplete = guests.every(
    (reservationGuest) => getGuestCompletenessErrors(reservationGuest.guest, reservation, today).length === 0
  );
  const apartmentReady = Boolean(apartment?.active && apartment.effectiveStatus === "READY");

  return [
    { key: "confirmed", passed: reservation.status === "CONFIRMED" },
    { key: "stayWindow", passed: today >= reservation.checkInDate && today < reservation.checkOutDate },
    { key: "guestCount", passed: guests.length === reservation.guestCount },
    { key: "primary", passed: primaryGuests.length === 1 },
    { key: "guestFields", passed: allGuestFieldsComplete },
    { key: "apartment", passed: apartmentReady },
  ];
};
