import type { Pronoun } from "../GameState";

/**
 * Context used to resolve template tokens in dialogue text and choice labels.
 * `name` is the player's chosen name (may be empty for a custom player); the
 * template falls back to a neutral default so an empty name still reads well.
 */
export type TemplateContext = {
  name: string;
  pronoun: Pronoun;
};

/** Shown for `{name}` when the player has not chosen a name. */
const DEFAULT_NAME = "you";

/**
 * Pronoun forms keyed by grammatical role:
 *   subject / object / possessive determiner / possessive pronoun / reflexive.
 */
type PronounForms = {
  subject: string;
  object: string;
  possessive: string; // determiner: "her/his/their dog"
  possessivePronoun: string; // "it is hers/his/theirs"
  reflexive: string;
};

const PRONOUN_FORMS: Record<Pronoun, PronounForms> = {
  she: { subject: "she", object: "her", possessive: "her", possessivePronoun: "hers", reflexive: "herself" },
  he: { subject: "he", object: "him", possessive: "his", possessivePronoun: "his", reflexive: "himself" },
  they: { subject: "they", object: "them", possessive: "their", possessivePronoun: "theirs", reflexive: "themselves" }
};

/**
 * Lower-case token name -> form selector. The template renders the chosen
 * pronoun's form; the writers phrase verbs around it (we do not conjugate).
 * Tokens are spelled with the gender-neutral words for readability in source.
 */
const PRONOUN_TOKENS: Record<string, keyof PronounForms> = {
  they: "subject",
  them: "object",
  their: "possessive",
  theirs: "possessivePronoun",
  themself: "reflexive",
  themselves: "reflexive"
};

function capitalize(value: string): string {
  if (value.length === 0) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Resolve a single token's inner name (without braces) or return undefined. */
function resolveToken(token: string, ctx: TemplateContext): string | undefined {
  if (token === "name") {
    return ctx.name.trim() === "" ? DEFAULT_NAME : ctx.name;
  }
  if (token === "Name") {
    return capitalize(ctx.name.trim() === "" ? DEFAULT_NAME : ctx.name);
  }

  const lower = token.toLowerCase();
  const form = PRONOUN_TOKENS[lower];
  if (form === undefined) return undefined;

  const resolved = PRONOUN_FORMS[ctx.pronoun][form];
  // A token written with a leading capital ({Their}) yields a capitalized form.
  const isCapitalized = token.charAt(0) === token.charAt(0).toUpperCase() && token.charAt(0) !== token.charAt(0).toLowerCase();
  return isCapitalized ? capitalize(resolved) : resolved;
}

/**
 * Substitute `{token}` placeholders in `text` using the player's name and
 * pronoun. Pure and synchronous. Unknown tokens are left untouched (braces and
 * all) so unrelated text such as JSON snippets is never mangled or stripped.
 *
 * Supported tokens:
 *   {name}                                     -> player's name (or "you")
 *   {they} {them} {their} {theirs} {themself}  -> pronoun forms
 *   capitalized variants ({They}, {Their}, ...) -> capitalized forms
 */
export function applyTemplate(text: string, ctx: TemplateContext): string {
  return text.replace(/\{(\w+)\}/g, (match, token: string) => {
    const resolved = resolveToken(token, ctx);
    return resolved === undefined ? match : resolved;
  });
}
