import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, AlertCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, PriorityBadge } from "@/components/ui-bits";
import { cn } from "@/lib/utils";
import {
  fetchProjects,
  fetchProjectTasks,
  createTask,
  updateTask,
  getAccessToken,
  removeAccessToken,
  getStoredUser,
  isTeamLead,
  Project,
  Task,
  CreateTaskInput,
  UserBrief,
} from "@/lib/apiClient";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Nimbus PM" },
      {
        name: "description",
        content:
          "All tasks in one table: assignee, priority, status and due date, with quick task creation.",
      },
      { property: "og:title", content: "Tasks — Nimbus PM" },
      {
        property: "og:description",
        content: "All tasks with assignee, priority, status and due date.",
      },
    ],
  }),
  component: Tasks,
});

const filters = ["All", "To Do", "In Progress", "Review", "Done"] as const;
type FilterType = (typeof filters)[number];

const taskStatusStyles: Record<"To Do" | "In Progress" | "Review" | "Done", string> = {
  "To Do": "bg-muted text-muted-foreground",
  "In Progress": "bg-primary/10 text-primary",
  Review: "bg-warning/15 text-warning",
  Done: "bg-success/15 text-success",
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
  if (!d) return "No due date";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "No due date";
  return parsed.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function isOverdue(dueDate?: string, status?: string): boolean {
  if (!dueDate || status === "DONE") return false;
  const parsed = new Date(dueDate);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.getTime() < Date.now();
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

function Tasks() {
  const [currentUser, setCurrentUser] = useState<UserBrief | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [list, setList] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const [filter, setFilter] = useState<FilterType>("All");
  const [open, setOpen] = useState(false);

  const canCreateTask = isTeamLead(currentUser);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  const loadAllData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const projs = await fetchProjects();
      setProjects(projs);

      const tasksArrays = await Promise.all(
        projs.map((p) =>
          fetchProjectTasks(p._id).catch((err) => {
            console.warn(`Failed to fetch tasks for project ${p._id}:`, err);
            return [] as Task[];
          })
        )
      );
      const combined = tasksArrays.flat();
      combined.sort((a, b) => {
        const tA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const tB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return tB - tA;
      });
      setList(combined);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load tasks and projects";
      if (msg.includes("401") || msg.includes("Access token missing")) {
        removeAccessToken();
        window.location.href = "/";
        return;
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!getAccessToken()) {
      window.location.href = "/";
      return;
    }
    void loadAllData();
  }, [loadAllData]);

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    setUpdatingId(taskId);
    setActionError(null);
    try {
      await updateTask(taskId, { status: newStatus });
      setList((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update task status";
      setActionError(msg);
    } finally {
      setUpdatingId(null);
    }
  };

  const projectMap = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of projects) {
      map.set(p._id, p);
    }
    return map;
  }, [projects]);

  const visible = useMemo(
    () => (filter === "All" ? list : list.filter((t) => mapTaskStatus(t.status) === filter)),
    [list, filter]
  );

  const overdueCount = useMemo(
    () => list.filter((t) => isOverdue(t.dueDate, t.status)).length,
    [list]
  );

  if (loading) {
    return (
      <AppShell title="Tasks" subtitle="Loading tasks...">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-4 text-sm text-muted-foreground">Loading tasks and projects...</p>
        </div>
      </AppShell>
    );
  }

  if (error && list.length === 0) {
    return (
      <AppShell title="Tasks" subtitle="Error loading tasks">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-card p-12 text-center shadow-sm">
          <div className="flex size-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertCircle className="size-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold">Failed to load tasks</h2>
          <p className="mt-1 text-sm text-muted-foreground">{error}</p>
          <button
            type="button"
            onClick={() => {
              void loadAllData();
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
      title="Tasks"
      subtitle={`${list.length} tasks · ${overdueCount} overdue`}
      actions={
        canCreateTask ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold text-primary-foreground cursor-pointer shadow-xs hover:opacity-95 transition"
            style={{ backgroundImage: "var(--gradient-brand)" }}
          >
            <Plus className="size-4" /> Add Task
          </button>
        ) : (
          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            👤 Member View (Lead assigns tasks)
          </span>
        )
      }
    >
      {actionError && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          <span>{actionError}</span>
          <button
            type="button"
            onClick={() => setActionError(null)}
            className="text-xs font-semibold underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            type="button"
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-muted text-foreground"
                : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {projects.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-semibold text-foreground">No projects available</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {canCreateTask
              ? "Create a project first to start creating and managing tasks."
              : "No projects have been assigned to you yet. Your Team Lead will add you to a project."}
          </p>
        </Card>
      ) : list.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="font-semibold text-foreground">No tasks found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {canCreateTask
              ? "Get started by adding your first task to a project."
              : "No tasks have been assigned to you in these projects."}
          </p>
          {canCreateTask && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold text-primary-foreground cursor-pointer"
              style={{ backgroundImage: "var(--gradient-brand)" }}
            >
              <Plus className="size-4" /> Add Task
            </button>
          )}
        </Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-5 py-3 font-medium">Task</th>
                <th className="px-5 py-3 font-medium">Assignee</th>
                <th className="px-5 py-3 font-medium">Priority</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Due date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                    No tasks with status &ldquo;{filter}&rdquo;.
                  </td>
                </tr>
              ) : (
                visible.map((t) => {
                  const overdue = isOverdue(t.dueDate, t.status);
                  const projName = projectMap.get(t.project)?.name ?? "Unknown project";
                  return (
                    <tr key={t._id} className="hover:bg-muted/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-foreground">{t.title}</p>
                        <p className="text-xs text-muted-foreground">{projName}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        {t.assignee ? (
                          <span className="inline-flex items-center gap-2">
                            <span className="flex size-7 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                              {getInitials(t.assignee.name)}
                            </span>
                            <span className="font-medium text-foreground">{t.assignee.name}</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 text-muted-foreground">
                            <span className="flex size-7 items-center justify-center rounded-full bg-muted text-[10px] font-medium text-muted-foreground">
                              --
                            </span>
                            <span>Unassigned</span>
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <PriorityBadge priority={mapTaskPriority(t.priority)} />
                      </td>
                      <td className="px-5 py-3.5">
                        <select
                          aria-label={`Change status for task ${t.title}`}
                          value={t.status}
                          disabled={updatingId === t._id}
                          onChange={(e) => {
                            void handleStatusChange(t._id, e.target.value);
                          }}
                          className={cn(
                            "cursor-pointer rounded-full border-0 px-2.5 py-1 text-xs font-medium outline-none transition focus:ring-2 focus:ring-ring/40",
                            taskStatusStyles[mapTaskStatus(t.status)],
                            updatingId === t._id && "cursor-wait opacity-50"
                          )}
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="IN_REVIEW">Review</option>
                          <option value="DONE">Done</option>
                        </select>
                      </td>
                      <td
                        className={`px-5 py-3.5 ${
                          overdue
                            ? "font-medium text-destructive"
                            : "text-muted-foreground"
                        }`}
                      >
                        {formatDate(t.dueDate)}
                        {overdue && " · overdue"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </Card>
      )}

      {open && (
        <AddTaskDialog
          projects={projects}
          onClose={() => setOpen(false)}
          onSuccess={loadAllData}
        />
      )}
    </AppShell>
  );
}

interface AddTaskDialogProps {
  projects: Project[];
  onClose: () => void;
  onSuccess: () => Promise<void>;
}

function AddTaskDialog({ projects, onClose, onSuccess }: AddTaskDialogProps) {
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    () => projects[0]?._id ?? ""
  );
  const [title, setTitle] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [dueDate, setDueDate] = useState(() =>
    new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);

  const selectedProject = useMemo(
    () => projects.find((p) => p._id === selectedProjectId),
    [projects, selectedProjectId]
  );

  const candidateAssignees = useMemo(() => {
    if (!selectedProject) return [];
    const memberMap = new Map<string, UserBrief>();
    if (selectedProject.owner?._id) {
      memberMap.set(selectedProject.owner._id, selectedProject.owner);
    }
    if (Array.isArray(selectedProject.members)) {
      for (const m of selectedProject.members) {
        if (m?._id) memberMap.set(m._id, m);
      }
    }
    return Array.from(memberMap.values());
  }, [selectedProject]);

  const handleProjectChange = (newProjectId: string) => {
    setSelectedProjectId(newProjectId);
    const nextProj = projects.find((p) => p._id === newProjectId);
    const validIds = new Set<string>();
    if (nextProj?.owner?._id) validIds.add(nextProj.owner._id);
    for (const m of nextProj?.members || []) {
      if (m?._id) validIds.add(m._id);
    }
    if (assigneeId && !validIds.has(assigneeId)) {
      setAssigneeId("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId) {
      setDialogError("Please select a project.");
      return;
    }
    if (!title.trim()) {
      setDialogError("Task name is required.");
      return;
    }

    setIsSubmitting(true);
    setDialogError(null);

    try {
      const payload: CreateTaskInput = {
        title: title.trim(),
        priority,
        status: "TODO",
      };
      if (assigneeId) {
        payload.assignee = assigneeId;
      }
      if (dueDate) {
        payload.dueDate = dueDate;
      }

      await createTask(selectedProjectId, payload);
      await onSuccess();
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create task";
      setDialogError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <form
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6"
        style={{ boxShadow: "var(--shadow-card)" }}
        onSubmit={(e) => {
          void handleSubmit(e);
        }}
      >
        <h2 className="text-lg font-semibold">Add task</h2>

        {dialogError && (
          <div className="mt-3 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-xs text-destructive">
            {dialogError}
          </div>
        )}

        <div className="mt-5 space-y-4">
          <Field label="Task name">
            <input
              name="name"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputCls}
              placeholder="e.g. Draft release notes"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Project">
              <select
                name="projectId"
                className={inputCls}
                value={selectedProjectId}
                onChange={(e) => handleProjectChange(e.target.value)}
              >
                {projects.map((p) => (
                  <option key={p._id} value={p._id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assignee">
              <select
                name="assignee"
                className={inputCls}
                value={assigneeId}
                onChange={(e) => setAssigneeId(e.target.value)}
              >
                <option value="">Unassigned</option>
                {candidateAssignees.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name} ({m.email})
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select
                name="priority"
                className={inputCls}
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="CRITICAL">Critical</option>
              </select>
            </Field>
            <Field label="Due date">
              <input
                type="date"
                name="dueDate"
                className={inputCls}
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </Field>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="h-9 rounded-xl border border-input px-4 text-sm font-medium hover:bg-muted transition"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="h-9 rounded-xl px-4 text-sm font-semibold text-primary-foreground hover:opacity-90 transition disabled:opacity-50"
            style={{ backgroundImage: "var(--gradient-brand)" }}
          >
            {isSubmitting ? "Adding..." : "Add task"}
          </button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  "h-10 w-full rounded-xl border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring/40";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
