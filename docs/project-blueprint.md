# 1TAP | Emergency Buddy - Technical Specification & Operational Blueprint

## 1. System Architecture Overview
1TAP is a professional-grade safety orchestration hub built on a **Real-Time Event-Driven Architecture**. It utilizes a dual-role (User/Guardian) hierarchy to coordinate personal security and hardware asset tracking.

## 2. Tactical Database Schema (Firebase RTDB)
The system operates on a hierarchical JSON structure optimized for sub-second latency:

### Personnel & Hardware Vault
- `users/${uid}/profile`: Tactical identity (email, role: 'user'|'guardian', displayName).
- `users/${uid}/buddies/${buddyId}`: Enlisted emergency contacts (name, phone, protocol groups).
- `users/${uid}/nodes/${nodeId}`: Registered hardware assets.
  - `hardwareId`: Unique hardware signature.
  - `status`: 'online' | 'offline'.
  - `trackRequest`: Boolean (Persistent tracking state).
  - `trackRequester`: UID of the Guardian currently requesting telemetry.
  - `latitude` / `longitude`: Spatial coordinates.
  - `temperature`: Thermal threshold (°C).

### Tactical Links (Handshake Protocol)
- `users/${uid}/links/${targetUid}`:
  - `status`: 'pending' (incoming) | 'requested' (outgoing) | 'linked' (active).
  - `trackingRequest`: 'requested' | 'approved' | null.

### Notification Vault (Telemetry Stream)
- `users/${uid}/notifications/${alertId}`:
  - `type`: 'sos' | 'telemetry' | 'link_request' | 'track_request'.
  - `trigger`: Signal source (e.g., 'TrackResponse', 'Manual SOS').
  - `place`: Human-readable geocoded location.
  - `latitude` / `longitude`: Precision coordinates.

## 3. Core Operational Process Flows

### A. Persistent Asset Tracking (Telemetry Protocol)
1. **Initiation**: A Guardian sends a `trackRequest=true` command to a linked User's node.
2. **Identification**: The Guardian's UID is signed as `trackRequester`.
3. **No Timeout**: The 10-second legacy window is decommissioned. Tracking remains active until the Guardian explicitly sets `trackRequest=false`.
4. **Hardware Loop**: The hardware node detects `trackRequest=true`, polls coordinates, and pushes a `TrackResponse` to the User's notification vault.

### B. SOS Intercept & Orchestration
1. **Trigger**: A hardware node or User initiates a `type='sos'` signal.
2. **Global Listener**: The terminal's `onChildAdded` listener intercepts the new entry.
3. **Identity Check**: If the alert is fresh (< 30s) and NOT a `TrackResponse`, the system auto-deploys the **High-Intensity SOS Intercept** modal.
4. **Visual Signature**: SOS alerts utilize the **Red** (`destructive`) palette. Telemetry updates (`TrackResponse`) utilize the **Blue** (`secondary`) palette and do not auto-intercept the UI.

### C. Asynchronous Spatial Resolution (Geocoding)
1. **Intercept**: System detects raw coordinates in a notification.
2. **Genkit Bridge**: Coordinates are passed to the `reverseGeocode` GenAI flow.
3. **Enrichment**: The AI returns "City, Province, Country".
4. **Commit**: The system asynchronously updates the notification record with the `place` string.

### D. Tactical Handshake (Linking)
1. **Search**: Guardian intercepts a Hardware ID.
2. **Dispatch**: Link request is written to both User and Guardian link paths.
3. **Authorization**: The User must approve the link (`status='linked'`) before any data is shared.
4. **Secondary Gate**: Tracking requires a separate `trackingRequest` approval flow.

## 4. UI/UX Engineering Standards
- **Tactical Minimalist**: Monochrome background with high-visibility primary/secondary accents.
- **Mobile Modal Logic**:
  - Dynamic padding (`p-4` to `p-10`) based on device width.
  - **CLOSE** command locked to viewport bottom.
  - `[&>button]:hidden` to force explicit personnel interaction.
- **Spatial Map**:
  - Leaflet.js integration with a tactical "Ping" animation on coordinates.
  - Dynamic height scaling (`h-[200px]` mobile / `h-[350px]` desktop) to prevent clipping.
- **Overflow Protection**: Strict use of `min-w-0` and `break-words` on all tactical strings.