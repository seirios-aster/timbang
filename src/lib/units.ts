/**
 * Metric and imperial. Everything is stored in metric (kg, cm, litres) and
 * converted only for display and input, so switching units never changes data.
 */
export type UnitSystem = 'metric' | 'imperial';

const LB_PER_KG = 2.2046226;
const CM_PER_INCH = 2.54;
const FL_OZ_PER_L = 33.814;

export type WeightUnit = 'kg' | 'lb';

export const weightUnit = (system: UnitSystem): WeightUnit => (system === 'imperial' ? 'lb' : 'kg');

/** Body weight in kg, as the number to show in the person's unit. Not rounded. */
export function bodyToDisplay(kg: number, system: UnitSystem): number {
  return system === 'imperial' ? kg * LB_PER_KG : kg;
}

/** A body weight typed in the person's unit, back to kg for storage. */
export function bodyFromDisplay(value: number, system: UnitSystem): number {
  return system === 'imperial' ? value / LB_PER_KG : value;
}

/** "68.6 kg" or "151.2 lb". */
export function fmtBody(kg: number, system: UnitSystem, digits = 1): string {
  return `${bodyToDisplay(kg, system).toFixed(digits)} ${weightUnit(system)}`;
}

/** The bare number, such as "68.6". */
export function fmtBodyNumber(kg: number, system: UnitSystem, digits = 1): string {
  return bodyToDisplay(kg, system).toFixed(digits);
}

/** A weekly change in kg shown as kg or lb, with a sign. */
export function fmtBodyChange(kg: number, system: UnitSystem, digits = 2): string {
  const value = Number(bodyToDisplay(Math.abs(kg), system).toFixed(digits));
  if (value === 0) return value.toFixed(digits);
  return `${kg > 0 ? '+' : '−'}${value.toFixed(digits)}`;
}

/** Whole feet and inches, with inches rounded and carried into feet. */
export function cmToFeetInches(cm: number): { feet: number; inches: number } {
  const totalInches = Math.round(cm / CM_PER_INCH);
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

export function feetInchesToCm(feet: number, inches: number): number {
  return (feet * 12 + inches) * CM_PER_INCH;
}

/** "170 cm" or "5 ft 7 in". */
export function fmtHeight(cm: number, system: UnitSystem): string {
  if (system === 'metric') return `${Math.round(cm)} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet} ft ${inches} in`;
}

/** "2.5 L" or "85 fl oz". */
export function fmtWater(litres: number, system: UnitSystem): string {
  if (system === 'metric') return `${litres.toFixed(1)} L`;
  return `${Math.round((litres * FL_OZ_PER_L) / 5) * 5} fl oz`;
}

/** The short unit for protein per body weight: "g/kg" or "g/lb". */
export function proteinUnit(system: UnitSystem): string {
  return `g/${weightUnit(system)}`;
}
