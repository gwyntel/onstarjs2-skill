# OnStarJS2 Skill

Control GM/OnStar vehicles (Chevrolet, GMC, Buick, Cadillac) via the unofficial OnStar API through the [onstarjs2](https://github.com/BigThunderSR/OnStarJS) npm package.

## Setup

```bash
cp .env.example .env
# Edit .env with your OnStar credentials
npm install   # auto-patches Linux GPU crash
```

### Required Credentials

| Variable | Description |
|----------|-------------|
| `DEVICEID` | UUID v4 (generate one, used to identify this client) |
| `VIN` | Your vehicle's VIN |
| `ONSTAR_USERNAME` | GM account email |
| `ONSTAR_PASSWORD` | GM account password |
| `ONSTAR_PIN` | 4-digit OnStar PIN |
| `ONSTAR_TOTPKEY` | 16-char TOTP secret from GM "Third-Party Authenticator App" setup |

**TOTP setup:** Change your GM account MFA to "Third-Party Authenticator App" (desktop browser only — option is hidden on mobile). Capture the TOTP key from the QR code setup link using an app like Stratum or Bitwarden that shows the raw key.

## Commands

All commands via `npm run <command>` or `node test.mjs <command>`:

### Read-only (safe, no vehicle action)

| Command | Description |
|---------|-------------|
| `vehicles` | List all vehicles on your OnStar account |
| `diagnostics` | Full vehicle health: battery, tire pressure, odometer, EV range |
| `location` | Current GPS location (lat/lng/geohash) |
| `ev-metrics` | EV charging metrics from GM's EVE API (SOC, plug state, range) |
| `ev-refresh` | Force-refresh live EV charging telemetry |
| `plan` | OnStar subscription plans and status |
| `recall` | Vehicle recall information |
| `warranty` | Warranty details and coverage |
| `sxm` | SiriusXM subscription info |

### Vehicle actions (will affect your car!)

| Command | Description |
|---------|-------------|
| `start` | Remote start engine |
| `cancel-start` | Cancel active remote start |
| `lock` | Lock all doors |
| `unlock` | Unlock all doors |
| `alert` | Flash lights + honk horn |
| `flash` | Flash lights only |
| `honk` | Honk horn only |

## ⚠️ PII Policy

**Never commit personally identifiable information to this repo or any skill.**

The following must ONLY live in `.env` (which is git-ignored):

| PII Type | Examples | Where it goes |
|----------|----------|---------------|
| VINs | `1G2ZF58B774109863` | `.env` → `VIN` |
| Device IDs | UUIDs | `.env` → `DEVICEID` |
| Account emails | `user@example.com` | `.env` → `ONSTAR_USERNAME` |
| Passwords | Any | `.env` → `ONSTAR_PASSWORD` |
| PINs | 4-digit numbers | `.env` → `ONSTAR_PIN` |
| TOTP keys | 16-char base32 | `.env` → `ONSTAR_TOTPKEY` |
| Account numbers | GM account #s | `.env` (or nowhere) |
| GPS coordinates | Lat/lng | Never in repo |
| Vehicle nicknames | Identifying names | `.env` (or nowhere) |

**If you find PII in any tracked file, remove it immediately and audit git history.**

## Architecture

```
test.mjs ──► onstarjs2 ──► GM Mobile API (na-mobile-api.gm.com)
                   │           ├── GraphQL: vehicles, details, plan, warranty, recall
                   │           ├── v1/v3: lock, unlock, start, alert, flash
                   │           └── Digital twin: location, diagnostics
                   │
                   └──► GM EVE API (eve-vcn.ext.gm.com)
                            ├── EV charging metrics
                            ├── Set charge level target
                            └── Stop charging
```

Auth: Patchright (Chromium) browser automation → GM Microsoft Entra ID OIDC → TOTP MFA → tokens cached locally.

## Linux GPU Crash Fix

On Linux containers/VMs without GPU, Chromium crashes during auth. The `postinstall` script patches `node_modules/onstarjs2/dist/index.mjs` to add `--disable-gpu` and `--disable-software-rasterizer` browser flags.

If you reinstall or update: `npm install` re-runs the patch automatically.

## ⚠️ Disclaimer

This uses an unofficial API and may violate GM's Terms of Service. Use at your own risk.
