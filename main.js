import { DemoEventAdapter, normalizeDoorEvent } from "./event-adapter.js";
import { loadAppState, persistAppState } from "./storage.js";

const $ = (id) => document.getElementById(id);
const loaded = loadAppState();
let state = loaded.state;
let storageAvailable = loaded.storageAvailable;
let setupDisclosureOpen = false;
let setupConsentGiven = false;
let clearConfirmationOpen = false;
let previousQuietState = false;
let noticeTimer = null;

const iconPaths = {
  door: '<path d="M5 21V4.5L12 3l7 1.5V21M9 21V8h8v13M13.5 14h.1M3 21h18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  bell: '<path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9ZM10 21h4" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  motion: '<path d="M3 12h3l2.2-6 4.2 12 2.3-6H21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>',
  check: '<path d="m5 12 4.2 4.2L19 6.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  hand: '<path d="M8 11V5a1.5 1.5 0 0 1 3 0v5-6a1.5 1.5 0 0 1 3 0v6-4a1.5 1.5 0 0 1 3 0v6-2a1.5 1.5 0 0 1 3 0v5c0 4-2.4 7-6.5 7h-1c-2.5 0-4.2-1.2-5.5-3.1L4.5 14a1.5 1.5 0 0 1 2.2-2L8 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  person: '<circle cx="9" cy="8" r="3" stroke="currentColor" stroke-width="1.7"/><path d="M3.5 19v-1a5.5 5.5 0 0 1 11 0v1h-11Zm13-8.5a3 3 0 1 0-1-5.83m2 9.83a4.5 4.5 0 0 1 3 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
  book: '<path d="M5 4.5A2.5 2.5 0 0 1 7.5 2H20v17H7.5A2.5 2.5 0 0 0 5 21.5m0-17v17m0-17H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h1" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>',
  clock: '<circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.7"/><path d="M12 7v5l3.5 2" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>',
};

function icon(name, size = 20) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">${iconPaths[name] || iconPaths.door}</svg>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[character]);
}

function createId() {
  if (globalThis.crypto && typeof globalThis.crypto.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `alert-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}`;
}

function captureFocus() {
  const active = document.activeElement;
  if (!active || active === document.body) return null;
  const actionButton = active.closest?.("[data-action]");
  if (actionButton) {
    return { action: actionButton.dataset.action, eventId: actionButton.dataset.id, wasAlertAction: true };
  }
  if (active.id) return { id: active.id };
  return null;
}

function restoreFocus(hint) {
  if (!hint) return;
  let target = hint.id ? $(hint.id) : null;
  if (!target && hint.action) {
    target = [...document.querySelectorAll("[data-action]")].find((element) =>
      element.dataset.action === hint.action && element.dataset.id === hint.eventId && !element.disabled,
    ) || null;
  }
  if (!target && hint.wasAlertAction) target = $("active-heading");
  if (target && !target.disabled && typeof target.focus === "function") {
    target.focus({ preventScroll: true });
  }
}

function announce(message) {
  const region = $("sr-announcer");
  region.textContent = "";
  window.requestAnimationFrame(() => { region.textContent = message; });
}

function showNotice(message) {
  const notice = $("app-notice");
  $("app-notice-text").textContent = message;
  notice.hidden = false;
  if (noticeTimer) window.clearTimeout(noticeTimer);
  noticeTimer = window.setTimeout(() => { notice.hidden = true; }, 10_000);
}

function updateStorageWarning() {
  $("storage-warning").hidden = storageAvailable;
}

function saveState() {
  const saved = persistAppState(state);
  if (!saved) {
    storageAvailable = false;
    updateStorageWarning();
  }
  return saved;
}

function applyPreferences() {
  document.body.classList.toggle("high-contrast", state.settings.highContrast);
  document.documentElement.classList.toggle("large-text", state.settings.largeText);
}

function formatClock(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "time unavailable";
  return new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date);
}

function formatEventDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const time = formatClock(date);
  if (date >= startOfToday) return `Today · ${time}`;
  if (date >= startOfYesterday) return `Yesterday · ${time}`;
  const day = new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date);
  return `${day} · ${time}`;
}

function formatDelay(seconds) {
  if (seconds < 60) return `${seconds} seconds`;
  return seconds === 60 ? "1 minute" : `${Math.floor(seconds / 60)} minutes`;
}

