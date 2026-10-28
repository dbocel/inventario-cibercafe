# Task 1 report — Isolated Angular static app scaffold

## Status

Implemented Task 1 in `frontend/`. The root `index.html` is unchanged. No database, RPC, RLS, or existing Supabase behavior was modified.

## Files changed

- `frontend/` — Angular standalone CLI workspace, CSS styling, generated Vitest unit-test support, npm scripts and lockfile.
- `frontend/src/index.html` — Spanish Guatemala document language, `Internet K-ROL` title, and relative `<base href="./">` for project-path hosting.
- `frontend/src/app/app.html`, `app.ts`, `app.spec.ts` — small Spanish placeholder shell and corresponding generated app test.
- `frontend/src/environments/environment.ts` — only the existing Supabase project URL and public anon key.
- `frontend/src/app/core/supabase/supabase-client.service.ts` — root-provided singleton exposing a `SupabaseClient` created from the public environment values.
- `frontend/src/app/core/supabase/supabase-client.service.spec.ts` — singleton and client-configuration test.
- `.superpowers/sdd/2026-10-28-angular-frontend/task-1-report.md` — this report.

## Commands and verification

Run from `frontend/` unless noted:

1. `npm.cmd install` — completed; installed 281 packages. NPM reported two audit vulnerabilities (one low and one high) and install-script approval notices.
2. `npm.cmd run build` before app behavior/service — exit 0; initial static bundle emitted under `frontend/dist/frontend`.
3. Added `@supabase/supabase-js@^2.99.0`; npm lockfile pins the selected dependency graph.
4. `npm.cmd test -- --watch=false` before service implementation — expected RED: Angular could not resolve `./supabase-client.service` and could not type the service injection.
5. Implemented the service. `npm.cmd test -- --watch=false` — GREEN: 2 test files passed, 3 tests passed.
6. `npm.cmd run build` — exit 0; emitted static files under `frontend/dist/frontend/browser`.
7. Inspected generated `index.html`: it contains `<base href="./">` and relative `styles-…css` / `main-…js` references.
8. Scanned workspace sources (excluding dependencies/build caches) and the generated bundle for service-role key markers, PAT/GitHub-token patterns, and credential-like values. No private credential matches were found in source or output. The permitted public anon key remains in `environment.ts`; the optimized app bundle does not currently include this unused service.
9. `npm.cmd audit --omit=dev` — 0 vulnerabilities in production dependencies. Full `npm.cmd audit --json` reports two issues in development tooling: `@angular/build` (low, via Vite) and Vite (high), with the audit suggesting `@angular/build@22.1.9` as a fix.
10. `git diff -- index.html` — empty; root page unchanged.

## Self-review

- Service is provided in root scope and constructs exactly one client per service instance.
- Environment file contains only the stated public URL and anon key.
- App is standalone, static, and uses relative hosting paths; no SSR, API server, or service-role credential was added.
- Generated placeholder UI and document language are Spanish (`es-GT`).
- The service test checks repeated injection identity, URL/key configuration, and that the environment object has exactly the two permitted keys/values.
- No sensitive Excel/CSV, PAT, private Supabase key, or credential-bearing harness was added.

## Concerns

- At the initial implementation commit, full npm audit reported one low and one high severity issue in development/build tooling (Angular build/Vite); production dependency audit was clean. Resolution and post-fix audit results are recorded in the follow-up below.
- `npm install` warned that several optional dependency install scripts were not yet approved by this npm version; build and tests nevertheless completed successfully.

## Follow-up — 2026-10-28: resolve Vite audit finding

### Changes

- Root cause confirmed: `@angular/build@22.2.4` declares an exact dependency on vulnerable `vite@8.3.0`; Angular 22.2.4 was otherwise aligned with the rest of the Angular CLI/framework packages.
- Tried the smallest lockfile operation first: `npm.cmd dedupe`. It did not resolve the finding; it unified Vite to `8.3.0` (still within the vulnerable range), and audit continued to report two findings.
- Added a scoped npm override in `frontend/package.json` for only `@angular/build`'s Vite dependency, selecting patched `vite@8.3.5`. `npm.cmd install` updated the lockfile. No Angular package versions or app behavior changed.
- The verified dependency tree retains `@angular/build@22.2.4`, `@angular/cli@22.2.4`, and Angular framework `22.2.3`, with one resolved Vite `8.3.5` marked `overridden`; there is no vulnerable `8.3.0` copy.

### TDD applicability

TDD was not applicable to this dependency-resolution-only change: no application code or behavior changed. The dependency graph was directly verified, then the requested unit tests and production build were run as compatibility checks.

### Verification

From `frontend/` after applying the override:

- `npm.cmd ls @angular/build @angular/cli @angular/core vite --all` — confirms the existing Angular versions remain intact and all Vite edges resolve to `8.3.5`.
- `npm.cmd test -- --watch=false` — exit 0; 2 test files and 3 tests passed.
- `npm.cmd run build` — exit 0; static production bundle emitted under `frontend/dist/frontend`.
- `npm.cmd audit --json` — exit 0; `vulnerabilities: {}` and totals `low: 0`, `moderate: 0`, `high: 0`, `critical: 0`, `total: 0`.

### Remaining concerns

- The scoped override intentionally replaces the exact Vite version pinned by `@angular/build`; the patched Vite minor/patch line satisfies Angular's other Vite peer constraints, and both the Angular tests and production build pass. Keep the override until a later Angular build release updates its own Vite pin, then re-check compatibility and audit before removing it.
- NPM continues to print optional install-script approval notices; they do not block installation, build, or tests.
