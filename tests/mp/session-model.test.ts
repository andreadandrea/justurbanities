import { describe, expect, it } from "vitest";
import {
  createPlayer,
  createSession,
  generateSessionCode,
  isValidSessionCode,
  joinSession,
  SESSION_CODE_LENGTH,
  SESSION_TTL_DAYS
} from "../../src/game/mp/SessionModel";

/** Deterministic rng stub. */
function seeded(values: number[]): () => number {
  let index = 0;
  return () => values[index++ % values.length];
}

describe("MP-1 session model (SPEC_Multiplayer §2.5)", () => {
  it("generates 6-char codes from the unambiguous alphabet", () => {
    const code = generateSessionCode();
    expect(code).toHaveLength(SESSION_CODE_LENGTH);
    expect(isValidSessionCode(code)).toBe(true);
    // The confusable characters are never used.
    for (const banned of ["I", "L", "O", "0", "1"]) expect(code).not.toContain(banned);
  });

  it("code generation is deterministic given the rng", () => {
    expect(generateSessionCode(seeded([0]))).toBe("AAAAAA");
    expect(generateSessionCode(seeded([0.999]))).toBe("999999");
  });

  it("rejects malformed codes", () => {
    expect(isValidSessionCode("ABC")).toBe(false);
    expect(isValidSessionCode("ABCDE0")).toBe(false); // 0 is banned
    expect(isValidSessionCode("abcdef")).toBe(false); // lower case
  });

  it("sessions expire after the GDPR-light TTL", () => {
    const now = new Date("2026-07-07T10:00:00.000Z");
    const session = createSession("vertical-slice-01", now, seeded([0.5]));
    const lifetimeDays = (Date.parse(session.expiresAt) - Date.parse(session.createdAt)) / 86_400_000;
    expect(lifetimeDays).toBe(SESSION_TTL_DAYS);
    expect(session.players).toEqual([]);
  });

  it("joining is idempotent per device key; pseudonyms may repeat", () => {
    const now = new Date("2026-07-07T10:00:00.000Z");
    let session = createSession("vertical-slice-01", now);
    const kim = createPlayer("Kim", "maya");
    const otherKim = createPlayer("Kim", "samir");
    session = joinSession(session, kim);
    session = joinSession(session, kim); // same device: no duplicate
    session = joinSession(session, otherKim); // same name, different device: ok
    expect(session.players).toHaveLength(2);
    expect(kim.playerId).not.toBe(otherKim.playerId);
  });
});
