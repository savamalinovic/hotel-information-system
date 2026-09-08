const DECIMAL_PATTERN = /^-?\d+(?:\.\d{1,2})?$/;

type DecimalParts = {
  negative: boolean;
  whole: string;
  fraction: string;
};

const toParts = (value: string): DecimalParts | undefined => {
  const normalized = value.trim().replace(",", ".");
  if (!DECIMAL_PATTERN.test(normalized)) {
    return undefined;
  }

  const negative = normalized.startsWith("-");
  const [rawWhole, rawFraction = ""] = (negative ? normalized.slice(1) : normalized).split(".");
  return {
    negative,
    whole: rawWhole.replace(/^0+(?=\d)/, "") || "0",
    fraction: rawFraction.padEnd(2, "0"),
  };
};

export const normalizePaymentAmount = (value: string, allowNegative = false) => {
  const parts = toParts(value);
  if (!parts || (!allowNegative && parts.negative)) {
    return undefined;
  }

  const sign = parts.negative ? "-" : "";
  return `${sign}${parts.whole}.${parts.fraction}`;
};

export const isZeroPaymentAmount = (value: string) => {
  const parts = toParts(value);
  return Boolean(parts && parts.whole === "0" && parts.fraction === "00");
};

export const isPositivePaymentAmount = (value: string) => {
  const parts = toParts(value);
  return Boolean(parts && !parts.negative && !isZeroPaymentAmount(value));
};

export const exceedsPaymentAmount = (value: string, limit: string) => {
  const candidate = toParts(value);
  const maximum = toParts(limit);
  if (!candidate || !maximum || candidate.negative || maximum.negative) {
    return false;
  }

  if (candidate.whole.length !== maximum.whole.length) {
    return candidate.whole.length > maximum.whole.length;
  }
  if (candidate.whole !== maximum.whole) {
    return candidate.whole > maximum.whole;
  }
  return candidate.fraction > maximum.fraction;
};

export const formatPaymentAmount = (value: string, currency: string, locale: string) => {
  const parts = toParts(value);
  if (!parts) {
    return `${value} ${currency}`;
  }

  const groupedWhole = parts.whole.replace(/\B(?=(\d{3})+(?!\d))/g, locale.startsWith("sr") ? "." : ",");
  const decimalSeparator = locale.startsWith("sr") ? "," : ".";
  const sign = parts.negative && !(parts.whole === "0" && parts.fraction === "00") ? "-" : "";
  return `${sign}${groupedWhole}${decimalSeparator}${parts.fraction} ${currency}`;
};

export const paymentAmountSign = (value: string) => value.trim().startsWith("-") ? "" : "+";
