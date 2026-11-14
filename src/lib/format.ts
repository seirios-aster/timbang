import type { ServingUnit } from '@/domain/foods/types';

const MINUS = '−';

export function fmtInt(value: number): string {
  return Math.round(value).toLocaleString('en-PH');
}

export function fmtDecimal(value: number, digits = 1): string {
  return value.toFixed(digits);
}

/** Always shows a sign, with a real minus sign: +250, −500. */
export function fmtSigned(value: number, digits = 0): string {
  const rounded = Number(Math.abs(value).toFixed(digits));
  const body = digits === 0 ? fmtInt(rounded) : rounded.toFixed(digits);
  if (rounded === 0) return body;
  return `${value > 0 ? '+' : MINUS}${body}`;
}

export function peso(value: number): string {
  return `₱${fmtInt(value)}`;
}

const FRACTIONS: Record<string, string> = { '0.25': '¼', '0.5': '½', '0.75': '¾' };

/** 1.5 becomes "1½", 0.5 becomes "½". */
export function fmtQuantity(value: number): string {
  const whole = Math.floor(value);
  const fraction = FRACTIONS[String(Number((value - whole).toFixed(2)))];
  if (!fraction) return String(Number(value.toFixed(2)));
  return whole === 0 ? fraction : `${whole}${fraction}`;
}

const PLURAL: Record<ServingUnit, string> = {
  cup: 'cups',
  pc: 'pcs',
  slice: 'slices',
  serving: 'servings',
  bowl: 'bowls',
  tbsp: 'tbsp',
  can: 'cans',
  scoop: 'scoops',
  glass: 'glasses',
  stick: 'sticks',
};

/** "1½ cups", "1 pc", "½ serving". */
export function fmtPortion(portions: number, unit: ServingUnit): string {
  return `${fmtQuantity(portions)} ${portions > 1 ? PLURAL[unit] : unit}`;
}
