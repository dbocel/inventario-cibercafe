# GitHub Pages Deployment Implementation Plan

> **For agentic workers:** Use the approved GitHub Pages deployment plan task-by-task. Keep the production branch history and remote content; never force-push.

**Goal:** Publish the verified Angular frontend as a static GitHub Pages site for `dbocel/inventario-cibercafe`.

**Architecture:** The remote `main` history is integrated without force-push, preserving its README and the current local root `index.html`. GitHub Actions was attempted but the account is billing-locked; the approved fallback is a manual orphan `gh-pages` branch containing only `frontend/dist/frontend/browser/` and `.nojekyll`. The owner selects that branch as the Pages source; the root legacy app and source tree are not deployed.

**Tech Stack:** Git, GitHub Pages branch publishing, Node.js 24, Angular CLI, npm.

**Spec:** `docs/superpowers/specs/2026-10-28-angular-frontend-design.md`; Phase 5 of `plan de implementacion/PLAN_inventario_funcional.md`.

## Global Constraints

- Publish only static Angular build output; do not deploy the root legacy `index.html`.
- Keep Supabase Auth, schema, RPC, and RLS unchanged; never add `service_role`, PAT, passwords, or credential-bearing tests to GitHub.
- Do not publish Excel/CSV business data or `Inventario.pdf`.
- Do not force-push; preserve the remote `main` branch content and history.
- Use Node.js 24 for the Angular CLI toolchain and run tests before build/deploy.
- Publish a clean orphan `gh-pages` branch with static browser artifacts only; future deployments are manual until Actions billing is restored.
- Keep the local uncommitted `frontend/angular.json` telemetry change unstaged unless separately authorized; do not stage unrelated `Inventario.pdf`.
- Production Pages URL: `https://dbocel.github.io/inventario-cibercafe/`; build artifacts use relative `./` base paths.

## Review Focus

- Remote history is unrelated to the local repository: merge its `main` safely, preserving both histories and resolving only the expected legacy `index.html` conflict in favor of the current local version; verify the remote README remains.
- The deployment artifact must be Angular's `browser/` directory, not `dist/` parent or root legacy HTML; verify uploaded artifact contents.
- The `gh-pages` branch must contain only the Angular browser build and `.nojekyll`, never source, dependencies, or business data.
- Pages settings must use branch `gh-pages`, folder `/(root)`; the owner must make this UI change because GitHub Pages API reports no site and no authenticated GitHub API tool is available.
- Supabase redirect allowlist should include the Pages URL if Auth redirect flows need it; don't modify Supabase credentials/settings silently—document the URL or request dashboard access if direct configuration is unavailable.

---

### Task 1: Add the static GitHub Pages build/deploy workflow

**Files:**
- Create: `.github/workflows/deploy-pages.yml`
- Modify: `frontend/README.md` with workflow, URL, and Supabase redirect-allowlist handoff.

**Interfaces:**
- Trigger on pushes to remote `main` and manual `workflow_dispatch`.
- Build working directory: `frontend/`; artifact path: `frontend/dist/frontend/browser/`.
- Run `npm ci`, `npm test -- --watch=false`, and `npm run build` on Node 24 before uploading/deploying.

- [ ] Validate workflow YAML and review permissions: `contents: read`, `pages: write`, `id-token: write`; use the official Pages artifact/deploy actions; do not add secrets.
- [ ] Run local test/build and verify `frontend/dist/frontend/browser/index.html` references relative assets.
- [ ] Confirm the workflow artifact path excludes source, real data, node_modules, and the root legacy app.

### Task 2: Connect and integrate remote history without publishing

**Files:**
- Git configuration: add `origin` as `https://github.com/dbocel/inventario-cibercafe.git`.
- Git history: integrate remote `main` into local `master` without force-push; preserve remote README and current root `index.html`.

**Interfaces:**
- Add `origin` and merge `origin/main` into the feature branch with an unrelated-history merge (remote starts at `f155a944`); never use `--force`.
- Deployment URL: `https://dbocel.github.io/inventario-cibercafe/`.

- [ ] Fetch and inspect remote `main`; resolve only expected content conflicts while preserving both histories and the remote README.
- [ ] Verify merge result and root `index.html`/README contents; do not push in this task.

### Task 3: Prepare the manual branch-publishing handoff

**Files:**
- Delete: `.github/workflows/deploy-pages.yml` (GitHub Actions is blocked by the account billing lock and the user chose manual branch publishing).
- Modify: `frontend/README.md`, root `README.md`, and `AGENTS.md` to document the manual `gh-pages` process and exact output folder.
- Prepare: the exact static artifact contents and security audit for a separate orphan `gh-pages` branch; do not push in this task.

**Interfaces:**
- The source branch contains both local project history and `origin/main`.
- The intended Pages tree is only `frontend/dist/frontend/browser/` plus `.nojekyll`; `gh-pages` was confirmed absent.
- This task is local only; no push or Pages setting change.

- [ ] Remove the ineffective Actions workflow and update README/AGENTS with the manual branch publishing procedure and exact Pages settings.
- [ ] Run tests/build/audit; prepare and audit only the static browser artifact plus `.nojekyll`. Stage no PDF, telemetry change, source tree, or dependencies.

### Task 4: Push reviewed source and static branch, then verify Pages

**Files:**
- Remote operations only: push source history to `main` and static artifact to `gh-pages`; configure Pages source via the owner UI if not already changed.

**Interfaces:**
- Push source branch to `origin main` as a fast-forward; push the orphan artifact commit to `origin gh-pages` without force.
- Pages source must be branch `gh-pages`, folder `/(root)`.

- [ ] Confirm both remote branch tips immediately before push; stop if either moved unexpectedly.
- [ ] Push both authorized branches; verify the GitHub Pages deployment under `/inventario-cibercafe/` serves Angular and all local assets.
- [ ] Verify the five hash tabs and leave the root `index.html` unchanged.
- [ ] Fast-forward local `master` to the pushed source commit without staging unrelated working-tree files.
- [ ] Provide the owner the Supabase Auth URL to allowlist: `https://dbocel.github.io/inventario-cibercafe/`; if dashboard access is not available, leave this as an explicit manual step rather than altering auth settings through an unverified credential.

## Publication boundary

The owner has authorized connecting and publishing to this repository. No force-push, repository visibility change, Supabase credential change, backend/RLS modification, or deletion of unrelated local files is authorized.
