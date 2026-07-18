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
