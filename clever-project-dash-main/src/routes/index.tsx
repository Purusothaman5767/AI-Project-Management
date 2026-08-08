import { createFileRoute, Link } from "@tanstack/react-router";

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
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      {/* Left side - Login */}
      <div className="flex items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-3xl font-semibold tracking-tight">
            Welcome back
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to see your projects, tasks and AI insights.
          </p>

          <form
            className="mt-8 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              window.location.href = "/dashboard";
            }}
          >
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="email">
                Email
              </label>

              <input
                id="email"
                type="email"
                defaultValue="sofia@nimbus.io"
                className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="password">
                Password
              </label>

              <input
                id="password"
                type="password"
                defaultValue="demo1234"
                className="h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm outline-none focus:ring-2 focus:ring-ring/40"
              />
            </div>

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

            <button
              type="submit"
              className="h-11 w-full rounded-xl text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              style={{ backgroundImage: "var(--gradient-brand)" }}
            >
              Sign in
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Demo only —{" "}
            <Link
              to="/dashboard"
              className="font-medium text-primary hover:underline"
            >
              skip to dashboard
            </Link>
          </p>
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