function timeInputLabel(value) {
  const [hours, minutes] = value.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return formatClock(date);
}

function isQuietHours(at = new Date()) {
  const quiet = state.settings.quietHours;
  if (!quiet.enabled) return false;
  const toMinutes = (value) => {
    const [hours, minutes] = value.split(":").map(Number);
    return hours * 60 + minutes;
  };
  const start = toMinutes(quiet.start);
  const end = toMinutes(quiet.end);
  if (start === end) return false;
  const nowMinutes = at.getHours() * 60 + at.getMinutes();
  return start < end
    ? nowMinutes >= start && nowMinutes < end
    : nowMinutes >= start || nowMinutes < end;
}

function quietHoursMessage() {
  const quiet = state.settings.quietHours;
  if (!quiet.enabled) return "Quiet hours off";
  if (quiet.start === quiet.end) return "Quiet hours set · choose different times";
  if (isQuietHours()) return `Quiet hours active · until ${timeInputLabel(quiet.end)}`;
  return `Quiet hours · ${timeInputLabel(quiet.start)}–${timeInputLabel(quiet.end)}`;
}

function statusForEvent(event) {
  if (event.status === "active") {
    if (event.caregiverNotifiedAt) {
      return { label: "Awaiting response · demo check-in recorded", className: "status-escalated", symbol: "!" };
    }
    return { label: "Waiting for a response", className: "status-active", symbol: "…" };
  }
  if (event.status === "acknowledged") {
    return event.caregiverNotifiedAt
      ? { label: "Acknowledged · after demo check-in", className: "", symbol: "✓" }
      : { label: "Acknowledged", className: "", symbol: "✓" };
  }
  return event.caregiverNotifiedAt
    ? { label: "Dismissed · demo check-in recorded", className: "status-dismissed", symbol: "—" }
    : { label: "Dismissed", className: "status-dismissed", symbol: "—" };
}

function sourceLabel(event) {
  if (event.source === "ring") return { label: "Ring event", className: "source-tag-ring" };
  if (event.source === "example") return { label: "Example", className: "source-tag-example" };
  return { label: "Demo event", className: "source-tag-demo" };
}

function eventIconName(event) {
  return /motion/i.test(event.eventType) ? "motion" : "bell";
}

function formatRemaining(seconds) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")} remaining`;
}

function remainingSeconds(event, now = Date.now()) {
  const delayMs = state.settings.escalationDelaySeconds * 1000;
  return Math.max(0, Math.ceil((delayMs - (now - new Date(event.occurredAt).getTime())) / 1000));
}

function renderHeroSummary() {
  const styleLabels = { visual: "Visual only", spoken: "Spoken priority", both: "Spoken + visual" };
  $("summary-alert-style").textContent = styleLabels[state.settings.alertStyle] || "Visual alerts";
  $("summary-caregiver").textContent = state.settings.escalationEnabled ? "Caregiver check-in on · demo" : "Caregiver check-in off";
  $("summary-quiet").textContent = isQuietHours() ? "Quiet hours active" : state.settings.quietHours.enabled ? "Quiet hours scheduled" : "Quiet hours off";
}

