import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";
import { PLANNING_TOOLS, buildSystemPrompt, executeTool, type ProposedItem } from "@/lib/planning-session";

export const maxDuration = 60;

type ChatMessage = { role: "user" | "assistant"; content: string };

type NdjsonEvent =
  | { type: "text"; text: string }
  | { type: "proposal"; item: ProposedItem }
  | { type: "done" }
  | { type: "error"; message: string };

function encodeLine(event: NdjsonEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event) + "\n");
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const body =
      JSON.stringify({
        type: "error",
        message: "ANTHROPIC_API_KEY isn't configured, so Planning Session can't run yet.",
      } satisfies NdjsonEvent) +
      "\n" +
      JSON.stringify({ type: "done" } satisfies NdjsonEvent) +
      "\n";
    return new Response(body, { headers: { "Content-Type": "application/x-ndjson" } });
  }

  const body = await req.json();
  const clientMessages: ChatMessage[] = Array.isArray(body.messages) ? body.messages : [];
  const context: { occasion?: string; date?: string } | undefined = body.context;

  const messages: Anthropic.MessageParam[] = clientMessages.map((m) => ({
    role: m.role,
    content: m.content,
  }));

  if (messages.length === 0) {
    // Kickoff turn with pre-seeded context (urgency branch) — a hidden
    // opening message the client never renders, just enough to get the
    // model talking about the occasion instead of asking what to do.
    messages.push({ role: "user", content: "Let's get started." });
  }

  const client = new Anthropic({ apiKey });
  const system = buildSystemPrompt(context);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Bounded loop: each pass is one assistant turn, possibly followed
        // by tool execution and another pass. Caps prevent a runaway loop
        // if the model keeps calling tools without ever finishing a reply.
        for (let turn = 0; turn < 6; turn++) {
          const apiStream = client.messages.stream({
            model: "claude-sonnet-5",
            max_tokens: 1024,
            system,
            tools: PLANNING_TOOLS,
            messages,
          });

          apiStream.on("text", (delta) => {
            controller.enqueue(encodeLine({ type: "text", text: delta }));
          });

          const final = await apiStream.finalMessage();
          messages.push({ role: "assistant", content: final.content });

          if (final.stop_reason !== "tool_use") break;

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of final.content) {
            if (block.type !== "tool_use") continue;
            const { resultForModel, proposal } = await executeTool(
              block.name,
              block.input as Record<string, unknown>
            );
            if (proposal) controller.enqueue(encodeLine({ type: "proposal", item: proposal }));
            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(resultForModel),
            });
          }
          messages.push({ role: "user", content: toolResults });
        }

        controller.enqueue(encodeLine({ type: "done" }));
      } catch (err) {
        console.error("Planning session chat failed:", err);
        controller.enqueue(
          encodeLine({ type: "error", message: "Something went wrong — try sending that again." })
        );
        controller.enqueue(encodeLine({ type: "done" }));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, { headers: { "Content-Type": "application/x-ndjson" } });
}
