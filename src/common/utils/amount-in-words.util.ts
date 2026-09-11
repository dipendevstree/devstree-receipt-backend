const ONES = [
  '',
  'One',
  'Two',
  'Three',
  'Four',
  'Five',
  'Six',
  'Seven',
  'Eight',
  'Nine',
  'Ten',
  'Eleven',
  'Twelve',
  'Thirteen',
  'Fourteen',
  'Fifteen',
  'Sixteen',
  'Seventeen',
  'Eighteen',
  'Nineteen',
];

const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(value: number): string {
  if (value < 20) return ONES[value];
  const tens = Math.floor(value / 10);
  const ones = value % 10;
  return ones ? `${TENS[tens]} ${ONES[ones]}` : TENS[tens];
}

function threeDigits(value: number): string {
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  const parts: string[] = [];
  if (hundreds) parts.push(`${ONES[hundreds]} Hundred`);
  if (rest) parts.push(twoDigits(rest));
  return parts.join(' ');
}

/** Indian numbering: crore, lakh, thousand, hundred. */
function indianWords(value: bigint): string {
  if (value === 0n) return 'Zero';

  const crore = Number(value / 10_000_000n);
  const lakh = Number((value / 100_000n) % 100n);
  const thousand = Number((value / 1000n) % 100n);
  const hundred = Number(value % 1000n);

  const parts: string[] = [];
  if (crore) parts.push(`${crore > 99 ? indianWords(BigInt(crore)) : twoDigits(crore)} Crore`);
  if (lakh) parts.push(`${twoDigits(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigits(thousand)} Thousand`);
  if (hundred) parts.push(threeDigits(hundred));
  return parts.join(' ');
}

/** International numbering: billion, million, thousand. */
function internationalWords(value: bigint): string {
  if (value === 0n) return 'Zero';

  const groups: number[] = [];
  let remaining = value;
  while (remaining > 0n) {
    groups.push(Number(remaining % 1000n));
    remaining /= 1000n;
  }

  const scales = ['', 'Thousand', 'Million', 'Billion', 'Trillion'];
  const parts: string[] = [];
  for (let i = groups.length - 1; i >= 0; i--) {
    if (!groups[i]) continue;
    parts.push(`${threeDigits(groups[i])}${scales[i] ? ` ${scales[i]}` : ''}`.trim());
  }
  return parts.join(' ');
}

export interface AmountInWordsOptions {
  currency?: string;
  /** INR defaults to the Indian numbering system. */
  numbering?: 'indian' | 'international';
}

const CURRENCY_UNITS: Record<string, { major: string; minor: string }> = {
  INR: { major: 'Rupees', minor: 'Paise' },
  USD: { major: 'Dollars', minor: 'Cents' },
  EUR: { major: 'Euros', minor: 'Cents' },
  GBP: { major: 'Pounds', minor: 'Pence' },
  AED: { major: 'Dirhams', minor: 'Fils' },
};

/**
 * Converts a decimal amount string ("1250.50") into words for receipt printing.
 * Accepts the decimal string form so it never re-derives money from a float.
 */
export function amountInWords(decimalAmount: string, options: AmountInWordsOptions = {}): string {
  const currency = (options.currency ?? 'INR').toUpperCase();
  const numbering = options.numbering ?? (currency === 'INR' ? 'indian' : 'international');
  const units = CURRENCY_UNITS[currency] ?? { major: currency, minor: 'Cents' };

  const negative = decimalAmount.trim().startsWith('-');
  const normalized = decimalAmount.trim().replace(/^-/, '');
  const [wholePart = '0', fractionPart = ''] = normalized.split('.');

  const whole = BigInt(wholePart || '0');
  const fractionDigits = (fractionPart + '00').slice(0, 2);
  const fraction = Number(fractionDigits);

  const convert = numbering === 'indian' ? indianWords : internationalWords;

  const segments: string[] = [];
  if (negative) segments.push('Minus');
  segments.push(`${convert(whole)} ${units.major}`);
  if (fraction > 0) segments.push(`and ${twoDigits(fraction)} ${units.minor}`);
  segments.push('Only');

  return segments.join(' ').replace(/\s+/g, ' ').trim();
}
