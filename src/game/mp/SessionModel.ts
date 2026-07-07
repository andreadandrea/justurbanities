import { v4 as uuid } from "uuid";

/**
 * MP-1 (SPEC_Multiplayer §2.5): pseudonymous classroom identity. No
 * accounts, no email — a display name plus a device key per session,
 * joined by a 6-char code. Nothing here touches the network.
 */

/** Unambiguous alphabet: no I/L/O/0/1 — codes get read aloud in class. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const SESSION_CODE_LENGTH = 6;

/** Default session lifetime (GDPR-light: sessions expire, spec §2.5). */
export const SESSION_TTL_DAYS = 30;

export type MpPlayer = {
  /** Device key — random, per session, never derived from personal data. */
  playerId: string;
  displayName: string;
  /** Playable character chosen for the shared city. */
  character: string;
};

export type MpSessionMeta = {
  code: string;
  scenarioId: string;
  createdAt: string;
  expiresAt: string;
  players: MpPlayer[];
};

export function generateSessionCode(random: () => number = Math.random): string {
  let code = "";
  for (let i = 0; i < SESSION_CODE_LENGTH; i++) {
    code += CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)];
  }
  return code;
}

export function isValidSessionCode(code: string): boolean {
  return code.length === SESSION_CODE_LENGTH && [...code].every((char) => CODE_ALPHABET.includes(char));
}

export function createPlayer(displayName: string, character: string): MpPlayer {
  return { playerId: uuid(), displayName, character };
}

export function createSession(
  scenarioId: string,
  now: Date,
  random: () => number = Math.random
): MpSessionMeta {
  const expires = new Date(now.getTime() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  return {
    code: generateSessionCode(random),
    scenarioId,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
    players: []
  };
}

/** Joining is idempotent per playerId; display names may repeat (pseudonyms). */
export function joinSession(session: MpSessionMeta, player: MpPlayer): MpSessionMeta {
  if (session.players.some((existing) => existing.playerId === player.playerId)) return session;
  return { ...session, players: [...session.players, { ...player }] };
}