function renderActiveAlerts() {
  const activeEvents = state.events
    .filter((event) => event.status === "active")
    .sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  const count = activeEvents.length;
  const countPill = $("active-count");
  countPill.textContent = count === 0 ? "No active alerts" : `${count} ${count === 1 ? "alert needs" : "alerts need"} a response`;
  countPill.classList.toggle("has-active", count > 0);

  if (count === 0) {
    $("active-alerts").innerHTML = `
      <div class="empty-state empty-alert">
        <span class="empty-illustration" aria-hidden="true">⌂</span>
        <div><h3>You’re all caught up</h3><p>When there’s a doorbell event, a clear alert will appear here.</p></div>
      </div>`;
    return;
  }

  $("active-alerts").innerHTML = activeEvents.map((event) => {
    const source = sourceLabel(event);
    const spokenPriorityClass = state.settings.alertStyle === "spoken" ? " alert-card-spoken" : "";
    let followUpMessage = "";
    if (event.caregiverNotifiedAt) {
      followUpMessage = `<p class="alert-card-message message-escalated">A caregiver demo notice is in this app only. No one was contacted.</p>`;
    } else if (state.settings.escalationEnabled) {
      const delay = formatDelay(state.settings.escalationDelaySeconds);
      followUpMessage = `<p class="alert-card-message">If you don’t acknowledge within ${escapeHtml(delay)}, a simulated check-in will appear here. <span class="countdown-value" data-remaining-id="${escapeHtml(event.id)}" aria-hidden="true">${escapeHtml(formatRemaining(remainingSeconds(event)))}</span></p>`;
    } else {
      followUpMessage = `<p class="alert-card-message">Automatic caregiver check-in is off. You can still respond here at any time.</p>`;
    }

    const caregiverAction = event.caregiverNotifiedAt
      ? `<button class="button button-secondary" type="button" data-action="caregiver" data-id="${escapeHtml(event.id)}" disabled>${icon("check", 18)} Check-in recorded in demo</button>`
      : `<button class="button button-secondary" type="button" data-action="caregiver" data-id="${escapeHtml(event.id)}">${icon("person", 18)} Ask caregiver to check</button>`;

    return `
      <article class="alert-card${spokenPriorityClass}" aria-labelledby="alert-title-${escapeHtml(event.id)}">
        <div class="alert-card-top">
          <span class="alert-state"><span class="alert-state-symbol" aria-hidden="true">!</span>Action needed</span>
          <span class="source-tag ${source.className}">${source.label}</span>
        </div>
        <h3 id="alert-title-${escapeHtml(event.id)}">${escapeHtml(event.eventType)}</h3>
        <div class="alert-details">
          <span class="alert-detail">${icon("door", 17)} ${escapeHtml(event.entrance)}</span>
          <time class="alert-detail" datetime="${escapeHtml(event.occurredAt)}">${icon("clock", 17)} ${escapeHtml(formatEventDate(event.occurredAt))}</time>
        </div>
        ${followUpMessage}
        <div class="alert-actions">
          <button class="button button-primary action-aware" type="button" data-action="acknowledge" data-id="${escapeHtml(event.id)}">${icon("check", 18)} I’m aware</button>
          ${caregiverAction}
          <button class="button action-dismiss" type="button" data-action="dismiss" data-id="${escapeHtml(event.id)}">${icon("hand", 18)} Dismiss</button>
        </div>
      </article>`;
  }).join("");
}

function renderHistory() {
  const events = [...state.events].sort((a, b) => new Date(b.occurredAt) - new Date(a.occurredAt));
  const count = events.length;
  $("clear-history").disabled = count === 0;
  $("history-caption").textContent = count === 0
    ? "No door events are currently saved in this browser."
    : `${count} ${count === 1 ? "event" : "events"} saved on this device. Example entries are labeled.`;

  if (count === 0) {
    $("history-list").innerHTML = `
      <li class="history-empty">
        ${icon("book", 24)}
        <p>No saved events yet. Try a clearly labeled demo event above to see how the history works.</p>
      </li>`;
    return;
  }

  $("history-list").innerHTML = events.map((event) => {
    const source = sourceLabel(event);
    const status = statusForEvent(event);
    return `
      <li class="history-row">
        <span class="history-icon" aria-hidden="true">${icon(eventIconName(event), 20)}</span>
        <div class="history-main">
          <div class="history-title-line"><strong>${escapeHtml(event.eventType)}</strong><span class="source-tag ${source.className}">${source.label}</span></div>
          <p>${escapeHtml(event.entrance)} · <time datetime="${escapeHtml(event.occurredAt)}">${escapeHtml(formatEventDate(event.occurredAt))}</time></p>
        </div>
        <span class="history-status ${status.className}"><span class="status-symbol" aria-hidden="true">${status.symbol}</span>${escapeHtml(status.label)}</span>
      </li>`;
  }).join("");
}

