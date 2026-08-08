import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui-bits";
import { members, tasks } from "@/data/mock";

export const Route = createFileRoute("/team")({
  head: () => ({
    meta: [
      { title: "Team — Nimbus PM" },
      { name: "description", content: "See every teammate's role, assigned tasks and current workload at a glance." },
      { property: "og:title", content: "Team — Nimbus PM" },
      { property: "og:description", content: "Roles, assigned tasks and workload for the whole team." },
    ],
  }),
  component: Team,
});

function workloadTone(w: number) {
  if (w >= 85) return { label: "Overloaded", bar: "bg-destructive", chip: "bg-destructive/12 text-destructive" };
  if (w >= 65) return { label: "Balanced", bar: "bg-primary", chip: "bg-primary/10 text-primary" };
  return { label: "Available", bar: "bg-success", chip: "bg-success/15 text-success" };
}

function Team() {
  return (
    <AppShell title="Team" subtitle={`${members.length} people · ${tasks.length} tasks assigned`}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((m) => {
          const tone = workloadTone(m.workload);
          return (
            <Card key={m.id}>
              <div className="flex items-center gap-3">
                <span
                  className="flex size-12 items-center justify-center rounded-2xl text-sm font-semibold text-primary-foreground"
                  style={{ backgroundImage: "var(--gradient-brand)" }}
                >
                  {m.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{m.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                </div>
                <span className={`ml-auto rounded-full px-2.5 py-1 text-xs font-medium ${tone.chip}`}>
                  {tone.label}
                </span>
              </div>

              <div className="mt-5 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Workload</span>
                  <span className="font-medium text-foreground">{m.workload}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                  <div className={`h-full rounded-full ${tone.bar}`} style={{ width: `${m.workload}%` }} />
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-xl bg-muted/60 px-4 py-3">
                <span className="text-xs text-muted-foreground">Assigned tasks</span>
                <span className="text-sm font-semibold">{m.assignedTasks}</span>
              </div>
            </Card>
          );
        })}
      </div>
    </AppShell>
  );
}
