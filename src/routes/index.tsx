import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Dices,
  CalendarDays,
  SlidersHorizontal,
  Activity as ActivityIcon,
} from "lucide-react";
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

type Tab = "plan" | "setup";

function Index() {
  const [activities, setActivities] = useState<Activity[]>(DEFAULT_ACTIVITIES);
  const [restDays, setRestDays] = useState(2);
  const [maxPerDay, setMaxPerDay] = useState(1);
  const [horizon, setHorizon] = useState(4);
  const [seed, setSeed] = useState(1);
  const [loaded, setLoaded] = useState(false);
  const [tab, setTab] = useState<Tab>("plan");

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
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col">
      {/* App header */}
      <header className="sticky top-0 z-20 border-b border-border/60 bg-background/80 px-5 pb-3 pt-5 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
              <ActivityIcon className="h-4.5 w-4.5" />
            </div>
            <h1 className="truncate text-xl" style={{ fontFamily: "var(--font-display)" }}>
              Rolling Plan
            </h1>
          </div>
          <div className="shrink-0 rounded-full bg-primary/10 px-3 py-1.5 text-right">
            <span
              className="text-lg font-bold leading-none text-primary"
              style={{ fontFamily: "var(--font-display)" }}
            >
              {Math.round(plan.score * 100)}%
            </span>
            <span className="ml-1 text-[10px] font-semibold uppercase tracking-wide text-primary/70">
              fit
            </span>
          </div>
        </div>
      </header>

      {/* Scrollable content */}
      <main className="flex-1 space-y-5 px-4 pb-28 pt-5">
        {tab === "plan" ? (
          <>
            <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-lg" style={{ fontFamily: "var(--font-display)" }}>
                  This plan
                </h2>
                <Button size="sm" variant="outline" onClick={() => setSeed((s) => s + 1)}>
                  <Dices className="mr-1.5 h-3.5 w-3.5" /> Reshuffle
                </Button>
              </div>
              <ul className="mt-3 space-y-2">
                {plan.fit.map((f) => (
                  <li key={f.activityId} className="flex items-center justify-between text-sm">
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full"
                        style={{ backgroundColor: f.color }}
                      />
                      <span className="truncate">{f.name}</span>
                    </span>
                    <span className="shrink-0 text-muted-foreground">
                      {f.scheduled} / {f.target.toFixed(1)}
                    </span>
                  </li>
                ))}
              </ul>
              {plan.warnings.length > 0 && (
                <ul className="mt-4 space-y-1.5 border-t border-border pt-3 text-xs text-accent">
                  {plan.warnings.map((w, i) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              )}
            </section>

            <PlanCalendar plan={plan} />
          </>
        ) : (
          <>
            <section>
              <h2 className="mb-3 text-lg" style={{ fontFamily: "var(--font-display)" }}>
                Activities
              </h2>
              <ActivityEditor activities={activities} onChange={setActivities} />
            </section>

            <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
              <h2 className="mb-4 text-lg" style={{ fontFamily: "var(--font-display)" }}>
                Constraints
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
            </section>
          </>
        )}
      </main>

      {/* Bottom tab bar */}
      <nav
        aria-label="Main navigation"
        className="fixed inset-x-0 bottom-0 z-20 mx-auto w-full max-w-md border-t border-border/60 bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur"
      >
        <div className="grid grid-cols-2 px-6 py-2">
          <TabButton
            active={tab === "plan"}
            onClick={() => setTab("plan")}
            icon={<CalendarDays className="h-5 w-5" />}
            label="Plan"
          />
          <TabButton
            active={tab === "setup"}
            onClick={() => setTab("setup")}
            icon={<SlidersHorizontal className="h-5 w-5" />}
            label="Setup"
          />
        </div>
      </nav>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-current={active ? "page" : undefined}
      onClick={onClick}
      className={`flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-semibold transition-colors ${
        active ? "text-primary" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
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
