import { DAY_LABELS, type Plan } from "@/lib/scheduler";

interface Props {
  plan: Plan;
}

function fmt(d: Date) {
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
}

export function PlanCalendar({ plan }: Props) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="space-y-6">
      {plan.weeks.map((week) => {
        const sessionCount = week.days.reduce((s, d) => s + d.sessions.length, 0);
        return (
          <section
            key={week.index}
            className="rounded-3xl border border-border bg-surface-raised/60 p-3 sm:p-4"
          >
            <div className="mb-3 flex items-baseline justify-between px-2">
              <h3 className="text-xl">
                Week {week.index + 1}
                <span className="ml-2 font-sans text-xs font-medium tracking-normal text-muted-foreground">
                  from {fmt(week.start)}
                </span>
              </h3>
              <span className="text-xs text-muted-foreground">{sessionCount} sessions</span>
            </div>

            <div className="space-y-2">
              {week.days.map((day) => {
                const isToday = day.date.getTime() === today.getTime();
                return (
                  <div
                    key={day.index}
                    className={`rounded-2xl border p-3.5 shadow-sm transition-colors ${
                      day.rest
                        ? "border-dashed border-border bg-surface/50"
                        : "border-border bg-surface"
                    } ${isToday ? "ring-2 ring-primary" : ""}`}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-semibold">
                        {DAY_LABELS[day.index % 7]}
                        {isToday && (
                          <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                            Today
                          </span>
                        )}
                      </span>
                      <span className="text-xs font-medium text-muted-foreground">
                        {fmt(day.date)}
                      </span>
                    </div>

                    {day.rest ? (
                      <p className="text-xs italic text-muted-foreground">Rest</p>
                    ) : day.sessions.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60">Open</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {day.sessions.map((s, i) => (
                          <li
                            key={i}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold"
                            style={{
                              backgroundColor: `color-mix(in oklab, ${s.color} 22%, transparent)`,
                              color: s.color,
                            }}
                          >
                            {s.name}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
