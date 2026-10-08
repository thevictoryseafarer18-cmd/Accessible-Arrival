function createId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function plainLabel(value, fallback, limit = 80) {
  if (typeof value !== "string") return fallback;
  const label = value.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, limit);
  return label || fallback;
}

/**
 * Convert an already-authorized adapter's small, normalized event into the UI's
 * private event record. Only entrance, event type, timestamp, and source are
 * retained; visitor identity and audio/video fields are deliberately ignored.
 */
export function normalizeDoorEvent(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("A normalized door event is required.");
  }
  const parsedTime = new Date(input.occurredAt ?? Date.now());
  const source = input.source === "ring" ? "ring" : "demo";
  return {
    id: createId(),
    entrance: plainLabel(input.entrance, "Front entrance"),
    eventType: plainLabel(input.eventType, "Doorbell event"),
    occurredAt: Number.isNaN(parsedTime.getTime()) ? new Date().toISOString() : parsedTime.toISOString(),
    source,
    status: "active",
    acknowledgedAt: null,
    dismissedAt: null,
    caregiverNotifiedAt: null,
    caregiverNoticeKind: null,
  };
}

/**
 * Local-only simulator implementing the adapter seam used by the dashboard.
 * A future authorized Ring adapter can implement the same subscribe contract
 * and emit the normalized event shape consumed by normalizeDoorEvent().
 */
export class DemoEventAdapter {
  constructor() {
    this.listeners = new Set();
  }

  subscribe(listener) {
    if (typeof listener !== "function") {
      throw new TypeError("Event listener must be a function.");
    }
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  simulateDoorbell(entrance = "Front entrance") {
    const event = Object.freeze({
      entrance: plainLabel(entrance, "Front entrance"),
      eventType: "Doorbell pressed",
      occurredAt: new Date().toISOString(),
      source: "demo",
    });
    for (const listener of [...this.listeners]) listener(event);
    return event;
  }
}
