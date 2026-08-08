import { createFileRoute, Link } from "@tanstack/react-router";
import { CalendarDays, Plus, MoreVertical, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import {
  AvatarStack,
  Card,
  ProgressBar,
  StatusBadge,
} from "@/components/ui-bits";
import { formatDate, projects as initialProjects } from "@/data/mock";

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
        content: "Browse every project with progress, deadlines and team members.",
      },
    ],
  }),
  component: Projects,
});

function Projects() {
  const [projectList, setProjectList] = useState(initialProjects);

  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<any | null>(null);
  const [deletingProject, setDeletingProject] = useState<any | null>(null);

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");

  const openEdit = (project: any) => {
    setEditingProject(project);
    setEditName(project.name);
    setEditDescription(project.description);
    setMenuOpen(null);
  };

  const saveEdit = () => {
    if (!editingProject) return;

    setProjectList((currentProjects) =>
      currentProjects.map((project) =>
        project.id === editingProject.id
          ? {
              ...project,
              name: editName,
              description: editDescription,
            }
          : project
      )
    );

    setEditingProject(null);
  };

  const confirmDelete = () => {
    if (!deletingProject) return;

    setProjectList((currentProjects) =>
      currentProjects.filter(
        (project) => project.id !== deletingProject.id
      )
    );

    setDeletingProject(null);
  };

  return (
    <>
      <AppShell
        title="Projects"
        subtitle={`${projectList.length} projects in the workspace`}
        actions={
          <button
            className="hidden h-9 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold text-primary-foreground sm:inline-flex"
            style={{ backgroundImage: "var(--gradient-brand)" }}
          >
            <Plus className="size-4" />
            New Project
          </button>
        }
      >
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {projectList.map((p) => (
            <div key={p.id} className="relative">
              <Link
                to="/projects/$projectId"
                params={{ projectId: p.id }}
                className="group block"
              >
                <Card className="relative transition-shadow hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-foreground">
                        {p.name}
                      </h3>

                      <p className="mt-2 text-sm leading-5 text-muted-foreground">
                        {p.description}
                      </p>
                    </div>

                    <div
                      className="relative shrink-0"
                      onClick={(e) => e.preventDefault()}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();

                          setMenuOpen(
                            menuOpen === p.id ? null : p.id
                          );
                        }}
                        className="flex size-8 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground"
                        aria-label={`Actions for ${p.name}`}
                      >
                        <MoreVertical className="size-4" />
                      </button>

                      {menuOpen === p.id && (
                        <div
                          className="absolute right-0 top-9 z-30 w-36 overflow-hidden rounded-xl border bg-background p-1 shadow-lg"
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => openEdit(p)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-foreground hover:bg-muted"
                          >
                            <Pencil className="size-4" />
                            Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setDeletingProject(p);
                              setMenuOpen(null);
                            }}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                          >
                            <Trash2 className="size-4" />
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-5 space-y-2">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span className="font-medium text-foreground">
                        {p.progress}%
                      </span>
                    </div>

                    <ProgressBar value={p.progress} />
                  </div>

                  <div className="mt-5 flex items-center justify-between">
                    <AvatarStack ids={p.members} />

                    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                      <CalendarDays className="size-3.5" />
                      {formatDate(p.deadline)}
                    </span>
                  </div>
                </Card>
              </Link>
            </div>
          ))}
        </div>
      </AppShell>

      {/* EDIT MODAL */}
      {editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl border bg-background p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Edit Project</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Update your project details.
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

            <div className="mt-6 space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Project Name
                </label>

                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-medium">
                  Description
                </label>

                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={4}
                  className="w-full resize-none rounded-xl border bg-background px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditingProject(null)}
                className="rounded-xl border px-4 py-2 text-sm font-medium hover:bg-muted"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveEdit}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-primary-foreground"
                style={{ backgroundImage: "var(--gradient-brand)" }}
              >
                Save Changes
              </button>
            </div>
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

            <h2 className="mt-4 text-lg font-semibold">
              Delete project?
            </h2>

            <p className="mt-2 text-sm leading-5 text-muted-foreground">
              Are you sure you want to delete{" "}
              <span className="font-medium text-foreground">
                {deletingProject.name}
              </span>
              ? This action cannot be undone.
            </p>

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
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}