function renderCaregiverFeed() {
  const notices = state.events
    .filter((event) => event.caregiverNotifiedAt && event.source !== "example")
    .sort((a, b) => new Date(b.caregiverNotifiedAt) - new Date(a.caregiverNotifiedAt))
    .slice(0, 10);

  if (notices.length === 0) {
    $("caregiver-feed").innerHTML = `
      <div class="inbox-empty">
        <span aria-hidden="true" class="inbox-empty-icon">✓</span>
        <p>No caregiver check-ins yet. If enabled, demo notices will appear here only.</p>
      </div>`;
    return;
  }

  const label = state.settings.caregiverLabel.trim();
  $("caregiver-feed").innerHTML = `<ul class="caregiver-feed-list">${notices.map((event) => {
    const isManual = event.caregiverNoticeKind === "manual";
    const reason = isManual ? "Requested from the active alert." : "The alert was not acknowledged before the selected delay.";
    return `
      <li class="caregiver-notice">
        <div class="caregiver-notice-top">
          <strong>${label ? `Demo label: ${escapeHtml(label)}` : "Caregiver check-in · simulated"}</strong>
          <span class="local-only-label">In app · not sent</span>
        </div>
        <p>${escapeHtml(event.eventType)} at ${escapeHtml(event.entrance)} · ${escapeHtml(formatEventDate(event.occurredAt))}</p>
        <p>${reason}</p>
        <p class="notice-meta">Demo notice created ${escapeHtml(formatClock(event.caregiverNotifiedAt))}. No external notification was sent.</p>
      </li>`;
  }).join("")}</ul>`;
}

function renderQuietStatus() {
  const setting = state.settings.quietHours;
  const start = $("quiet-start").value || setting.start;
  const end = $("quiet-end").value || setting.end;
  const status = $("quiet-status");
  if (!setting.enabled) {
    status.textContent = "Quiet hours are off.";
    return;
  }
  if (setting.start === setting.end) {
    status.textContent = "Choose different start and end times to activate quiet hours.";
    return;
  }
  status.textContent = isQuietHours()
    ? `Active now · spoken alerts paused until ${timeInputLabel(end)}.`
    : `Scheduled ${timeInputLabel(start)} to ${timeInputLabel(end)}.`;
}

function renderSettings() {
  document.querySelectorAll('input[name="alert-style"]').forEach((input) => {
    input.checked = input.value === state.settings.alertStyle;
  });
  $("high-contrast").checked = state.settings.highContrast;
  $("large-text").checked = state.settings.largeText;
  $("quiet-enabled").checked = state.settings.quietHours.enabled;
  $("quiet-start").value = state.settings.quietHours.start;
  $("quiet-end").value = state.settings.quietHours.end;
  $("quiet-start").disabled = !state.settings.quietHours.enabled;
  $("quiet-end").disabled = !state.settings.quietHours.enabled;
  $("quiet-range").classList.toggle("time-range-disabled", !state.settings.quietHours.enabled);
  $("caregiver-label").value = state.settings.caregiverLabel;
  $("escalation-delay").value = String(state.settings.escalationDelaySeconds);

  const enabled = state.settings.escalationEnabled;
  $("caregiver-summary").textContent = enabled
    ? `On · demo only. Check-in after ${formatDelay(state.settings.escalationDelaySeconds)} without a response.`
    : "Off. No automatic caregiver check-in will be created.";
  $("setup-caregiver").hidden = enabled || setupDisclosureOpen;
  $("caregiver-disclosure").hidden = enabled || !setupDisclosureOpen;
  $("caregiver-config").hidden = !enabled;
  $("caregiver-consent").checked = setupConsentGiven;
  $("enable-caregiver").disabled = !setupConsentGiven;
  $("turn-off-speech").hidden = state.settings.alertStyle === "visual";
  renderQuietStatus();
}

function renderAll(options = {}) {
  const focusHint = options.focusTarget ? { id: options.focusTarget } : captureFocus();
  applyPreferences();
  renderHeroSummary();
  renderActiveAlerts();
  renderCaregiverFeed();
  renderHistory();
  renderSettings();
  $("clear-confirm").hidden = !clearConfirmationOpen;
  updateStorageWarning();
  restoreFocus(focusHint);
}

function setSpeechStatus(message) {
  $("speech-status").textContent = message;
}

