# FIRECALC Security Backlog

## Purpose
This is a build-phase security backlog, not a stop-everything launch checklist.

The goal is to keep security in mind while the product is still evolving so we do not accidentally paint ourselves into a corner later. For now, the app is still a local-first product under active construction, and privacy is not being treated as the top priority. That means some items can wait, but a few should shape how we keep building.

## Working Rules During Build
1. Treat anything placed in the URL as effectively public.
2. Never let client-side account or Pro state become authoritative for any future server-side access.
3. Keep secrets and privileged config off the client. `NEXT_PUBLIC_*` should only hold non-sensitive values.
4. Put size and validation limits around any user-controlled input surface: URLs, imports, and future sync payloads.
5. If we add backend features later, they should be secure by default: authenticated, rate-limited, validated, and logged.

## Must Fix Before Public Launch
| Priority | Backlog item | Why it matters | Trigger |
|---|---|---|---|
| High | Stop automatic scenario syncing into the URL | Full financial scenarios should not silently end up in browser history, logs, support screenshots, or copied links. Sharing should be explicit. | Before any public launch |
| High | Add real security headers and CSP | The app currently lacks an explicit header posture. We should ship with CSP, anti-clickjacking protection, strict referrer policy, and `nosniff` at minimum. | Before any public launch |
| High | Replace preview auth and Pro access with real server-side auth and authorization | Current account and Pro access are local-preview only. That is fine for build phase, but not for any real paid or synced product. | Before any real auth, billing, or paid launch |
| High | Redesign cloud sync around trusted server validation | Any future remote sync needs server-issued sessions, entitlement checks, request validation, rate limiting, and origin controls. | Before enabling remote sync in production |
| Medium | Add size limits and safe-fail behavior for share/import flows | Malformed or oversized payloads should not be able to freeze the client or create unstable behavior. | Before public launch |
| Medium | Add middleware or route protection once server-backed features exist | If routes ever expose paid, user-specific, or synced data, access checks must happen on the server, not just in the UI. | Before server-backed protected features |
| Medium | Add production monitoring for security-relevant failures | We should know when auth fails, sync starts erroring, or malformed payloads spike. | Before public launch |

## Good To Tackle During Build
| Priority | Backlog item | Why it matters |
|---|---|---|
| Medium | Add a max length guard before decompressing `scenario` URL params | Prevents easy client-side abuse and keeps the share feature predictable |
| Medium | Add a file size limit and better error handling for JSON import | Prevents importing giant or malformed files from causing bad UX or crashes |
| Medium | Keep share actions explicit-only | Avoids future accidental regressions back toward silent URL leakage |
| Medium | Add CI security checks | `npm audit`, dependency update automation, and secret scanning should run automatically |
| Medium | Document an environment-variable policy | Makes it clear what can be public and what must stay server-only |
| Medium | Add schema versioning for import/export and sync payloads | Safer migrations, easier validation, fewer brittle parsing assumptions |
| Medium | Add tests for malformed and oversized inputs | Security-sensitive parsing paths should have regression coverage |
| Low | Review third-party charting and UI libraries during upgrades | Keeps supply-chain and browser-surface risk from drifting unnoticed |

## Lower Priority / Later
These are worth tracking, but they do not need to interrupt current product building:

- Encrypt local scenario data at rest in the browser if privacy becomes a stronger product promise later
- Encrypt remote sync payloads end-to-end if the sync model expands
- Move from query-parameter sharing to a more controlled signed or server-backed share system
- Add WAF, bot mitigation, or abuse-detection controls once public traffic and backend APIs exist
- Add more formal compliance and data-retention policies if the app becomes account-heavy

## Current Acceptable Build-Phase Assumptions
- Local-only scenario storage is acceptable while the app is still under active build
- Preview account state can stay local as long as it is never mistaken for real security
- Pro prompts can remain UX-only while there is no real protected backend
- Privacy hardening can stay below the line for now, but silent URL leakage should still be considered a design smell and avoided

## Known Code Areas To Revisit Later
- `next.config.ts`
- `src/lib/share/scenario-url.ts`
- `src/components/landing/quick-fire-workspace.tsx`
- `src/components/tax/tax-strategy-workspace.tsx`
- `src/components/withdrawal/historical-backtest-workspace.tsx`
- `src/components/dashboard/dashboard-workspace.tsx`
- `src/components/scenario-lab/scenario-lab-workspace.tsx`
- `src/lib/product/account.ts`
- `src/lib/product/cloud-sync.ts`
- `src/lib/db/database.ts`

## Simple Rule Of Thumb
While we are still building:

- UX previews can stay fake
- server trust cannot be fake
- anything in the URL should be assumed public
- anything coming from the user should be assumed untrusted
