# Home Close

Household "month-end close": track recurring bills (utilities, mobile, internet, credit cards,
installment loans) and debit accounts, record monthly expenses and payments, and reconcile each
account against its bank balance.

Design source of truth: `design/home-close-prototype.html`. Match its screens, flows and theme
settings. Treat its sample data as fixtures only.

## Stack (fixed)

- **MongoDB** with **Mongoose** for schemas and validation.
- **Express** REST API on **Node.js** (current LTS).
- **React** single-page app built with **Vite**. Client-side rendering only: **no SSR**, no
  server components, no Next.js or Remix.
- **React Router v7**. Import from `react-router` only, **never `react-router-dom`**. Use data
  mode (`createBrowserRouter` + `RouterProvider`), not framework mode.
- **TypeScript** in both client and server.
- Tests: **Vitest** (client and server), **React Testing Library**, **Supertest** for the API.

## Guardrails

- Do not add a framework, library or service unless the task cannot reasonably be done with what
  is already here. If a new dependency is needed, explain why in the PR and keep it small.
- No state-management library to start. Use React state, context and router loaders/actions.
- No CSS framework or component library. Use the CSS custom properties from the prototype.
- No cloud-specific SDKs or services in app code. The app must run unchanged on AWS, GCP or Azure.
- Config comes only from environment variables (validated at startup). Never commit secrets.
  Keep `.env.example` up to date.
- CI/CD is not decided yet. Don't add pipeline files. Keep every check runnable via npm scripts.

## Repo layout - can be modified with human approval only

```
client/      React SPA (Vite)
  src/routes/       one module per route (loader, action, component)
  src/components/   shared UI (StatusPill, Drawer, Modal, MoneyInput, ...)
  src/api/          typed fetch wrappers for the REST API
  src/theme/        tokens.css (light + dark), base styles
server/      Express API
  src/routes/       routers, one per resource
  src/controllers/  request/response handling only
  src/services/     business logic (close, reconciliation, bill cycles)
  src/models/       Mongoose models
  src/middleware/   auth, validation, error handling
infra/       Terraform (see below)
design/      prototype and design notes (read-only reference)
```

npm workspaces at the root. Shared types live in `shared/` only if both sides need them.

## Domain rules

- **Money is stored and computed as integer cents.** Format only at the UI edge. Never use floats.
- Dates are ISO `YYYY-MM-DD` strings for statement, due, paid and posted dates. A close period is
  `YYYY-MM`.
- A **Bill** (biller) has one or more service lines (e.g. LADWP: electricity, water, trash pickup).
  A **Statement** stores an amount per line, and its total is the sum of those lines.
- Bill frequency: monthly, every 2 months (with an odd/even-month cycle) or quarterly. A bill that
  isn't billed in a given period is shown as off-cycle, not as missing.
- Each bill has its own statement day and due rule: a fixed day of the month, or N days after the
  statement.
- A close period contains the bills **due** in that month.
- Statuses move in this order: awaiting statement → entered → scheduled → paid. Recording a payment
  creates a transaction in the paying account.
- Reconciliation difference = bank balance − (opening balance + cleared transactions). Sign-off is
  allowed only when the difference is 0. A signed-off period is read-only until it is reopened.
- Domain logic lives in `server/src/services` as pure, unit-tested functions.

## API conventions

- REST, JSON, under `/api/v1`. Plural resources: `/accounts`, `/bills`, `/periods/:period/items`,
  `/transactions`, `/reconciliations`.
- Validate every request body and query at the route boundary. Return `400` with field errors.
- Errors share one shape: `{ error: { code, message, fields? } }`. No stack traces in responses.
- Every query is scoped to the authenticated household. Never trust a `householdId` sent by the
  client.
- Auth (v0): the login and sign-up UI exist, but the API uses a stub session middleware. Keep the
  middleware interface so real auth can replace it later.

## Frontend conventions

- Function components and hooks only. One route = one folder.
- Load data in route `loader`s and change it in route `action`s. Avoid fetch-in-`useEffect`.
- Components stay presentational. API calls go through `src/api`.
- Accessibility: label every input, make every action keyboard reachable, keep visible focus.
- Support light and dark themes through tokens only. No hard-coded colors in components.

## Infrastructure (Terraform)

- **All** infrastructure and cloud resources are defined in Terraform under `infra/`. No changes
  made by hand in a cloud console. If something was changed manually, import or codify it.
- The cloud provider (AWS, GCP or Azure) is not chosen yet. Keep the app container-based and
  provider-neutral, with a `Dockerfile` for `server/` and a static build for `client/`.
- Layout: `infra/modules/` (reusable), `infra/envs/{dev,staging,prod}/` (thin roots).
- Use remote state with locking. Pin Terraform and provider versions. No secrets in `.tf` or
  `.tfvars`: use the provider's secret manager, referenced by Terraform.
- Run `terraform fmt` and `terraform validate` before any infra change is considered done.

## Quality bar

- Before finishing any task, run `npm run lint`, `npm run typecheck` and `npm test` and make sure
  all three pass.
- Add or update tests with every change to services, API routes or route loaders/actions.
- Keep each PR to one concern. Don't reformat or refactor unrelated code.
- If the prototype and these rules conflict, follow these rules and flag the conflict.

## Git Flow
- main is the production branch.
- develop is the default working branch.
- All feature branches start from develop.

For each task/feature:
1. Ask if new feature branch should be created. If yes, create feat/NNN-brief-feature-name from develop, where NNN is the zero-padded sequentially incremented task number.
2. Implement and test the task on that branch.
3. When complete, stage the changes and draft a commit message in single line format beginning with the task number (for example, 003: implement Tree-sitter predicates). Ask for approval before committing.
4. After commit approval, commit the changes. Ask for approval before pushing.
5. After push, prompt: "Please create a PR feat/NNN-... → develop in GitHub, review it, and let me know when it's merged."
6. After the merge is explicitly confirmed, run:
git switch develop
git pull origin develop
7. Never delete local branches. Never commit, push, or switch branches without explicit approval at that step.
