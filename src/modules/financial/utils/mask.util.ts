import { Money } from 'src/common/utils/money.util';

/**
 * The single place where a decrypted amount is allowed to become part of an API
 * response. When the financial session is locked the value is dropped entirely —
 * the API returns `null`, never the real figure with a "locked" flag beside it.
 */
export function maskAmount(amount: Money | null | undefined, unlocked: boolean): string | null {
  if (!unlocked || amount === null || amount === undefined) return null;
  return amount.toDecimalString();
}

export function maskNumber(value: number | null | undefined, unlocked: boolean): number | null {
  if (!unlocked || value === null || value === undefined) return null;
  return value;
}

/** Convenience for list/summary payloads that carry several amounts. */
export function maskAmounts<K extends string>(
  amounts: Record<K, Money | null>,
  unlocked: boolean,
): Record<K, string | null> {
  const result = {} as Record<K, string | null>;
  for (const key of Object.keys(amounts) as K[]) {
    result[key] = maskAmount(amounts[key], unlocked);
  }
  return result;
}
