import type { SupabaseConfig } from "../../sync/SupabaseRemoteApi";

/**
 * MP-2 feature flag and adapter selection (SPEC_Multiplayer §2.4/§5).
 * Multiplayer only wakes up behind `?mp=1`; with the flag off the game
 * must make ZERO network calls — so the selection is a pure function the
 * tests can pin down.
 */

/** Dexie settings key holding the joined-session info. */
export const MP_SESSION_SETTING = "mpSession";

export type MpJoinInfo = {
  code: string;
  displayName: string;
  playerId: string;
};

export type MpEnv = {
  supabaseUrl?: string;
  supabaseAnonKey?: string;
};

export function mpEnabled(search: string): boolean {
  return new URLSearchParams(search).get("mp") === "1";
}

/** MP-4: read-only teacher dashboard (`?facilitator=1`). */
export function facilitatorEnabled(search: string): boolean {
  return new URLSearchParams(search).get("facilitator") === "1";
}

/** Session code passed on the URL (`?session=ABC234`) — facilitator flow. */
export function sessionCodeFromUrl(search: string): string | undefined {
  const code = new URLSearchParams(search).get("session")?.toUpperCase();
  return code || undefined;
}

/**
 * The remote adapter to use. Supabase only when: flag on, session joined,
 * and the build ships the EU-project config. Everything else stays on the
 * fake adapter (in-memory, no network).
 */
export function chooseRemoteAdapter(
  search: string,
  joinInfo: MpJoinInfo | undefined,
  env: MpEnv
): { kind: "supabase"; config: SupabaseConfig } | { kind: "fake" } {
  if (!mpEnabled(search)) return { kind: "fake" };
  if (!joinInfo || !env.supabaseUrl || !env.supabaseAnonKey) return { kind: "fake" };
  return {
    kind: "supabase",
    config: {
      url: env.supabaseUrl,
      anonKey: env.supabaseAnonKey,
      sessionCode: joinInfo.code,
      playerId: joinInfo.playerId
    }
  };
}
