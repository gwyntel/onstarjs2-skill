[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/gwyntel/onstarjs2-skill)

# OnStarJS2 Skill

Control GM/OnStar vehicles (Chevrolet, GMC, Buick, Cadillac) via the unofficial OnStar API through the [onstarjs2](https://github.com/BigThunderSR/OnStarJS) npm package.

## Install

## Install as an agent skill

Prerequisite: Node.js 22.20 or later.

This repository contains an Agent Skill at the repository root (`SKILL.md`). Install it into Hermes Agent with the Vercel Skills CLI:

```bash
npx skills add gwyntel/onstarjs2-skill --skill onstarjs2 --agent hermes-agent -g -y
```

To install for a different supported agent, replace `hermes-agent` with that agent's CLI name. This only installs the instructions; it does **not** configure OnStar credentials or authorize vehicle actions.

## Use

Ask the agent to load `onstarjs2` for OnStarJS2 setup, diagnostics, or commands. Read-only commands and vehicle actions are distinct; review the requested command carefully. Commands such as remote start, lock/unlock, alert, and charging control affect the vehicle. Keep credentials in the ignored `.env` file only, never in prompts or tracked files.

## Update the skill

For GitHub-source installs tracked by the Vercel Skills CLI:

```bash
npx skills update onstarjs2 -g -y
```

If the CLI cannot find the install record, reinstall from the repository with the `npx skills add` command above. To update a local clone installation, pull the repository changes and reinstall from that path.

## Troubleshooting

- If the CLI does not find the skill, ensure the repository root contains `SKILL.md` with valid YAML `name: onstarjs2` and a one-line `description`.
- If it does not appear in the agent, verify the selected `--agent` and installation path for that agent; for permission errors, ensure the target skill directory is writable.
- Skill installation does not install this project's npm dependencies or configure credentials. Follow the separate project setup below.

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
