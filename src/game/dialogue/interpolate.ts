import type { Pronoun } from "../GameState";

export type InterpolationContext = {
  playerName: string;
  pronoun: Pronoun;
};

/** Pronoun forms addressed by dialogue tokens, keyed by the "they" series. */
const PRONOUN_FORMS: Record<Pronoun, Record<string, string>> = {
  she: { they: "she", them: "her", their: "her", theirs: "hers", themself: "herself" },
  he: { they: "he", them: "him", their: "his", theirs: "his", themself: "himself" },
  they: { they: "they", them: "them", their: "their", theirs: "theirs", themself: "themself" }
};

const TOKEN_PATTERN = /\{(playerName|they|them|their|theirs|themself|They|Them|Their|Theirs|Themself)\}/g;

/**
 * Resolves {playerName} and {they}/{them}/{their}/... tokens in dialogue
 * text. Capitalised tokens ({They}) produce capitalised forms. Unknown
 * tokens are left untouched so broken data stays visible.
 */
export function interpolateDialogueText(text: string, context: InterpolationContext): string {
  return text.replace(TOKEN_PATTERN, (_match, token: string) => {
    if (token === "playerName") return context.playerName;
    const lower = token.toLowerCase();
    const form = PRONOUN_FORMS[context.pronoun][lower];
    if (form === undefined) return `{${token}}`;
    return token[0] === token[0].toUpperCase() ? form[0].toUpperCase() + form.slice(1) : form;
  });
}
