import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DAY_LABELS,
  paletteColor,
  sessionsPerWeek,
  type Activity,
  type Cadence,
} from "@/lib/scheduler";

interface Props {
  activities: Activity[];
  onChange: (next: Activity[]) => void;
}

const CADENCE_LABEL: Record<Cadence, string> = {
  weekly: "per week",
  biweekly: "every 2 weeks",
  monthly: "every 4 weeks",
};

export function ActivityEditor({ activities, onChange }: Props) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  const update = (id: string, patch: Partial<Activity>) =>
    onChange(activities.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const toggleDay = (a: Activity, day: number) => {
    const cur = a.lockedDays ?? [];
    const next = cur.includes(day) ? cur.filter((d) => d !== day) : [...cur, day].sort();
    update(a.id, { lockedDays: next });
  };

  const move = (from: number, to: number) => {
    if (from === to) return;
    const next = [...activities];
    const [item] = next.splice(from, 1);
    if (!item) return;
    next.splice(to, 0, item);
    onChange(next);
  };

  const add = () =>
    onChange([
      ...activities,
      {
        id: crypto.randomUUID(),
        name: "New activity",
        times: 1,
        cadence: "weekly",
        minGapDays: 2,
        color: paletteColor(activities.length),
        lockedDays: [],
      },
    ]);

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Drag to reorder — activities higher in the list win when the plan can&apos;t fit everything.
      </p>

      {activities.map((a, i) => (
        <div
          key={a.id}
          onDragOver={(e) => {
            e.preventDefault();
            setOverIndex(i);
          }}
          onDrop={(e) => {
            e.preventDefault();
            if (dragIndex !== null) move(dragIndex, i);
            setDragIndex(null);
            setOverIndex(null);
          }}
          className={`rounded-lg border border-border bg-surface-raised p-4 transition-opacity ${
            dragIndex === i ? "opacity-50" : ""
          } ${overIndex === i && dragIndex !== null && dragIndex !== i ? "ring-2 ring-primary" : ""}`}
          style={{ borderLeft: `4px solid ${a.color}` }}
        >
          <div className="flex items-center gap-2">
            <span
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragEnd={() => {
                setDragIndex(null);
                setOverIndex(null);
              }}
              aria-label={`Reorder ${a.name}`}
              className="flex cursor-grab items-center gap-1 text-muted-foreground active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
              <span className="text-xs font-semibold">{i + 1}</span>
            </span>
            <Input
              value={a.name}
              aria-label="Activity name"
              onChange={(e) => update(a.id, { name: e.target.value })}
              className="h-9 flex-1 font-semibold"
            />
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${a.name}`}
              onClick={() => onChange(activities.filter((x) => x.id !== a.id))}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Sessions</Label>
              <Input
                type="number"
                min={1}
                max={14}
                value={a.times}
                onChange={(e) =>
                  update(a.id, { times: Math.max(1, Math.min(14, Number(e.target.value) || 1)) })
                }
                className="h-9"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Interval</Label>
              <Select
                value={a.cadence}
                onValueChange={(v) => update(a.id, { cadence: v as Cadence })}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CADENCE_LABEL) as Cadence[]).map((c) => (
                    <SelectItem key={c} value={c}>
                      {CADENCE_LABEL[c]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Min. days between</Label>
              <Input
                type="number"
                min={1}
                max={14}
                value={a.minGapDays}
                onChange={(e) =>
                  update(a.id, {
                    minGapDays: Math.max(1, Math.min(14, Number(e.target.value) || 1)),
                  })
                }
                className="h-9"
              />
            </div>
          </div>

          <div className="mt-3 space-y-1">
            <Label className="text-xs text-muted-foreground">
              Lock to days {a.lockedDays?.length ? "" : "(any day)"}
            </Label>
            <div className="flex flex-wrap gap-1">
              {DAY_LABELS.map((label, d) => {
                const on = a.lockedDays?.includes(d) ?? false;
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    aria-label={`${label} for ${a.name}`}
                    onClick={() => toggleDay(a, d)}
                    className={`h-7 w-9 rounded border text-[11px] font-semibold uppercase transition-colors ${
                      on
                        ? "border-transparent bg-primary text-primary-foreground"
                        : "border-border text-muted-foreground hover:border-primary/60"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            ≈ {sessionsPerWeek(a).toFixed(2)} sessions per week
          </p>
        </div>
      ))}

      <Button variant="outline" className="w-full" onClick={add}>
        <Plus className="mr-2 h-4 w-4" /> Add activity
      </Button>
    </div>
  );
}
