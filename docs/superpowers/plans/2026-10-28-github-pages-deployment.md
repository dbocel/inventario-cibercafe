# GitHub Pages Deployment Implementation Plan

> **For agentic workers:** Use the approved GitHub Pages deployment plan task-by-task. Keep the production branch history and remote content; never force-push.

**Goal:** Publish the verified Angular frontend as a static GitHub Pages site for `dbocel/inventario-cibercafe`.

**Architecture:** GitHub Actions builds/tests `frontend/` and deploys only `frontend/dist/frontend/browser/` through the Pages artifact workflow. The remote already has a `main` branch with a README and legacy `index.html`; integrate its history without force-push, preserve the remote README and the current local root `index.html`, and publish Angular from the workflow artifact rather than the repository root.

**Tech Stack:** GitHub Actions, `actions/configure-pages`, `actions/upload-pages-artifact`, `actions/deploy-pages`, Node.js 24, Angular CLI, npm.

**Spec:** `docs/superpowers/specs/2026-10-28-angular-frontend-design.md`; Phase 5 of `plan de implementacion/PLAN_inventario_funcional.md`.

## Global Constraints

- Publish only static Angular build output; do not deploy the root legacy `index.html`.
- Keep Supabase Auth, schema, RPC, and RLS unchanged; never add `service_role`, PAT, passwords, or credential-bearing tests to GitHub.
- Do not publish Excel/CSV business data or `Inventario.pdf`.
- Do not force-push; preserve the remote `main` branch content and history.
- Use Node.js 24 for the Angular CLI toolchain and run tests before build/deploy.
- Keep the local uncommitted `frontend/angular.json` telemetry change unstaged unless separately authorized; do not stage unrelated `Inventario.pdf`.
- Production Pages URL: `https://dbocel.github.io/inventario-cibercafe/`; build artifacts use relative `./` base paths.

## Review Focus

- Remote history is unrelated to the local repository: merge its `main` safely, preserving both histories and resolving only the expected legacy `index.html` conflict in favor of the current local version; verify the remote README remains.
- The deployment artifact must be Angular's `browser/` directory, not `dist/` parent or root legacy HTML; verify uploaded artifact contents.
- A failed test/build must block deployment; workflow must not deploy on failed jobs.
- Pages settings may require Actions source enablement; document/perform only the specific repository setting necessary, without changing visibility or unrelated settings.
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

### Task 2: Connect the existing repository and publish without overwriting remote history

**Files:**
- Git configuration: add `origin` as `https://github.com/dbocel/inventario-cibercafe.git`.
- Git history: integrate remote `main` into local `master` without force-push; preserve remote README and current root `index.html`.
- GitHub Pages: configure source as GitHub Actions only if the repository setting is required for the workflow.

**Interfaces:**
- Push local `master` to remote `main` after an unrelated-history merge (remote starts at `f155a944`); never use `--force`.
- Deployment URL: `https://dbocel.github.io/inventario-cibercafe/`.

- [ ] Fetch and inspect remote `main`; resolve only expected content conflicts while preserving both histories and the remote README.
- [ ] Run final tests/build/audit on the integrated tree; stage only deployment workflow, README, and explicitly intended merge files—exclude `Inventario.pdf` and the uncommitted Angular analytics change.
- [ ] Push to `origin main`; verify the GitHub Actions workflow completes and the Pages URL serves the Angular app, all assets, and five hash tabs.
- [ ] Provide the owner the Supabase Auth URL to allowlist: `https://dbocel.github.io/inventario-cibercafe/`; if dashboard access is not available, leave this as an explicit manual step rather than altering auth settings through an unverified credential.

## Publication boundary

The owner has authorized connecting and publishing to this repository. No force-push, repository visibility change, Supabase credential change, backend/RLS modification, or deletion of unrelated local files is authorized.
