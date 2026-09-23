import Anthropic from "@anthropic-ai/sdk";
import { asc, eq } from "drizzle-orm";
import { NextRequest } from "next/server";
import { db } from "@/db";
import { plan, planItem, planMessage } from "@/db/schema";
import { PLANNING_TOOLS, buildSystemPrompt, executeTool, type ProposedItem } from "@/lib/planning-session";

export const maxDuration = 60;

type NdjsonEvent =
  | { type: "text"; text: string }
  | { type: "proposal"; item: ProposedItem; dbId: number }
  | { type: "title"; title: string }
  | { type: "done" }
  | { type: "error"; message: string };

function encodeLine(event: NdjsonEvent): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(event) + "\n");
}

function errorResponse(message: string): Response {
  const body =
    JSON.stringify({ type: "error", message } satisfies NdjsonEvent) +
    "\n" +
    JSON.stringify({ type: "done" } satisfies NdjsonEvent) +
    "\n";
  return new Response(body, { headers: { "Content-Type": "application/x-ndjson" } });
}

export async function POST(req: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return errorResponse("ANTHROPIC_API_KEY isn't configured, so Planning Session can't run yet.");
  }

  const body = await req.json();
  const planId: number | undefined = body.planId;
  const newMessage: { role: "user"; content: string; hidden: boolean } | undefined = body.message;
  const context: { occasion?: string; date?: string } | undefined = body.context;

  if (!planId) return errorResponse("Missing plan id.");

  const [planRow] = await db.select().from(plan).where(eq(plan.id, planId)).limit(1);
  if (!planRow) return errorResponse("That plan couldn't be found — try starting a new one.");

  if (newMessage) {
    await db.insert(planMessage).values({
      planId,
      role: "user",
      content: newMessage.content,
      hidden: newMessage.hidden,
    });
  }

  const history = await db
    .select()
    .from(planMessage)
    .where(eq(planMessage.planId, planId))
    .orderBy(asc(planMessage.createdAt));

  const messages: Anthropic.MessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  if (messages.length === 0) {
    return errorResponse("Say something to get started.");
  }

  const client = new Anthropic({ apiKey });
  const system = await buildSystemPrompt(context);

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let assistantText = "";
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
            assistantText += delta;
            controller.enqueue(encodeLine({ type: "text", text: delta }));
          });

          const final = await apiStream.finalMessage();
          messages.push({ role: "assistant", content: final.content });

          if (final.stop_reason !== "tool_use") break;

          const toolResults: Anthropic.ToolResultBlockParam[] = [];
          for (const block of final.content) {
            if (block.type !== "tool_use") continue;
            const { resultForModel, proposal, planTitle } = await executeTool(
              block.name,
              block.input as Record<string, unknown>
            );

            if (proposal) {
              const [itemRow] = await db
                .insert(planItem)
                .values({
                  planId,
                  clientId: proposal.clientId,
                  category: proposal.category,
                  status: "proposed",
                  payloadJson: JSON.stringify(proposal),
                })
                .returning({ id: planItem.id });
              controller.enqueue(encodeLine({ type: "proposal", item: proposal, dbId: itemRow.id }));
            }

            if (planTitle) {
              await db.update(plan).set({ name: planTitle }).where(eq(plan.id, planId));
              controller.enqueue(encodeLine({ type: "title", title: planTitle }));
            }

            toolResults.push({
              type: "tool_result",
              tool_use_id: block.id,
              content: JSON.stringify(resultForModel),
            });
          }
          messages.push({ role: "user", content: toolResults });
        }

        if (assistantText.trim()) {
          await db.insert(planMessage).values({ planId, role: "assistant", content: assistantText });
        }
        await db.update(plan).set({ updatedAt: new Date() }).where(eq(plan.id, planId));

        controller.enqueue(encodeLine({ type: "done" }));
      } catch (err) {
        console.error("Planning session chat failed:", err);
        if (assistantText.trim()) {
          await db.insert(planMessage).values({ planId, role: "assistant", content: assistantText });
        }
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
