export type Cadence = "weekly" | "biweekly" | "monthly";

export interface Activity {
  id: string;
  name: string;
  times: number;
  cadence: Cadence;
  /** Minimum whole days between two sessions of this activity. */
  minGapDays: number;
  color: string;
  /** Weekday indexes (0 = Mon … 6 = Sun) this activity is locked to. Empty = any day. */
  lockedDays?: number[];
}

export interface PlanSession {
  activityId: string;
  name: string;
  color: string;
}

export interface PlanDay {
  /** Absolute day index from plan start. */
  index: number;
  date: Date;
  rest: boolean;
  sessions: PlanSession[];
}

export interface PlanWeek {
  index: number;
  start: Date;
  days: PlanDay[];
}

export interface ActivityFit {
  activityId: string;
  name: string;
  color: string;
  target: number;
  scheduled: number;
  /** -1..1 relative deviation from the target over the horizon. */
  deviation: number;
}

export interface Plan {
  weeks: PlanWeek[];
  fit: ActivityFit[];
  /** 0..1 — how well the whole plan matches the requested volumes. */
  score: number;
  warnings: string[];
}

export interface PlanConfig {
  activities: Activity[];
  restDaysPerWeek: number;
  maxSessionsPerDay: number;
  weeks: number;
  startDate: Date;
}

export const CADENCE_WEEKS: Record<Cadence, number> = {
  weekly: 1,
  biweekly: 2,
  monthly: 4,
};

export const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export const PALETTE = [
  "var(--color-act-1)",
  "var(--color-act-2)",
  "var(--color-act-3)",
  "var(--color-act-4)",
  "var(--color-act-5)",
  "var(--color-act-6)",
];

export function paletteColor(i: number): string {
  return PALETTE[i % PALETTE.length] ?? PALETTE[0]!;
}

export function sessionsPerWeek(a: Activity): number {
  return a.times / CADENCE_WEEKS[a.cadence];
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  out.setHours(0, 0, 0, 0);
  return out;
}

/** Deterministic pseudo-random so a given seed always yields the same plan. */
function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}

/**
 * Builds a rolling plan.
 *
 * Every activity accumulates "credit" each day equal to its weekly rate / 7.
 * When a day comes up, the activities with the most outstanding credit get
 * first pick — so a 3x-biweekly activity naturally alternates 2 and 1 sessions
 * across weeks instead of forcing an exact weekly quota.
 */
