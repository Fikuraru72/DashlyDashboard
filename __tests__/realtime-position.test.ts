import { describe, expect, it } from "vitest";

import {
  getPositionTimestamp,
  isParticipantDisconnected,
  isStalePosition,
} from "@/lib/realtime-position";

describe("realtime position ordering", () => {
  it("rejects older or duplicate positions", () => {
    const current = { timestamp: "2026-07-18T19:10:01.000Z" };

    expect(isStalePosition({ timestamp: "2026-07-18T19:10:00.000Z" }, current)).toBe(true);
    expect(isStalePosition({ timestamp: current.timestamp }, current)).toBe(true);
    expect(isStalePosition({ timestamp: "2026-07-18T19:10:02.000Z" }, current)).toBe(false);
    expect(getPositionTimestamp({ captured_at: current.timestamp })).toBe(
      Date.parse(current.timestamp),
    );
  });

  it("uses connection state and telemetry age, not the movement status", () => {
    const now = Date.parse("2026-07-18T20:00:00.000Z");

    expect(isParticipantDisconnected({ isOffline: false, lastUpdate: now }, now)).toBe(false);
    expect(isParticipantDisconnected({ isOffline: true, lastUpdate: now }, now)).toBe(true);
    expect(isParticipantDisconnected({ isOffline: false, lastUpdate: now - 15_001 }, now)).toBe(
      true,
    );
  });
});
