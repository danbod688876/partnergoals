import type Anthropic from "@anthropic-ai/sdk";
import { and, eq, ilike } from "drizzle-orm";
import { db } from "@/db";
import { enjoyedPlace, favoriteRestaurant, keyDate, preference, preferenceCategoryEnum } from "@/db/schema";
import { suggestRestaurant } from "@/lib/suggest-restaurant";
import { suggestHotels, enrichHotel, type HotelEnrichment } from "@/lib/suggest-hotel";
import { enrichRestaurant, type RestaurantEnrichment } from "@/lib/restaurant-enrichment";
import { searchHotelsViaSerpApi } from "@/lib/serpapi-hotels";

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

export type FavoriteRestaurantRef = {
  id: number;
  name: string;
  platform: "opentable" | "resy" | "other";
  platformVenueId: string | null;
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
  // The trip's destination city, if the model has stated one — carried on
  // every item (not just the first) so a new trip gets it stored, and so
  // restaurant/hotel lookups search there instead of the user's home city.
  destination: string | null;
  // Set instead of restaurantInfo when restaurant_name matches an existing
  // FavoriteRestaurant — the panel renders the real booking widget (or a
  // link to its detail page) for these rather than a live Places lookup.
  favoriteRestaurant: FavoriteRestaurantRef | null;
  restaurantInfo: RestaurantEnrichment | null;
  hotelInfo: HotelEnrichment | null;
};

// A real, priced hotel candidate from SerpApi's Google Hotels engine — a
// separate concept from a generic "stay" itinerary item (which just gets a
// Places rating, no price). tripId is null until confirmed, same pattern as
// ProposedItineraryItem: the frontend resolves it to whichever trip is
// active in this session.
export type ProposedHotelStay = {
  clientId: string;
  kind: "hotel_stay";
  category: "stay";
  tripId: number | null;
  destination: string;
  checkIn: string;
  checkOut: string;
  name: string;
  price: number | null;
  currency: string | null;
  rating: number | null;
  reviewCount: number | null;
  bookingUrl: string | null;
};

export type ProposedItem = ProposedKeyDate | ProposedPlannedActivity | ProposedItineraryItem | ProposedHotelStay;

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
        destination: {
          type: "string",
          description:
            "The trip's destination city (e.g. 'Vancouver'). Include this on EVERY itinerary item for a trip, not just the first — it's what makes restaurant_name/hotel_name lookups search the right city instead of the user's home city, and gets saved onto the trip the first time it's confirmed.",
        },
        restaurant_name: {
          type: "string",
          description:
            "Set this to the specific restaurant/bar/cafe's name when category is eat_drink and you're recommending a real place (not a generic 'find dinner somewhere' placeholder) — this looks up its rating, a short description, and a link to attach to the card.",
        },
        hotel_name: {
          type: "string",
          description:
            "Set this to the specific hotel's name when category is stay and you're recommending a real place (from search_hotels or one the user named) — this looks up its rating, a short description, and a booking link to attach to the card.",
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
        city: {
          type: "string",
          description: "The destination city to search near, if this is for a trip away from the user's home city — always set this for a trip, or results will search the wrong place.",
        },
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
    name: "propose_hotel_stay",
    description:
      "Search real, currently-priced hotel candidates for a trip via Google Hotels and propose the top few as cards — the user picks which one (if any) to confirm. Needs concrete check-in/check-out dates; if you don't have those yet, ask, or use search_hotels first for a dateless, price-free look at options. Never invent a hotel, price, or rating — only what's actually returned.",
    input_schema: {
      type: "object",
      properties: {
        destination: { type: "string" },
        check_in: { type: "string", description: "YYYY-MM-DD" },
        check_out: { type: "string", description: "YYYY-MM-DD" },
      },
      required: ["destination", "check_in", "check_out"],
    },
  },
  {
    name: "save_preference",
    description:
      "Save something the user tells you about their partner's tastes — a favorite cuisine, a hobby, a neighborhood they love, anything that'll help future planning — as a lasting preference. Call this as soon as the user states one in conversation, don't wait to be asked; it's separate from proposing plan items and doesn't show up as a card. Use 'food' for cuisine/restaurant tastes.",
    input_schema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          enum: ["band", "color", "flower", "jewelry_style", "food", "hobby", "movie", "other"],
        },
        value: { type: "string" },
      },
      required: ["category", "value"],
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

async function findFavoriteRestaurantByName(name: string): Promise<FavoriteRestaurantRef | null> {
  const [row] = await db
    .select()
    .from(favoriteRestaurant)
    .where(ilike(favoriteRestaurant.name, name))
    .limit(1);
  if (!row) return null;
  return { id: row.id, name: row.name, platform: row.platform, platformVenueId: row.platformVenueId };
}

let clientIdCounter = 0;
function nextClientId(): string {
  clientIdCounter += 1;
  return `plan-${Date.now()}-${clientIdCounter}`;
}

