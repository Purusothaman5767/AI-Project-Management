import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Bot, Send, User } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card } from "@/components/ui-bits";

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

type Msg = { id: string; role: "user" | "assistant"; text: string };

const suggestions = [
  "Which projects are at risk?",
  "Predict our deadlines",
  "What should we prioritise?",
  "Is the workload balanced?",
];

const replies: { match: string[]; text: string }[] = [
  {
    match: ["risk", "danger", "problem", "alert"],
    text: "2 projects look risky right now:\n\n• Billing Revamp — 41% complete with 20 days left and a blocked critical task (“Proration calculation service”). Risk: high.\n• Compliance Audit — paused 4 days pending legal review, and “Access review evidence” is already overdue. Risk: medium-high.\n\nInsights Dashboard is healthy at 88% and should land early.",
  },
  {
    match: ["deadline", "predict", "late", "when", "ship"],
    text: "Deadline prediction based on current velocity:\n\n• Insights Dashboard — Aug 13 (2 days early)\n• Atlas Mobile App — Sep 15 (3 days late)\n• Billing Revamp — Sep 6 (9 days late)\n• Vendor Portal — Oct 20 (on track, low confidence: scope still forming)\n\nBiggest lever: unblocking proration work this week pulls Billing Revamp back by ~5 days.",
  },
  {
    match: ["priorit", "focus", "next", "important"],
    text: "Suggested priority order for this week:\n\n1. Access review evidence (Critical, overdue) — Marcus Reid\n2. Proration calculation service (Critical, due Aug 6) — Lina Ortega\n3. Dunning email regression pass (High, due Aug 2) — Marcus Reid\n4. Implement offline sync queue (High, due Aug 11) — Noah Patel\n\nEverything below priority 4 can safely slip a sprint.",
  },
  {
    match: ["workload", "capacity", "busy", "balance", "team"],
    text: "Workload check:\n\n• Noah Patel — 94% (overloaded, 9 tasks)\n• Ava Mercer — 82%\n• Sofia Chen — 73%\n• Lina Ortega — 61%\n• Marcus Reid — 45%\n• Ibrahim Kone — 38%\n\nSuggestion: move “Push notification permissions” from Noah to Ibrahim, and “Invoice PDF template” from Ava to Marcus. That brings the team spread from 56 points to 34.",
  },
];

function dummyReply(input: string) {
  const q = input.toLowerCase();
  const hit = replies.find((r) => r.match.some((m) => q.includes(m)));
  return (
    hit?.text ??
    "Here's what I see across the workspace: 6 projects, 1 completed, 3 tasks overdue and one team member above 90% capacity. Ask me about project risk, deadline predictions, task priorities or workload balancing."
  );
}

function Assistant() {
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "m0",
      role: "assistant",
      text: "Hi Sofia — I've reviewed all 6 projects this morning. Ask me about risk, deadlines, priorities or workload and I'll break it down.",
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

  const send = (text: string) => {
    const value = text.trim();
    if (!value || thinking) return;
    setMessages((prev) => [...prev, { id: `u${Date.now()}`, role: "user", text: value }]);
    setInput("");
    setThinking(true);
    setTimeout(() => {
      setMessages((prev) => [...prev, { id: `a${Date.now()}`, role: "assistant", text: dummyReply(value) }]);
      setThinking(false);
      inputRef.current?.focus();
    }, 800);
  };

  return (
    <AppShell title="AI Assistant" subtitle="Dummy insights — no data leaves this demo">
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
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/70 text-foreground"
                }`}
              >
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
                className="rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted"
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
