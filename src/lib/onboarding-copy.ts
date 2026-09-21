import { formsFor, verb, type PronounSet } from "@/lib/pronouns";

export const QUICK_PICK_CATEGORIES = [
  "color",
  "flower",
  "band",
  "jewelry_style",
  "food",
  "hobby",
  "movie",
] as const;

export type QuickPickCategory = (typeof QUICK_PICK_CATEGORIES)[number];

export function questionFor(category: QuickPickCategory, pronouns: PronounSet): string {
  const { subject, object } = formsFor(pronouns);
  const does = verb(pronouns, "do");

  switch (category) {
    case "color":
      return `What colors make ${object} light up?`;
    case "flower":
      return `What flowers ${does} ${subject} love?`;
    case "band":
      return `What music ${does} ${subject} always put on?`;
    case "jewelry_style":
      return `What jewelry ${does} ${subject} reach for?`;
    case "food":
      return `What food ${does} ${subject} never turn down?`;
    case "hobby":
      return `What ${does} ${subject} love doing?`;
    case "movie":
      return `What movies ${does} ${subject} watch again and again?`;
  }
}

// Common color names shown as tap-to-pick chips on the color quick-pick
// screen, so picking a favorite color doesn't require typing one from
// scratch. The free-text input alongside them still covers anything else.
export const COLOR_CHIPS = [
  "Terracotta",
  "Sage",
  "Dusty Rose",
  "Navy",
  "Mustard",
  "Cream",
  "Burgundy",
  "Forest Green",
  "Warm Gray",
  "Lavender",
] as const;

export function placeholderFor(category: QuickPickCategory): string {
  switch (category) {
    case "color":
      return "e.g. sage green";
    case "flower":
      return "e.g. peonies";
    case "band":
      return "e.g. Fleet Foxes";
    case "jewelry_style":
      return "e.g. dainty gold";
    case "food":
      return "e.g. Thai food";
    case "hobby":
      return "e.g. hiking";
    case "movie":
      return "e.g. Amélie";
  }
}
