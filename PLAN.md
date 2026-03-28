# henry_VPN — Developer Privacy Toolkit · Plan

## TL;DR

Build a polyglot monorepo that packages four complementary privacy/proxy approaches
into a unified developer toolkit:

1. Self-hosted WireGuard VPN (bash + Makefile)
2. AWS Lambda rotating proxy (TypeScript + CDK)
3. Residential proxy agent wrappers with TLS impersonation (TypeScript)
4. Playwright stealth browser with WebRTC leak controls (TypeScript + puppeteer-extra)

All four are surfaced through a single `henry-vpn` CLI.

---

## Monorepo Layout

```text
henry_VPN/
├── packages/
│   ├── wireguard/          # bash + Makefile + WG config templates
│   ├── lambda-proxy/       # TypeScript Lambda handler + CDK infra
│   ├── residential-proxy/  # TypeScript proxy wrappers + TLS impersonation
│   ├── stealth-browser/    # TypeScript Playwright + stealth plugin
│   └── cli/                # Unified CLI (commander)
├── .gitignore              # *.conf, keys/, profiles/, .env excluded
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .env.example
└── PLAN.md                 ← this file
```

---

## Phase 1 — Repo Scaffold & Shared Tooling

| #   | File / Action         | Detail                                                                  |
| --- | --------------------- | ----------------------------------------------------------------------- |
| 1   | `pnpm-workspace.yaml` | Lists all five `packages/*`                                             |
| 2   | `.gitignore`          | Excludes `*.conf`, `keys/`, `profiles/`, `.env`, `wg0.conf`, `clients/` |
| 3   | `tsconfig.base.json`  | Strict TypeScript settings inherited by all TS packages                 |
| 4   | `.env.example`        | Documents every cross-package env var in one place                      |

---

## Phase 2 — WireGuard Package (`packages/wireguard/`)

| #   | File                                      | Detail                                                                                                                   |
| --- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 5   | `provision/wireguard-install.sh`          | Wraps **angristan/wireguard-install** with non-interactive env vars; sets `umask 077` before key generation              |
| 6   | `Makefile`                                | Targets: `add-peer NAME=`, `revoke-peer NAME=`, `status`, `up`, `down`                                                   |
| 7   | `scripts/kill-switch.sh`                  | Applies host firewall rules so outbound traffic is blocked unless it goes through `wg0` or to the WireGuard VPS endpoint |
| 8   | `configs/.gitkeep` + `configs/.gitignore` | Placeholder dir; excludes generated `*.conf` and `keys/` material                                                        |
| 9   | `docs/setup.md`                           | Step-by-step: rent VPS → run provision script → enable kill-switch → download client `.conf`                             |

**Security considerations**

- `umask 077` before `wg genkey` — private keys never world-readable
- `PostUp` iptables rules in server template for DNS leak prevention
- Kill-switch rules block all outbound traffic unless it uses `wg0` or reaches the WireGuard VPS directly
- `DNS = 1.1.1.1` hardcoded in client template; block non-tunnel DNS with iptables
- `PersistentKeepalive = 25` — required for clients behind NAT
- IPv6 dual-stack (`Address = 10.66.66.1/24, fd42:42:42::1/64`) from day one

---

## Phase 3 — Lambda Proxy Package (`packages/lambda-proxy/`)

| #   | File                 | Detail                                                                                                                                                                             |
| --- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 10  | `src/handler.ts`     | Lambda entry: receives `{ targetUrl, method, headers, body }`, calls SSRF guard, forwards via the selected outbound transport                                                      |
| 11  | `src/ssrf-guard.ts`  | Blocks all RFC-1918 addresses (`10.x`, `172.16.x`, `192.168.x`, `169.254.x`) and validates target URL                                                                              |
| 12  | `src/rotator.ts`     | Region-hopping rotator that round-robins requests across `us-east-1`, `eu-west-1`, `ap-southeast-1`, and similar regions; self-invoke/cold starts are a secondary spread mechanism |
| 13  | `infra/cdk/stack.ts` | `NodejsFunction` (esbuild) + `FunctionUrl` with `AuthType: AWS_IAM`; **no VPC**                                                                                                    |

**Key dependencies**: `axios`, `@aws-sdk/client-lambda`, `aws-cdk-lib`, `@types/aws-lambda`

**Security considerations**

