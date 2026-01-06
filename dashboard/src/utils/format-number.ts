/*
 * Locales code
 * https://gist.github.com/raushankrjha/d1c7e35cf87e69aa8b4208a8171a8416
 */

export type InputNumberValue = string | number | null | undefined;

export const MetricUnits = ['', 'K', 'M', 'G', 'T', 'P', 'E', 'Z', 'Y'];
export const PerMinuteMetricUnits = [
  '/min',
  'K/min',
  'M/min',
  'G/min',
  'T/min',
  'P/min',
  'E/min',
  'Z/min',
  'Y/min',
];
export const WattUnits = ['W', 'KW', 'MW', 'GW', 'TW', 'PW', 'EW', 'ZW', 'YW'];
export const WattHoursUnits = ['', 'KWh', 'MWh', 'GWh', 'TWh', 'PWh', 'EWh', 'ZWh', 'YWh'];
export const LengthUnits = ['m', 'km'];

type Options = (Intl.NumberFormatOptions | undefined) & {
  ensureConstantDecimals?: boolean;
  decimals?: number;
};

const DEFAULT_LOCALE = { code: 'en-US', currency: 'USD' };

function processInput(inputValue: InputNumberValue): number | null {
  if (inputValue == null || Number.isNaN(inputValue)) return null;
  return Number(inputValue);
}

// ----------------------------------------------------------------------

/**
 * Formats a number with locale-specific formatting.
 * @param inputValue - The number to format
 * @param options - Formatting options (decimals, ensureConstantDecimals, etc.)
 * @returns Formatted number string (e.g., "1,234,567")
 */
export function fNumber(inputValue: InputNumberValue, options?: Options) {
  const locale = DEFAULT_LOCALE;

  const number = processInput(inputValue);
  if (number === null) return '';

  const fm = (n: number): string => {
    if (options?.decimals === 0) {
      return Math.round(n).toString();
    }

    return new Intl.NumberFormat(locale.code, {
      maximumFractionDigits: options?.decimals || 2,
      minimumFractionDigits: options?.ensureConstantDecimals ? options?.decimals || 2 : 0,
      ...options,
    }).format(number);
  };

  return fm(number);
}

// ----------------------------------------------------------------------

/**
 * Formats a number as currency.
 * @param inputValue - The number to format
 * @param options - Formatting options (decimals, ensureConstantDecimals, etc.)
 * @returns Formatted currency string (e.g., "$1,234.56")
 */
export function fCurrency(inputValue: InputNumberValue, options?: Options) {
  const locale = DEFAULT_LOCALE;

  const number = processInput(inputValue);
  if (number === null) return '';

  const fm = (n: number): string => {
    if (options?.decimals === 0) {
      return Math.round(n).toString();
    }

    return new Intl.NumberFormat(locale.code, {
      style: 'currency',
      currency: locale.currency,
      maximumFractionDigits: options?.decimals || 2,
      minimumFractionDigits: options?.ensureConstantDecimals ? options?.decimals || 2 : 0,
      ...options,
    }).format(number);
  };

  return fm(number);
}

// ----------------------------------------------------------------------

/**
 * Formats a number as a percentage.
 * @param inputValue - The number to format (0-100 scale)
 * @param options - Formatting options (decimals, ensureConstantDecimals, etc.)
 * @returns Formatted percentage string (e.g., "85%")
 */
export function fPercent(inputValue: InputNumberValue, options?: Options) {
  const locale = DEFAULT_LOCALE;

  const number = processInput(inputValue);
  if (number === null) return '';

  const fm = (n: number): string => {
    if (options?.decimals === 0) {
      return Math.round(n).toString();
    }

    return new Intl.NumberFormat(locale.code, {
      style: 'percent',
      maximumFractionDigits: options?.decimals || 2,
      minimumFractionDigits: options?.ensureConstantDecimals ? options?.decimals || 2 : 0,
      ...options,
    }).format(number / 100);
  };

  return fm(number);
}

// ----------------------------------------------------------------------

/**
 * Shortens a large number with optional unit suffixes (K, M, G, etc.).
 *
 * @param inputValue - The number to shorten
 * @param units - Array of unit suffixes to use at each magnitude (e.g., MetricUnits, WattUnits).
 *   Pass an empty array `[]` for compact notation without unit suffix (e.g., "2K" for coordinates).
 *   Pass MetricUnits for values with units (e.g., "2 K" with space).
 * @param options - Formatting options (decimals, ensureConstantDecimals, onlyDecimalsWhenDivisible)
 * @returns Shortened string (e.g., "1.5K", "2.3 MW", "-150K")
 *
 * @example
 * // Coordinates (no unit suffix): "150K"
 * fShortenNumber(150000, [], { decimals: 0 })
 *
 * @example
 * // Power with units: "1.5 MW"
 * fShortenNumber(1500000, WattUnits, { decimals: 1 })
 *
 * @example
 * // Item counts: "2.5 K"
 * fShortenNumber(2500, MetricUnits, { decimals: 1 })
 */
export function fShortenNumber(
  inputValue: number,
  units: string[],
  options?: Options & { onlyDecimalsWhenDivisible?: boolean }
) {
  let unitIndex = 0;
  // Scale the number down and increase the unit index until the value is less than 1000
  let didDivide = false;
  while (inputValue >= 1000 && unitIndex < units.length - 1) {
    inputValue /= 1000;
    unitIndex += 1;
    didDivide = true;
  }

  const locale = DEFAULT_LOCALE;

  const number = processInput(inputValue);
  if (number === null) return '';

  const fm = (n: number): string => {
    if (options?.decimals === 0) {
      return Math.round(n).toString();
    }

    const maxFractionDigits = options?.decimals || 2;
    const minimumFractionDigits = options?.ensureConstantDecimals ? options?.decimals || 2 : 0;
    const noDecimalsOverride = options?.onlyDecimalsWhenDivisible && !didDivide;

    return new Intl.NumberFormat(locale.code, {
      notation: units.length ? undefined : 'compact',
      maximumFractionDigits: noDecimalsOverride ? 0 : maxFractionDigits,
      minimumFractionDigits: noDecimalsOverride ? 0 : minimumFractionDigits,
      ...options,
    }).format(number);
  };

  return (
    fm(inputValue).replace(/[A-Z]/g, (match) => match.toLowerCase()) +
    (units?.length ? ` ${units[unitIndex]}` : '')
  );
}

// ----------------------------------------------------------------------

/**
 * Formats a number as data size (bytes, Kb, Mb, etc.).
 * @param inputValue - The number of bytes
 * @returns Formatted data size string (e.g., "1.5 Mb")
 */
export function fData(inputValue: InputNumberValue) {
  const number = processInput(inputValue);
  if (number === null || number === 0) return '0 bytes';

  const units = ['bytes', 'Kb', 'Mb', 'Gb', 'Tb', 'Pb', 'Eb', 'Zb', 'Yb'];
  const decimal = 2;
  const baseValue = 1024;

  const index = Math.floor(Math.log(number) / Math.log(baseValue));
  const fm = `${parseFloat((number / baseValue ** index).toFixed(decimal))} ${units[index]}`;

  return fm;
}
