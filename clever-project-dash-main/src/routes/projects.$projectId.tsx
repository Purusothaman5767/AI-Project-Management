import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { AvatarStack, Card, PriorityBadge, ProgressBar, StatusBadge } from "@/components/ui-bits";
import { formatDate, memberById, projectById, tasksForProject } from "@/data/mock";

export const Route = createFileRoute("/projects/$projectId")({
  head: () => ({
    meta: [
      { title: "Project details — Nimbus PM" },
      { name: "description", content: "Project overview with progress, task list, team, deadline and recent activity." },
      { property: "og:title", content: "Project details — Nimbus PM" },
      { property: "og:description", content: "Progress, tasks, team, deadline and activity for this project." },
    ],
  }),
  component: ProjectDetails,
});

function ProjectDetails() {
  const { projectId } = Route.useParams();
  const project = projectById(projectId);
  if (!project) throw notFound();

  const projectTasks = tasksForProject(project.id);
  const done = projectTasks.filter((t) => t.status === "Done").length;

  return (
    <AppShell title={project.name} subtitle={`Due ${formatDate(project.deadline)}`}>
      <Link to="/projects" className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All projects
      </Link>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex items-start justify-between gap-3">
            <h2 className="font-semibold">Overview</h2>
            <StatusBadge status={project.status} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{project.description}</p>

          <div className="mt-6 space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Progress</span>
              <span className="font-medium text-foreground">{project.progress}%</span>
            </div>
            <ProgressBar value={project.progress} />
          </div>

          <div className="mt-6 grid grid-cols-3 gap-3 text-center">
            {[
              ["Tasks", projectTasks.length],
              ["Completed", done],
              ["Open", projectTasks.length - done],
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
            <h2 className="font-semibold">Team</h2>
            <div className="mt-4 space-y-3">
              {project.members.map((id) => {
                const m = memberById(id);
                if (!m) return null;
                return (
                  <div key={id} className="flex items-center gap-3">
                    <span className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                      {m.initials}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{m.role}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h2 className="font-semibold">Tasks</h2>
          <div className="mt-4 divide-y divide-border">
            {projectTasks.map((t) => (
              <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {memberById(t.assignee)?.name} · due {formatDate(t.dueDate)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <PriorityBadge priority={t.priority} />
                  <StatusBadge status={t.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-semibold">Activity</h2>
          <ol className="mt-4 space-y-4">
            {project.activity.map((a) => (
              <li key={a.id} className="flex gap-3">
                <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />
                <div>
                  <p className="text-sm">{a.text}</p>
                  <p className="text-xs text-muted-foreground">{a.time}</p>
                </div>
              </li>
            ))}
          </ol>
        </Card>
      </div>

      <div className="mt-4 flex items-center justify-between">
        <AvatarStack ids={project.members} />
      </div>
    </AppShell>
  );
}
