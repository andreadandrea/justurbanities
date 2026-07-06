/**
 * Dual art style (SPEC_Dual_Art_Style): every character exists in two
 * graphic versions — realistic and anthropomorphic-animal — switchable at
 * any time. The variant is DATA (a path segment), not code.
 *
 * Current asset layout keeps the original flat structure as the realistic
 * set (assets/characters/<id>/...); the animal set lives under
 * assets/characters/<id>/animal/... with identical filenames. The fallback
 * chain is a hard rule: requested variant → realistic → placeholder.
 */

export const ART_VARIANTS = ["realistic", "animal"] as const;
export type ArtVariant = (typeof ART_VARIANTS)[number];

export const DEFAULT_VARIANT: ArtVariant = "realistic";

const CHARACTER_PATH = /^(assets\/characters\/[^/]+\/)(.+)$/;

/** The path of a character asset in the given variant. */
export function variantPath(path: string, variant: ArtVariant): string {
  if (variant === "realistic") return path;
  const match = CHARACTER_PATH.exec(path);
  if (!match) return path; // not a character asset: variants don't apply
  return `${match[1]}${variant}/${match[2]}`;
}

/** Candidate paths in fallback order (requested variant first). */
export function variantCandidates(path: string, variant: ArtVariant): string[] {
  const primary = variantPath(path, variant);
  return primary === path ? [path] : [primary, path];
}

/** Cache key scoped to a variant, so a switch never returns stale art. */
export function variantKey(variant: ArtVariant, key: string): string {
  return `${variant}:${key}`;
}

export type VariantGap = { variant: ArtVariant; characterId: string; missing: string[] };

/**
 * Per-variant completeness report: which declared assets are missing on
 * disk for each character and variant. `availableFiles` holds project-
 * relative paths (as in the manifest); drives the asset status doc.
 */
export function variantCompletenessReport(
  manifest: {
    characters?: Array<{
      id: string;
      generatedAssets?: { icon?: string; portraits?: Record<string, string>; spritesDir?: string };
    }>;
  },
  availableFiles: ReadonlySet<string>,
  variants: readonly ArtVariant[] = ART_VARIANTS
): VariantGap[] {
  const gaps: VariantGap[] = [];
  for (const character of manifest.characters ?? []) {
    const declared = [
      character.generatedAssets?.icon,
      ...Object.values(character.generatedAssets?.portraits ?? {})
    ].filter((path): path is string => typeof path === "string");
    for (const variant of variants) {
      const missing = declared
        .map((path) => variantPath(path, variant))
        .filter((path) => !availableFiles.has(path));
      if (missing.length > 0) gaps.push({ variant, characterId: character.id, missing });
    }
  }
  return gaps;
}