export function buildPlan(config: PlanConfig, seed = 1): Plan {
  const { activities, restDaysPerWeek, maxSessionsPerDay, weeks } = config;
  const start = new Date(config.startDate);
  start.setHours(0, 0, 0, 0);
  const rand = rng(seed);
  const warnings: string[] = [];

  const totalDays = weeks * 7;
  const trainingDaysPerWeek = Math.max(0, 7 - restDaysPerWeek);
  const capacity = weeks * trainingDaysPerWeek * maxSessionsPerDay;
  const demand = activities.reduce((s, a) => s + sessionsPerWeek(a) * weeks, 0);

  if (activities.length === 0) {
    return { weeks: [], fit: [], score: 1, warnings: ["Add an activity to generate a plan."] };
  }
  if (demand > capacity) {
    warnings.push(
      `Requested ${demand.toFixed(1)} sessions but only ${capacity} slots exist. The plan will fall short — add training days or raise sessions per day.`,
    );
  }

  const quota = new Map<string, number>();
  const credit = new Map<string, number>();
  const lastDay = new Map<string, number>();
  const scheduled = new Map<string, number>();
  for (const a of activities) {
    // Warm start: begin partway through the accrual cycle so the first week
    // isn't systematically short, with a little variation per activity.
    credit.set(a.id, rand() * 0.95);
    lastDay.set(a.id, -999);
    scheduled.set(a.id, 0);
    quota.set(a.id, Math.round(sessionsPerWeek(a) * weeks));
  }

  const days: PlanDay[] = [];

  // Earlier activities in the list win ties when the plan can't fit everything.
  const priority = new Map<string, number>();
  activities.forEach((a, i) => priority.set(a.id, (activities.length - i) * 0.05));

  const allowsDay = (a: Activity, weekday: number) =>
    !a.lockedDays?.length || a.lockedDays.includes(weekday);

  // Weekdays that at least one locked activity needs — keep them free of rest.
  const protectedDays = new Set<number>();
  for (const a of activities) for (const d of a.lockedDays ?? []) protectedDays.add(d);

  for (let w = 0; w < weeks; w++) {
    // Rest days: spread them out, avoiding weekdays locked by an activity.
    const restSet = pickRestDays(restDaysPerWeek, w, rand, protectedDays);


    for (let d = 0; d < 7; d++) {
      const index = w * 7 + d;
      const isRest = restSet.has(d);
      const day: PlanDay = {
        index,
        date: addDays(start, index),
        rest: isRest,
        sessions: [],
      };

      if (!isRest) {
        for (let slot = 0; slot < maxSessionsPerDay; slot++) {
          const pick = activities
            .filter((a) => !day.sessions.some((s) => s.activityId === a.id))
            .filter((a) => index - (lastDay.get(a.id) ?? -999) >= a.minGapDays)
            .filter((a) => allowsDay(a, d))
            // Locked activities get a lower bar — their windows are scarce.
            .filter((a) => (credit.get(a.id) ?? 0) >= (a.lockedDays?.length ? 0.45 : 0.72))
            .filter((a) => (scheduled.get(a.id) ?? 0) < (quota.get(a.id) ?? 0))
            .sort(
              (a, b) =>
                (credit.get(b.id) ?? 0) +
                (priority.get(b.id) ?? 0) -
                ((credit.get(a.id) ?? 0) + (priority.get(a.id) ?? 0)),
            )[0];
          if (!pick) break;
          day.sessions.push({ activityId: pick.id, name: pick.name, color: pick.color });
          credit.set(pick.id, (credit.get(pick.id) ?? 0) - 1);
          lastDay.set(pick.id, index);
          scheduled.set(pick.id, (scheduled.get(pick.id) ?? 0) + 1);
        }
      }

      days.push(day);
      // Accrue tomorrow's credit.
      if (index < totalDays - 1) {
        for (const a of activities) {
          credit.set(a.id, (credit.get(a.id) ?? 0) + sessionsPerWeek(a) / 7);
        }
      }
    }
  }

  // Fill pass: top up activities that finished the horizon under target by
  // dropping sessions into free, non-rest days that respect the minimum gap.
  for (const a of activities) {
    const target = Math.round(sessionsPerWeek(a) * weeks);
    let placed = scheduled.get(a.id) ?? 0;
    if (placed >= target) continue;
    for (const day of days) {
      if (placed >= target) break;
      if (day.rest) continue;
      if (day.sessions.length >= maxSessionsPerDay) continue;
      if (day.sessions.some((s) => s.activityId === a.id)) continue;
      if (!allowsDay(a, day.index % 7)) continue;
      const near = days.some(
        (o) =>
          Math.abs(o.index - day.index) < a.minGapDays &&
          o.index !== day.index &&
          o.sessions.some((s) => s.activityId === a.id),
      );
      if (near) continue;
      day.sessions.push({ activityId: a.id, name: a.name, color: a.color });
      placed++;
      scheduled.set(a.id, placed);
    }
  }

  const planWeeks: PlanWeek[] = [];
  for (let w = 0; w < weeks; w++) {
    planWeeks.push({
      index: w,
      start: addDays(start, w * 7),
      days: days.slice(w * 7, w * 7 + 7),
    });
  }

  const fit: ActivityFit[] = activities.map((a) => {
    const target = sessionsPerWeek(a) * weeks;
    const got = scheduled.get(a.id) ?? 0;
    return {
      activityId: a.id,
      name: a.name,
      color: a.color,
      target,
      scheduled: got,
      deviation: target === 0 ? 0 : (got - target) / target,
    };
  });

  for (const f of fit) {
    if (Math.abs(f.deviation) > 0.15) {
      warnings.push(
        `${f.name}: ${f.scheduled} of ${f.target.toFixed(1)} target sessions — try a smaller rest-day count or a shorter minimum gap.`,
      );
    }
  }

  const score =
    fit.length === 0
      ? 1
      : Math.max(0, 1 - fit.reduce((s, f) => s + Math.abs(f.deviation), 0) / fit.length);

  return { weeks: planWeeks, fit, score, warnings };
}

function pickRestDays(count: number, week: number, rand: () => number): Set<number> {
  const set = new Set<number>();
  if (count <= 0) return set;
  if (count >= 7) return new Set([0, 1, 2, 3, 4, 5, 6]);

  // Evenly spaced anchors, rotated per week so rest days drift naturally.
  const offset = Math.floor(rand() * 7) + week;
  const step = 7 / count;
  for (let i = 0; i < count; i++) {
    let d = Math.round(i * step + offset) % 7;
    let guard = 0;
    while (set.has(d) && guard++ < 7) d = (d + 1) % 7;
    set.add(d);
  }
  return set;
}
