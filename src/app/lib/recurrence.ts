import { RecurringRule, Transaction, isoDate } from "./types";

function clampDay(year: number, monthZeroBased: number, day: number): number {
  const last = new Date(year, monthZeroBased + 1, 0).getDate();
  return Math.min(day, last);
}

export function generateOccurrencesForMonth(
  rules: RecurringRule[],
  year: number,
  monthZeroBased: number
): Transaction[] {
  const start = new Date(Date.UTC(year, monthZeroBased, 1));
  const end = new Date(Date.UTC(year, monthZeroBased + 1, 0));
  const results: Transaction[] = [];

  for (const rule of rules) {
    if (!rule.active) continue;
    const ruleStart = new Date(rule.start + "T00:00:00Z");
    const ruleEnd = rule.end ? new Date(rule.end + "T00:00:00Z") : undefined;
    if (ruleEnd && ruleEnd < start) continue;
    if (ruleStart > end) continue;

    if (rule.frequency === "monthly") {
      const day = clampDay(year, monthZeroBased, rule.dayOfMonth ?? 1);
      const dateStr = isoDate(year, monthZeroBased, day);
      const dateObj = new Date(dateStr + "T00:00:00Z");
      if (dateObj >= ruleStart && (!ruleEnd || dateObj <= ruleEnd)) {
        results.push({
          id: `r-${rule.id}-${dateStr}`,
          date: dateStr,
          type: rule.type,
          amount: rule.amount,
          note: rule.note,
          source: "recurring",
          ruleId: rule.id,
        });
      }
      continue;
    }

    if (rule.frequency === "weekly" || rule.frequency === "fortnightly") {
      const weekday = rule.weekday ?? 1; // default Monday
      // find first occurrence on/after start within this month respecting weekday
      const firstOfMonth = new Date(Date.UTC(year, monthZeroBased, 1));
      const firstWeekdayOffset = (weekday - firstOfMonth.getUTCDay() + 7) % 7;
      let current = new Date(firstOfMonth);
      current.setUTCDate(firstOfMonth.getUTCDate() + firstWeekdayOffset);

      // Fast-forward to align with rule start and fortnight cadence if needed
      const interval = rule.frequency === "weekly" ? 7 : 14;

      // Align to the first occurrence >= ruleStart that matches the cadence from rule.start
      while (current < start) {
        current.setUTCDate(current.getUTCDate() + 7);
      }
      // Ensure cadence: distance from rule.start in days is multiple of interval
      while (current <= end) {
        const currentDateStr = isoDate(current.getUTCFullYear(), current.getUTCMonth(), current.getUTCDate());
        const currentDateObj = new Date(currentDateStr + "T00:00:00Z");
        const diffDays = Math.floor((currentDateObj.getTime() - ruleStart.getTime()) / (1000 * 60 * 60 * 24));
        const matchesCadence = diffDays >= 0 && diffDays % interval === 0;
        if (
          matchesCadence &&
          currentDateObj >= start &&
          currentDateObj <= end &&
          (!ruleEnd || currentDateObj <= ruleEnd)
        ) {
          results.push({
            id: `r-${rule.id}-${currentDateStr}`,
            date: currentDateStr,
            type: rule.type,
            amount: rule.amount,
            note: rule.note,
            source: "recurring",
            ruleId: rule.id,
          });
        }
        current.setUTCDate(current.getUTCDate() + 7);
      }
    }
  }

  return results.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

