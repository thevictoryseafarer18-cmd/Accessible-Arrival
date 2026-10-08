const STORAGE_KEY = "accessible-arrival-demo-v1";
const MAX_EVENTS = 100;

function cleanText(value, fallback, maxLength = 80) {
  if (typeof value !== "string") return fallback;
  const cleaned = value.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, maxLength);
  return cleaned || fallback;
}

function toIso(value, fallback = null) {
  if (typeof value !== "string" && typeof value !== "number") return fallback;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed.toISOString();
}

function exampleEvent({ id, ageMs, entrance, eventType, status, hasCaregiverNotice = false }) {
  const happenedAt = Date.now() - ageMs;
  const responseAt = happenedAt + Math.min(60_000, Math.max(20_000, Math.floor(ageMs * 0.08)));
  return {
    id: `example-${id}`,
    entrance,
    eventType,
    occurredAt: new Date(happenedAt).toISOString(),
    source: "example",
    status,
    acknowledgedAt: status === "acknowledged" ? new Date(responseAt).toISOString() : null,
    dismissedAt: status === "dismissed" ? new Date(responseAt).toISOString() : null,
    caregiverNotifiedAt: hasCaregiverNotice ? new Date(happenedAt + 30_000).toISOString() : null,
    caregiverNoticeKind: hasCaregiverNotice ? "automatic" : null,
  };
}

export function createInitialState() {
  return {
    settings: {
      alertStyle: "visual",
      highContrast: false,
      largeText: false,
      escalationEnabled: false,
      escalationDelaySeconds: 30,
      caregiverLabel: "",
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "07:00",
      },
    },
    // These clearly labeled examples make the first visit useful without pretending
    // that a Ring account or a real doorbell event has been connected.
    events: [
      exampleEvent({
        id: "acknowledged",
        ageMs: 14 * 60_000,
        entrance: "Front entrance",
        eventType: "Doorbell pressed",
        status: "acknowledged",
      }),
      exampleEvent({
        id: "dismissed",
        ageMs: 2 * 60 * 60_000 + 8 * 60_000,
        entrance: "Side entrance",
        eventType: "Motion detected",
        status: "dismissed",
      }),
      exampleEvent({
        id: "caregiver",
        ageMs: 26 * 60 * 60_000,
        entrance: "Front entrance",
        eventType: "Doorbell pressed",
        status: "acknowledged",
        hasCaregiverNotice: true,
      }),
    ],
  };
}

function sanitizeEvent(event, index) {
  if (!event || typeof event !== "object") return null;
  const validStatuses = new Set(["active", "acknowledged", "dismissed"]);
  const validSources = new Set(["demo", "example", "ring"]);
  const status = validStatuses.has(event.status) ? event.status : "active";
  const source = validSources.has(event.source) ? event.source : "demo";
  const occurredAt = toIso(event.occurredAt, new Date().toISOString());
  const noticeKind = event.caregiverNoticeKind === "manual" ? "manual" : "automatic";
  const caregiverNotifiedAt = toIso(event.caregiverNotifiedAt, null);

  return {
    id: cleanText(event.id, `restored-${index}`, 100),
    entrance: cleanText(event.entrance, "Entrance", 80),
    eventType: cleanText(event.eventType, "Doorbell event", 80),
    occurredAt,
    source,
    status,
    acknowledgedAt: toIso(event.acknowledgedAt, null),
    dismissedAt: toIso(event.dismissedAt, null),
    caregiverNotifiedAt,
    caregiverNoticeKind: caregiverNotifiedAt ? noticeKind : null,
  };
}

export function sanitizeState(saved) {
  const defaults = createInitialState();
  const rawSettings = saved && typeof saved === "object" && saved.settings && typeof saved.settings === "object"
    ? saved.settings
    : {};
  const validStyles = new Set(["visual", "spoken", "both"]);
  const rawQuiet = rawSettings.quietHours && typeof rawSettings.quietHours === "object" ? rawSettings.quietHours : {};
  const validDelays = new Set([10, 30, 60, 120]);
  const parsedDelay = Number(rawSettings.escalationDelaySeconds);
  const delay = validDelays.has(parsedDelay) ? parsedDelay : defaults.settings.escalationDelaySeconds;
  const cleanTime = (value, fallback) => /^([01]\d|2[0-3]):[0-5]\d$/.test(value) ? value : fallback;

  const events = Array.isArray(saved?.events)
    ? saved.events.map(sanitizeEvent).filter(Boolean).slice(0, MAX_EVENTS)
    : defaults.events;

  return {
    settings: {
      alertStyle: validStyles.has(rawSettings.alertStyle) ? rawSettings.alertStyle : defaults.settings.alertStyle,
      highContrast: rawSettings.highContrast === true,
      largeText: rawSettings.largeText === true,
      escalationEnabled: rawSettings.escalationEnabled === true,
      escalationDelaySeconds: delay,
      caregiverLabel: cleanText(rawSettings.caregiverLabel, "", 40),
      quietHours: {
        enabled: rawQuiet.enabled === true,
        start: cleanTime(rawQuiet.start, defaults.settings.quietHours.start),
        end: cleanTime(rawQuiet.end, defaults.settings.quietHours.end),
      },
    },
    events,
  };
}

export function loadAppState() {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored === null) {
      return { state: createInitialState(), storageAvailable: true, isNew: true };
    }
    return { state: sanitizeState(JSON.parse(stored)), storageAvailable: true, isNew: false };
  } catch (_error) {
    return { state: createInitialState(), storageAvailable: false, isNew: true };
  }
}

export function persistAppState(state) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ settings: state.settings, events: state.events }));
    return true;
  } catch (_error) {
    return false;
  }
}

export function clearPersistedState() {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (_error) {
    return false;
  }
}
