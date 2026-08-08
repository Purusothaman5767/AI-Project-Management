import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, PriorityBadge, StatusBadge } from "@/components/ui-bits";
import {
  formatDate,
  isOverdue,
  memberById,
  projectById,
  tasks as seedTasks,
  type Task,
} from "@/data/mock";

export const Route = createFileRoute("/tasks")({
  head: () => ({
    meta: [
      { title: "Tasks — Nimbus PM" },
      { name: "description", content: "All tasks in one table: assignee, priority, status and due date, with quick task creation." },
      { property: "og:title", content: "Tasks — Nimbus PM" },
      { property: "og:description", content: "All tasks with assignee, priority, status and due date." },
    ],
  }),
  component: Tasks,
});

const filters = ["All", "To Do", "In Progress", "Review", "Done"] as const;

function Tasks() {
  const [list, setList] = useState<Task[]>(seedTasks);
  const [filter, setFilter] = useState<(typeof filters)[number]>("All");
  const [open, setOpen] = useState(false);

  const visible = useMemo(
    () => (filter === "All" ? list : list.filter((t) => t.status === filter)),
    [list, filter],
  );

  return (
    <AppShell
      title="Tasks"
      subtitle={`${list.length} tasks · ${list.filter(isOverdue).length} overdue`}
      actions={
        <button
          onClick={() => setOpen(true)}
          className="inline-flex h-9 items-center gap-1.5 rounded-xl px-3.5 text-sm font-semibold text-primary-foreground"
          style={{ backgroundImage: "var(--gradient-brand)" }}
        >
          <Plus className="size-4" /> Add Task
        </button>
      }
    >
      <div className="mb-4 flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground hover:bg-muted"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

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
            {visible.map((t) => (
              <tr key={t.id} className="hover:bg-muted/50">
                <td className="px-5 py-3.5">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{projectById(t.projectId)?.name}</p>
                </td>
                <td className="px-5 py-3.5">
                  <span className="inline-flex items-center gap-2">
                    <span className="flex size-7 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
                      {memberById(t.assignee)?.initials}
                    </span>
                    {memberById(t.assignee)?.name}
                  </span>
                </td>
                <td className="px-5 py-3.5">
                  <PriorityBadge priority={t.priority} />
                </td>
                <td className="px-5 py-3.5">
                  <StatusBadge status={t.status} />
                </td>
                <td className={`px-5 py-3.5 ${isOverdue(t) ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                  {formatDate(t.dueDate)}
                  {isOverdue(t) && " · overdue"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {open && <AddTaskDialog onClose={() => setOpen(false)} onAdd={(t) => setList((prev) => [t, ...prev])} />}
    </AppShell>
  );
}

function AddTaskDialog({ onClose, onAdd }: { onClose: () => void; onAdd: (t: Task) => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-foreground/30" onClick={onClose} />
      <form
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-6"
        style={{ boxShadow: "var(--shadow-card)" }}
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          onAdd({
            id: `t${Date.now()}`,
            name: String(data.get("name") || "Untitled task"),
            projectId: String(data.get("projectId")),
            assignee: String(data.get("assignee")),
            priority: data.get("priority") as Task["priority"],
            status: "To Do",
            dueDate: String(data.get("dueDate") || "2026-08-31"),
          });
          onClose();
        }}
      >
        <h2 className="text-lg font-semibold">Add task</h2>
        <div className="mt-5 space-y-4">
          <Field label="Task name">
            <input name="name" required className={inputCls} placeholder="e.g. Draft release notes" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Project">
              <select name="projectId" className={inputCls} defaultValue="p1">
                {[...new Set(seedTasks.map((t) => t.projectId))].map((id) => (
                  <option key={id} value={id}>
                    {projectById(id)?.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Assignee">
              <select name="assignee" className={inputCls} defaultValue="m1">
                {["m1", "m2", "m3", "m4", "m5", "m6"].map((id) => (
                  <option key={id} value={id}>
                    {memberById(id)?.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Priority">
              <select name="priority" className={inputCls} defaultValue="Medium">
                {["Low", "Medium", "High", "Critical"].map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            </Field>
            <Field label="Due date">
              <input type="date" name="dueDate" className={inputCls} defaultValue="2026-08-31" />
            </Field>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-9 rounded-xl border border-input px-4 text-sm font-medium">
            Cancel
          </button>
          <button
            type="submit"
            className="h-9 rounded-xl px-4 text-sm font-semibold text-primary-foreground"
            style={{ backgroundImage: "var(--gradient-brand)" }}
          >
            Add task
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
