import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays, AlertCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, PriorityBadge, ProgressBar, StatusBadge } from "@/components/ui-bits";
import {
  fetchProjectById,
  fetchProjectTasks,
  Project,
  Task,
  UserBrief,
} from "@/lib/apiClient";

export const Route = createFileRoute("/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Project details — Nimbus PM" },
      {
        name: "description",
        content:
          "Project overview with progress, task list, team, deadline and recent activity.",
      },
      { property: "og:title", content: "Project details — Nimbus PM" },
      {
        property: "og:description",
        content: "Progress, tasks, team, deadline and activity for this project.",
      },
    ],
  }),
  component: ProjectDetails,
});

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

const mapTaskStatus = (status: string) => {
  switch (status) {
    case "TODO":
      return "To Do" as const;
    case "IN_PROGRESS":
      return "In Progress" as const;
    case "IN_REVIEW":
      return "Review" as const;
    case "DONE":
      return "Done" as const;
    default:
      return "To Do" as const;
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
      return "Medium" as const;
  }
};

function formatDate(d?: string): string {
  if (!d) return "No deadline";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "No deadline";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  if (Number.isNaN(date.getTime())) return "";
  const now = Date.now();
  const diffMs = now - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatRole(role?: string): string {
  if (!role) return "Team Member";
  switch (role) {
    case "ADMIN":
      return "Admin";
    case "PROJECT_MANAGER":
      return "Project Manager";
    case "TEAM_MEMBER":
      return "Team Member";
    default:
      return role;
  }
}

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

interface ActivityItem {
  id: string;
  text: string;
  time: string;
  timestamp: number;
}

function ProjectDetails() {
  const { projectId } = Route.useParams();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);

  const loadData = useCallback(async () => {
    if (!projectId) {
      setIsNotFound(true);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setIsNotFound(false);
    try {
      const proj = await fetchProjectById(projectId);
      setProject(proj);
      try {
        const projTasks = await fetchProjectTasks(projectId);
        setTasks(projTasks);
      } catch (taskErr: unknown) {
        console.warn("Could not load tasks for project:", taskErr);
        setTasks([]);
      }
    } catch (err: unknown) {
      const is404 =
        (err !== null &&
          typeof err === "object" &&
          "status" in err &&
          (err as { status: unknown }).status === 404) ||
        (err instanceof Error && err.message.toLowerCase().includes("not found"));
      if (is404) {
        setIsNotFound(true);
      } else {
        const msg = err instanceof Error ? err.message : "Failed to load project";
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  if (loading) {
    return (
      <AppShell title="Project Details" subtitle="Loading project details...">
        <Link
          to="/projects"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All projects
        </Link>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading project and tasks...</p>
        </div>
      </AppShell>
    );
  }

  if (isNotFound || !project) {
    return (
      <AppShell title="Project Not Found" subtitle="The requested project does not exist">
        <Link
          to="/projects"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All projects
        </Link>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Project not found</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            No project exists with ID &ldquo;{projectId}&rdquo; or you do not have permission to view it.
          </p>
          <Link
            to="/projects"
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
          >
            <ArrowLeft className="size-4" /> Return to all projects
          </Link>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Project Details" subtitle="Error loading project">
        <Link
          to="/projects"
          className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> All projects
        </Link>
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Failed to load project</h2>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => {
              void loadData();
            }}
            className="mt-6 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition"
          >
            Try again
          </button>
        </div>
      </AppShell>
    );
  }

  const done = tasks.filter((t) => t.status === "DONE").length;
  const progressPercent = tasks.length > 0 ? Math.round((done / tasks.length) * 100) : 0;

  // Compile team list from owner and members
  const allMembersMap = new Map<string, { user: UserBrief; isOwner: boolean }>();
  if (project.owner?._id) {
    allMembersMap.set(project.owner._id, { user: project.owner, isOwner: true });
  }
  if (Array.isArray(project.members)) {
    for (const m of project.members) {
      if (m?._id && !allMembersMap.has(m._id)) {
        allMembersMap.set(m._id, { user: m, isOwner: false });
      }
    }
  }
  const teamList = Array.from(allMembersMap.values());

  // Compile real activity entries
  const activities: ActivityItem[] = [];
  if (project.createdAt) {
    const t = new Date(project.createdAt).getTime();
    activities.push({
      id: `proj-create-${project._id}`,
      text: `Project created by ${project.owner?.name ?? "Owner"}`,
      time: formatRelativeTime(project.createdAt),
      timestamp: Number.isNaN(t) ? 0 : t,
    });
  }

  if (project.updatedAt && project.updatedAt !== project.createdAt) {
    const t = new Date(project.updatedAt).getTime();
    activities.push({
      id: `proj-update-${project._id}`,
      text: `Project status updated to ${mapProjectStatus(project.status)}`,
      time: formatRelativeTime(project.updatedAt),
      timestamp: Number.isNaN(t) ? 0 : t,
    });
  }

  for (const task of tasks) {
    if (task.createdAt) {
      const t = new Date(task.createdAt).getTime();
      const actor = task.creator?.name ?? "Team member";
      activities.push({
        id: `task-create-${task._id}`,
        text: `Task "${task.title}" added by ${actor}`,
        time: formatRelativeTime(task.createdAt),
        timestamp: Number.isNaN(t) ? 0 : t,
      });
    }
  }

  activities.sort((a, b) => b.timestamp - a.timestamp);
  const recentActivities = activities.slice(0, 5);

  return (
    <AppShell title={project.name} subtitle={`Due ${formatDate(project.deadline)}`}>
      <Link
        to="/projects"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> All projects
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold">Overview</h2>
            <StatusBadge status={mapProjectStatus(project.status)} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {project.description || "No description provided."}
          </p>

          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="font-medium text-foreground">{progressPercent}%</span>
            </div>
            <ProgressBar value={progressPercent} />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              ["Tasks", tasks.length],
              ["Completed", done],
              ["Open", tasks.length - done],
            ].map(([l, v]) => (
              <div key={l as string} className="rounded-xl bg-muted/60 p-3">
                <p className="text-xl font-semibold">{v}</p>
                <p className="text-xs text-muted-foreground">{l}</p>
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h2 className="font-semibold">Deadline</h2>
            <p className="mt-3 inline-flex items-center gap-2 text-sm">
              <CalendarDays className="size-4 text-primary" /> {formatDate(project.deadline)}
            </p>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">Team</h2>
              <span className="text-xs text-muted-foreground">{teamList.length} members</span>
            </div>
            <div className="mt-4 space-y-3">
              {teamList.length === 0 ? (
                <p className="text-xs text-muted-foreground">No team members assigned.</p>
              ) : (
                teamList.map(({ user, isOwner }) => (
                  <div key={user._id} className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                      {getInitials(user.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {user.name}
                        {isOwner && (
                          <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                            Owner
                          </span>
                        )}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {formatRole(user.role)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Tasks</h2>
            <span className="text-xs text-muted-foreground">{tasks.length} total</span>
          </div>
          {tasks.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No tasks created for this project yet.
            </div>
          ) : (
            <div className="mt-4 divide-y divide-border">
              {tasks.map((t) => (
                <div key={t._id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{t.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {t.assignee?.name ? `${t.assignee.name} · ` : "Unassigned · "}
                      due {formatDate(t.dueDate)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <PriorityBadge priority={mapTaskPriority(t.priority)} />
                    <StatusBadge status={mapTaskStatus(t.status)} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <h2 className="font-semibold">Activity</h2>
          {recentActivities.length === 0 ? (
            <p className="mt-4 text-xs text-muted-foreground">No recent activity recorded.</p>
          ) : (
            <ol className="mt-4 space-y-4">
              {recentActivities.map((a) => (
                <li key={a.id} className="flex gap-3">
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                  <div>
                    <p className="text-sm">{a.text}</p>
                    <p className="text-xs text-muted-foreground">{a.time}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <div className="flex -space-x-2">
          {teamList.map(({ user }) => (
            <span
              key={user._id}
              title={`${user.name} (${user.email})`}
              className="flex size-8 items-center justify-center rounded-full border-2 border-card bg-accent text-[11px] font-semibold text-accent-foreground"
            >
              {getInitials(user.name)}
            </span>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">
          {teamList.length} team {teamList.length === 1 ? "member" : "members"}
        </span>
      </div>
    </AppShell>
  );
}
