import { Plus, Trash2 } from "lucide-react";
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
import { PALETTE, sessionsPerWeek, type Activity, type Cadence } from "@/lib/scheduler";

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
  const update = (id: string, patch: Partial<Activity>) =>
    onChange(activities.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const add = () =>
    onChange([
      ...activities,
      {
        id: crypto.randomUUID(),
        name: "New activity",
        times: 1,
        cadence: "weekly",
        minGapDays: 2,
        color: PALETTE[activities.length % PALETTE.length],
      },
    ]);

  return (
    <div className="space-y-3">
      {activities.map((a) => (
        <div
          key={a.id}
          className="rounded-lg border border-border bg-surface-raised p-4"
          style={{ borderLeft: `4px solid ${a.color}` }}
        >
          <div className="flex items-center gap-2">
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
