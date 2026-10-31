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
import { Card, PriorityBadge, ProgressBar, StatusBadge } from "@/components/ui-bits";
import { formatDate, progressTrend } from "@/data/mock";
import { fetchProjects, fetchProjectTasks, getAccessToken, removeAccessToken, Project, Task, UserBrief } from "@/lib/apiClient";
import { useEffect, useState } from "react";

// Map backend enum strings to UI badge string literals
const mapProjectStatus = (status: string) => {
  switch (status) {
    case "PLANNING":
      return "Planning" as const;
    case "IN_PROGRESS":
      return "In Progress" as const;
    case "ON_HOLD":
      return "On Hold" as const;
    case "COMPLETED":
      return "Completed" as const;
    default:
      return "Planning" as const;
  }
};

const mapTaskPriority = (priority: string) => {
  switch (priority) {
    case "LOW":
      return "Low" as const;
    case "MEDIUM":
      return "Medium" as const;
    case "HIGH":
      return "High" as const;
    case "CRITICAL":
      return "Critical" as const;
    default:
      return "Low" as const;
  }
};

function getInitials(name?: string): string {
  if (!name) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0];
  if (!first) return "??";
  if (parts.length === 1) return first.slice(0, 2).toUpperCase();
  const last = parts[parts.length - 1];
  const lastChar = last ? last.charAt(0) : "";
  return (first.charAt(0) + lastChar).toUpperCase();
}

function getProjectId(project: any): string {
  if (!project) return "";
  if (typeof project === "object" && project._id) return String(project._id);
  return String(project);
}

