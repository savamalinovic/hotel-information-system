const positiveIntegerPattern = /^\d+$/;

export const parsePositiveId = (value: unknown): number | null => {
  if (Array.isArray(value)) {
    return value.length === 1 ? parsePositiveId(value[0]) : null;
  }

  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value > 0 ? value : null;
  }

  if (typeof value !== "string" || !positiveIntegerPattern.test(value)) {
    return null;
  }

  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : null;
};

export const isPositiveId = (value: unknown): value is number =>
  typeof value === "number" && parsePositiveId(value) !== null;

export const requirePositiveId = (value: unknown): number => {
  const parsed = parsePositiveId(value);

  if (parsed === null) {
    throw new Error("Invalid positive identifier");
  }

  return parsed;
};
