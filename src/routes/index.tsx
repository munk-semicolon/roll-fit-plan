import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Dices, CalendarRange, Activity as ActivityIcon } from "lucide-react";
import { ActivityEditor } from "@/components/ActivityEditor";
import { PlanCalendar } from "@/components/PlanCalendar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { buildPlan, paletteColor, type Activity } from "@/lib/scheduler";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Rolling Workout Plan Builder" },
      {
        name: "description",
        content:
          "Define how often you train each activity — weekly, bi-weekly or monthly — and generate a rolling multi-week workout plan with rest days built in.",
      },
      { property: "og:title", content: "Rolling Workout Plan Builder" },
      {
        property: "og:description",
        content:
          "Turn training frequencies into a rolling, rest-day-aware workout schedule that adapts week to week.",
      },
    ],
  }),
  component: Index,
});

const STORAGE_KEY = "rolling-plan-config-v1";

const DEFAULT_ACTIVITIES: Activity[] = [
  { id: "run", name: "Running", times: 3, cadence: "biweekly", minGapDays: 2, color: paletteColor(0) },
  { id: "box", name: "Boxing", times: 1, cadence: "weekly", minGapDays: 3, color: paletteColor(1) },
  { id: "cyc", name: "Cycling", times: 1, cadence: "monthly", minGapDays: 7, color: paletteColor(2) },
];

function startOfWeek(d: Date) {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  const shift = (out.getDay() + 6) % 7;
  out.setDate(out.getDate() - shift);
  return out;
}

function Index() {
  const [activities, setActivities] = useState<Activity[]>(DEFAULT_ACTIVITIES);
  const [restDays, setRestDays] = useState(2);
  const [maxPerDay, setMaxPerDay] = useState(1);
  const [horizon, setHorizon] = useState(4);
  const [seed, setSeed] = useState(1);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p.activities)) setActivities(p.activities);
        if (typeof p.restDays === "number") setRestDays(p.restDays);
        if (typeof p.maxPerDay === "number") setMaxPerDay(p.maxPerDay);
        if (typeof p.horizon === "number") setHorizon(p.horizon);
      }
    } catch {
      /* ignore corrupt storage */
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ activities, restDays, maxPerDay, horizon }),
    );
  }, [loaded, activities, restDays, maxPerDay, horizon]);

  const plan = useMemo(
    () =>
      buildPlan(
        {
          activities,
          restDaysPerWeek: restDays,
          maxSessionsPerDay: maxPerDay,
          weeks: horizon,
          startDate: startOfWeek(new Date()),
        },
        seed,
      ),
    [activities, restDays, maxPerDay, horizon, seed],
  );

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary">
          Rolling training scheduler
        </p>
        <h1 className="mt-2 text-5xl leading-none sm:text-6xl">Your plan, on repeat</h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground">
          Set how often each activity should happen — three times bi-weekly, once a week, once a
          month — and the scheduler rolls out a plan that keeps every activity close to its target
          while protecting your rest days.
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[380px_1fr]">
        <aside className="space-y-8">
          <section>
            <h2 className="mb-3 flex items-center gap-2 text-2xl">
              <ActivityIcon className="h-5 w-5 text-primary" /> Activities
            </h2>
            <ActivityEditor activities={activities} onChange={setActivities} />
          </section>

          <section className="rounded-lg border border-border bg-surface p-4">
            <h2 className="mb-4 flex items-center gap-2 text-2xl">
              <CalendarRange className="h-5 w-5 text-primary" /> Constraints
            </h2>

            <div className="space-y-6">
              <SliderRow
                label="Rest days per week"
                value={restDays}
                min={0}
                max={4}
                onChange={setRestDays}
              />
              <SliderRow
                label="Max sessions per day"
                value={maxPerDay}
                min={1}
                max={3}
                onChange={setMaxPerDay}
              />
              <SliderRow
                label="Weeks to plan"
                value={horizon}
                min={2}
                max={12}
                onChange={setHorizon}
              />
            </div>

            <Button className="mt-6 w-full" onClick={() => setSeed((s) => s + 1)}>
              <Dices className="mr-2 h-4 w-4" /> Reshuffle plan
            </Button>
          </section>

          <section className="rounded-lg border border-border bg-surface p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-2xl">Fit</h2>
              <span className="text-3xl text-primary" style={{ fontFamily: "var(--font-display)" }}>
                {Math.round(plan.score * 100)}%
              </span>
            </div>
            <ul className="mt-3 space-y-2">
              {plan.fit.map((f) => (
                <li key={f.activityId} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: f.color }}
                    />
                    {f.name}
                  </span>
                  <span className="text-muted-foreground">
                    {f.scheduled} / {f.target.toFixed(1)}
                  </span>
                </li>
              ))}
            </ul>
            {plan.warnings.length > 0 && (
              <ul className="mt-4 space-y-2 border-t border-border pt-3 text-xs text-accent">
                {plan.warnings.map((w, i) => (
                  <li key={i}>{w}</li>
                ))}
              </ul>
            )}
          </section>
        </aside>

        <section>
          <PlanCalendar plan={plan} />
        </section>
      </div>
    </main>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <Label className="text-sm">{label}</Label>
        <span className="text-sm font-semibold text-primary">{value}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={1}
        onValueChange={(v) => onChange(v[0] ?? min)}
        aria-label={label}
      />
    </div>
  );
}