function getProjectName(task: Task, projects: Project[]): string {
  if (typeof task.project === "object" && (task.project as any)?.name) {
    return (task.project as any).name;
  }
  const pid = getProjectId(task.project);
  return projects.find((p) => p._id === pid)?.name ?? "Untitled project";
}

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load projects then tasks
  useEffect(() => {
    if (!getAccessToken()) {
      window.location.href = "/";
      return;
    }
    let isMounted = true;
    const loadData = async () => {
      try {
        const proj = await fetchProjects();
        if (!isMounted) return;
        setProjects(proj || []);
        if (Array.isArray(proj) && proj.length > 0) {
          const tasksPerProject = await Promise.all(
            proj.map((p) => fetchProjectTasks(p._id).catch(() => []))
          );
          if (!isMounted) return;
          setTasks(tasksPerProject.flat() || []);
        } else {
          setTasks([]);
        }
      } catch (e: unknown) {
        if (!isMounted) return;
        const errMessage = e instanceof Error ? e.message : String(e);
        if (errMessage.includes("401") || errMessage.includes("Access token missing")) {
          removeAccessToken();
          window.location.href = "/";
          return;
        }
        setError(errMessage);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  const overdueTasks = tasks.filter(
    (t) =>
      t.dueDate &&
      !Number.isNaN(new Date(t.dueDate).getTime()) &&
      t.status !== "DONE" &&
      new Date(t.dueDate) < new Date()
  );

  const stats = [
    { label: "Total Projects", value: projects.length, icon: FolderKanban, tone: "text-primary bg-primary/10" },
    {
      label: "Active Projects",
      value: projects.filter((p) => p.status === "IN_PROGRESS").length,
      icon: Timer,
      tone: "text-primary-glow bg-primary-glow/12",
    },
    {
      label: "Completed Tasks",
      value: tasks.filter((t) => t.status === "DONE").length,
      icon: CheckCircle2,
      tone: "text-success bg-success/12",
    },
    {
      label: "Overdue Tasks",
      value: overdueTasks.length,
      icon: AlertTriangle,
      tone: "text-destructive bg-destructive/12",
    },
  ];

  // Derive unique team members from loaded projects and tasks
  const teamMembers = (() => {
    const memberMap = new Map<string, UserBrief>();
    for (const p of projects) {
      if (p.owner?._id) memberMap.set(p.owner._id, p.owner);
      if (Array.isArray(p.members)) {
        for (const m of p.members) {
          if (m?._id) memberMap.set(m._id, m);
        }
      }
    }
    for (const t of tasks) {
      if (t.assignee?._id) memberMap.set(t.assignee._id, t.assignee);
      if (t.creator?._id) memberMap.set(t.creator._id, t.creator);
    }
    return Array.from(memberMap.values());
  })();

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  if (loading) {
    return (
      <AppShell title="Dashboard" subtitle="Loading…">
        <p className="text-foreground">Loading dashboard data…</p>
      </AppShell>
    );
  }
  if (error) {
    return (
      <AppShell title="Dashboard" subtitle="Error">
        <p className="text-destructive">{error}</p>
      </AppShell>
    );
  }

  return (
    <AppShell title="Dashboard" subtitle={`${todayFormatted} · Portfolio Overview`}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-foreground">{s.label}</p>
                <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">{s.value}</p>
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
              <h2 className="font-semibold text-foreground">Progress</h2>
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
                <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={12} stroke="var(--foreground)" />
                <YAxis tickLine={false} axisLine={false} fontSize={12} stroke="var(--foreground)" />
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
            <span
              className={`flex size-9 items-center justify-center rounded-xl ${
                overdueTasks.length > 0
                  ? "bg-destructive/12 text-destructive"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {overdueTasks.length > 0 ? (
                <AlertTriangle className="size-5" />
              ) : (
                <CheckCircle2 className="size-5" />
              )}
            </span>
            <div>
              <h2 className="font-semibold">AI Risk Alert</h2>
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {overdueTasks.length > 0 ? "Active Project Risks" : "Portfolio Health"}
              </span>
            </div>
          </div>

          {overdueTasks.length > 0 ? (
            <>
              <p className="mt-4 text-sm text-foreground">
                <strong>Schedule Warning:</strong> {overdueTasks.length} task
                {overdueTasks.length === 1 ? "" : "s"} passed target deadline and require attention.
              </p>
              <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                {overdueTasks.slice(0, 3).map((t) => (
                  <li key={t._id} className="truncate">
                    • <span className="font-medium text-foreground">{t.title}</span> (due{" "}
                    {t.dueDate ? formatDate(t.dueDate) : "overdue"})
                  </li>
                ))}
              </ul>
            </>
          ) : projects.length > 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              All scheduled tasks are currently on track. No blocking risks or deadline overruns detected across your portfolio.
            </p>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              No project risk data available yet. Create projects and assign task deadlines to enable AI-assisted risk tracking.
            </p>
          )}

          <Link
            to="/assistant"
            className="mt-5 inline-flex text-sm font-semibold text-primary hover:underline"
          >
            Open AI Assistant →
          </Link>
        </Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Recent projects</h2>
            <Link to="/projects" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-4">
            {projects.slice(0, 4).map((p) => {
              const projectTasks = tasks.filter((t) => getProjectId(t.project) === p._id);
              const totalTasks = projectTasks.length;
              const completedTasks = projectTasks.filter((t) => t.status === "DONE").length;
              const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

              return (
                <Link
                  key={p._id}
                  to="/projects/$projectId"
                  params={{ projectId: p._id }}
                  className="block rounded-xl p-3 transition-colors hover:bg-muted/60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <StatusBadge status={mapProjectStatus(p.status)} />
                  </div>
                  <div className="mt-2 space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress ({completedTasks}/{totalTasks} tasks)</span>
                      <span className="font-medium text-foreground">{progress}%</span>
                    </div>
                    <ProgressBar value={progress} />
                  </div>
                </Link>
              );
            })}
            {projects.length === 0 && <p className="text-muted-foreground">No projects found.</p>}
          </div>
        </Card>

        <Card>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Recent tasks</h2>
            <Link to="/tasks" className="text-sm font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <div className="space-y-3">
            {tasks.slice(0, 6).map((t) => (
              <div key={t._id} className="flex items-center justify-between gap-3 rounded-xl p-2.5 hover:bg-muted/60">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {getProjectName(t, projects)} · {t.assignee?.name ?? "Unassigned"} · due {t.dueDate ? formatDate(t.dueDate) : "No due date"}
                  </p>
                </div>
                <PriorityBadge priority={mapTaskPriority(t.priority)} />
              </div>
            ))}
            {tasks.length === 0 && <p className="text-muted-foreground">No tasks found.</p>}
          </div>
        </Card>
      </div>

      <div className="mt-6">
        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-foreground">Team snapshot</h2>
            <Link to="/team" className="text-sm font-medium text-primary hover:underline">
              Manage team
            </Link>
          </div>
          <div className="mt-4">
            {teamMembers.length > 0 ? (
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2">
                  {teamMembers.slice(0, 8).map((m) => (
                    <span
                      key={m._id}
                      title={`${m.name} (${m.role})`}
                      className="flex size-8 items-center justify-center rounded-full border-2 border-card bg-accent text-[11px] font-semibold text-accent-foreground"
                    >
                      {getInitials(m.name)}
                    </span>
                  ))}
                  {teamMembers.length > 8 && (
                    <span className="flex size-8 items-center justify-center rounded-full border-2 border-card bg-muted text-[11px] font-medium text-muted-foreground">
                      +{teamMembers.length - 8}
                    </span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">
                  {teamMembers.length} {teamMembers.length === 1 ? "member" : "members"}
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No team members assigned yet.</p>
            )}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
