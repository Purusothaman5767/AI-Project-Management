import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { AlertCircle, Bot, Send, User } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui-bits";
import { askAssistant, AssistantApiError, AssistantChatMessage } from "@/lib/apiClient";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Assistant — Nimbus PM" },
      { name: "description", content: "Ask about project risk, deadline predictions, task priorities and workload balancing." },
      { property: "og:title", content: "AI Assistant — Nimbus PM" },
      { property: "og:description", content: "Risk, deadlines, priorities and workload suggestions in one chat." },
    ],
  }),
  component: Assistant,
});

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  isError?: boolean | undefined;
  errorCode?: string | undefined;
};

const suggestions = [
  "Which projects are at risk?",
  "Predict our deadlines",
  "What should we prioritise?",
  "Is the workload balanced?",
];

function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "m0",
      role: "assistant",
      text: "Welcome to Nimbus PM AI Assistant. Ask me about project risk, deadline predictions, task priorities, or team workload and I'll analyze your live workspace data.",
    },
  ]);
  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, thinking]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const send = async (text: string) => {
    const value = text.trim();
    if (!value || thinking) return;

    setMessages((prev) => [...prev, { id: `u${Date.now()}`, role: "user", text: value }]);
    setInput("");
    setThinking(true);

    // Build history for backend, excluding error messages and welcome prompt
    const history: AssistantChatMessage[] = messages
      .filter((m) => !m.isError && m.id !== "m0" && m.text.trim().length > 0)
      .map((m) => ({
        role: m.role,
        content: m.text.trim().slice(0, 4000),
      }))
      .slice(-20);

    try {
      const response = await askAssistant({
        message: value,
        history,
      });

      setMessages((prev) => [
        ...prev,
        {
          id: `a${Date.now()}`,
          role: "assistant",
          text: response.reply,
        },
      ]);
    } catch (err: unknown) {
      let errorText = "Failed to communicate with AI Assistant. Please try again.";
      let errCode: string | undefined;

      if (err instanceof AssistantApiError) {
        errCode = err.code;
        if (err.status === 503 || err.code === "CONFIG_MISSING") {
          errorText =
            "Configuration Required: GEMINI_API_KEY is not configured on the server. Please add your GEMINI_API_KEY to the backend .env file to enable live AI responses.";
        } else if (err.status === 429 || err.code === "RATE_LIMIT") {
          errorText =
            "Rate Limit Reached: The AI provider quota or rate limit has been reached. Please wait a moment before sending another prompt.";
        } else if (err.status === 401) {
          errorText =
            "Session Expired: Your authentication session is missing or expired. Please sign in again.";
        } else if (err.status === 502) {
          errorText = `AI Provider Error: ${err.message}`;
        } else {
          errorText = err.message || "An unexpected error occurred while communicating with the AI service.";
        }
      } else if (err instanceof Error) {
        errorText = err.message;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          text: errorText,
          isError: true,
          errorCode: errCode,
        },
      ]);
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  };

  return (
    <AppShell title="AI Assistant" subtitle="AI insights grounded in your live projects and tasks">
      <Card className="flex h-[calc(100vh-13rem)] flex-col p-0">
        <div className="flex-1 space-y-5 overflow-y-auto p-5">
          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
              {m.role === "assistant" && (
                <span
                  className="flex size-8 shrink-0 items-center justify-center rounded-xl text-primary-foreground"
                  style={{ backgroundImage: "var(--gradient-brand)" }}
                >
                  <Bot className="size-4" />
                </span>
              )}
              <div
                className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : m.isError
                    ? "border border-destructive/40 bg-destructive/10 text-destructive"
                    : "bg-muted/70 text-foreground"
                }`}
              >
                {m.isError && (
                  <div className="mb-1 flex items-center gap-1.5 font-semibold text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    <span>Assistant Notice</span>
                  </div>
                )}
                {m.text}
              </div>
              {m.role === "user" && (
                <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground">
                  <User className="size-4" />
                </span>
              )}
            </div>
          ))}

          {thinking && (
            <div className="flex gap-3">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-xl text-primary-foreground"
                style={{ backgroundImage: "var(--gradient-brand)" }}
              >
                <Bot className="size-4" />
              </span>
              <div className="rounded-2xl bg-muted/70 px-4 py-3 text-sm text-muted-foreground">Analysing…</div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-border p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                disabled={thinking}
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <textarea
              ref={inputRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Ask about risk, deadlines, priorities or workload…"
              className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border border-input bg-background px-3.5 py-3 text-sm outline-none focus:ring-2 focus:ring-ring/40"
            />
            <button
              type="submit"
              disabled={thinking || !input.trim()}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl text-primary-foreground disabled:opacity-50"
              style={{ backgroundImage: "var(--gradient-brand)" }}
              aria-label="Send message"
            >
              <Send className="size-4" />
            </button>
          </form>
        </div>
      </Card>
    </AppShell>
  );
}

