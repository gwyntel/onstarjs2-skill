---
name: onstarjs2
description: Control GM/OnStar vehicles via the OnStarJS2 npm library (BigThunderSR/OnStarJS). Authenticate with TOTP, execute vehicle commands, query diagnostics, manage EV charging, and retrieve vehicle/account data.
version: 1.1.0
author: gwyntel
license: MIT
metadata:
  hermes:
    tags: [onstar, gm, vehicle, iot, home-assistant, ev, mqtt, smart-home]
    related_skills: [homeassistant-cli, openhue]
prerequisites:
  npm_package: onstarjs2
  env_vars:
    - DEVICEID (UUID v4)
    - VIN (vehicle identification number)
    - ONSTAR_USERNAME (GM account email)
    - ONSTAR_PASSWORD
    - ONSTAR_PIN (4-digit OnStar PIN)
    - ONSTAR_TOTPKEY (TOTP secret from GM "Third-Party Authenticator App" setup)
  pii_warning: |
    ⚠️ NEVER commit PII (VINs, emails, passwords, PINs, TOTP keys, account numbers,
    GPS coordinates, device IDs, vehicle nicknames) to any tracked file. All credentials
    must live in .env only (which is git-ignored). If PII is found in tracked files,
    remove immediately and rewrite git history with git filter-branch.
  note: |
    TOTP setup: Change GM account MFA to "Third-Party Authenticator App" (desktop browser only).
    Capture the TOTP key from the QR code setup link or use an app like Stratum/Bitwarden that shows the key.
    Requires chromium-bidi (auto-installed via patchright postinstall). Valid system time (NTP) is critical.
---

# OnStarJS2 Skill

Control GM vehicles (Chevrolet, GMC, Buick, Cadillac) via the unofficial OnStar API through the `onstarjs2` npm package.

This skill targets GM/OnStar vehicles and the `onstarjs2` npm package; the executing agent may be Hermes, Claude Code, Codex, or another agent. Hermes-only conveniences (HA tools, cron tools, paths) are optional adapters, not product requirements. Obtain explicit authorization before any vehicle action (start, lock/unlock, horn/lights, charging changes) or before transmitting vehicle location/diagnostics. Prefer read-only queries when demonstrating setup; never run real vehicle commands as a test.

**Skill Repo (clone this):** <https://github.com/gwyntel/onstarjs2-skill>
**Upstream npm:** <https://www.npmjs.com/package/onstarjs2>
**Upstream Source:** <https://github.com/BigThunderSR/OnStarJS>
**API Base:** `https://na-mobile-api.gm.com`

> **Self-contained skill:** Clone the skill repo, `npm install`, configure `.env`, and go.
> Do NOT fork the upstream OnStarJS repo — this skill wraps the npm package as-is
> with a test harness, Linux GPU patch, and command scripts.

## ⚠️ Critical Requirements

1. **TOTP Authentication** — As of 2024-11-19, GM requires TOTP. You MUST set your GM account MFA to "Third-Party Authenticator App" and capture the TOTP secret key.
2. **Chromium/Browser** — The auth flow uses Patchright (Chromium fork) for browser automation. `chromium-bidi` must be installed.
3. **Valid System Time** — TOTP is time-based. NTP/Chrony is required. Token auth will silently fail with clock skew.
4. **Use at your own risk** — Unofficial library. May violate GM's ToS.

## Configuration

### Environment Variables (.env)

```env
DEVICEID="XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
VIN="1G2ZF58B774109863"
ONSTAR_USERNAME="foo@bar.com"
ONSTAR_PASSWORD="***"
ONSTAR_PIN="1234"
ONSTAR_TOTPKEY="XXXXXXXXXXXXXXXX"
TOKEN_LOCATION="./"              # optional: where to store auth tokens
CHECK_REQUEST_STATUS=true        # optional: poll for command completion
MAX_429_RETRIES=4                # optional: 429 retry count
INITIAL_429_DELAY_MS=1500        # optional: initial backoff
BACKOFF_FACTOR=2                 # optional: exponential backoff multiplier
JITTER_MS=500                    # optional: random jitter
MAX_429_DELAY_MS=60000           # optional: max backoff cap
```

### Programmatic Config

