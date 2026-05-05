---
name: onstarjs2
description: Control GM/OnStar vehicles via the OnStarJS2 npm library (BigThunderSR/OnStarJS). Authenticate with TOTP, execute vehicle commands, query diagnostics, manage EV charging, and retrieve vehicle/account data.
version: 1.0.0
author: Claire
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

### Retrieving OnStar Credentials from HA Add-on

If the user has onstar2mqtt running as an HA add-on, the credentials (including TOTP key) are accessible via the HA Supervisor CLI:

```bash
# From HA SSH terminal (not Hermes SSH — must be inside HA OS)
ha addons info <addon_slug>
```

The `options` block in the output contains all `ONSTAR_*` env vars. The addon slug follows the pattern `020296af_onstar2mqtt_bigthundersr_vehicle<N>`.

**What does NOT work for reading add-on config:**
- `docker inspect` — blocked by HA SSH Protection Mode
- `curl http://hassio/addons/<slug>` — 401 without Supervisor token
- Searching `/data/` for auth tokens or options.json — Supervisor stores config internally
- Reading `/homeassistant/.storage/refresh_tokens` for Supervisor auth — no direct path

See `references/deployment-missbolt.md` for the live deployment details (VIN, credentials, MQTT topics).

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
- **Token reuse** — after first successful auth, tokens are saved to `microsoft_tokens.json` and `gm_tokens.json` at `TOKEN_LOCATION`. Subsequent calls reuse tokens without browser re-auth until they expire
