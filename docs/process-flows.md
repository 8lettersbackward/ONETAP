# 1TAP | Operational Process Flows & Logic Logic

## 1. Authentication & Role-Based Entry
**Logic**: 
- Upon login, the system queries `users/${uid}/profile`.
- **RBAC**: If `role === 'guardian'`, the terminal initializes the "LINKED USERS" radar. If `role === 'user'`, it initializes "MANAGE BUDDIES".
- **Verification Gate**: All tactical modules are locked until `emailVerified === true`.

## 2. The Persistent Telemetry Loop
**Sequence**:
1. **Guardian Command**: Guardian clicks "Track Request" on a linked asset.
2. **Database Mutation**: `nodes/${nodeId}/trackRequest` set to `true`. `trackRequester` set to `currentUid`.
3. **Infinite State**: Logic removed the 10-second timer. The state is persistent.
4. **Hardware Intercept**: Hardware reads `trackRequest: true`.
5. **Response Dispatch**: Hardware writes `type: 'sos', trigger: 'TrackResponse'` to the User's vault.
6. **UI Recognition**: Terminal intercepts the signal. Because `trigger === 'TrackResponse'`, it skips the auto-modal deployment but colors the notification **Blue** (`secondary`).

## 3. High-Intensity SOS Orchestration
**Sequence**:
1. **Trigger**: SOS signal written to RTDB.
2. **Real-Time Intercept**: `onChildAdded` listener catches the event.
3. **Validation**: System checks `alert.type === 'sos'` and `alert.trigger !== 'TrackResponse'`.
4. **Auto-Deployment**: The high-intensity **Tactical SOS Intercept** modal (Red) is pushed to the top of the UI stack.
5. **Spatial Resolution**: `reverseGeocode` flow is called asynchronously.
6. **UI Enrichment**: The map in the modal centers on coordinates, and the "Place" name is updated live as the AI returns data.

## 4. Tactical Linking Handshake
**Logic**:
1. **Step 1 (Requested)**: Guardian searches Hardware ID. Link state: `Guardian: requested, User: pending`.
2. **Step 2 (Approved)**: User clicks "Approve". Both paths updated to `status: 'linked'`.
3. **Step 3 (Track Auth)**: Guardian clicks "Request Track". Link state: `Guardian: requested, User: pending` (on `trackingRequest` field).
4. **Step 4 (Final)**: User approves track. Both paths set to `approved`. Only now is the "Track Assets" command enabled for the Guardian.

## 5. UI/UX Mobile Hardening
**Constraints**:
- **Modal Verticality**: Use `flex flex-col` on dialog content. Header is `flex-shrink-0`, Content is `flex-1 overflow-hidden`, Footer is `flex-shrink-0`. This ensures the **CLOSE** button never leaves the viewport on iPhone/Android browsers.
- **Map Scaling**: Map height must be dynamic (`h-[200px]` to `h-[350px]`) to accommodate the 2-way modal padding.
- **Text Safety**: All identity strings (Emails/Names) must use `truncate` or `break-words` to prevent layout breach on 320px displays.