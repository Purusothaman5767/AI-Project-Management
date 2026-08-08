import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, CheckCircle2, FolderKanban, Timer } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AvatarStack, Card, PriorityBadge, ProgressBar, StatusBadge } from "@/components/ui-bits";
import { formatDate, isOverdue, memberById, progressTrend, projectById, projects, tasks } from "@/data/mock";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — Nimbus PM" },
      { name: "description", content: "Track project health, task progress and AI risk alerts across your portfolio." },
      { property: "og:title", content: "Dashboard — Nimbus PM" },
      { property: "og:description", content: "Track project health, task progress and AI risk alerts." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const stats = [
    { label: "Total Projects", value: projects.length, icon: FolderKanban, tone: "text-primary bg-primary/10" },
    {
      label: "Active Projects",
      value: projects.filter((p) => p.status === "In Progress").length,
      icon: Timer,
      tone: "text-primary-glow bg-primary-glow/12",
    },
    {
      label: "Completed Tasks",
      value: tasks.filter((t) => t.status === "Done").length,
      icon: CheckCircle2,
      tone: "text-success bg-success/12",
    },
    {
      label: "Overdue Tasks",
      value: tasks.filter(isOverdue).length,
      icon: AlertTriangle,
      tone: "text-destructive bg-destructive/12",
    },
  ];

  return (
    <AppShell title="Dashboard" subtitle="Friday, August 8 · portfolio overview">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight">{s.value}</p>
              </div>
              <span className={`flex size-10 items-center justify-center rounded-xl ${s.tone}`}>
                <s.icon className="size-5" />
              </span>
            </div>
          </Card>
        ))}
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Progress</h2>
              <p className="text-xs text-muted-foreground">Completed vs planned tasks</p>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={progressTrend} margin={{ left: -20, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--chart-2)" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="var(--chart-2)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--muted-foreground)" />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid var(--border)",
                    background: "var(--card)",
                    fontSize: 12,
                  }}
                />
                <Area type="monotone" dataKey="planned" stroke="var(--chart-2)" fill="url(#g2)" strokeWidth={2} />
                <Area type="monotone" dataKey="completed" stroke="var(--chart-1)" fill="url(#g1)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="border-primary/25 bg-accent/40">
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-destructive/12 text-destructive">
              <AlertTriangle className="size-5" />
            </span>
            <h2 className="font-semibold">AI Risk Alert</h2>
          </div>
          <p className="mt-4 text-sm text-foreground/90">
            <strong>Billing Revamp</strong> is trending 9 days late. Proration work is blocked and
            Noah Patel is at 94% workload.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
            <li>• Reassign 2 QA tasks to Marcus Reid (45% load)</li>
            <li>• Move “Invoice PDF template” to next sprint</li>
            <li>• Compliance Audit paused 4 days — needs a decision</li>
          </ul>
          <Link to="/assistant" className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline">
            Open AI Assistant →
          </Link>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Recent projects</h2>
            <Link to="/projects" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {projects.slice(0, 4).map((p) => (
              <Link
                key={p.id}
                to="/projects/$projectId"
                params={{ projectId: p.id }}
                className="block rounded-xl p-3 transition-colors hover:bg-muted/60"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="truncate text-sm font-medium">{p.name}</p>
                  <StatusBadge status={p.status} />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar value={p.progress} />
                  <span className="w-10 shrink-0 text-right text-xs text-muted-foreground">{p.progress}%</span>
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold">Recent tasks</h2>
            <Link to="/tasks" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {tasks.slice(0, 6).map((t) => (
              <div key={t.id} className="flex items-center justify-between gap-3 rounded-xl p-2.5 hover:bg-muted/60">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {projectById(t.projectId)?.name} · {memberById(t.assignee)?.name} · due {formatDate(t.dueDate)}
                  </p>
                </div>
                <PriorityBadge priority={t.priority} />
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <h2 className="font-semibold">Team snapshot</h2>
          <div className="mt-4 flex items-center justify-between">
            <AvatarStack ids={["m1", "m2", "m3", "m4", "m5", "m6"]} />
            <Link to="/team" className="text-sm font-medium text-primary hover:underline">
              Manage team
            </Link>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
