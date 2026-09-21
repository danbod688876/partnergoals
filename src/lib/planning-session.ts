import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { keyDate } from "@/db/schema";
import { suggestRestaurant } from "@/lib/suggest-restaurant";

export type ProposedKeyDate = {
  clientId: string;
  kind: "key_date";
  label: string;
  date: string;
  recurrence: "annual" | "one_time";
  sensitive: boolean;
};

export type ProposedPlannedActivity = {
  clientId: string;
  kind: "planned_activity";
  activityType: "date_night" | "trip" | "anniversary_birthday";
  targetDate: string | null;
  notes: string | null;
};

export type ProposedItineraryItem = {
  clientId: string;
  kind: "itinerary_item";
  tripId: number | null;
  day: number;
  time: string | null;
  activity: string;
  notes: string | null;
};

export type ProposedItem = ProposedKeyDate | ProposedPlannedActivity | ProposedItineraryItem;

export const PLANNING_TOOLS: Anthropic.Tool[] = [
  {
    name: "propose_key_date",
    description:
      "Propose a key date (birthday, anniversary, etc.) to add. This does NOT save it — it shows up as a proposed card the user must confirm.",
    input_schema: {
      type: "object",
      properties: {
        label: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        recurrence: { type: "string", enum: ["annual", "one_time"] },
        sensitive: {
          type: "boolean",
          description: "True for dates that deserve quiet, low-key handling rather than gift framing.",
        },
      },
      required: ["label", "date", "recurrence", "sensitive"],
    },
  },
  {
    name: "propose_planned_activity",
    description:
      "Propose a planned activity (date night, a trip, or an anniversary/birthday plan without a full key date). Does NOT save it.",
    input_schema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["date_night", "trip", "anniversary_birthday"] },
        target_date: { type: "string", description: "YYYY-MM-DD, optional" },
        notes: { type: "string" },
      },
      required: ["type"],
    },
  },
  {
    name: "propose_trip_itinerary_item",
    description:
      "Propose one day-by-day itinerary item for a trip. Omit trip_id if this is the first item of a new trip being planned — the frontend groups consecutive trip-id-less items into one new trip.",
    input_schema: {
      type: "object",
      properties: {
        trip_id: { type: "integer", description: "Existing trip id, if continuing one already confirmed this session." },
        day: { type: "integer", description: "Day number within the trip, starting at 1." },
        time: { type: "string", description: "Optional time, e.g. '7:00 PM'." },
        activity: { type: "string" },
        notes: { type: "string" },
      },
      required: ["day", "activity"],
    },
  },
  {
    name: "suggest_restaurant",
    description:
      "Look up restaurants matching a cuisine and/or neighborhood. Searches the user's saved favorites first; if none match, falls back to nearby options from Google Places. Read-only — does not propose or save anything. Check each result's source (\"favorite\" or \"places\") and be clear with the user which kind it is. If it returns no results, say so honestly rather than inventing a restaurant.",
    input_schema: {
      type: "object",
      properties: {
        cuisine: { type: "string" },
        neighborhood: { type: "string" },
      },
    },
  },
];

function normalizeLabel(label: string): string {
  return label.trim().toLowerCase();
}

function monthDay(dateStr: string): string {
  return dateStr.slice(5); // "MM-DD"
}

async function findDuplicateKeyDate(label: string, date: string) {
  const rows = await db.select().from(keyDate);
  return rows.find(
    (row) => normalizeLabel(row.label) === normalizeLabel(label) && monthDay(row.date) === monthDay(date)
  );
}

let clientIdCounter = 0;
function nextClientId(): string {
  clientIdCounter += 1;
  return `plan-${Date.now()}-${clientIdCounter}`;
}

export type ToolExecutionResult = {
  resultForModel: unknown;
  proposal?: ProposedItem;
};

export async function executeTool(name: string, input: Record<string, unknown>): Promise<ToolExecutionResult> {
  switch (name) {
    case "propose_key_date": {
      const label = String(input.label ?? "");
      const date = String(input.date ?? "");
      const recurrence = (input.recurrence === "one_time" ? "one_time" : "annual") as "annual" | "one_time";
      const sensitive = Boolean(input.sensitive);

      const duplicate = await findDuplicateKeyDate(label, date);
      if (duplicate) {
        return {
          resultForModel: {
            status: "duplicate",
            message: `A key date called "${duplicate.label}" already exists on this date. Don't propose it again — mention it's already saved instead.`,
          },
        };
      }

      return {
        resultForModel: { status: "proposed" },
        proposal: { clientId: nextClientId(), kind: "key_date", label, date, recurrence, sensitive },
      };
    }

    case "propose_planned_activity": {
      const activityType = (
        ["date_night", "trip", "anniversary_birthday"].includes(String(input.type))
          ? input.type
          : "date_night"
      ) as ProposedPlannedActivity["activityType"];
      const targetDate = input.target_date ? String(input.target_date) : null;
      const notes = input.notes ? String(input.notes) : null;

      return {
        resultForModel: { status: "proposed" },
        proposal: { clientId: nextClientId(), kind: "planned_activity", activityType, targetDate, notes },
      };
    }

    case "propose_trip_itinerary_item": {
      const tripId = typeof input.trip_id === "number" ? input.trip_id : null;
      const day = typeof input.day === "number" ? input.day : 1;
      const time = input.time ? String(input.time) : null;
      const activity = String(input.activity ?? "");
      const notes = input.notes ? String(input.notes) : null;

      return {
        resultForModel: { status: "proposed", newTrip: tripId == null },
        proposal: { clientId: nextClientId(), kind: "itinerary_item", tripId, day, time, activity, notes },
      };
    }

    case "suggest_restaurant": {
      const cuisine = input.cuisine ? String(input.cuisine) : undefined;
      const neighborhood = input.neighborhood ? String(input.neighborhood) : undefined;
      const results = await suggestRestaurant({ cuisine, neighborhood });

      return {
        resultForModel:
          results.length > 0
            ? { results }
            : {
                results: [],
                message:
                  "Nothing favorited or found nearby matches that. Tell the user honestly rather than suggesting a specific restaurant that isn't grounded in their data.",
              },
      };
    }

    default:
      return { resultForModel: { status: "error", message: `Unknown tool: ${name}` } };
  }
}

export function buildSystemPrompt(context?: { occasion?: string; date?: string }): string {
  const base = `You're helping plan something for the user's partner, inside PartnerGoals — a private, warm, personal app (never clinical or corporate in tone).

Be warm and plain-spoken, like a thoughtful friend helping someone plan, not a form to fill out. Bias toward proposing something concrete quickly rather than asking a lot of clarifying questions first — the whole point of this feature is speed when time is short. One or two quick questions is fine if genuinely needed, but don't stall on details.

You can propose a key date, a planned activity (date night / trip / anniversary-birthday), or a trip itinerary item — these show up for the user to review and confirm themselves; nothing you propose is saved automatically. You can also look up the user's saved favorite restaurants (read-only). Never invent a restaurant that isn't in those results — if nothing matches, say so plainly instead of making something up.

Keep replies short — a sentence or two plus whatever you proposed, not a long message.`;

  if (context?.occasion || context?.date) {
    return `${base}\n\nContext for this session: the user just added an upcoming occasion — ${context.occasion ?? "an important date"}${context.date ? ` on ${context.date}` : ""} — and it's coming up soon. Open by acknowledging that directly and proposing a concrete next step (e.g. a restaurant suggestion, an activity, or an itinerary idea) right away rather than asking what they want first.`;
  }

  return base;
}