export type ToolExecutionResult = {
  resultForModel: unknown;
  proposal?: ProposedItem;
  // A tool that can surface several real, distinct candidates from one call
  // (e.g. propose_hotel_stay) uses this instead of `proposal` — each becomes
  // its own card, individually confirmable.
  proposals?: ProposedItem[];
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
      const destination = input.destination ? String(input.destination) : null;
      const category = (
        ["stay", "eat_drink", "explore"].includes(String(input.category))
          ? input.category
          : "explore"
      ) as PlanItemCategory;

      let restaurantInfo: RestaurantEnrichment | null = null;
      let hotelInfo: HotelEnrichment | null = null;
      let favorite: FavoriteRestaurantRef | null = null;
      if (category === "eat_drink" && input.restaurant_name) {
        const name = String(input.restaurant_name);
        favorite = await findFavoriteRestaurantByName(name);
        if (!favorite) {
          restaurantInfo = await enrichRestaurant(name, null, destination);
        }
      } else if (category === "stay" && input.hotel_name) {
        hotelInfo = await enrichHotel(String(input.hotel_name), destination);
      }

      return {
        resultForModel: {
          status: "proposed",
          newTrip: tripId == null,
          matchedFavorite: favorite
            ? "this is one of the user's saved favorites — its booking widget/link will show on the card, no need to describe reservation details yourself"
            : undefined,
          placeLookup:
            !favorite && (input.restaurant_name || input.hotel_name)
              ? restaurantInfo || hotelInfo
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
          destination,
          favoriteRestaurant: favorite,
          restaurantInfo,
          hotelInfo,
        },
      };
    }

    case "suggest_restaurant": {
      const cuisine = input.cuisine ? String(input.cuisine) : undefined;
      const neighborhood = input.neighborhood ? String(input.neighborhood) : undefined;
      const city = input.city ? String(input.city) : undefined;
      const results = await suggestRestaurant({ cuisine, neighborhood, city });

      return {
        resultForModel:
          results.length > 0
            ? { results }
            : {
                results: [],
                message:
                  "Nothing favorited or found nearby. Don't explain why (no saved favorites, no Places results) — just ask concisely for what's needed to search, e.g. a neighborhood and a favorite kind of food, in one short question.",
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
                  "Nothing enjoyed on file and nothing found nearby. Don't explain why — just ask concisely for what's needed, e.g. the destination city, in one short question.",
              },
      };
    }

    case "propose_hotel_stay": {
      const destination = String(input.destination ?? "").trim();
      const checkIn = String(input.check_in ?? "");
      const checkOut = String(input.check_out ?? "");
      if (!destination || !checkIn || !checkOut) {
        return {
          resultForModel: { status: "error", message: "destination, check_in, and check_out are all required" },
        };
      }

      const candidates = await searchHotelsViaSerpApi({ destination, checkIn, checkOut });
      if (candidates.length === 0) {
        return {
          resultForModel: {
            results: [],
            message:
              "No hotels found (SERP_API_KEY may not be set, or nothing matched). Say so honestly rather than inventing a hotel.",
          },
        };
      }

      const proposals: ProposedHotelStay[] = candidates.map((c) => ({
        clientId: nextClientId(),
        kind: "hotel_stay",
        category: "stay",
        tripId: null,
        destination,
        checkIn,
        checkOut,
        name: c.name,
        price: c.price,
        currency: c.currency,
        rating: c.rating,
        reviewCount: c.reviewCount,
        bookingUrl: c.bookingUrl,
      }));

      return {
        resultForModel: {
          status: "proposed",
          count: proposals.length,
          message: `Proposed ${proposals.length} real, priced candidate(s) as cards — no need to restate their prices/ratings in your reply, just point the user at the panel.`,
        },
        proposals,
      };
    }

    case "save_preference": {
      const category = (
        preferenceCategoryEnum.enumValues.includes(String(input.category) as never)
          ? input.category
          : "other"
      ) as (typeof preferenceCategoryEnum.enumValues)[number];
      const value = String(input.value ?? "").trim();
      if (!value) return { resultForModel: { status: "error", message: "value is required" } };

      const existing = await db
        .select({ id: preference.id })
        .from(preference)
        .where(and(eq(preference.category, category), ilike(preference.value, value)))
        .limit(1);

      if (existing.length > 0) {
        return { resultForModel: { status: "already_saved" } };
      }

      await db.insert(preference).values({ category, value, strength: "like" });
      return { resultForModel: { status: "saved" } };
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

You can propose a key date, a planned activity (date night / trip / anniversary-birthday), or a trip itinerary item — these show up for the user to review and confirm themselves; nothing you propose is saved automatically. You can also look up the user's saved favorite restaurants and hotels the user has actually enjoyed staying at (both read-only). Never invent a restaurant, hotel, rating, or review count that isn't in those results — if nothing matches, say so plainly instead of making something up. When a lookup comes back empty, don't explain the mechanics of why (no saved favorites, no Places results, missing API key) — just ask concisely for whatever's needed to search, in one short question (e.g. "What neighborhood, and what's a favorite kind of food?").

For a trip specifically: first find out if it's tied to an event (anniversary, birthday, just a getaway) and roughly how many nights, then start with lodging. If you don't have exact check-in/check-out dates yet, use search_hotels for a quick, dateless look at options (places enjoyed before, or nearby favorites); once you have real dates, call propose_hotel_stay — it proposes several real, currently-priced hotel cards at once from Google Hotels, which the user picks from directly, rather than you choosing one to describe. Prefer propose_hotel_stay over describing a hotel in propose_trip_itinerary_item whenever you have dates, since it carries real pricing a generic itinerary item doesn't. Always pass the trip's destination as \`city\` to suggest_restaurant/search_hotels and as \`destination\` on propose_trip_itinerary_item (every item, not just the first) and propose_hotel_stay — otherwise searches default to the user's own home city instead of where the trip actually is. When you propose a specific restaurant, set restaurant_name on propose_trip_itinerary_item so it gets a real rating/link (or the user's own booking widget, if it matches a saved favorite) attached — don't just describe a place in your reply text without proposing it that way.

Whenever the user tells you something about their partner's tastes in conversation — a favorite cuisine, a neighborhood they love, a hobby — call save_preference right away so it's remembered for next time, even if that's not what they were asking for. Don't wait to be asked.

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
