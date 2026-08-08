export type Status = "Planning" | "In Progress" | "On Hold" | "Completed";
export type Priority = "Low" | "Medium" | "High" | "Critical";
export type TaskStatus = "To Do" | "In Progress" | "Review" | "Done";

export type Member = {
  id: string;
  name: string;
  role: string;
  initials: string;
  workload: number;
  assignedTasks: number;
};

export type Project = {
  id: string;
  name: string;
  description: string;
  progress: number;
  deadline: string;
  status: Status;
  members: string[];
  activity: { id: string; text: string; time: string }[];
};

export type Task = {
  id: string;
  name: string;
  projectId: string;
  assignee: string;
  priority: Priority;
  status: TaskStatus;
  dueDate: string;
};

export const members: Member[] = [
  { id: "m1", name: "Ava Mercer", role: "Product Designer", initials: "AM", workload: 82, assignedTasks: 7 },
  { id: "m2", name: "Noah Patel", role: "Frontend Engineer", initials: "NP", workload: 94, assignedTasks: 9 },
  { id: "m3", name: "Lina Ortega", role: "Backend Engineer", initials: "LO", workload: 61, assignedTasks: 5 },
  { id: "m4", name: "Marcus Reid", role: "QA Analyst", initials: "MR", workload: 45, assignedTasks: 4 },
  { id: "m5", name: "Sofia Chen", role: "Project Manager", initials: "SC", workload: 73, assignedTasks: 6 },
  { id: "m6", name: "Ibrahim Kone", role: "Data Engineer", initials: "IK", workload: 38, assignedTasks: 3 },
];

export const projects: Project[] = [
  {
    id: "p1",
    name: "Atlas Mobile App",
    description: "Cross-platform companion app with offline sync and push notifications.",
    progress: 68,
    deadline: "2026-09-12",
    status: "In Progress",
    members: ["m1", "m2", "m5"],
    activity: [
      { id: "a1", text: "Noah Patel merged “Offline queue retry”", time: "2h ago" },
      { id: "a2", text: "Ava Mercer uploaded new onboarding screens", time: "6h ago" },
      { id: "a3", text: "Sofia Chen moved deadline to Sep 12", time: "Yesterday" },
    ],
  },
  {
    id: "p2",
    name: "Billing Revamp",
    description: "Usage-based pricing engine, invoice templates and dunning flows.",
    progress: 41,
    deadline: "2026-08-28",
    status: "In Progress",
    members: ["m3", "m4", "m5"],
    activity: [
      { id: "a1", text: "Lina Ortega opened PR “Proration edge cases”", time: "3h ago" },
      { id: "a2", text: "Marcus Reid logged 4 regression bugs", time: "1d ago" },
    ],
  },
  {
    id: "p3",
    name: "Insights Dashboard",
    description: "Self-serve analytics with cohort charts and scheduled reports.",
    progress: 88,
    deadline: "2026-08-15",
    status: "In Progress",
    members: ["m2", "m6"],
    activity: [
      { id: "a1", text: "Ibrahim Kone shipped nightly aggregation job", time: "5h ago" },
      { id: "a2", text: "Noah Patel fixed chart tooltip overflow", time: "2d ago" },
    ],
  },
  {
    id: "p4",
    name: "Design System 2.0",
    description: "Token-driven component library shared across web and mobile.",
    progress: 100,
    deadline: "2026-07-30",
    status: "Completed",
    members: ["m1", "m2"],
    activity: [{ id: "a1", text: "Ava Mercer published v2.0.0 release notes", time: "1w ago" }],
  },
  {
    id: "p5",
    name: "Vendor Portal",
    description: "External supplier onboarding, document review and SLA tracking.",
    progress: 22,
    deadline: "2026-10-20",
    status: "Planning",
    members: ["m3", "m5", "m6"],
    activity: [{ id: "a1", text: "Sofia Chen drafted scope document", time: "3d ago" }],
  },
  {
    id: "p6",
    name: "Compliance Audit",
    description: "SOC 2 evidence collection, access reviews and policy updates.",
    progress: 55,
    deadline: "2026-08-05",
    status: "On Hold",
    members: ["m4", "m5"],
    activity: [{ id: "a1", text: "Marcus Reid paused pending legal review", time: "4d ago" }],
  },
];

export const tasks: Task[] = [
  { id: "t1", name: "Implement offline sync queue", projectId: "p1", assignee: "m2", priority: "High", status: "In Progress", dueDate: "2026-08-11" },
  { id: "t2", name: "Onboarding illustration set", projectId: "p1", assignee: "m1", priority: "Medium", status: "Review", dueDate: "2026-08-09" },
  { id: "t3", name: "Push notification permissions", projectId: "p1", assignee: "m2", priority: "Low", status: "To Do", dueDate: "2026-08-19" },
  { id: "t4", name: "Proration calculation service", projectId: "p2", assignee: "m3", priority: "Critical", status: "In Progress", dueDate: "2026-08-06" },
  { id: "t5", name: "Invoice PDF template", projectId: "p2", assignee: "m1", priority: "Medium", status: "To Do", dueDate: "2026-08-14" },
  { id: "t6", name: "Dunning email regression pass", projectId: "p2", assignee: "m4", priority: "High", status: "To Do", dueDate: "2026-08-02" },
  { id: "t7", name: "Cohort retention chart", projectId: "p3", assignee: "m2", priority: "High", status: "Done", dueDate: "2026-07-29" },
  { id: "t8", name: "Nightly aggregation job", projectId: "p3", assignee: "m6", priority: "High", status: "Done", dueDate: "2026-08-01" },
  { id: "t9", name: "Scheduled report delivery", projectId: "p3", assignee: "m6", priority: "Medium", status: "In Progress", dueDate: "2026-08-13" },
  { id: "t10", name: "Token migration guide", projectId: "p4", assignee: "m1", priority: "Low", status: "Done", dueDate: "2026-07-25" },
  { id: "t11", name: "Supplier document upload flow", projectId: "p5", assignee: "m3", priority: "Medium", status: "To Do", dueDate: "2026-09-01" },
  { id: "t12", name: "SLA tracking data model", projectId: "p5", assignee: "m6", priority: "Medium", status: "To Do", dueDate: "2026-09-08" },
  { id: "t13", name: "Access review evidence", projectId: "p6", assignee: "m4", priority: "Critical", status: "In Progress", dueDate: "2026-07-31" },
  { id: "t14", name: "Policy update sign-off", projectId: "p6", assignee: "m5", priority: "High", status: "Review", dueDate: "2026-08-04" },
  { id: "t15", name: "Design QA on billing screens", projectId: "p2", assignee: "m1", priority: "Low", status: "Done", dueDate: "2026-07-28" },
];

export const progressTrend = [
  { month: "Feb", completed: 18, planned: 24 },
  { month: "Mar", completed: 26, planned: 30 },
  { month: "Apr", completed: 31, planned: 34 },
  { month: "May", completed: 29, planned: 38 },
  { month: "Jun", completed: 42, planned: 44 },
  { month: "Jul", completed: 48, planned: 50 },
  { month: "Aug", completed: 21, planned: 46 },
];

export const today = new Date("2026-08-08");

export const memberById = (id: string) => members.find((m) => m.id === id);
export const projectById = (id: string) => projects.find((p) => p.id === id);
export const tasksForProject = (id: string) => tasks.filter((t) => t.projectId === id);
export const isOverdue = (t: Task) => t.status !== "Done" && new Date(t.dueDate) < today;

export const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