```typescript
import OnStar from "onstarjs2";

const onStar = OnStar.create({
  deviceId: "UUID-v4",
  vin: "1G2ZF58B774109863",
  username: "foo@bar.com",
  password: "p@ssw0rd",
  onStarPin: "1234",
  onStarTOTP: "TOTP_SECRET",
  tokenLocation: "./",
  checkRequestStatus: true,            // default: true
  requestPollingIntervalSeconds: 6,    // default: 6
  requestPollingTimeoutSeconds: 90,    // default: 90
  max429Retries: 3,                    // default: 3
  initial429DelayMs: 1000,             // default: 1000
  backoffFactor: 2,                    // default: 2
  jitterMs: 250,                       // default: 250
  max429DelayMs: 30000,               // default: 30000
  retryOn429ForPost: false,           // default: false (only GET retried)
});
```

## Complete Command Reference

### 🚗 Vehicle Query Commands (GraphQL, no vehicle action)

| Method | Returns | Params | Description |
|--------|---------|--------|-------------|
| `getAccountVehicles()` | `GarageVehiclesResponse` | none | All vehicles on account (VIN, make, model, year, OnStar status) |
| `getVehicleDetails(vin?)` | `VehicleDetailsResponse` | `vin?` (default: config VIN) | Full vehicle info: RPO codes, permissions, commands, colors, metadata |
| `getOnstarPlan(vin?)` | `OnstarPlanResponse` | `vin?` | OnStar subscription plans, offers, active plans, orders, expiry |
| `getVehicleRecallInfo(vin?)` | `VehicleRecallInfoResponse` | `vin?` | Recall status, repair status, descriptions, completion dates |
| `getWarrantyInfo(vin?)` | `WarrantyInfoResponse` | `vin?` | Warranty types, coverage dates, mileage limits, status |
| `getSxmSubscriptionInfo(vin?)` | `SxmSubscriptionInfoResponse` | `vin?` | SiriusXM device ID, subscription status, channel account |

### 🔧 Vehicle Action Commands (v3 API with v1 fallback)

All action commands automatically try v3 API first and fall back to v1 if the vehicle doesn't support v3. The API version is cached in-memory per session.

