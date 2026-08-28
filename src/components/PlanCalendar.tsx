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
    <div className="space-y-4">
      <div className="hidden grid-cols-7 gap-2 px-1 sm:grid">
        {DAY_LABELS.map((d) => (
          <div key={d} className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {d}
          </div>
        ))}
      </div>

      {plan.weeks.map((week) => {
        const sessionCount = week.days.reduce((s, d) => s + d.sessions.length, 0);
        return (
          <div key={week.index}>
            <div className="mb-2 flex items-baseline justify-between px-1">
              <h3 className="text-lg">
                Week {week.index + 1}
                <span className="ml-2 font-sans text-xs font-medium tracking-normal text-muted-foreground">
                  from {fmt(week.start)}
                </span>
              </h3>
              <span className="text-xs text-muted-foreground">{sessionCount} sessions</span>
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-7">
              {week.days.map((day) => {
                const isToday = day.date.getTime() === today.getTime();
                return (
                  <div
                    key={day.index}
                    className={`min-h-24 rounded-lg border p-2 transition-colors ${
                      day.rest
                        ? "border-dashed border-border bg-surface/40"
                        : "border-border bg-surface"
                    } ${isToday ? "ring-2 ring-primary" : ""}`}
                  >
                    <div className="mb-2 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="sm:hidden">{DAY_LABELS[day.index % 7]}</span>
                      <span>{fmt(day.date)}</span>
                    </div>

                    {day.rest ? (
                      <p className="text-xs italic text-muted-foreground">Rest</p>
                    ) : day.sessions.length === 0 ? (
                      <p className="text-xs text-muted-foreground/60">Open</p>
                    ) : (
                      <ul className="space-y-1">
                        {day.sessions.map((s, i) => (
                          <li
                            key={i}
                            className="rounded px-2 py-1 text-xs font-semibold"
                            style={{ backgroundColor: `color-mix(in oklab, ${s.color} 22%, transparent)`, color: s.color }}
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
          </div>
        );
      })}
    </div>
  );
}
