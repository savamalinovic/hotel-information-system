export type DateKeyParts = {
  year: number;
  month: number;
  day: number;
};

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export const parseDateKeyParts = (value: string): DateKeyParts | undefined => {
  if (!DATE_KEY_PATTERN.test(value)) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  const candidate = new Date(year, month - 1, day, 12);
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return undefined;
  }

  return { year, month, day };
};

export const parseDateKeyToLocalNoon = (value: string): Date | null => {
  const parts = parseDateKeyParts(value);
  return parts ? new Date(parts.year, parts.month - 1, parts.day, 12) : null;
};

export const isValidDateKey = (value: string) => Boolean(parseDateKeyParts(value));

export const toDateKey = (value: Date) => {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
