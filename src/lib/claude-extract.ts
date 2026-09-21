import Anthropic from "@anthropic-ai/sdk";

export type ExtractedPreference = {
  category: "band" | "color" | "flower" | "jewelry_style" | "food" | "hobby" | "movie" | "other";
  value: string;
  strength?: "like" | "love" | "dislike";
  notes?: string;
};

export type ExtractedKeyDate = {
  label: string;
  date: string; // YYYY-MM-DD, year is a placeholder (2000) when not given
  recurrence?: "annual" | "one_time";
  sensitive?: boolean;
  leadTimeDays?: number;
};

export type ExtractedProfile = {
  name?: string;
  pronouns?: "she_her" | "he_him" | "they_them";
  birthday?: string;
  city?: string;
  neighborhood?: string;
  clothingSize?: string;
  shoeSize?: string;
  ringSize?: string;
  dietaryNotes?: string;
  preferences: ExtractedPreference[];
  keyDates: ExtractedKeyDate[];
};

const EXTRACT_TOOL: Anthropic.Tool = {
  name: "extract_partner_profile",
  description: "Extract structured facts about a person from freeform notes.",
  input_schema: {
    type: "object",
    properties: {
      name: { type: "string", description: "The person's name, if mentioned." },
      pronouns: { type: "string", enum: ["she_her", "he_him", "they_them"] },
      birthday: {
        type: "string",
        description:
          "Their birthday as YYYY-MM-DD. If only month/day is known (no year), use 2000 as a placeholder year.",
      },
      city: { type: "string" },
      neighborhood: { type: "string" },
      clothingSize: { type: "string" },
      shoeSize: { type: "string" },
      ringSize: { type: "string" },
      dietaryNotes: { type: "string" },
      preferences: {
        type: "array",
        description: "Things they like/love/dislike — bands, colors, flowers, jewelry style, food, hobbies, movies.",
        items: {
          type: "object",
          properties: {
            category: {
              type: "string",
              enum: ["band", "color", "flower", "jewelry_style", "food", "hobby", "movie", "other"],
            },
            value: { type: "string" },
            strength: { type: "string", enum: ["like", "love", "dislike"] },
            notes: { type: "string" },
          },
          required: ["category", "value"],
        },
      },
      keyDates: {
        type: "array",
        description: "Birthdays, anniversaries, or other dates worth remembering (besides their own birthday above).",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            date: {
              type: "string",
              description: "YYYY-MM-DD. If only month/day is known, use 2000 as a placeholder year.",
            },
            recurrence: { type: "string", enum: ["annual", "one_time"] },
            sensitive: {
              type: "boolean",
              description: "True for dates that deserve quiet, low-key handling rather than gift framing.",
            },
            leadTimeDays: { type: "integer" },
          },
          required: ["label", "date"],
        },
      },
    },
    required: ["preferences", "keyDates"],
  },
};

export type ExtractResult =
  | { status: "ok"; data: ExtractedProfile }
  | { status: "error"; message: string };

export async function extractProfileFromText(text: string): Promise<ExtractResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      status: "error",
      message: "ANTHROPIC_API_KEY isn't configured, so notes can't be sorted automatically yet.",
    };
  }

  if (!text.trim()) {
    return { status: "error", message: "Paste something first." };
  }

  try {
    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 2048,
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: "extract_partner_profile" },
      messages: [
        {
          role: "user",
          content: `Extract what you can about this person from these notes. Don't invent anything that isn't there — leave fields out if they're not mentioned.\n\n---\n${text}\n---`,
        },
      ],
    });

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
    );

    if (!toolUse) {
      return { status: "error", message: "Couldn't make sense of that — try adding a bit more detail." };
    }

    const data = toolUse.input as Partial<ExtractedProfile>;
    return {
      status: "ok",
      data: { ...data, preferences: data.preferences ?? [], keyDates: data.keyDates ?? [] },
    };
  } catch (err) {
    console.error("Claude extraction failed:", err);
    return { status: "error", message: "Something went wrong sorting that out — try again in a moment." };
  }
}
