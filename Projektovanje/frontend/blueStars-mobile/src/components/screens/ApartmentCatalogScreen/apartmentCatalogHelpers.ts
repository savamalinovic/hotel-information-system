import {
  ApartmentDetails,
  ApartmentPicture,
  ApartmentUnavailability,
} from "@/src/types/types";

export const sortApartmentPictures = (pictures: ApartmentPicture[]) =>
  [...pictures].sort((left, right) => left.displayOrder - right.displayOrder);

export const filterLoadedApartments = (apartments: ApartmentDetails[], search: string) => {
  const normalizedSearch = search.trim().toLocaleLowerCase();

  if (!normalizedSearch) {
    return apartments;
  }

  return apartments.filter((apartment) =>
    [apartment.name, apartment.address]
      .some((value) => value.toLocaleLowerCase().includes(normalizedSearch))
  );
};

export const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getRelevantUnavailability = (
  periods: ApartmentUnavailability[],
  today = getLocalDateKey()
) => periods
  .filter((period) => period.endDate >= today)
  .sort((left, right) => left.startDate.localeCompare(right.startDate));

export const isCurrentUnavailability = (period: ApartmentUnavailability, today = getLocalDateKey()) =>
  period.startDate <= today && period.endDate >= today;

export const formatPrice = (amount: string | number, currency: string) => `${String(amount)} ${currency}`;

export const formatDate = (value: string, language: string) => {
  const locale = language.startsWith("sr") ? "sr-Latn-BA" : "en-GB";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(`${value}T12:00:00`));
};

export const formatDateTime = (value: string, language: string) => {
  const locale = language.startsWith("sr") ? "sr-Latn-BA" : "en-GB";
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
};