function speak(text, context = "test") {
  try {
    if (!("speechSynthesis" in window) || typeof window.SpeechSynthesisUtterance !== "function") {
      setSpeechStatus("Spoken alerts aren’t supported in this browser. The on-screen alert still works.");
      if (context === "test") announce("Spoken alerts are not supported in this browser. The on-screen alert still works.");
      return false;
    }

    const synthesis = window.speechSynthesis;
    synthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(text);
    utterance.rate = 0.94;
    utterance.pitch = 1;
    utterance.volume = 1;
    utterance.onstart = () => setSpeechStatus(context === "test" ? "Playing your spoken alert test." : "Speaking the door alert.");
    utterance.onend = () => setSpeechStatus("Spoken alert finished.");
    utterance.onerror = (event) => {
      if (event?.error === "canceled" || event?.error === "interrupted") return;
      setSpeechStatus("Voice playback did not start. The on-screen alert is still available.");
    };
    setSpeechStatus(context === "test" ? "Starting spoken alert test…" : "Starting spoken door alert…");
    synthesis.speak(utterance);
    return true;
  } catch (_error) {
    setSpeechStatus("Voice playback is unavailable here. The on-screen alert still works.");
    return false;
  }
}

function turnOffSpeech() {
  state.settings.alertStyle = "visual";
  try {
    if ("speechSynthesis" in window) window.speechSynthesis.cancel();
  } catch (_error) {
    // Visual alerts remain available even if the browser's speech engine fails.
  }
  saveState();
  renderAll();
  setSpeechStatus("Spoken door alerts are off. Visual alerts remain on.");
  showNotice("Spoken door alerts turned off. You can still see every alert on screen.");
  announce("Spoken door alerts are off. Visual alerts remain on.");
}

function handleIncomingEvent(rawEvent) {
  try {
    const event = normalizeDoorEvent(rawEvent);
    state.events = [event, ...state.events].slice(0, 100);
    saveState();
    renderAll();
    const label = event.source === "demo" ? "Demo event" : "Door event";
    const eventSpeech = `${label}. ${event.eventType} at ${event.entrance}. ${formatClock(event.occurredAt)}.`;
    announce(`${label}: ${event.eventType} at ${event.entrance}, ${formatClock(event.occurredAt)}. The alert is on screen and needs a response.`);

    if (state.settings.alertStyle !== "visual") {
      if (isQuietHours()) {
        setSpeechStatus("Quiet hours are active. This alert is visual; spoken output was paused.");
        showNotice("Quiet hours are active, so this alert was shown on screen without spoken audio.");
      } else if (!speak(eventSpeech, "event")) {
        showNotice("The visual alert is ready. Spoken alerts aren’t available in this browser right now.");
      }
    }
  } catch (_error) {
    showNotice("That demo event could not be added. Please try again.");
    announce("The door event could not be added. Please try again.");
  }
}

function updateEvent(eventId, changes) {
  const current = state.events.find((event) => event.id === eventId);
  if (!current) return false;
  state.events = state.events.map((event) => event.id === eventId ? { ...event, ...changes } : event);
  saveState();
  renderAll();
  return true;
}

function acknowledgeEvent(eventId) {
  const event = state.events.find((item) => item.id === eventId && item.status === "active");
  if (!event) return;
  updateEvent(eventId, { status: "acknowledged", acknowledgedAt: new Date().toISOString() });
  showNotice("You marked the alert as noticed. It remains in Recent events on this device.");
  announce("Alert acknowledged. It remains in Recent events on this device.");
}

function dismissEvent(eventId) {
  const event = state.events.find((item) => item.id === eventId && item.status === "active");
  if (!event) return;
  updateEvent(eventId, { status: "dismissed", dismissedAt: new Date().toISOString() });
  showNotice("Alert dismissed. The event stays in Recent events on this device.");
  announce("Alert dismissed. The event stays in Recent events.");
}

function recordCaregiverNotice(eventId, kind) {
  const event = state.events.find((item) => item.id === eventId && item.status === "active");
  if (!event || event.caregiverNotifiedAt) return false;
  const notifiedAt = new Date().toISOString();
  state.events = state.events.map((item) => item.id === eventId
    ? { ...item, caregiverNotifiedAt: notifiedAt, caregiverNoticeKind: kind }
    : item);
  saveState();
  renderAll();
  return true;
}

function askCaregiver(eventId) {
  const event = state.events.find((item) => item.id === eventId && item.status === "active");
  if (!event) return;
  if (!state.settings.escalationEnabled) {
    showNotice("Caregiver check-in is off. No request was created. Set up a trusted caregiver in Alert preferences first.");
    announce("Caregiver check-in is off. No request was created. Set it up in Alert preferences first.");
    return;
  }
  if (recordCaregiverNotice(eventId, "manual")) {
    showNotice("A simulated caregiver check-in was added to the in-app demo inbox. No one was contacted.");
    announce("A simulated caregiver check-in was added to the in-app inbox. No external message was sent.");
  }
}