- SSRF guard is mandatory — no bypassing RFC-1918 ranges
- `FunctionUrl` uses `AuthType: AWS_IAM` — never left open
- No VPC attachment — VPC kills IP diversity and undermines the rotation strategy
- Region hopping is required because AWS warm reuse can keep traffic on the same micro-VM and IP for minutes
- CloudWatch budget alarm to cap costs
- Lambda timeout: 15 s (API Gateway hard limit: 29 s)
- Response streaming (`InvokeWithResponseStream`) for payloads larger than 6 MB

---

## Phase 4 — Residential Proxy Package (`packages/residential-proxy/`)

| #   | File                  | Detail                                                                                                                     |
| --- | --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| 14  | `src/proxy-agent.ts`  | Builds proxy-aware transport from `HTTP_PROXY` env vars and selects a browser-like TLS client for outbound requests        |
| 15  | `src/session.ts`      | Constructs Bright Data / Oxylabs session username: rotating vs. sticky + optional geo suffix (`country-US`, `city-london`) |
| 16  | `src/client.ts`       | Wrapper that uses `got-scraping` or `curl-impersonate`-style transport so JA3/TLS characteristics match a real browser     |
| 17  | `config/.env.example` | `HTTP_PROXY`, `HTTPS_PROXY`, `NO_PROXY`, `PROXY_SESSION_TTL`, `PROXY_GEO`, `TLS_IMPERSONATION_PROFILE`                     |

**Key dependencies**: `https-proxy-agent`, `http-proxy-agent`, `proxy-from-env`, `got-scraping` or `curl-impersonate`, `dotenv`

**Security considerations**

- Proxy credentials in environment variables only — never hardcoded
- Direct Node.js TLS is insufficient for sensitive targets; outbound requests must use browser-like TLS impersonation to avoid JA3 mismatches
- `rejectUnauthorized` is never disabled — TLS to the target site stays verified
- `NO_PROXY` for internal addresses is mandatory (prevents credential leakage to internal services)
- Rotate sub-user credentials per project/environment via provider dashboard

---

## Phase 5 — Stealth Browser Package (`packages/stealth-browser/`)

| #   | File                     | Detail                                                                                                                                                                                                                     |
| --- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 18  | `src/browser-factory.ts` | `playwright-extra` chromium with stealth plugin; `channel: 'chrome'` (real binary); `headless: 'new'`                                                                                                                      |
| 19  | `src/stealth-context.ts` | `BrowserContext` with correlated fingerprint (locale/timezone/screen) via `@apify/fingerprint-suite`; proxy auth routed through `proxy-chain` on localhost; WebRTC constrained with `rtcConfiguration: { iceServers: [] }` |
| 20  | `src/page-runner.ts`     | Navigation + action orchestration; blocks images/fonts/stylesheets via `context.route()` for speed; `serviceWorkers: 'block'` when route-intercepting                                                                      |
| 21  | `profiles/`              | Gitignored; stores `storageState` JSON (cookies/localStorage) for session persistence                                                                                                                                      |

**Key dependencies**: `playwright`, `playwright-extra`, `puppeteer-extra-plugin-stealth`, `@apify/fingerprint-suite`, `fingerprint-injector`, `proxy-chain`

**Security considerations**

- Always pair stealth with a residential proxy — datacenter IP + stealth is still flagged by IP reputation
- Fingerprint consistency: locale, timezone, screen resolution, and user-agent must be internally correlated per session
- WebRTC/STUN must be disabled or constrained to the proxy path to prevent local/private IP leakage from inside the tunnel
- `serviceWorkers: 'block'` when using `context.route()` — service workers bypass route handlers
- `proxy-chain` runs as a local authenticated proxy bridge so Playwright only sees localhost proxy settings and credentials never appear in process arguments
- `headless: 'new'` significantly harder to detect than legacy headless mode
- `storageState` persisted between sessions improves reCAPTCHA v3 score over time

---

## Phase 6 — Unified CLI (`packages/cli/`)

| #   | File                     | Detail                                                                          |
| --- | ------------------------ | ------------------------------------------------------------------------------- |
| 22  | `src/commands/wg.ts`     | `wg up \| down \| add-peer \| status` — shells out to WireGuard Makefile        |
| 23  | `src/commands/proxy.ts`  | `proxy test \| rotate` — invokes Lambda rotator or residential client           |
| 24  | `src/commands/browse.ts` | `browse <url> [--proxy residential\|lambda]` — launches stealth browser session |
| 25  | `src/index.ts`           | `commander` entry point; reads `.env` via `dotenv`                              |

**Key dependencies**: `commander`, `chalk`, `dotenv`

---

## Files to Create

