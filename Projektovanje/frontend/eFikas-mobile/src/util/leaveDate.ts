import { isValidDateKey, parseDateKeyToLocalNoon } from "@/src/util/dateKey";

export const isValidInclusiveLeavePeriod = (startDate: string, endDate: string) =>
  isValidDateKey(startDate) && isValidDateKey(endDate) && startDate <= endDate;

export const formatLeaveDate = (value: string, language: string) => {
  const date = parseDateKeyToLocalNoon(value);
  if (!date) return value;
  return new Intl.DateTimeFormat(language.startsWith("sr") ? "sr-Latn-BA" : "en-GB", {
    dateStyle: "medium",
  }).format(date);
};
