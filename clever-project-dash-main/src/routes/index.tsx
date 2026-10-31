import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { setAccessToken } from "@/lib/apiClient";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — Nimbus PM" },
      {
        name: "description",
        content:
          "Sign in to Nimbus PM, the AI-assisted project management workspace for modern teams.",
      },
      {
        property: "og:title",
        content: "Sign in — Nimbus PM",
      },
      {
        property: "og:description",
        content:
          "Sign in to Nimbus PM, the AI-assisted project management workspace.",
      },
    ],
  }),
  component: Login,
});

function Login() {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<"TEAM_LEAD" | "TEAM_MEMBER">("TEAM_LEAD");
  const [error, setError] = useState<string | null>(null);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleQuickRole = (role: "lead" | "member") => {
    setIsSubmitting(false);
    setError(null);
    if (role === "lead") {
      setEmail("sarah.pm@nimbus.pm");
      setPassword("Password123!");
      setDemoNotice("Team Lead credentials loaded (Sarah Jenkins). Can create projects, assign members & assign tasks.");
    } else {
      setEmail("alex.dev@nimbus.pm");
      setPassword("Password123!");
      setDemoNotice("Team Member credentials loaded (Alex Morgan). Can view assigned projects and update tasks.");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setDemoNotice(null);

    if (isRegister) {
      if (password.length < 8) {
        setError("Password must be at least 8 characters.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const endpoint = isRegister ? "/api/auth/register" : "/api/auth/login";
      const payload = isRegister
        ? {
            name: name.trim(),
            email: email.trim(),
            password,
            confirmPassword,
            role: selectedRole,
          }
        : { email: email.trim(), password };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const message =
          errorData.message || `${isRegister ? "Registration" : "Sign in"} failed (${response.statusText || response.status})`;
        setError(message);
        return;
      }

      const data = await response.json().catch(() => ({}));
      if (data.accessToken) {
        setAccessToken(data.accessToken);
      }
      if (data.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      if (typeof window !== "undefined") {
        window.location.href = "/dashboard";
      } else {
        await navigate({ to: "/dashboard" });
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected network error occurred. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Left side - Login / Register */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight">
            {isRegister ? "Create an account" : "Welcome back"}
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            {isRegister
              ? "Register to start managing projects, tracking tasks and getting AI insights."
              : "Sign in to see your projects, tasks and AI insights."}
          </p>

          {/* Mode Switcher Tabs */}
          <div className="mt-6 flex rounded-xl bg-card p-1 border border-input">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setError(null);
                setDemoNotice(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                !isRegister
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setError(null);
                setDemoNotice(null);
              }}
              className={`flex-1 rounded-lg py-2 text-xs font-semibold transition-all ${
                isRegister
                  ? "bg-primary text-primary-foreground shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Register
            </button>
          </div>

          {/* Quick Role Sign-in Presets (Only visible in Sign In mode) */}
          {!isRegister && (
            <div className="mt-4 rounded-xl border border-input bg-card p-3 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Quick Role Sign-In
                </span>
                <span className="text-[10px] text-primary font-medium">Click to prefill</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  id="quick-role-lead"
                  onClick={(e) => {
                    e.preventDefault();
                    handleQuickRole("lead");
                  }}
                  disabled={isSubmitting}
                  aria-label="Preload Team Lead credentials"
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-primary/40 bg-primary/5 py-2 px-2 text-xs font-medium text-foreground hover:bg-primary/10 transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-sm pointer-events-none">👑</span>
                  <div className="text-left pointer-events-none">
                    <p className="font-semibold text-xs leading-none">Team Lead</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Full Admin</p>
                  </div>
                </button>
                <button
                  type="button"
                  id="quick-role-member"
                  onClick={(e) => {
                    e.preventDefault();
                    handleQuickRole("member");
                  }}
                  disabled={isSubmitting}
                  aria-label="Preload Team Member credentials"
                  className="flex items-center justify-center gap-1.5 rounded-lg border border-input bg-muted/30 py-2 px-2 text-xs font-medium text-foreground hover:bg-muted transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span className="text-sm pointer-events-none">👤</span>
                  <div className="text-left pointer-events-none">
                    <p className="font-semibold text-xs leading-none">Team Member</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">Collaborator</p>
                  </div>
                </button>
              </div>
            </div>
          )}

          {demoNotice && (
            <div
              className="mt-4 rounded-xl border border-primary/40 bg-primary/10 p-3.5 text-sm text-foreground"
              role="alert"
            >
              <div className="flex items-start gap-2.5">
                <Info className="size-4 text-primary shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-primary text-xs uppercase tracking-wider">Demo Mode Notice</p>
                  <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{demoNotice}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDemoNotice(null)}
                  className="text-muted-foreground hover:text-foreground text-xs"
                  aria-label="Dismiss notice"
                >
                  ✕
                </button>
              </div>
            </div>
          )}

          {error && (
            <div
              className="mt-4 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive"
              role="alert"
            >
              {error}
            </div>
          )}

          <form
            className="mt-6 space-y-4"
            onSubmit={handleSubmit}
          >
            {isRegister && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  Select Your Role
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedRole("TEAM_LEAD")}
                    className={cn(
                      "flex flex-col items-start rounded-xl border p-3 text-left transition-all cursor-pointer",
                      selectedRole === "TEAM_LEAD"
                        ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                        : "border-input bg-card hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                      <span>👑</span> Team Lead
                    </div>
                    <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
                      Can create projects, assign members & assign tasks
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedRole("TEAM_MEMBER")}
                    className={cn(
                      "flex flex-col items-start rounded-xl border p-3 text-left transition-all cursor-pointer",
                      selectedRole === "TEAM_MEMBER"
                        ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary"
                        : "border-input bg-card hover:bg-muted/50"
                    )}
                  >
                    <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
                      <span>👤</span> Team Member
                    </div>
                    <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
                      Can view assigned projects & update tasks
                    </p>
                  </button>
                </div>
              </div>
            )}

            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="name">
                  Full Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Morgan"
                  required={isRegister}
                  disabled={isSubmitting}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                Email
              </label>

              <input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                required
                disabled={isSubmitting}
                className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="password">
                Password
              </label>

              <input
                id="password"
                name="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={isSubmitting}
                className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
              />
            </div>

            {isRegister && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-foreground" htmlFor="confirmPassword">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required={isRegister}
                  disabled={isSubmitting}
                  className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
                />
              </div>
            )}

            {!isRegister && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 text-muted-foreground">
                  <input
                    type="checkbox"
                    defaultChecked
                    className="size-4 rounded border-input accent-primary"
                  />
                  Remember me
                </label>

                <span className="font-medium text-primary">
                  Forgot password?
                </span>
              </div>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="h-11 w-full rounded-xl text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              style={{ backgroundImage: "var(--gradient-brand)" }}
            >
              {isSubmitting
                ? isRegister
                  ? "Creating account…"
                  : "Signing in…"
                : isRegister
                ? "Create account"
                : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            Demo only —{" "}
            <button
              type="button"
              onClick={() => {
                setDemoNotice(
                  "Demo mode requires an authenticated session to access live project data. A pre-configured demo account does not exist. Please sign in or register below to explore the dashboard."
                );
              }}
              className="font-medium text-primary hover:underline cursor-pointer"
            >
              skip to dashboard
            </button>
          </div>
        </div>
      </div>

      {/* Right side - Product information */}
      <div
        className="relative hidden overflow-hidden lg:block"
        style={{ backgroundImage: "var(--gradient-brand)" }}
      >
        <div className="flex h-full flex-col justify-center gap-6 px-14 text-primary-foreground">
          <h2 className="text-4xl font-semibold leading-tight tracking-tight">
            Plan less.
            <br />
            Ship more.
          </h2>

          <p className="max-w-sm text-sm/6 opacity-90">
            Nimbus PM watches your timelines, spots risk early and suggests
            where the team should focus next.
          </p>

          <div className="grid max-w-sm grid-cols-2 gap-3">
            {[
              ["24", "Projects tracked"],
              ["1.2k", "Tasks completed"],
              ["18%", "Fewer overruns"],
              ["6", "AI insights daily"],
            ].map(([v, l]) => (
              <div
                key={l}
                className="rounded-2xl bg-white/12 p-4 backdrop-blur"
              >
                <p className="text-2xl font-semibold">{v}</p>
                <p className="text-xs opacity-85">{l}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}