let defaultCurrency = "USD";
let defaultLocale = "en-US";

export function setGlobalFormatPreferences({
  currency,
  locale,
}: {
  currency?: string;
  locale?: string;
}) {
  if (currency) {
    defaultCurrency = currency;
  }

  if (locale) {
    defaultLocale = locale;
  }
}

export function formatCurrency(
  value: number,
  currency: string = defaultCurrency,
  maximumFractionDigits = 0,
) {
  return new Intl.NumberFormat(defaultLocale, {
    style: "currency",
    currency,
    maximumFractionDigits,
  }).format(value);
}

export function formatCompactCurrency(
  value: number,
  currency: string = defaultCurrency,
) {
  return new Intl.NumberFormat(defaultLocale, {
    style: "currency",
    currency,
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

export function formatPercent(value: number, maximumFractionDigits = 1) {
  return new Intl.NumberFormat(defaultLocale, {
    style: "percent",
    maximumFractionDigits,
  }).format(value);
}

export function formatYears(value: number | null) {
  if (value === null) {
    return "Not reachable";
  }

  if (value < 1) {
    return `${Math.round(value * 12)} mo`;
  }

  return `${value.toFixed(1)} yrs`;
}
