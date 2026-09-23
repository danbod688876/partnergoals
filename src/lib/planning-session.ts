import type Anthropic from "@anthropic-ai/sdk";
import { db } from "@/db";
import { enjoyedPlace, keyDate } from "@/db/schema";
import { suggestRestaurant } from "@/lib/suggest-restaurant";
import { suggestHotels } from "@/lib/suggest-hotel";
import { enrichRestaurant, type RestaurantEnrichment } from "@/lib/restaurant-enrichment";

export type PlanItemCategory = "stay" | "eat_drink" | "explore" | "other";

export type ProposedKeyDate = {
  clientId: string;
  kind: "key_date";
  category: "other";
  label: string;
  date: string;
  recurrence: "annual" | "one_time";
  sensitive: boolean;
};

export type ProposedPlannedActivity = {
  clientId: string;
  kind: "planned_activity";
  category: "other";
  activityType: "date_night" | "trip" | "anniversary_birthday";
  targetDate: string | null;
  notes: string | null;
};

export type ProposedItineraryItem = {
  clientId: string;
  kind: "itinerary_item";
  category: PlanItemCategory;
  tripId: number | null;
  day: number;
  time: string | null;
  activity: string;
  notes: string | null;
  restaurantInfo: RestaurantEnrichment | null;
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
      "Propose one day-by-day itinerary item for a trip. Omit trip_id if this is the first item of a new trip being planned — the frontend groups consecutive trip-id-less items into one new trip. Always set category so the plan panel can group it correctly.",
    input_schema: {
      type: "object",
      properties: {
        trip_id: { type: "integer", description: "Existing trip id, if continuing one already confirmed this session." },
        day: { type: "integer", description: "Day number within the trip, starting at 1." },
        time: { type: "string", description: "Optional time, e.g. '7:00 PM'." },
        activity: { type: "string" },
        notes: { type: "string" },
        category: {
          type: "string",
          enum: ["stay", "eat_drink", "explore"],
          description: "stay = lodging/hotel, eat_drink = a meal/bar/cafe stop, explore = everything else (sights, activities).",
        },
        restaurant_name: {
          type: "string",
          description:
            "Set this to the specific restaurant/bar/cafe's name when category is eat_drink and you're recommending a real place (not a generic 'find dinner somewhere' placeholder) — this looks up its rating, a short description, and a link to attach to the card.",
        },
      },
      required: ["day", "activity", "category"],
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
  {
    name: "search_hotels",
    description:
      "Look up hotels for a trip. Checks places the user has actually enjoyed staying at first (and says so if it finds one); if none match, falls back to nearby options from Google Places sorted by rating. Read-only — does not propose or save anything. Use this before proposing a 'stay' itinerary item so the suggestion is grounded, not invented.",
    input_schema: {
      type: "object",
      properties: {
        city: { type: "string", description: "Destination city — required unless the trip destination is already obvious from context." },
        neighborhood: { type: "string" },
      },
    },
  },
  {
    name: "set_plan_title",
    description:
      "Set (or update) this plan's short display title, e.g. 'Vancouver Weekend' or 'Mom's Birthday'. Call this once you have enough context to name it well — after the first concrete proposal is a good time. Does not show up as a card; it just renames the plan.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
      },
      required: ["title"],
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
  planTitle?: string;
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
        proposal: { clientId: nextClientId(), kind: "key_date", category: "other", label, date, recurrence, sensitive },
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
        proposal: { clientId: nextClientId(), kind: "planned_activity", category: "other", activityType, targetDate, notes },
      };
    }

    case "propose_trip_itinerary_item": {
      const tripId = typeof input.trip_id === "number" ? input.trip_id : null;
      const day = typeof input.day === "number" ? input.day : 1;
      const time = input.time ? String(input.time) : null;
      const activity = String(input.activity ?? "");
      const notes = input.notes ? String(input.notes) : null;
      const category = (
        ["stay", "eat_drink", "explore"].includes(String(input.category))
          ? input.category
          : "explore"
      ) as PlanItemCategory;

      let restaurantInfo: RestaurantEnrichment | null = null;
      if (category === "eat_drink" && input.restaurant_name) {
        restaurantInfo = await enrichRestaurant(String(input.restaurant_name), null);
      }

      return {
        resultForModel: {
          status: "proposed",
          newTrip: tripId == null,
          restaurantLookup: input.restaurant_name
            ? restaurantInfo
              ? "found — attached rating/link to the card, no need to repeat those details in your reply"
              : "not found on Places — mention it's not independently verified"
            : undefined,
        },
        proposal: {
          clientId: nextClientId(),
          kind: "itinerary_item",
          category,
          tripId,
          day,
          time,
          activity,
          notes,
          restaurantInfo,
        },
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

    case "search_hotels": {
      const city = input.city ? String(input.city) : undefined;
      const neighborhood = input.neighborhood ? String(input.neighborhood) : undefined;
      const results = await suggestHotels({ city, neighborhood });

      return {
        resultForModel:
          results.length > 0
            ? { results }
            : {
                results: [],
                message:
                  "No enjoyed hotels on file and nothing found nearby (city may be missing, or GOOGLE_PLACES_API_KEY isn't set). Ask the user for a city, or say honestly that you can't find options rather than inventing a hotel.",
              },
      };
    }

    case "set_plan_title": {
      const title = String(input.title ?? "").trim();
      if (!title) return { resultForModel: { status: "error", message: "title is required" } };
      return { resultForModel: { status: "ok" }, planTitle: title };
    }

    default:
      return { resultForModel: { status: "error", message: `Unknown tool: ${name}` } };
  }
}

