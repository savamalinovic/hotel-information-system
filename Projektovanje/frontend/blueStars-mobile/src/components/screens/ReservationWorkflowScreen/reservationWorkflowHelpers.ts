import { ReservationDetails, ReservationStatus } from "@/src/types/types";
import {
  isValidDateKey,
  parseDateKeyParts,
} from "@/src/util/dateKey";

export type CalendarDayMark = {
  dots?: { key: string; color: string }[];
  selected?: boolean;
  selectedColor?: string;
};

const parseDateParts = parseDateKeyParts;

export const getLocalDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export { isValidDateKey };

export const compareDateKeys = (left: string, right: string) => left.localeCompare(right);

export const isStayPeriodValid = (checkInDate: string, checkOutDate: string) =>
  isValidDateKey(checkInDate) && isValidDateKey(checkOutDate) && compareDateKeys(checkInDate, checkOutDate) < 0;

export const addCalendarDays = (dateKey: string, days: number) => {
  const parts = parseDateParts(dateKey);
  if (!parts) {
    return dateKey;
  }

  const date = new Date(parts.year, parts.month - 1, parts.day, 12);
  date.setDate(date.getDate() + days);
  return getLocalDateKey(date);
};

export const getNights = (checkInDate: string, checkOutDate: string) => {
  const checkIn = parseDateParts(checkInDate);
  const checkOut = parseDateParts(checkOutDate);
  if (!checkIn || !checkOut) {
    return 0;
  }

  const start = Date.UTC(checkIn.year, checkIn.month - 1, checkIn.day);
  const end = Date.UTC(checkOut.year, checkOut.month - 1, checkOut.day);
  return Math.max(0, Math.round((end - start) / 86_400_000));
};

export const getMonthRange = (monthKey: string) => {
  const parts = parseDateParts(monthKey) ?? parseDateParts(getLocalDateKey());
  if (!parts) {
    return { from: getLocalDateKey(), to: addCalendarDays(getLocalDateKey(), 1) };
  }

  const from = `${parts.year}-${String(parts.month).padStart(2, "0")}-01`;
  return { from, to: addCalendarDays(from, 32).slice(0, 7) + "-01" };
};

export const formatDateKey = (dateKey: string, locale: string) => {
  const parts = parseDateParts(dateKey);
  if (!parts) {
    return dateKey;
  }

  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(parts.year, parts.month - 1, parts.day, 12)
  );
};

export const formatMoney = (amount: string, currency: string) => `${amount} ${currency}`;

export const normalizeDecimalInput = (value: string) => value.trim().replace(",", ".");

export const isValidDecimalAmount = (value: string) => /^\d+(?:\.\d{1,2})?$/.test(value);

export const getStatusColor = (status: ReservationStatus, colors: { success: string; error: string; accent: string; primary: string }) => {
  switch (status) {
    case "CONFIRMED":
      return colors.primary;
    case "CHECKED_IN":
      return colors.success;
    case "CHECKED_OUT":
      return colors.accent;
    case "CANCELLED":
    case "NO_SHOW":
      return colors.error;
  }
};

const statusDotColor = (status: ReservationStatus, colors: { success: string; error: string; accent: string; primary: string }) =>
  getStatusColor(status, colors);

export const getReservationsForDate = (reservations: ReservationDetails[], dateKey: string) =>
  reservations.filter(
    (reservation) =>
      compareDateKeys(reservation.checkInDate, dateKey) <= 0 && compareDateKeys(dateKey, reservation.checkOutDate) < 0
  );

export const getCalendarMarks = (
  reservations: ReservationDetails[],
  selectedDate: string | undefined,
  colors: { success: string; error: string; accent: string; primary: string }
): Record<string, CalendarDayMark> => {
  const marks: Record<string, CalendarDayMark> = {};

  reservations.forEach((reservation) => {
    let current = reservation.checkInDate;
    let safetyCounter = 0;
    while (compareDateKeys(current, reservation.checkOutDate) < 0 && safetyCounter < 370) {
      const currentMark = marks[current] ?? {};
      const dot = { key: `${reservation.reservationId}-${reservation.status}`, color: statusDotColor(reservation.status, colors) };
      const dots = currentMark.dots?.some((item) => item.key === dot.key)
        ? currentMark.dots
        : [...(currentMark.dots ?? []), dot];
      marks[current] = { ...currentMark, dots };
      current = addCalendarDays(current, 1);
      safetyCounter += 1;
    }
  });

  if (selectedDate) {
    marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: colors.primary };
  }

  return marks;
};
