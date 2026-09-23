"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, inputClass, primaryButtonClass, secondaryButtonClass } from "@/components/ui";
import type { ProposedItem } from "@/lib/planning-session";
import { PlanPanel, type PlanItem } from "./PlanPanel";
import { createDraftPlan, listDraftPlans, loadPlan, type DraftPlanSummary } from "./actions";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string; hidden?: boolean };

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `msg-${idCounter}`;
}

export function PlanningSession({
  occasion,
  date,
  planId: initialPlanId,
}: {
  occasion?: string;
  date?: string;
  planId?: number;
}) {
  const router = useRouter();
  const [planId, setPlanId] = useState<number | null>(initialPlanId ?? null);
  const [planName, setPlanName] = useState<string>("New plan");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [drafts, setDrafts] = useState<DraftPlanSummary[]>([]);
  const [showDrafts, setShowDrafts] = useState(false);
  const hasStarted = useRef(false);
  const usedContext = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const hasContext = Boolean(occasion || date);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    (async () => {
      if (initialPlanId) {
        const loaded = await loadPlan(initialPlanId);
        if (loaded) {
          setPlanName(loaded.plan.name);
          setMessages(loaded.messages.map((m) => ({ id: m.id, role: m.role, text: m.content, hidden: m.hidden })));
          setPlanItems(
            loaded.items.map((i) => ({ ...(i.payload as ProposedItem), status: i.status, dbId: i.dbId }))
          );
          setReady(true);
          return;
        }
      }

      const created = await createDraftPlan();
      setPlanId(created.id);
      setPlanName(created.name);
      setReady(true);

      if (hasContext) {
        const kickoff: ChatMessage = { id: nextId(), role: "user", text: "Let's get started.", hidden: true };
        setMessages([kickoff]);
        usedContext.current = true;
        runTurn(created.id, kickoff.text, true, true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function runTurn(activePlanId: number, text: string, hidden: boolean, useContext: boolean) {
    setStreaming(true);
    setError(null);

    const assistantId = nextId();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", text: "" }]);

    try {
      const res = await fetch("/api/planning-session/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: activePlanId,
          message: { role: "user", content: text, hidden },
          context: useContext ? { occasion, date } : undefined,
        }),
      });

      if (!res.body) throw new Error("No response body");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex;
        while ((newlineIndex = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (!line.trim()) continue;

          const event = JSON.parse(line) as
            | { type: "text"; text: string }
            | { type: "proposal"; item: ProposedItem; dbId: number }
            | { type: "title"; title: string }
            | { type: "done" }
            | { type: "error"; message: string };

          if (event.type === "text") {
            assistantText += event.text;
            const snapshot = assistantText;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, text: snapshot } : m))
            );
          } else if (event.type === "proposal") {
            setPlanItems((prev) => [...prev, { ...event.item, status: "proposed", dbId: event.dbId }]);
          } else if (event.type === "title") {
            setPlanName(event.title);
          } else if (event.type === "error") {
            setError(event.message);
          }
        }
      }
    } catch {
      setError("Lost the connection — try sending that again.");
    } finally {
      setStreaming(false);
    }
  }

  function send() {
    const text = input.trim();
    if (!text || streaming || !planId) return;
    setInput("");
    const userMsg: ChatMessage = { id: nextId(), role: "user", text };
    setMessages((prev) => [...prev, userMsg]);
    const useContext = hasContext && !usedContext.current;
    usedContext.current = true;
    runTurn(planId, text, false, useContext);
  }

  async function openDraftMenu() {
    setShowDrafts((v) => !v);
    if (!showDrafts) setDrafts(await listDraftPlans());
  }

  if (!ready) {
    return <p className="text-sm text-ink-400">Loading…</p>;
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl text-ink-800">{planName}</h1>
          <p className="text-sm text-ink-400">
            {hasContext
              ? `Talking through ${occasion ?? "an upcoming date"}${date ? ` (${date})` : ""}.`
              : "Tell me what's on your mind — I'll help you put a plan together."}
          </p>
        </div>
        <div className="relative">
          <button onClick={openDraftMenu} className={secondaryButtonClass}>
            My plans
          </button>
          {showDrafts && (
            <div className="absolute right-0 z-10 mt-2 w-64 rounded-xl2 border border-ink-100 bg-white p-2 shadow-soft">
              <button
                onClick={() => router.push("/planning")}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-clay-600 hover:bg-cream-100"
              >
                + New plan
              </button>
              <div className="my-1 border-t border-ink-100" />
              {drafts.length === 0 && <p className="px-3 py-2 text-sm text-ink-400">No other drafts yet.</p>}
              {drafts.map((d) => (
                <button
                  key={d.id}
                  onClick={() => router.push(`/planning?plan=${d.id}`)}
                  className={`block w-full rounded-lg px-3 py-2 text-left text-sm ${
                    d.id === planId ? "bg-cream-100 text-ink-800" : "text-ink-600 hover:bg-cream-100"
                  }`}
                >
                  {d.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex h-[70vh] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto rounded-xl2 border border-ink-100 bg-white p-4">
            {messages
              .filter((m) => !m.hidden)
              .map((m) => (
                <div key={m.id} className={m.role === "user" ? "text-right" : "text-left"}>
                  <div
                    className={`inline-block max-w-[85%] rounded-xl2 px-4 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-clay-500 text-white"
                        : "bg-cream-100 text-ink-800"
                    }`}
                  >
                    {m.text || (streaming && m.id === messages[messages.length - 1]?.id ? "…" : "")}
                  </div>
                </div>
              ))}
            {error && <p className="text-sm text-clay-600">{error}</p>}
            <div ref={transcriptEndRef} />
          </div>

          <div className="mt-3 flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Type a message…"
              disabled={streaming}
              autoFocus
              className={inputClass}
            />
            <button onClick={send} disabled={streaming || !input.trim()} className={primaryButtonClass}>
              Send
            </button>
          </div>
        </div>

        <div>
          <h2 className="mb-3 font-serif text-lg text-ink-800">Your plan</h2>
          <Card className="max-h-[70vh] overflow-y-auto bg-cream-50/50 p-4">
            <PlanPanel items={planItems} setItems={setPlanItems} />
          </Card>
        </div>
      </div>
    </div>
  );
}