async function enjoyedPlacesSummary(): Promise<string | null> {
  const rows = await db.select().from(enjoyedPlace);
  if (rows.length === 0) return null;

  const byType = new Map<string, string[]>();
  for (const row of rows) {
    const list = byType.get(row.type) ?? [];
    list.push(row.city ? `${row.name} (${row.city})` : row.name);
    byType.set(row.type, list);
  }

  return Array.from(byType.entries())
    .map(([type, names]) => `${type}s: ${names.join(", ")}`)
    .join("; ");
}

export async function buildSystemPrompt(context?: { occasion?: string; date?: string }): Promise<string> {
  const enjoyed = await enjoyedPlacesSummary();

  const base = `You're helping plan something for the user's partner, inside PartnerGoals — a private, warm, personal app (never clinical or corporate in tone).

Be warm and plain-spoken, like a thoughtful friend helping someone plan, not a form to fill out. Bias toward proposing something concrete quickly rather than asking a lot of clarifying questions first — the whole point of this feature is speed when time is short. One or two quick questions is fine if genuinely needed, but don't stall on details.

You can propose a key date, a planned activity (date night / trip / anniversary-birthday), or a trip itinerary item — these show up for the user to review and confirm themselves; nothing you propose is saved automatically. You can also look up the user's saved favorite restaurants and hotels the user has actually enjoyed staying at (both read-only). Never invent a restaurant, hotel, rating, or review count that isn't in those results — if nothing matches, say so plainly instead of making something up.

For a trip specifically: first find out if it's tied to an event (anniversary, birthday, just a getaway) and roughly how many nights, then start with lodging — call search_hotels and propose a 'stay' itinerary item before filling in food and activities. When you propose a specific restaurant stop, set restaurant_name on propose_trip_itinerary_item so it gets a real rating/link attached — don't just describe a restaurant in your reply text without proposing it that way.

Once you have enough context to name this plan well (after the first concrete proposal is a good time), call set_plan_title with a short, specific title.${
    enjoyed
      ? `\n\nPlaces the user has enjoyed before, worth referencing when relevant — a callback ("similar to the place you stayed at last time") or suggesting the same place again if a trip returns to that city: ${enjoyed}.`
      : ""
  }

Keep replies short — a sentence or two plus whatever you proposed, not a long message.`;

  if (context?.occasion || context?.date) {
    return `${base}\n\nContext for this session: the user just added an upcoming occasion — ${context.occasion ?? "an important date"}${context.date ? ` on ${context.date}` : ""} — and it's coming up soon. Open by acknowledging that directly and proposing a concrete next step (e.g. a restaurant suggestion, an activity, or an itinerary idea) right away rather than asking what they want first.`;
  }

  return base;
}
