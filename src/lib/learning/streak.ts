/** Consecutive days (ending today or yesterday) with at least one completed session. */
export function streakDays(sessionStarts: string[], now = new Date()): number {
  const day = (d: Date) => d.toISOString().slice(0, 10);
  const days = new Set(sessionStarts.map((s) => day(new Date(s))));
  const cursor = new Date(now);
  if (!days.has(day(cursor))) cursor.setUTCDate(cursor.getUTCDate() - 1);
  let n = 0;
  while (days.has(day(cursor))) {
    n++;
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return n;
}
