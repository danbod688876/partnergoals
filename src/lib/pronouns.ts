export type PronounSet = "she_her" | "he_him" | "they_them";

type Forms = {
  subject: string; // she / he / they
  object: string; // her / him / them
  possessive: string; // her / his / their
  possessiveNoun: string; // hers / his / theirs
  // Whether this pronoun set takes plural verb agreement ("they love" vs "she loves").
  plural: boolean;
};

const FORMS: Record<PronounSet, Forms> = {
  she_her: { subject: "she", object: "her", possessive: "her", possessiveNoun: "hers", plural: false },
  he_him: { subject: "he", object: "him", possessive: "his", possessiveNoun: "his", plural: false },
  they_them: { subject: "they", object: "them", possessive: "their", possessiveNoun: "theirs", plural: true },
};

export function formsFor(pronouns: PronounSet | null | undefined): Forms {
  return FORMS[pronouns ?? "they_them"];
}

// Conjugates a small, known set of present-tense verbs for the given
// pronoun set ("love" -> "loves"/"love", "do" -> "does"/"do", "be" ->
// "is"/"are"). Only covers what the onboarding/notification copy actually
// needs, not a general conjugator.
const IRREGULAR: Record<string, [string, string]> = {
  do: ["does", "do"],
  be: ["is", "are"],
  have: ["has", "have"],
};

export function verb(pronouns: PronounSet | null | undefined, base: string): string {
  const { plural } = formsFor(pronouns);
  const irregular = IRREGULAR[base];
  if (irregular) return plural ? irregular[1] : irregular[0];
  return plural ? base : `${base}s`;
}
