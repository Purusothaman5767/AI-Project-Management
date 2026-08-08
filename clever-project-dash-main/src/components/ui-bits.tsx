import { cn } from "@/lib/utils";
import type { Priority, Status, TaskStatus } from "@/data/mock";
import { memberById } from "@/data/mock";

const statusStyles: Record<Status | TaskStatus, string> = {
  Planning: "bg-accent text-accent-foreground",
  "In Progress": "bg-primary/10 text-primary",
  "On Hold": "bg-warning/15 text-warning",
  Completed: "bg-success/15 text-success",
  "To Do": "bg-muted text-muted-foreground",
  Review: "bg-warning/15 text-warning",
  Done: "bg-success/15 text-success",
};

const priorityStyles: Record<Priority, string> = {
  Low: "bg-muted text-muted-foreground",
  Medium: "bg-primary/10 text-primary",
  High: "bg-warning/15 text-warning",
  Critical: "bg-destructive/12 text-destructive",
};

export function StatusBadge({ status }: { status: Status | TaskStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", statusStyles[status])}>
      {status}
    </span>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-medium", priorityStyles[priority])}>
      {priority}
    </span>
  );
}

export function ProgressBar({ value }: { value: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className="h-full rounded-full"
        style={{ width: `${value}%`, backgroundImage: "var(--gradient-brand)" }}
      />
    </div>
  );
}

export function AvatarStack({ ids }: { ids: string[] }) {
  return (
    <div className="flex -space-x-2">
      {ids.map((id) => {
        const m = memberById(id);
        if (!m) return null;
        return (
          <span
            key={id}
            title={m.name}
            className="flex size-8 items-center justify-center rounded-full border-2 border-card bg-accent text-[11px] font-semibold text-accent-foreground"
          >
            {m.initials}
          </span>
        );
      })}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn("rounded-2xl border border-border bg-card p-5", className)}
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      {children}
    </div>
  );
}
