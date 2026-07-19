export const PARTICIPANT_STALE_MS = 15_000;

export type TimestampedPosition = {
  timestamp?: string;
  capturedAt?: string;
  captured_at?: string;
};

export function getPositionTimestamp(position: TimestampedPosition): number | null {
  const raw = position.timestamp ?? position.capturedAt ?? position.captured_at;
  if (!raw) return null;

  const timestamp = Date.parse(raw);
  return Number.isNaN(timestamp) ? null : timestamp;
}

export function isParticipantDisconnected(
  participant: { isOffline?: boolean; lastUpdate: number },
  now = Date.now(),
): boolean {
  return participant.isOffline === true || now - participant.lastUpdate > PARTICIPANT_STALE_MS;
}

export function isStalePosition(
  incoming: TimestampedPosition,
  current?: TimestampedPosition,
): boolean {
  const incomingTimestamp = getPositionTimestamp(incoming);
  const currentTimestamp = current ? getPositionTimestamp(current) : null;
  return (
    incomingTimestamp !== null && currentTimestamp !== null && incomingTimestamp <= currentTimestamp
  );
}
