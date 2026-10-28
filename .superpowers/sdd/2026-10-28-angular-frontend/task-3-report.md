# Task 3 implementation report

## Status

Implemented shared Supabase data loading, product creation/initial stock handling, dashboard, inventory, and history. Integrated those features into the matching shell slots. The legacy root `index.html` was not changed. No database, RPC, RLS, or credentials were changed.

## TDD evidence

- Added `inventory-data.service.spec.ts` first, covering all six reads and their relationship/order/limit selections, source-tagged failures, product inserts, duplicate codes, zero initial stock, positive initial stock via `registrar_movimiento`, and quick-sale movement RPC parameters.
- Initial RED command attempts uncovered two test setup issues before implementation: PowerShell blocks `npm.ps1` (used `npm.cmd` instead), and the first real compile showed the expected missing service module plus a TypeScript index-signature access error in the fake query builder. Corrected the test-only `then` access; the missing module remained the feature-absent failure that the new tests were designed to catch.
- Implemented the service and confirmed GREEN: `npm.cmd test -- --include=src/app/core/data/inventory-data.service.spec.ts` → **5 tests passed** at that stage.
- Added component tests for dashboard totals/low stock, inventory filtering/admin behavior/create/CSV messaging, history filtering/CSV messaging, and the RPC-based quick-sale contract.

## Verification

Commands executed from `frontend/`:

- `npm.cmd test -- --include=src/app/core/data` → **5 tests passed** (service focused).
- `npm.cmd test -- --include=src/app/core/data --include=src/app/features` → **15 tests passed** (focused features/data).
- `npm.cmd test` → **9 test files, 33 tests passed**.
- `npm.cmd run build` → production build passed; initial bundle 473.36 kB raw / 115.86 kB estimated transfer.
- `npx.cmd prettier --check` on all changed TypeScript, HTML, and CSS → all matched files use Prettier style.
- `git diff --check` → passed (only Windows LF-to-CRLF informational warnings for the edited shell files).

## Files

- Added `frontend/src/app/core/data/inventory-data.service.ts` and `.spec.ts`.
- Added dashboard, inventory, and history components, templates, styles, and tests under `frontend/src/app/features/`.
- Updated `frontend/src/app/layout/app-shell.component.ts`, `.html`, and `.css` to load shared data after authentication, provide retryable error/loading states, and render the three completed feature slots. The movements and cybercafé placeholders remain untouched.

## Self-review and concerns

- All reads use the existing authenticated `SupabaseClientService.client`; six failures surface the source and timeout after 15 seconds. No partial datasets are rendered.
- Product rows are inserted with the existing product columns; initial stock and quick sales use only `registrar_movimiento`. Duplicate-code errors retain the established Spanish message. UI creation is admin-only; database authorization remains with existing RLS.
- Dashboard totals/labels, inventory category/search/stock filters, history filter/search/date rendering, es-GT display formatting, and the CSV-download warning are represented and tested. Inventory offers quick sale through the same RPC behavior and reference as the existing quick-sale flow.
- No live Supabase requests or sensitive business data are used in tests.
- No known blockers. A read failure clears the view and requires retry rather than leaving stale partial data visible.
