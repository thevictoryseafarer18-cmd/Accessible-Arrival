# Accessible Arrival — User Guide

Accessible Arrival is a local demo for making doorbell events easier to notice and respond to. It is **not connected to a Ring device** and does not send texts, calls, emails, or other external notifications.

## Open the app

The demo preview is running in this workspace. To run a local copy, open a terminal in the project folder and start a static web server:

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>. On Windows, use `py -m http.server 8000`. No installation, account, or API key is needed. Keep the terminal open while using the local app; press `Ctrl+C` to stop the server.

## Your dashboard

- **Doorway alerts** shows events that still need a response. On first use, this area is empty.
- **Try a demo event** lets you choose the entrance and simulate a doorbell press. Each simulated alert is labeled **Demo event**.
- **Caregiver demo inbox** displays only simulated check-ins created inside this app.
- **Recent events** records active, acknowledged, dismissed, and simulated caregiver-check-in states. First-use sample entries are labeled **Example** so they are not confused with real events.
- The summary in the green banner reflects your current alert style, caregiver setting, and quiet-hours state.

## Choose how alerts appear

In **Alert preferences**, select one of three styles:

- **Visual only** — show the prominent on-screen alert without spoken output.
- **Spoken** — speak the alert and keep the details and actions on screen; the visual card is less prominent.
- **Both** — speak the alert and show the prominent visual card.

The event and its response actions remain visible in every style. Use **Test spoken alert** to try speech on this device. Use **Turn spoken alerts off** or select **Visual only** to stop spoken door alerts. If this browser does not support speech, or playback fails, the on-screen alert still works and the app displays a status message. The test speaks only after you press its button.

### High contrast and large text

Turn on **High contrast** for stronger text and outlines. Turn on **Large text** to enlarge interface text. These settings can be used independently and are saved in this browser.

### Quiet hours

Turn on **Enable quiet hours**, then set **From** and **Until** using local time. Quiet hours pause spoken door alerts only: visual alerts stay on screen, and caregiver timing is unchanged. Choose different start and end times; using the same time for both does not activate a quiet period.

## Set up a caregiver demo check-in

Caregiver check-ins are off by default. To enable the demo:

1. Select **Set up a trusted caregiver**.
2. Read the disclosure. In a future connected service, a check-in might share the entrance, event type, time, and whether you acknowledged the alert. It would not need visitor identity, audio, or video.
3. Check the confirmation box and select **Enable demo check-in**.
4. Optionally enter a display label. It is just a local label—not a phone number or contact method.
5. Choose how long the app should wait before adding an automatic demo check-in. **10 seconds** is useful for a quick demonstration.

Nothing is sent to the person named by the display label—or to anyone else. If a configured event reaches its delay without acknowledgement, a simulated notice appears in **Caregiver demo inbox**. You can also select **Ask caregiver to check** on an active alert to add an immediate simulated notice. If check-ins are off, that action explains that no request was created.

Use **Turn off automatic check-ins** to stop future automatic check-ins. Existing notices remain in the event history until you clear it.

## Respond to a doorbell event

1. Choose **Front entrance** or **Side entrance** in the demo control.
2. Select **Simulate doorbell event**. The app adds a doorbell event with its entrance and time. If spoken alerts are selected and quiet hours are not active, the browser attempts to speak the alert.
3. Choose an action:
   - **I’m aware** — acknowledge the alert; the automatic countdown stops.
   - **Ask caregiver to check** — with demo check-in enabled, add an immediate local notice. It does not contact anyone.
   - **Dismiss** — close the active alert; the event remains in history.
4. If automatic check-ins are enabled and you do not acknowledge in time, the app adds a simulated notice to the in-app inbox. The alert remains available until you acknowledge or dismiss it.

## Clear demo history

Select **Clear history**, review the confirmation, then choose **Erase history**. This removes example entries, simulated events, open alerts, and in-app caregiver notices from this browser. It keeps your alert preferences. Clearing history cannot undo a deletion; sample entries are not recreated after you clear them.

## Keyboard and screen-reader use

- Use **Skip to main content** at the top of the page to bypass the header.
- Tab through controls; use arrow keys for the alert-style radio options and Space to toggle switches or checkboxes.
- A visible focus outline helps identify the current control.
- New events and important response or escalation changes are announced by the app's screen-reader status region. Alert state is shown with text and symbols, not color alone.

## Privacy, storage, and limitations

- The app stores preferences and demo history in this browser's `localStorage`. Clearing browser/site data may also remove them. The app has no backend and does not send event data or notifications over a network.
- It does not identify visitors, infer identity, record or store audio/video, or contact caregivers.
- Spoken output uses the browser/operating-system speech feature. Voice availability and any voice-service behavior are controlled by that environment.
- There is no Ring connection, account linking, API, device access, or authorized integration configured. The simulator is for demonstrating the interface only; do not rely on the app for emergency response or safety monitoring.

A future real integration would need an authorized Ring API/SDK, simulator, or device integration and explicit resident consent. It would also need secure credential handling and an authorized delivery service before any caregiver could receive a real notification. See the project `README.md` for the adapter integration point and development notes.
