import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users, AlertCircle, RefreshCw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui-bits";
import { fetchTeamMembers, getAccessToken, removeAccessToken, TeamMember } from "@/lib/apiClient";

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
  if (w >= 80) return { label: "Overloaded", bar: "bg-destructive", chip: "bg-destructive/15 text-destructive" };
  if (w >= 45) return { label: "Balanced", bar: "bg-primary", chip: "bg-primary/10 text-primary" };
  return { label: "Available", bar: "bg-success", chip: "bg-success/15 text-success" };
}

function formatRole(role: string): string {
  switch (role) {
    case "ADMIN":
      return "Administrator";
    case "PROJECT_MANAGER":
      return "Project Manager";
    case "TEAM_MEMBER":
      return "Team Member";
    default:
      return role;
  }
}

function Team() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTeam = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchTeamMembers();
      setTeam(data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load team data";
      if (msg.includes("401") || msg.includes("Access token missing")) {
        removeAccessToken();
        window.location.href = "/";
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getAccessToken()) {
      window.location.href = "/";
      return;
    }
    void loadTeam();
  }, []);

  const totalAssigned = team.reduce((acc, m) => acc + (m.assignedTasks || 0), 0);

  if (loading) {
    return (
      <AppShell title="Team" subtitle="Loading team members...">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading workspace team members...</p>
        </div>
      </AppShell>
    );
  }

  if (error && team.length === 0) {
    return (
      <AppShell title="Team" subtitle="Error loading team">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Failed to load team</h2>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => {
              void loadTeam();
            }}
            className="mt-6 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
          >
            Try again
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title="Team"
      subtitle={`${team.length} ${team.length === 1 ? "teammate" : "people"} · ${totalAssigned} tasks assigned`}
      actions={
        <button
          type="button"
          onClick={() => void loadTeam()}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-input bg-card px-3.5 text-sm font-medium text-foreground hover:bg-muted transition"
          title="Refresh team workload"
        >
          <RefreshCw className="size-3.5" /> Refresh
        </button>
      }
    >
      {team.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Users className="size-6" />
          </div>
          <h3 className="mt-4 text-base font-semibold">No team members found</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Register new users or seed demo team members to populate the workspace.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {team.map((m) => {
            const tone = workloadTone(m.workload);
            return (
              <Card key={m._id} className="relative transition hover:shadow-md">
                <div className="flex items-center gap-3">
                  <span
                    className="flex size-12 items-center justify-center rounded-2xl text-sm font-semibold text-primary-foreground shadow-sm"
                    style={{ backgroundImage: "var(--gradient-brand)" }}
                  >
                    {m.initials}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{m.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{formatRole(m.role)}</p>
                    <p className="truncate text-[11px] text-muted-foreground/80">{m.email}</p>
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
                    <div className={`h-full rounded-full transition-all duration-500 ${tone.bar}`} style={{ width: `${m.workload}%` }} />
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center rounded-xl bg-muted/50 p-2.5 text-xs">
                  <div>
                    <span className="text-muted-foreground text-[10px] block uppercase">Assigned</span>
                    <span className="font-semibold text-sm text-foreground">{m.assignedTasks}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block uppercase">Done</span>
                    <span className="font-semibold text-sm text-success">{m.completedTasks}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-[10px] block uppercase">Pending</span>
                    <span className="font-semibold text-sm text-foreground">{m.pendingTasks}</span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </AppShell>
  );
}
