/** Today's local calendar date as YYYY-MM-DD. */
export function todayIso(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Monday is 0, Sunday is 6. */
export function todayIndex(): number {
  return (new Date().getDay() + 6) % 7;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-11-13" becomes "Nov 13". */
export function fmtShortDate(iso: string): string {
  const [, month, day] = iso.split('-').map(Number);
  return `${MONTHS[(month ?? 1) - 1]} ${day}`;
}

export const DAYS = [
  { short: 'Lun', long: 'Lunes' },
  { short: 'Mar', long: 'Martes' },
  { short: 'Miy', long: 'Miyerkules' },
  { short: 'Huw', long: 'Huwebes' },
  { short: 'Biy', long: 'Biyernes' },
  { short: 'Sab', long: 'Sabado' },
  { short: 'Lin', long: 'Linggo' },
] as const;
