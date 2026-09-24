import { getLocalDateKey, isValidDateKey, normalizeDecimalInput } from "@/src/components/screens/ReservationWorkflowScreen/reservationWorkflowHelpers";

const MONEY_PATTERN = /^(?:0|[1-9]\d{0,11})(?:\.\d{1,2})?$/;

export const normalizeMoneyInput = (value: string) => normalizeDecimalInput(value);

export const isPositiveMoney = (value: string) => {
  if (!MONEY_PATTERN.test(value)) {
    return false;
  }

  return !["0", "0.0", "0.00"].includes(value);
};

export const isOptionalPositiveMoney = (value: string) => value.length === 0 || isPositiveMoney(value);

export const isExpenseDateValid = (value: string) => isValidDateKey(value) && value <= getLocalDateKey();

export const formatMoney = (amount: string | null | undefined, currency: string) =>
  amount === null || amount === undefined ? "—" : `${amount} ${currency}`;

export const formatDate = (value: string | null | undefined, locale: string) => {
  if (!value || !isValidDateKey(value)) {
    return "—";
  }
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat(locale, { day: "2-digit", month: "short", year: "numeric" }).format(
    new Date(year, month - 1, day, 12)
  );
};

export const formatTimestamp = (value: string | null | undefined, locale: string) => {
  if (!value) {
    return "—";
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
};

export const formatFileSize = (sizeBytes: number) => {
  if (sizeBytes < 1024) {
    return `${sizeBytes} B`;
  }
  if (sizeBytes < 1024 * 1024) {
    return `${Math.ceil(sizeBytes / 1024)} KB`;
  }
  return `${(sizeBytes / (1024 * 1024)).toFixed(1)} MB`;
};
