# Accessible Arrival

Accessible Arrival is a local-first, accessible demo for noticing and responding to doorbell events in a way that suits the resident. It uses a doorbell simulator; it is **not connected to Ring** and it does not send messages.

## Run it

No package installation, paid service, account, or API key is needed. Serve this folder over HTTP so the browser can load JavaScript modules:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000>. On Windows, `py -m http.server 8000` can be used instead. Stop the server with `Ctrl+C`.

## Demo flow

1. The dashboard opens with clearly labeled **Example** history, an empty live-alert area, and the current alert preferences.
2. Choose **Visual only**, **Spoken**, or **Both**. The active alert and its response controls always remain visible; Spoken mode gives voice priority with a quieter on-screen card, while Both pairs voice with the more prominent visual alert. High contrast and large text can be switched on independently. Use **Test spoken alert** to try the browser's speech feature; **Turn spoken alerts off** is available whenever speech is selected.
3. To try caregiver escalation, choose **Set up a trusted caregiver**. Review the information disclosure, check the local-demo confirmation, and enable it. Choose an optional display label and delay. A **10-second** delay is available for a quick demo.
4. Choose an entrance and select **Simulate doorbell event**. The resulting event is marked **Demo event** and appears as an active alert and in Recent events.
5. Try **I’m aware**, **Ask caregiver to check**, or **Dismiss**. With automatic check-ins enabled, an unacknowledged alert creates a notice in **Caregiver demo inbox** after the selected delay. The notice is in-app only. No text, call, email, or other external notification is sent.
6. **Clear history** removes example and simulated events, active alerts, and demo inbox notices from this browser. Alert preferences are kept.

Example history is seeded only on first use so the dashboard can show acknowledged, dismissed, and caregiver-check-in states. Examples are fictional, labeled, and stored locally like other demo data.

## Accessibility controls

- Large, labeled actions; semantic headings; a skip link; keyboard-operable native controls; and visible keyboard focus.
- Screen-reader status announcements for new events, responses, and simulated escalation.
- High contrast and large text settings persist locally. Alerts are never communicated by color alone, and no flashing animation is used.
- Spoken alerts use the browser/operating-system `SpeechSynthesis` feature when available. If it is unsupported or playback fails, the app keeps the visual alert and provides a status message. Available voices and any voice-service behavior are controlled by the browser or operating system.
- Quiet hours pause spoken door alerts only. The visual alert remains, and configured caregiver timing is unchanged.

## Privacy and demo limits

- Settings, example events, simulated events, and in-app demo notices are saved in this browser's `localStorage`. The app has no backend and makes no event or notification requests.
- Caregiver check-ins are off by default. The setup disclosure previews the event type, entrance, time, and acknowledgement state that a future connected check-in might share. Enabling the current demo only creates a local inbox entry; it does **not** contact a caregiver.
- The app does not identify visitors, infer identity, capture or store audio/video, or send external notifications. An optional caregiver display label is only a local label, not contact information.
- This prototype demonstrates interface behavior, not a safety-critical monitoring service. Do not rely on it for emergency response or as a substitute for an authorized doorbell app.

## Where a real Ring integration would plug in

There is no Ring account, Ring SDK, endpoint, credential, or authorized integration configured here. The simulator lives in `src/event-adapter.js`. It implements a small `subscribe(listener)` contract and emits a normalized event containing only `entrance`, `eventType`, `occurredAt`, and `source`. `src/main.js` subscribes to that adapter and passes incoming normalized events through `normalizeDoorEvent()` before saving them or updating the UI.

A future integration should replace the simulator with an adapter built against a **currently authorized Ring API, SDK, approved simulator, or device integration** and map its documented event data to that small contract. Do not assume undocumented endpoints or capabilities. Before real use, the project would need an authorized account/device consent flow, secure handling of any credentials (not browser storage), a trusted service for any off-device caregiver delivery, explicit recipient consent and disclosure, and production review for privacy, reliability, and accessibility. None of those pieces are present in this demo.
