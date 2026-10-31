import { createFileRoute, Link } from "@tanstack/react-router";
import {
  CalendarDays,
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  X,
  AlertCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Card, ProgressBar, StatusBadge } from "@/components/ui-bits";
import {
  fetchProjects,
  fetchProjectTasks,
  createProject,
  updateProject,
  deleteProject,
  fetchUsers,
  getAccessToken,
  removeAccessToken,
  getStoredUser,
  isTeamLead,
  Project,
  Task,
  UserBrief,
} from "@/lib/apiClient";

export const Route = createFileRoute("/projects/")({
  head: () => ({
    meta: [
      { title: "Projects — Nimbus PM" },
      {
        name: "description",
        content:
          "Browse every project with progress, deadlines, status and assigned team members.",
      },
      { property: "og:title", content: "Projects — Nimbus PM" },
      {
        property: "og:description",
        content:
          "Browse every project with progress, deadlines and team members.",
      },
    ],
  }),
  component: Projects,
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

const getTodayInput = () => new Date().toISOString().slice(0, 10);
const getFutureInput = (days: number) =>
  new Date(Date.now() + days * 86400000).toISOString().slice(0, 10);

function Projects() {
  const [currentUser, setCurrentUser] = useState<UserBrief | null>(null);
  const [projectList, setProjectList] = useState<Project[]>([]);
  const [tasksMap, setTasksMap] = useState<Record<string, Task[]>>({});
  const [availableUsers, setAvailableUsers] = useState<UserBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingProject, setDeletingProject] = useState<Project | null>(null);

  const [modalError, setModalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canCreateAndManage = isTeamLead(currentUser);

  useEffect(() => {
    setCurrentUser(getStoredUser());
  }, []);

  // Create form state
  const [createName, setCreateName] = useState("");
  const [createDescription, setCreateDescription] = useState("");
  const [createStartDate, setCreateStartDate] = useState(getTodayInput);
  const [createDeadline, setCreateDeadline] = useState(() => getFutureInput(30));
  const [createStatus, setCreateStatus] = useState("PLANNING");
  const [createPriority, setCreatePriority] = useState("MEDIUM");
  const [createMembers, setCreateMembers] = useState<string[]>([]);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStartDate, setEditStartDate] = useState(getTodayInput);
  const [editDeadline, setEditDeadline] = useState(() => getFutureInput(30));
  const [editStatus, setEditStatus] = useState("PLANNING");
  const [editPriority, setEditPriority] = useState("MEDIUM");
  const [editMembers, setEditMembers] = useState<string[]>([]);

  const loadProjects = async () => {
    try {
      setLoading(true);
      setError(null);
      const [projects, users] = await Promise.all([
        fetchProjects(),
        fetchUsers().catch(() => [] as UserBrief[]),
      ]);
      setProjectList(projects);
      setAvailableUsers(users);

      // Load tasks for progress calculation
      const tasksPerProject = await Promise.all(
        projects.map((p) =>
          fetchProjectTasks(p._id)
            .then((tasks) => ({ id: p._id, tasks }))
            .catch(() => ({ id: p._id, tasks: [] as Task[] }))
        )
      );

      const mapping: Record<string, Task[]> = {};
      for (const item of tasksPerProject) {
        mapping[item.id] = item.tasks;
      }
      setTasksMap(mapping);
    } catch (err: unknown) {
      const errMessage = err instanceof Error ? err.message : String(err);
      if (errMessage.includes("401") || errMessage.includes("Access token missing")) {
        removeAccessToken();
        window.location.href = "/";
        return;
      }
      setError(errMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!getAccessToken()) {
      window.location.href = "/";
      return;
    }
    loadProjects();
  }, []);

  const openCreate = () => {
    setCreateName("");
    setCreateDescription("");
    setCreateStartDate(getTodayInput());
    setCreateDeadline(getFutureInput(30));
    setCreateStatus("PLANNING");
    setCreatePriority("MEDIUM");
    setCreateMembers([]);
    setModalError(null);
    setIsCreating(true);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!createName.trim()) {
      setModalError("Project name is required.");
      return;
    }

    if (new Date(createDeadline) < new Date(createStartDate)) {
      setModalError("Deadline cannot be earlier than start date.");
      return;
    }

    try {
      setIsSubmitting(true);
      setModalError(null);
      await createProject({
        name: createName.trim(),
        description: createDescription.trim() || undefined,
        startDate: new Date(createStartDate).toISOString(),
        deadline: new Date(createDeadline).toISOString(),
        status: createStatus,
        priority: createPriority,
        members: createMembers.length > 0 ? createMembers : undefined,
      });

      setIsCreating(false);
      await loadProjects();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEdit = (project: Project) => {
    setEditingProject(project);
    setEditName(project.name);
    setEditDescription(project.description || "");
    setEditStartDate(
      project.startDate ? project.startDate.slice(0, 10) : getTodayInput()
    );
    setEditDeadline(
      project.deadline ? project.deadline.slice(0, 10) : getFutureInput(30)
    );
    setEditStatus(project.status || "PLANNING");
    setEditPriority(project.priority || "MEDIUM");
    setEditMembers(project.members?.map((m) => m._id) || []);
    setModalError(null);
    setMenuOpen(null);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject || isSubmitting) return;

    if (!editName.trim()) {
      setModalError("Project name is required.");
      return;
    }

    if (new Date(editDeadline) < new Date(editStartDate)) {
      setModalError("Deadline cannot be earlier than start date.");
      return;
    }

    try {
      setIsSubmitting(true);
      setModalError(null);
      await updateProject(editingProject._id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        startDate: new Date(editStartDate).toISOString(),
        deadline: new Date(editDeadline).toISOString(),
        status: editStatus,
        priority: editPriority,
        members: editMembers,
      });

      setEditingProject(null);
      await loadProjects();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingProject || isSubmitting) return;

    try {
      setIsSubmitting(true);
      setModalError(null);
      await deleteProject(deletingProject._id);
      setDeletingProject(null);
      await loadProjects();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppShell title="Projects" subtitle="Loading projects…">
        <div className="flex items-center justify-center p-16">
          <p className="text-sm text-muted-foreground">Loading projects…</p>
        </div>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell title="Projects" subtitle="Error loading projects">
        <div
          className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-destructive"
          role="alert"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="size-5" />
            <p className="font-semibold">Unable to load projects</p>
          </div>
          <p className="mt-2 text-sm">{error}</p>
          <button
            type="button"
            onClick={loadProjects}
            className="mt-4 rounded-xl border border-destructive/40 px-4 py-2 text-sm font-medium hover:bg-destructive/20"
          >
            Try Again
          </button>
        </div>
      </AppShell>
    );
  }

  return (
    <>
      <AppShell
        title="Projects"
        subtitle={`${projectList.length} ${
          projectList.length === 1 ? "project" : "projects"
        } in the workspace`}
        actions={
          canCreateAndManage ? (
            <button
              type="button"
              onClick={openCreate}
              className="hidden h-9 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold text-primary-foreground sm:inline-flex cursor-pointer"
              style={{ backgroundImage: "var(--gradient-brand)" }}
            >
              <Plus className="size-4" />
              New Project
            </button>
          ) : (
            <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/60 px-3 py-1 text-xs font-medium text-muted-foreground">
              👤 Member View (Lead manages projects)
            </span>
          )
        }
      >
        {projectList.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border p-12 text-center">
            <h3 className="text-base font-semibold text-foreground">
              No projects found
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {canCreateAndManage
                ? "Get started by creating your first project to track tasks, deadlines, and progress."
                : "No projects have been assigned to you yet. Your Team Lead will add you as a project member."}
            </p>
            {canCreateAndManage && (
              <button
                type="button"
                onClick={openCreate}
                className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-xl px-4 text-sm font-semibold text-primary-foreground cursor-pointer"
                style={{ backgroundImage: "var(--gradient-brand)" }}
              >
                <Plus className="size-4" />
                New Project
              </button>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {projectList.map((p) => {
              const pTasks = tasksMap[p._id] || [];
              const totalTasks = pTasks.length;
              const completedTasks = pTasks.filter(
                (t) => t.status === "DONE"
              ).length;
              const progress =
                totalTasks > 0
                  ? Math.round((completedTasks / totalTasks) * 100)
                  : 0;

              const membersList = [p.owner, ...(p.members || [])].filter(
                (m): m is UserBrief => Boolean(m && m._id)
              );
              const isOwnerOrLead = canCreateAndManage || p.owner?._id === currentUser?._id;

              return (
                <div key={p._id} className="relative">
                  <Link
                    to="/projects/$projectId"
                    params={{ projectId: p._id }}
                    className="group block"
                  >
                    <Card className="relative transition-shadow hover:shadow-md">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h3 className="font-semibold text-foreground">
                            {p.name}
                          </h3>

                          <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted-foreground">
                            {p.description || "No description provided."}
                          </p>
                        </div>

                        {isOwnerOrLead && (
                          <div
                            className="relative shrink-0"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setMenuOpen(menuOpen === p._id ? null : p._id);
                              }}
                              className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground cursor-pointer"
                              aria-label={`Actions for ${p.name}`}
                            >
                              <MoreVertical className="size-4" />
                            </button>

                          {menuOpen === p._id && (
                            <div
                              className="absolute right-0 top-9 z-30 w-36 overflow-hidden rounded-xl border bg-background p-1 shadow-lg"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                              }}
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  openEdit(p);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
                              >
                                <Pencil className="size-4" />
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  setDeletingProject(p);
                                  setModalError(null);
                                  setMenuOpen(null);
                                }}
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-500/10"
                              >
                                <Trash2 className="size-4" />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        <StatusBadge status={mapProjectStatus(p.status)} />
                        {p.priority && (
                          <span className="text-xs uppercase tracking-wide text-muted-foreground">
                            {p.priority}
                          </span>
                        )}
                      </div>

                      <div className="mt-5 space-y-2">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            Progress ({completedTasks}/{totalTasks} tasks)
                          </span>
                          <span className="font-medium text-foreground">
                            {progress}%
                          </span>
                        </div>

                        <ProgressBar value={progress} />
                      </div>

                      <div className="mt-5 flex items-center justify-between">
                        <div className="flex -space-x-1.5">
                          {membersList.slice(0, 4).map((m) => (
                            <span
                              key={m._id}
                              title={`${m.name} (${m.role})`}
                              className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-accent text-[10px] font-semibold text-accent-foreground"
                            >
                              {getInitials(m.name)}
                            </span>
                          ))}
                          {membersList.length > 4 && (
                            <span className="flex size-7 items-center justify-center rounded-full border-2 border-card bg-muted text-[10px] font-medium text-muted-foreground">
                              +{membersList.length - 4}
                            </span>
                          )}
                        </div>

                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                          <CalendarDays className="size-3.5" />
                          {formatDate(p.deadline)}
                        </span>
                      </div>
                    </Card>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </AppShell>

      {/* CREATE MODAL */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">New Project</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Create a new project workspace.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            {modalError && (
              <div
                className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
              >
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreate} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="create-name">
                  Project Name *
                </label>
                <input
                  id="create-name"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                  placeholder="e.g. Mobile App Redesign"
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="create-description">
                  Description
                </label>
                <textarea
                  id="create-description"
                  value={createDescription}
                  onChange={(e) => setCreateDescription(e.target.value)}
                  rows={3}
                  placeholder="Goals, deliverables and context..."
                  className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="create-status">
                    Status
                  </label>
                  <select
                    id="create-status"
                    value={createStatus}
                    onChange={(e) => setCreateStatus(e.target.value)}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="create-priority">
                    Priority
                  </label>
                  <select
                    id="create-priority"
                    value={createPriority}
                    onChange={(e) => setCreatePriority(e.target.value)}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="create-start-date">
                    Start Date *
                  </label>
                  <input
                    id="create-start-date"
                    type="date"
                    value={createStartDate}
                    onChange={(e) => setCreateStartDate(e.target.value)}
                    required
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="create-deadline">
                    Deadline *
                  </label>
                  <input
                    id="create-deadline"
                    type="date"
                    value={createDeadline}
                    onChange={(e) => setCreateDeadline(e.target.value)}
                    required
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {availableUsers.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Assign Team Members
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto rounded-xl border border-input bg-card p-2">
                    {availableUsers.map((u) => {
                      const isSelected = createMembers.includes(u._id);
                      return (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setCreateMembers(createMembers.filter((id) => id !== u._id));
                            } else {
                              setCreateMembers([...createMembers, u._id]);
                            }
                          }}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {u.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  style={{ backgroundImage: "var(--gradient-brand)" }}
                >
                  {isSubmitting ? "Creating…" : "Create Project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Edit Project</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Update project details and timeline.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="rounded-lg p-2 text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" />
              </button>
            </div>

            {modalError && (
              <div
                className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
              >
                {modalError}
              </div>
            )}

            <form onSubmit={saveEdit} className="mt-5 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="edit-name">
                  Project Name *
                </label>
                <input
                  id="edit-name"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium" htmlFor="edit-description">
                  Description
                </label>
                <textarea
                  id="edit-description"
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="edit-status">
                    Status
                  </label>
                  <select
                    id="edit-status"
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="PLANNING">Planning</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="ON_HOLD">On Hold</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="edit-priority">
                    Priority
                  </label>
                  <select
                    id="edit-priority"
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value)}
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="CRITICAL">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="edit-start-date">
                    Start Date
                  </label>
                  <input
                    id="edit-start-date"
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    required
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium" htmlFor="edit-deadline">
                    Deadline
                  </label>
                  <input
                    id="edit-deadline"
                    type="date"
                    value={editDeadline}
                    onChange={(e) => setEditDeadline(e.target.value)}
                    required
                    className="w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>

              {availableUsers.length > 0 && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                    Assign Team Members
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto rounded-xl border border-input bg-card p-2">
                    {availableUsers.map((u) => {
                      const isSelected = editMembers.includes(u._id);
                      return (
                        <button
                          key={u._id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setEditMembers(editMembers.filter((id) => id !== u._id));
                            } else {
                              setEditMembers([...editMembers, u._id]);
                            }
                          }}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition cursor-pointer ${
                            isSelected
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}
                          {u.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingProject(null)}
                  className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  style={{ backgroundImage: "var(--gradient-brand)" }}
                >
                  {isSubmitting ? "Saving…" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION */}
      {deletingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl border bg-background p-6 shadow-xl">
            <div className="flex size-11 items-center justify-center rounded-xl bg-red-100 text-red-600">
              <Trash2 className="size-5" />
            </div>

            <h2 className="mt-4 text-lg font-semibold">Delete project?</h2>

            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deletingProject.name}
              </span>
              ? This action cannot be undone.
            </p>

            {modalError && (
              <div
                className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
                role="alert"
              >
                {modalError}
              </div>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDeletingProject(null)}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={confirmDelete}
                disabled={isSubmitting}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-50"
              >
                {isSubmitting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}