"use client";

import { useEffect, useRef, useState } from "react";
import { Card, inputClass, primaryButtonClass } from "@/components/ui";
import type { ProposedItem } from "@/lib/planning-session";
import { PlanPanel, type PlanItem } from "./PlanPanel";

type ChatMessage = { id: string; role: "user" | "assistant"; text: string; hidden?: boolean };

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `msg-${idCounter}`;
}

export function PlanningSession({ occasion, date }: { occasion?: string; date?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [planItems, setPlanItems] = useState<PlanItem[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasStarted = useRef(false);
  const usedContext = useRef(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  const hasContext = Boolean(occasion || date);

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    if (hasContext) {
      const kickoff: ChatMessage = { id: nextId(), role: "user", text: "Let's get started.", hidden: true };
      setMessages([kickoff]);
      runTurn([kickoff], true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function runTurn(history: ChatMessage[], useContext: boolean) {
    setStreaming(true);
    setError(null);

    const assistantId = nextId();
    setMessages((prev) => [...prev, { id: assistantId, role: "assistant", text: "" }]);

    try {
      const res = await fetch("/api/planning-session/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.text })),
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
            | { type: "proposal"; item: ProposedItem }
            | { type: "done" }
            | { type: "error"; message: string };

          if (event.type === "text") {
            assistantText += event.text;
            const snapshot = assistantText;
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantId ? { ...m, text: snapshot } : m))
            );
          } else if (event.type === "proposal") {
            setPlanItems((prev) => [...prev, { ...event.item, status: "proposed" }]);
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
    if (!text || streaming) return;
    setInput("");
    const userMsg: ChatMessage = { id: nextId(), role: "user", text };
    const history = [...messages, userMsg];
    setMessages(history);
    const useContext = hasContext && !usedContext.current;
    usedContext.current = true;
    runTurn(history, useContext);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
      <div className="flex h-[75vh] flex-col">
        <div className="mb-3">
          <h1 className="font-serif text-2xl text-ink-800">Let&rsquo;s plan something</h1>
          <p className="text-sm text-ink-400">
            {hasContext
              ? `Talking through ${occasion ?? "an upcoming date"}${date ? ` (${date})` : ""}.`
              : "Tell me what's on your mind — I'll help you put a plan together."}
          </p>
        </div>

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
        <Card className="max-h-[75vh] overflow-y-auto bg-cream-50/50 p-4">
          <PlanPanel items={planItems} setItems={setPlanItems} />
        </Card>
      </div>
    </div>
  );
}
