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

/**
 * Canonical formatter for the "years to FI" display. Every UI site
 * should use this instead of hand-rolling `Math.round` or
 * `.toFixed(1)`, so the same scenario reads the same on every page.
 *
 * Renders integer years for readability ("15 years") while the calc
 * layer keeps 1-decimal precision internally.
 */
export function formatYearsToFi(value: number | null) {
  if (value === null) {
    return "Not reachable";
  }
  if (value < 1) {
    const months = Math.max(0, Math.round(value * 12));
    return `${months} mo`;
  }
  return `${Math.round(value)} yrs`;
}

/**
 * Canonical formatter for a computed retirement/FIRE age. Displays as
 * an integer ("age 50") because that's how humans think about age,
 * even though the calc layer stores 1-decimal precision.
 */
export function formatFireAge(age: number | null) {
  if (age === null) {
    return "—";
  }
  return String(Math.round(age));
}
