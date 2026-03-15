import { RRule, Weekday } from "rrule";
import { db } from "@/lib/db/client";
import type { RecurrenceRule, Occurrence, DayOfWeek } from "@/types/recurring";

const HORIZON_WEEKS = parseInt(process.env.RECURRENCE_HORIZON_WEEKS ?? "12", 10);

const DAY_MAP: Record<DayOfWeek, Weekday> = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
};

const FREQ_MAP: Record<string, number> = {
  daily: RRule.DAILY,
  weekly: RRule.WEEKLY,
  monthly: RRule.MONTHLY,
};

export function parseRecurrenceRule(ruleStr: string): RecurrenceRule {
  const parsed = JSON.parse(ruleStr) as RecurrenceRule;
  return parsed;
}

/**
 * Expand a recurrence rule to individual occurrence dates.
 * Uses the event's venue timezone (from cities.timezone) for DST safety.
 * Returns dates within [from, to] window, bounded by the configurable horizon.
 */
export async function expandOccurrences(
  eventId: string,
  ruleStr: string,
  baseStart: string,
  baseEnd: string,
  from?: Date,
  to?: Date,
): Promise<Array<{ date: string; startDatetime: string; endDatetime: string }>> {
  const rule = parseRecurrenceRule(ruleStr);

  // Fetch timezone from event's venue -> city
  const tzResult = await db().query<{ timezone: string }>(
    `SELECT c.timezone FROM events e
     JOIN venues v ON v.id = e.venue_id
     JOIN cities c ON c.id = v.city_id
     WHERE e.id = $1`,
    [eventId],
  );
  const timezone = tzResult.rows[0]?.timezone ?? "UTC";

  const baseDate = new Date(baseStart);
  const duration = new Date(baseEnd).getTime() - baseDate.getTime();

  const now = new Date();
  const horizonEnd = new Date(now);
  horizonEnd.setDate(horizonEnd.getDate() + HORIZON_WEEKS * 7);

  const windowStart = from ?? now;
  const windowEnd = to ?? horizonEnd;

  const rruleOptions: ConstructorParameters<typeof RRule>[0] = {
    freq: FREQ_MAP[rule.frequency],
    interval: rule.interval || 1,
    dtstart: baseDate,
  };

  if (rule.daysOfWeek?.length) {
    rruleOptions.byweekday = rule.daysOfWeek.map((d) => DAY_MAP[d]);
  }

  if (rule.endDate) {
    rruleOptions.until = new Date(rule.endDate);
  }

  if (rule.occurrenceCount) {
    rruleOptions.count = rule.occurrenceCount;
  }

  const rrule = new RRule(rruleOptions);

  // Use rrule's between() for efficient expansion
  const dates = rrule.between(windowStart, windowEnd, true);

  return dates.map((occDate) => {
    // DST-safe: apply the occurrence date with the original time in the venue timezone
    const dateStr = occDate.toISOString().slice(0, 10);
    const timeStr = baseDate.toISOString().slice(11); // preserve time portion
    const startIso = `${dateStr}T${timeStr}`;
    const endIso = new Date(new Date(startIso).getTime() + duration).toISOString();

    return {
      date: dateStr,
      startDatetime: startIso,
      endDatetime: endIso,
    };
  });
}