function checkAutomaticEscalations() {
  if (!state.settings.escalationEnabled) return;
  const now = Date.now();
  const delayMs = state.settings.escalationDelaySeconds * 1000;
  const dueIds = new Set(state.events
    .filter((event) => event.status === "active" && !event.caregiverNotifiedAt)
    .filter((event) => now - new Date(event.occurredAt).getTime() >= delayMs)
    .map((event) => event.id));
  if (dueIds.size === 0) return;

  const notifiedAt = new Date().toISOString();
  state.events = state.events.map((event) => dueIds.has(event.id)
    ? { ...event, caregiverNotifiedAt: notifiedAt, caregiverNoticeKind: "automatic" }
    : event);
  saveState();
  renderAll();
  const count = dueIds.size;
  showNotice(`${count === 1 ? "A caregiver demo check-in has" : `${count} caregiver demo check-ins have`} appeared in the in-app inbox. No one was contacted.`);
  announce(`${count === 1 ? "A caregiver demo check-in has" : `${count} caregiver demo check-ins have`} appeared in the in-app inbox. No external message was sent.`);
}

function refreshCountdowns() {
  document.querySelectorAll("[data-remaining-id]").forEach((element) => {
    const event = state.events.find((item) => item.id === element.dataset.remainingId);
    if (event && event.status === "active" && !event.caregiverNotifiedAt && state.settings.escalationEnabled) {
      element.textContent = formatRemaining(remainingSeconds(event));
    }
  });
}

function handleAlertAction(clickEvent) {
  const button = clickEvent.target.closest("button[data-action]");
  if (!button) return;
  const { action, id } = button.dataset;
  if (action === "acknowledge") acknowledgeEvent(id);
  if (action === "dismiss") dismissEvent(id);
  if (action === "caregiver") askCaregiver(id);
}

const eventAdapter = new DemoEventAdapter();
eventAdapter.subscribe(handleIncomingEvent);

if (loaded.isNew && storageAvailable) {
  storageAvailable = persistAppState(state);
}
updateStorageWarning();
previousQuietState = isQuietHours();
renderAll();

$("active-alerts").addEventListener("click", handleAlertAction);
$("simulate-event").addEventListener("click", () => {
  const entrance = $("demo-entrance").value || "Front entrance";
  eventAdapter.simulateDoorbell(entrance);
});
$("dismiss-notice").addEventListener("click", () => {
  $("app-notice").hidden = true;
  if (noticeTimer) window.clearTimeout(noticeTimer);
});

$("test-speech").addEventListener("click", () => {
  const succeeded = speak("This is a test of your spoken door alert. The front entrance has a doorbell event.", "test");
  if (succeeded) announce("Starting your spoken alert test.");
});
$("turn-off-speech").addEventListener("click", turnOffSpeech);

document.querySelectorAll('input[name="alert-style"]').forEach((input) => {
  input.addEventListener("change", () => {
    if (!input.checked) return;
    state.settings.alertStyle = input.value;
    if (input.value === "visual") {
      try { if ("speechSynthesis" in window) window.speechSynthesis.cancel(); } catch (_error) { /* keep visual alerts available */ }
      setSpeechStatus("Spoken door alerts are off. Visual alerts remain on.");
    }
    saveState();
    renderAll();
    const spoken = input.value === "visual" ? "Spoken door alerts are off." : "Spoken door alerts are enabled along with the on-screen alert.";
    announce(spoken);
  });
});

$("high-contrast").addEventListener("change", (event) => {
  state.settings.highContrast = event.target.checked;
  saveState();
  renderAll();
  announce(event.target.checked ? "High contrast is on." : "High contrast is off.");
});
$("large-text").addEventListener("change", (event) => {
  state.settings.largeText = event.target.checked;
  saveState();
  renderAll();
  announce(event.target.checked ? "Large text is on." : "Large text is off.");
});

