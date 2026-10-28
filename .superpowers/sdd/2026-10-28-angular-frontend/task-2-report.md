# Task 2 report: Auth, roles, and app shell

## Status

Implemented Task 2 in the `angular-frontend` worktree. The legacy root `index.html` is unchanged. No Supabase schema, Auth configuration, RLS policy, RPC, credential, or sensitive data changes were made.

## Files changed

- `frontend/src/app/core/auth/auth.service.ts` — session restoration from `getSession().data.session.user`, sign-in using returned `data.user`, profile-role lookup from `perfiles.rol`, sign-out, visible errors and local auth state.
- `frontend/src/app/core/auth/auth.service.spec.ts` — login, restore, missing session, invalid credentials, profile failure, logout, and no-`getUser()` prerequisite tests.
- `frontend/src/app/features/login/login.component.{ts,html,css}` — Spanish login gate, accessible errors, busy button, preserves password after errors and clears only after full success.
- `frontend/src/app/features/login/login.component.spec.ts` — login error/busy and password handling tests.
- `frontend/src/app/layout/app-shell.component.{ts,html,css}` — five reference tabs and labels, fragment synchronization/default, login gate, admin-only controls, logout, existing in-memory theme toggle, and feature integration placeholder slots.
- `frontend/src/app/layout/app-shell.component.spec.ts` — five fragments, unknown-fragment fallback, gate, role-based controls, labels/logout, and theme toggle tests.
- `frontend/src/app/app.ts`, `frontend/src/app/app.html`, `frontend/src/app/app.spec.ts` — initialize auth at app startup and render the shell; update root component test.
- `frontend/src/styles.css` — shared theme tokens and base styling matching the existing visual design.

`frontend/src/app/app.config.ts` was left unchanged: the shell uses the approved route-independent access gate, so no router configuration is required for this task. There is no separate `auth.guard.ts`; access is gated by the shell and covered by shell tests.

## TDD and verification

Auth tests were written before `AuthService`. First RED command:

```text
npm.cmd test -- --watch=false --include="src/app/core/auth/auth.service.spec.ts"
```

It failed at Angular compilation because `./auth.service` did not exist. Task 1 had supplied no AuthService skeleton, so a missing-session assertion could not run against an existing initial implementation. After implementation, the focused suite exposed one case-sensitive expectation mismatch in the test (`correo` vs the displayed `Correo`); the assertion was corrected to match the intended Spanish message. Auth focused suite then passed: **1 file, 6 tests passed**.

The theme behavior was also tested first: its new shell test failed because clicking the existing theme button did not toggle the theme; the shell implementation was then added.

Final verification from `frontend/`:

```text
npm.cmd test -- --watch=false
Test Files  5 passed (5)
Tests       20 passed (20)
```

```text
npm.cmd run build
Application bundle generation complete.
Output location: ...\frontend\dist\frontend
```

```text
npm.cmd exec -- prettier --check [changed Angular source/test files]
All matched files use Prettier code style!
```

`git diff --check` passed. `git diff --exit-code -- index.html` passed; only expected Windows LF-to-CRLF working-copy warnings were printed.

## Self-review / concerns

- Role visibility is fail-closed: only `admin` gets the “Nuevo producto” and tariff controls; a missing/failed profile does not grant a role. Server authorization remains Supabase RLS.
- Auth only calls `getSession()` for restoration and uses its `session.user`; login uses the returned `data.user`. Neither path has a redundant `getUser()` call.
- Stale/missing session and profile failures return to the login gate with a visible Spanish message. Invalid credentials remain visible and do not clear the entered password.
- The five feature areas intentionally contain placeholder integration slots; feature behavior and data operations are not duplicated here and remain for Tasks 3+.
- No live Supabase/E2E test was run; the task's requested unit tests and static production build were run. Integration against the actual project remains unverified in this task.
- The theme button behavior is preserved. The “Nuevo producto” and tariff area are role-specific shell integration points, not implemented feature workflows.