```text
# Root
pnpm-workspace.yaml
.gitignore
tsconfig.base.json
.env.example

# WireGuard
packages/wireguard/provision/wireguard-install.sh
packages/wireguard/Makefile
packages/wireguard/scripts/kill-switch.sh
packages/wireguard/configs/.gitkeep
packages/wireguard/docs/setup.md

# Lambda Proxy
packages/lambda-proxy/src/handler.ts
packages/lambda-proxy/src/ssrf-guard.ts
packages/lambda-proxy/src/rotator.ts
packages/lambda-proxy/infra/cdk/stack.ts
packages/lambda-proxy/package.json
packages/lambda-proxy/tsconfig.json

# Residential Proxy
packages/residential-proxy/src/proxy-agent.ts
packages/residential-proxy/src/session.ts
packages/residential-proxy/src/client.ts
packages/residential-proxy/config/.env.example
packages/residential-proxy/package.json
packages/residential-proxy/tsconfig.json

# Stealth Browser
packages/stealth-browser/src/browser-factory.ts
packages/stealth-browser/src/stealth-context.ts
packages/stealth-browser/src/page-runner.ts
packages/stealth-browser/profiles/.gitkeep
packages/stealth-browser/package.json
packages/stealth-browser/tsconfig.json

# CLI
packages/cli/src/index.ts
packages/cli/src/commands/wg.ts
packages/cli/src/commands/proxy.ts
packages/cli/src/commands/browse.ts
packages/cli/package.json
packages/cli/tsconfig.json
```

---

## Verification Checklist

- [ ] `pnpm install` from root resolves all workspaces without conflicts
- [ ] `pnpm --filter lambda-proxy build` — TypeScript compiles with zero errors
- [ ] `pnpm --filter residential-proxy test` — proxy agent correctly reads `HTTP_PROXY` and constructs session URL
- [ ] TLS check: run a residential-proxy request against `https://ja3er.com/json` and confirm the JA3 fingerprint matches a browser profile rather than default Node.js
- [ ] `pnpm --filter stealth-browser test` — Playwright launches, stealth plugin attaches, navigates to `https://bot.sannak.de` and outputs a clean detection score
- [ ] WebRTC check: run `henry-vpn browse https://browserleaks.com/webrtc` and confirm private/local IP values are hidden
- [ ] `cdk deploy` for lambda-proxy — invoke via `curl` with IAM auth, confirm 200 response and cross-region IP diversity in CloudWatch logs
- [ ] WireGuard: `wg show` on VPS shows active peer handshake; `curl ifconfig.me` through the tunnel returns VPS IP
- [ ] Kill-switch test: manually bring down `wg0` and verify `curl https://google.com` times out instead of falling back to the ISP route

---

## Key Decisions

| Decision          | Choice                                             | Reason                                                               |
| ----------------- | -------------------------------------------------- | -------------------------------------------------------------------- |
| Monorepo tool     | pnpm workspaces                                    | Lightweight; no Nx/Turborepo overhead for this scale                 |
| Lambda IaC        | AWS CDK (TypeScript)                               | Type-safe; consistent with TS stack; no YAML                         |
| CLI framework     | `commander`                                        | Minimal; no codegen overhead vs `oclif`                              |
| TLS impersonation | `got-scraping` first, `curl-impersonate` if needed | Better browser-like JA3 than default Node transport                  |
| Tor integration   | Excluded                                           | Out of scope for personal tooling; adds significant OpSec complexity |
| Mobile clients    | Excluded                                           | WireGuard mobile apps (iOS/Android) handle this natively             |
| Multi-user/SaaS   | Excluded                                           | Personal toolkit only                                                |

---

## Security Rules (Non-Negotiable)

1. **No keys or credentials in git** — `*.conf`, `keys/`, `profiles/`, `.env` are gitignored at the root level.
2. **SSRF protection on every HTTP-forwarding path** — RFC-1918 blocklist is enforced in `ssrf-guard.ts`.
3. **TLS never downgrades to default Node behavior for sensitive targets** — use browser-like impersonation where the target inspects JA3/TLS fingerprints.
4. **No open endpoints** — Lambda `FunctionUrl` requires IAM auth; WireGuard port (UDP 51820) is the only open inbound port on the VPS.
5. **WireGuard clients must fail closed** — if `wg0` drops, outbound traffic is blocked rather than leaking to the ISP path.
6. **Principle of least privilege** — Lambda execution role has no permissions beyond CloudWatch Logs; VPS user is non-root after provisioning.