$("setup-caregiver").addEventListener("click", () => {
  setupDisclosureOpen = true;
  setupConsentGiven = false;
  renderAll({ focusTarget: "disclosure-heading" });
});
$("caregiver-consent").addEventListener("change", (event) => {
  setupConsentGiven = event.target.checked;
  renderAll({ focusTarget: "caregiver-consent" });
});
$("cancel-caregiver-setup").addEventListener("click", () => {
  setupDisclosureOpen = false;
  setupConsentGiven = false;
  renderAll({ focusTarget: "setup-caregiver" });
});
$("enable-caregiver").addEventListener("click", () => {
  if (!setupConsentGiven) return;
  state.settings.escalationEnabled = true;
  setupDisclosureOpen = false;
  setupConsentGiven = false;
  saveState();
  renderAll({ focusTarget: "escalation-delay" });
  showNotice("Demo check-in is on. Notices stay in this app only; no one will be contacted.");
  announce("Caregiver demo check-in enabled. You can choose the delay. No one will be contacted.");
});
$("turn-off-caregiver").addEventListener("click", () => {
  state.settings.escalationEnabled = false;
  setupDisclosureOpen = false;
  setupConsentGiven = false;
  saveState();
  renderAll({ focusTarget: "setup-caregiver" });
  showNotice("Automatic caregiver check-ins are off. Existing demo history has not been removed.");
  announce("Automatic caregiver check-ins are off.");
});
$("caregiver-label").addEventListener("input", (event) => {
  state.settings.caregiverLabel = event.target.value.replace(/[\u0000-\u001f\u007f<>]/g, "").slice(0, 40);
  saveState();
});
$("escalation-delay").addEventListener("change", (event) => {
  const delay = Number(event.target.value);
  if (![10, 30, 60, 120].includes(delay)) return;
  state.settings.escalationDelaySeconds = delay;
  saveState();
  renderAll();
  showNotice(`Automatic demo check-in delay set to ${formatDelay(delay)}.`);
  announce(`Demo caregiver check-in delay set to ${formatDelay(delay)}.`);
});

$("quiet-enabled").addEventListener("change", (event) => {
  state.settings.quietHours.enabled = event.target.checked;
  saveState();
  renderAll();
  const message = event.target.checked ? "Quiet hours turned on. Spoken alerts pause during the selected times; visual alerts remain." : "Quiet hours turned off.";
  showNotice(message);
  announce(message);
  previousQuietState = isQuietHours();
});
function updateQuietTime(which, value) {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return;
  state.settings.quietHours[which] = value;
  saveState();
  renderAll();
  if (state.settings.quietHours.enabled && state.settings.quietHours.start === state.settings.quietHours.end) {
    showNotice("Choose different start and end times to turn quiet hours on.");
  } else {
    showNotice(`Quiet hours set from ${timeInputLabel(state.settings.quietHours.start)} to ${timeInputLabel(state.settings.quietHours.end)}.`);
  }
  announce($("quiet-status").textContent);
  previousQuietState = isQuietHours();
}
$("quiet-start").addEventListener("change", (event) => updateQuietTime("start", event.target.value));
$("quiet-end").addEventListener("change", (event) => updateQuietTime("end", event.target.value));

$("clear-history").addEventListener("click", () => {
  if (state.events.length === 0) return;
  clearConfirmationOpen = true;
  renderAll({ focusTarget: "cancel-clear" });
  announce("Confirm clearing all saved events, open alerts, and in-app caregiver demo notices. Your alert preferences will stay.");
});
$("cancel-clear").addEventListener("click", () => {
  clearConfirmationOpen = false;
  renderAll({ focusTarget: "clear-history" });
  announce("History was kept.");
});
$("confirm-clear").addEventListener("click", () => {
  state.events = [];
  clearConfirmationOpen = false;
  saveState();
  renderAll({ focusTarget: "history-heading" });
  showNotice("Local event history, open alerts, and caregiver demo notices have been cleared. Alert preferences were kept.");
  announce("Demo event history cleared. Alert preferences were kept.");
});

let lastMinute = new Date().getMinutes();
window.setInterval(() => {
  checkAutomaticEscalations();
  refreshCountdowns();
  const now = new Date();
  if (now.getMinutes() !== lastMinute) {
    lastMinute = now.getMinutes();
    const quietNow = isQuietHours();
    if (quietNow !== previousQuietState) {
      previousQuietState = quietNow;
      renderHeroSummary();
      renderQuietStatus();
      const message = quietNow ? "Quiet hours are active. Spoken door alerts are paused." : "Quiet hours have ended. Spoken door alerts can play again.";
      showNotice(message);
      announce(message);
    }
  }
}, 1000);