| Method | Params | Description |
|--------|--------|-------------|
| `start(options?)` | `{ cabinTemperature?: number }` | Remote start engine (cabin temp in Celsius, EV/remote start) |
| `cancelStart()` | none | Cancel active remote start |
| `lockDoor(options?)` | `{ delay?: number }` | Lock all doors |
| `unlockDoor(options?)` | `{ delay?: number }` | Unlock all doors |
| `lockTrunk(options?)` | `{ delay?: number }` | Lock trunk (doesn't close it) |
| `unlockTrunk(options?)` | `{ delay?: number }` | Unlock trunk (all doors stay locked) |
| `alert(options?)` | `{ action?: ["Flash"\|"Honk"], delay?, duration?, override?: ["DoorOpen"\|"IgnitionOn"] }` | Flash lights and/or honk horn |
| `cancelAlert()` | none | Cancel active alert |
| `flashLights(options?)` | `{ delay?, duration?, override? }` | Flash lights only (no horn) |
| `stopLights()` | none | Stop active flash lights |

### 🔋 EV Charging Commands (eve-vcn.ext.gm.com API)

These use a separate EV session token obtained via `initSession`. The token and vehicleId are cached and auto-refreshed on auth errors.

| Method | Params | Description |
|--------|--------|-------------|
| `getEVChargingMetrics(opts?)` | `{ clientVersion?, os? }` | Current EV charging metrics/status |
| `refreshEVChargingMetrics(opts?)` | `{ clientVersion?, os? }` | Force-refresh live charging telemetry |
| `setChargeLevelTarget(tcl, opts?)` | `tcl` (1-100%), `{ noMetricsRefresh?, clientRequestId?, clientVersion?, os? }` | Set target charge percentage |
| `stopCharging(opts?)` | `{ noMetricsRefresh?, clientRequestId?, clientVersion?, os? }` | Stop current charging session |

### 📊 Data Retrieval Commands

| Method | Returns | Description |
|--------|---------|-------------|
| `diagnostics()` | `TypedResult<HealthStatusResponse>` | Full vehicle health: odometer, tire pressure, fuel economy, battery, advanced diagnostics |
| `location()` | `Result` | Current vehicle location (lat/lng/geohash). Polls until updatePending≠PENDING |

### ❌ Deprecated Commands

| Method | Replacement |
|--------|-------------|
| `chargeOverride()` | `setChargeLevelTarget()` + `stopCharging()` |
| `getChargingProfile()` | `getEVChargingMetrics()` |
| `setChargingProfile()` | `setChargeLevelTarget()` |

## Architecture

```
OnStar (index.ts)
  └── RequestService (RequestService.ts)
        ├── GMAuth (auth/GMAuth.ts) — TOTP + Patchright browser automation
        ├── Request (Request.ts) — HTTP request builder (fluent API)
        ├── RequestResult (RequestResult.ts) — success/failure wrapper
        ├── RequestError (RequestError.ts) — error with response/request context
        └── onStarAppConfig.json — API base URL + user agent

API Endpoints:
  GM Mobile API:  https://na-mobile-api.gm.com
    /mbff/garage/v1                     — GraphQL queries (vehicles, details, plan, warranty, recall, SXM)
    /api/v1/account/vehicles/{vin}/commands/{cmd}  — v1 action commands
    /veh/cmd/v3/{cmd}/{vin}             — v3 action commands
    /veh/datadelivery/digitaltwin/v1/vehicles/{vin}  — location
    /api/v1/vh/vehiclehealth/v1/healthstatus/{vin}   — diagnostics

  EV API:  https://eve-vcn.ext.gm.com/api/gmone/v1
    /admin/initSession                  — EV session token + vehicleId
    /vehicle/getVehicleChargingMetrics  — EV charging data
    /vehicle/performSetChargingSettings  — Set charge target
    /vehicle/performStopCharging         — Stop charging
    /vehicle/performVehicleChargingMetricsQuery  — Refresh EV metrics
```

## Authentication Flow

1. `GMAuth.create(config)` — builds OIDC client for GM's Microsoft Entra ID
2. Browser automation (Patchright/Chromium) navigates GM login flow
3. TOTP code generated from `onStarTOTP` key via `totp-generator`
4. OIDC authorization code exchanged for tokens
5. Tokens persisted to `microsoft_tokens.json` / `gm_tokens.json` at `tokenLocation`
6. JWT decoded to extract authorized VINs — validates configured VIN is in list
7. Tokens auto-refreshed on expiry; browser re-initialized for reauth

## 429 Rate Limit Handling

- Configurable retries with exponential backoff + jitter
- `Retry-After` header respected (seconds or HTTP-date)
- By default only GET requests are retried on 429 (`retryOn429ForPost: false`)
- Config via `max429Retries`, `initial429DelayMs`, `backoffFactor`, `jitterMs`, `max429DelayMs`

## Result Shape

```typescript
// Standard result
{ status: "success"|"failure"|"inProgress", response?: { data?: any }, message?: string }

// Typed result (diagnostics)
{ status, response?: { data?: HealthStatusResponse }, message? }
```

## Helper Scripts (package.json)

```bash
pnpm run:request-service       # Interactive CLI for all commands
pnpm run:get-vehicles          # Get account vehicles
pnpm run:get-diagnostics       # Get vehicle diagnostics
pnpm run:get-tire-pressure     # Get tire pressure
pnpm setup:env                  # Setup .env from template
pnpm setup:interactive         # Interactive credential manager
```

## Ecosystem Integrations

- **onstar2mqtt** — MQTT bridge for Home Assistant (<https://github.com/BigThunderSR/onstar2mqtt>)
- **HA Add-on** — Home Assistant add-on wrapper (<https://github.com/BigThunderSR/homeassistant-addons-onstar2mqtt>)
- **Node-RED** — Node-RED integration (<https://github.com/BigThunderSR/node-red-contrib-onstar2>)
- **PyOnStar** — Python port (<https://github.com/leboff/pyonstar>)

### Retrieving OnStar Credentials from an HA Add-on (optional, sensitive)

If the operator already runs onstar2mqtt as an HA add-on, its configuration may be inspectable through the HA Supervisor CLI from an authorized HA terminal (not from an arbitrary agent host):

```bash
ha addons info <operator_configured_addon_slug>
```

Treat any returned options as secrets; do not copy them to chat, logs, or tracked files. Availability and access restrictions depend on the HA installation. Do not assume a particular add-on slug, host path, or private deployment reference. Configure `.env` locally as described above instead.

## MQTT Shortcut Path (when onstar2mqtt HA add-on is running)

If the onstar2mqtt Home Assistant add-on is already deployed, you can send commands via MQTT **without installing or configuring the npm package at all**. This is dramatically faster for quick one-off commands like lock/unlock/start.

### Prerequisites

- MQTT broker accessible to the agent host (if configured; the HA add-on publishes/subscribes to it)
- `paho-mqtt` Python package installed
- Broker credentials configured privately by the operator; do not assume a deployment reference or retrieve/print secrets

### Command Pattern

Use only operator-configured broker address, credentials, and discovered vehicle topic (substitute placeholders below; never publish secrets). Obtain explicit user approval before publishing any action command.

```python
import paho.mqtt.client as mqtt
import json
import time

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.username_pw_set('<mqtt_user>', '<mqtt_password>')
client.connect('<mqtt_broker_host>', 1883, 60)
client.loop_start()

topic = 'homeassistant/<VIN>/command'
payload = json.dumps({'command': '<commandName>'})
result = client.publish(topic, payload, qos=1)
result.wait_for_publish(timeout=10)
print(f'Published <commandName> — RC: {result.rc}')

time.sleep(1)
client.loop_stop()
client.disconnect()
```

### Supported Commands via MQTT

`lockDoor`, `unlockDoor`, `start`, `cancelStart`, `alert`, `cancelAlert`, `flashLights`, `stopLights`, `diagnostics`, `location`, `getEVChargingMetrics`, `setChargeLevelTarget` (options: 1-100), `stopCharging`

### Scheduling Timed Commands

Use your agent's native scheduler or an HA automation if available. Configure an appropriately scoped HA capability and ensure the scheduled instruction uses operator-configured broker details and a verified topic. Do not assume Hermes cron tools exist on other agents. Every scheduled vehicle action requires explicit user authorization.

### HA Button Entity Path (simplest of all)

When the onstar2mqtt HA add-on is running, it creates HA **button entities** for every vehicle action command. Pressing these buttons via the HA API is the simplest way to issue a command — no MQTT scripting, no npm install, no Python dependencies.

**Entity naming pattern:** `button.{year}_{make}_{model}_command_{commandName}` (verify on the target instance; exact IDs vary by vehicle/integration version). Do not assume the illustrative IDs from another installation.

**How to press a button (Home Assistant tool/API):**
Use the executing agent's native Home Assistant capability if available, or the HA REST API. `ha_call_service` is a Hermes-specific example, not a required tool. Discover the actual entity ID on the target HA instance; the example below is illustrative only.

```text
Domain: button; service: press; entity_id: <verified vehicle command button>
```

**How to press a button (via HA REST API):**
```bash
curl -X POST "https://HA_URL/api/services/button/press" \
  -H "Authorization: Bearer $HASS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"entity_id": "button.2019_chevrolet_bolt_ev_command_start"}'
```

**Scheduling timed commands:** Use your agent's native scheduler or an HA automation if available. Configure an appropriately scoped HA capability, and ensure the scheduled instruction discovers/uses a verified entity ID. Do not assume Hermes cronjob names or toolsets exist on other agents. A scheduled vehicle action still requires explicit user authorization.

**Discovering available button entities:**
```
GET /api/states → filter for entity_id containing "command" + vehicle model prefix
```

### When to Use HA Buttons vs MQTT vs npm

| Scenario | Use |
|----------|-----|
| Quick command (lock/unlock/start) with HA add-on running | **HA Buttons** — zero dependencies, works from Hermes directly |
| Scheduling timed commands | **HA Buttons + cronjob** — simplest inline prompt |
| Scripting multiple commands in sequence | **MQTT** — programmatic control, no per-call overhead |
| Querying diagnostics or location data | **npm** — structured response parsing |
| EV charging management | **npm** — complex API interactions |
| No HA add-on deployed | **npm** — only option |

## Common Patterns

### Quick Vehicle Status Check

```javascript
const onStar = OnStar.create(config);
const vehicles = await onStar.getAccountVehicles();
const diag = await onStar.diagnostics();
const loc = await onStar.location();
```

### EV Charge Management

```javascript
const metrics = await onStar.getEVChargingMetrics();
await onStar.setChargeLevelTarget(80);  // charge to 80%
await onStar.stopCharging();             // stop charging now
```

### Lock/Unlock with Alert

```javascript
await onStar.lockDoor();
await onStar.alert({ action: ["Flash", "Honk"], duration: 1 });
await onStar.unlockDoor({ delay: 0 });
```

## Pitfalls

- **GM "Access Denied" auth block (post-Jul 2026)** — GM's Entra ID (`custlogin.gm.com`) now returns `[ACCESS DENIED]` on the `/B2C_1A_SEAMLESS_MOBILE_SignUpOrSignIn/SelfAsserted` endpoint for automated Patchright/Chromium sign-ins. The add-on log shows `🚫 Access Denied: GM's auth server blocked this sign-in attempt. Retrying immediately makes this worse.` **Every retry deepens the block — do NOT start the add-on in a loop.** Recovery is hours-long waiting or manual auth via the Firefox extension (https://github.com/metheos/onstar_firefox).
- **Diagnosing a dead OnStar add-on from outside HA** — `ha apps logs` returns EMPTY for a stopped add-on (no crash trail survives). Workflow:
  1. `ha apps list | grep -A12 -i onstar` → check `state:` (slug pattern `020296af_onstar2mqtt_bigthundersr_vehicle<N>`)
  2. `ha apps info <slug> | sed -n '/^options:/,/^schema:/p'` → reads all `ONSTAR_*`/`MQTT_*` creds (works from the Hermes SSH key on the HA host, no Supervisor token needed)
  3. `ha apps start <slug>` (ONE attempt only), `sleep 45`, `ha apps logs <slug> | tail -80` → the auth failure prints here
  4. Check entity fallout: `GET /api/states` filtered on the vehicle prefix — all `button.*_command_*` / sensors read `unavailable` with `last_changed` frozen at the failure time
- **A scheduled-start automation keeps firing while the vehicle integration is dead** — `automation.*` reports `state: on` and `last_triggered` updates on schedule, but the `button.press` action silently no-ops on an `unavailable` entity. `last_triggered` is NOT evidence the car started; verify the actual button/sensor entities and the add-on state.
- **HA log location** — on HAOS the current log is NOT at `/config/home-assistant.log` (moved in 2024.x). Use the HA UI Logs page, `ha core logs`, or `/config/home-assistant.log.1` for the rotated prior file.
- **Stale token files are renamed `.old`** — OnStarJS2 rotates `microsoft_tokens.json` / `gm_tokens.json` at `TOKEN_LOCATION`, keeping the previous pair as `*.json.old`. If ONLY `.old` files exist, the live tokens are gone and browser re-auth is required. Decode `expires_at` in the `.old` file to date the last successful auth.
- **TOTP key must be captured during initial GM MFA setup** — cannot be retrieved later unless using an authenticator app that shows keys
- **"Third-Party Authenticator App" option only appears on desktop browser** — not visible on mobile
- **Token auth requires valid system time** — even small clock skew causes silent failures
- **Action commands cache v1/v3 preference in memory only** — not persisted, redetermined each session
- **EV API vehicleId comes from initSession response** — cannot be derived from VIN alone
- **Shared OnStar accounts** get partial data (plan details empty/errors handled gracefully since v2.16.0)
- **Location polling** — `location()` triggers an update then polls until `updatePending ≠ PENDING`
- **429 rate limiting** — GM's API rate limits aggressively; respect the backoff config
- **Browser automation** — auth uses headless Chromium; needs xvfb on Linux, may fail in constrained environments
- **Linux GPU crash** — on Linux (containers/VMs without GPU), Chromium crashes with "Target page, context or browser has been closed" during auth. Fix: patch `node_modules/onstarjs2/dist/index.mjs` to add `--disable-gpu` and `--disable-software-rasterizer` alongside the existing `--use-gl=swiftshader` line (around line 1374). No vulkan ICD is needed after this fix
- **paho-mqtt install on managed Python** — `pip install paho-mqtt` may fail with PEP 668 on system-managed Python. Use a project virtual environment (`python3 -m venv .venv`, activate it, then `python -m pip install paho-mqtt`) rather than modifying the agent's managed Python environment.
- **HA Supervisor API returns 401 with standard HASS_TOKEN** — The `/api/hassio/*` endpoints require Supervisor authentication (separate from the long-lived access token). You cannot read add-on configs this way from an external agent. Use `/api/states` instead to discover entities, or use the HA button entity path to issue commands without needing add-on config at all
- **Token reuse** — after first successful auth, tokens are saved to `microsoft_tokens.json` and `gm_tokens.json` at `TOKEN_LOCATION`. Subsequent calls reuse tokens without browser re-auth until they expire

## Human-Assisted VNC Recovery — PROVEN PLAYBOOK (Sep 2026)

When GM's WAF blocks headless auth (silent 403 on `/SelfAsserted`, no error UI — detect via `performance.getEntriesByType('resource')` filtering `responseStatus===403`), a **human-assisted VNC login** through the camofox anti-detect browser succeeds. Proven end-to-end Sep 15 2026: blocked all morning headless, human clicked Log In once over VNC → full token set in under a minute.

**Architecture** (3 pieces on camofox CT):
1. **onstar_firefox extension** (github.com/metheos/onstar_firefox) installed in camoufox via the `addons:` array in `launchOptions()` — needs three patches for agent-drivability:
   - `background.js`: `saveAs: true` → `saveAs: false` (kills native Save-As dialog)
   - `background.js`: `startAuthFlow` navigates the invoking tab (`browser.tabs.update(sender.tab.id)`) instead of `tabs.create()` so the agent-tracked tab follows the flow
   - `background.js`: webRequest listener additionally POSTs the captured `msauth.com.gm.mychevrolet://` redirect URL to a local capture listener (`http://localhost:9999/capture`) — this is what hands the OAuth code to the agent without any popup
2. **Capture listener** — tiny Python http.server on CT :9999 writing each POST body to `/tmp/gm_capture_latest.txt`
3. **VNC** — camofox `ENABLE_VNC=1` + `VNC_PASSWORD` env (systemd drop-in); x11vnc + noVNC auto-attach to camoufox's Xvfb display. Access via `https://camofox.<tailnet>.ts.net/novnc/vnc.html` or raw VNC `<ct-ip>:5900`

**Flow, step by step:**
1. Agent generates PKCE pair (stdlib: `secrets.token_bytes(32)` → base64url verifier, SHA-256 → challenge) + state, and builds the authorization URL from the discovery doc with `client_id 3ff30506-d242-4bed-835b-422bf992622e`, `redirect_uri msauth.com.gm.mychevrolet://auth`, `scope https://gmb2cprod.onmicrosoft.com/<client_id>/Test.Read openid profile offline_access`, `bundleID com.gm.myChevrolet`, `brand chevrolet`
2. Agent navigates its tracked tab to the auth URL, fills email via real typing, clicks Continue, focuses the password field
3. **Human takes over over VNC**: types password, clicks Log In. GM's WAF accepts the human-speed real-browser interaction that it 403s when driven programmatically
4. Extension's webRequest listener catches the 302 to the custom scheme, forwards the full redirect URL to the capture listener
5. Agent reads `/tmp/gm_capture_latest.txt`, extracts `code`, verifies `state` matches, and does the token exchange from the camofox CT (same egress): POST `{grant_type: authorization_code, client_id, redirect_uri, code, code_verifier}` to the discovery doc's `token_endpoint`
6. Full token set (`access_token`/`refresh_token`/`id_token`) lands as JSON — install into the HA add-on's `TOKEN_LOCATION` (onstar2mqtt default `/ssl/vehicle1/`: write `microsoft_tokens.json` + `gm_tokens.json`, then `ha apps restart <slug>`), or hand to onstarjs2 directly

**Why it works:** GM's bot detection fingerprints request *dynamics* (timing, event cadence, CDP artifacts). Real human input over VNC on a camoufox (anti-detect Firefox) session has none of the tells. The OAuth code itself is captured by the extension's own listener, so nothing about the exchange is fingerprinted — the only human moment is the single login click.

**Scaling note for agent fleets:** the whole apparatus (PKCE gen, auth URL build, capture listener, token install) is agent-side except the ONE human click. Store the verifier/state in a temp file keyed to the capture so a later session can pick up the exchange if the browser restarts mid-flow.
