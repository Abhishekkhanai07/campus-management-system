/** Date helpers. Calendar dates are stored at UTC midnight. */
export function toDateOnly(input: string | Date): Date {
  const d = typeof input === 'string' ? new Date(input) : input;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
}

export function today(): Date {
  return toDateOnly(new Date());
}

export function isoDate(d: Date): string {
  return toDateOnly(d).toISOString().slice(0, 10);
}

/** 1 = Monday ... 7 = Sunday (matches TimetableSlot.weekday) */
export function weekdayOf(d: Date): number {
  const js = toDateOnly(d).getUTCDay();
  return js === 0 ? 7 : js;
}

export function eachDate(from: Date, to: Date): Date[] {
  const out: Date[] = [];
  const cur = toDateOnly(from);
  const end = toDateOnly(to);
  while (cur <= end) {
    out.push(new Date(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

export function pct(part: number, total: number): number {
  if (!total) return 0;
  return Math.round((part / total) * 1000) / 10;
}
