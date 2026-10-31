import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  FolderKanban,
  ListChecks,
  Users,
  Bot,
  Bell,
  Search,
  Menu,
  X,
  Sparkles,
  LogOut,
} from "lucide-react";
import { useState, useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { removeAccessToken } from "@/lib/apiClient";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/tasks", label: "Tasks", icon: ListChecks },
  { to: "/team", label: "Team", icon: Users },
  { to: "/assistant", label: "AI Assistant", icon: Bot },
] as const;

export function AppShell({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const routerState = useRouterState();
  const pathname = routerState?.location?.pathname ?? "";
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<{ name?: string; email?: string; role?: string } | null>(null);

  const isLead = user?.role
    ? ["TEAM_LEAD", "PROJECT_MANAGER", "ADMIN"].includes(user.role.toUpperCase())
    : false;

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (raw) setUser(JSON.parse(raw));
    } catch (_) {
      setUser(null);
    }
  }, []);

  const SidebarBody = (
    <div className="flex h-full flex-col gap-6 p-4">
      <Link to="/dashboard" className="flex items-center gap-2.5 px-2 py-1">
        <span
          className="flex size-9 items-center justify-center rounded-xl text-primary-foreground"
          style={{ backgroundImage: "var(--gradient-brand)" }}
        >
          <Sparkles className="size-4.5" />
        </span>
        <span className="text-base font-semibold tracking-tight">Nimbus PM</span>
      </Link>

      <nav className="flex flex-col gap-1">
        {nav.map((item) => {
          const active = pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="size-4.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-2xl bg-accent/70 p-4">
        <p className="text-sm font-semibold text-accent-foreground">AI insights</p>
        <p className="mt-1 text-xs text-muted-foreground">
          3 projects need attention this week.
        </p>
        <Link
          to="/assistant"
          onClick={() => setOpen(false)}
          className="mt-3 inline-flex text-xs font-semibold text-primary hover:underline"
        >
          Ask the assistant →
        </Link>
      </div>

      {user && (
        <div className="flex items-center gap-2.5 rounded-xl border border-sidebar-border bg-card/60 p-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
            {user?.name ? user.name.split(/\s+/).map((s: string) => s[0]).join('').slice(0, 2).toUpperCase() : "PM"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-foreground">{user.name}</p>
            <p className="truncate text-[10px] text-muted-foreground">
              {isLead ? "👑 Team Lead" : "👤 Team Member"}
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar lg:block">
        <div className="sticky top-0 h-screen">{SidebarBody}</div>
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-foreground/30" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-64 border-r border-sidebar-border bg-sidebar">
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-4 text-muted-foreground"
              aria-label="Close navigation"
            >
              <X className="size-5" />
            </button>
            {SidebarBody}
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border bg-card/80 px-4 py-3.5 backdrop-blur md:px-6">
          <button
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted lg:hidden"
            onClick={() => setOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight">{title}</h1>
            {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
          </div>
          <div className="relative hidden md:block">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search…"
              className="h-9 w-56 rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
          </div>
          {actions}
          <button className="relative rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Notifications">
            <Bell className="size-5" />
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-primary" />
          </button>
          {user && (
            <span
              className={cn(
                "hidden sm:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold",
                isLead
                  ? "border border-primary/40 bg-primary/10 text-primary"
                  : "border border-border bg-muted/70 text-muted-foreground"
              )}
              title={`Logged in as ${isLead ? "Team Lead" : "Team Member"}`}
            >
              <span>{isLead ? "👑" : "👤"}</span>
              <span>{isLead ? "Team Lead" : "Team Member"}</span>
            </span>
          )}
          <div className="flex size-9 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground" title={user?.name || "User"}>
            {user?.name ? user.name.split(/\s+/).map((s: string) => s[0]).join('').slice(0, 2).toUpperCase() : "PM"}
          </div>
          <button
            onClick={async () => {
              try {
                await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
              } catch (_) {}
              removeAccessToken();
              localStorage.removeItem("user");
              window.location.href = "/";
            }}
            title="Sign out"
            aria-label="Sign out"
            className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <LogOut className="size-5" />
          </button>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-6 md:py-8">{children}</main>
      </div>
    </div>
  );
}
