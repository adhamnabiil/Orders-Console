# Orders Console

A small full-stack console for an operations team to search, filter, and create orders without duplicates. Built for the SARH take-home (Junior).

**Stack:** React + Vite + MUI + axios (frontend) · Express + Mongoose + MongoDB (backend) · TypeScript on both sides.

## Prerequisites

- Node.js 20+
- A local MongoDB instance listening on `mongodb://127.0.0.1:27017` (MongoDB 7+ / 9+)

## Setup (under five minutes)

### 1. Backend

```bash
cd backend
cp .env.example .env
npm install
npm run seed
npm run dev
```

API: `http://localhost:4000`

### 2. Frontend (second terminal)

```bash
cd frontend
npm install
npm run dev
```

UI: `http://localhost:5173` (Vite proxies `/api` → backend)

### Seeded logins

| Email | Password | Role |
| --- | --- | --- |
| `admin@example.com` | `admin123` | admin |
| `agent@example.com` | `agent123` | agent |

`npm run seed` drops and recreates users + **50,000** orders (deterministic via `faker.seed(42)`).

## Tests

```bash
# Backend (real MongoDB database `orders_console_test`)
cd backend
npm test

# Frontend (rapid-filter race test with MSW)
cd frontend
npm test
```

The backend suite includes the **R2 duplicate proof**: the same create request is fired 2× and 10× in parallel with one `Idempotency-Key`; exactly one order is stored.

## Features

### R1 — Large list that stays fast and correct

- Search by customer name or email (prefix match)
- Filter by status
- Sort by created date or amount
- Server-side `skip` / `limit` pagination with total count
- MUI table + `TablePagination` (never sends the full 50k rows to the browser)
- List fetching uses `AbortController` so a slow earlier response cannot overwrite a newer filter
- Covered by the frontend rapid-filter test (MSW delays responses so stale results would surface if cancellation failed)

### R2 — Create order without duplicates

- Line items are chosen from a fixed **product catalog** (same list in seed, API, and UI)
- Client sends only `productName` + `quantity` — never prices or totals
- Server resolves catalog prices, computes `totalCents`, and stores the snapshot on the order (used for list/sort)
- Client + server validation (zod)
- Required `Idempotency-Key` header (server-enforced)
- Unique MongoDB index on `{ createdBy, idempotencyKey }`
- Parallel identical creates → one `201`, rest `200` with the same order
- Same key + different body → `422`

`npm run seed` (local or Atlas via `MONGO_URL`) populates the 50k orders from that same catalog.

## Database indexes

Documented on the Order model and created via `syncIndexes()` during seed:

| Index | Purpose |
| --- | --- |
| `{ createdAt: -1, _id: -1 }` | Default sort by date |
| `{ totalCents: -1, _id: -1 }` | Sort by amount |
| `{ status: 1, createdAt: -1, _id: -1 }` | Filter + date sort |
| `{ status: 1, totalCents: -1, _id: -1 }` | Filter + amount sort |
| `{ customerNameLower: 1 }` | Prefix search on name |
| `{ customerEmail: 1 }` | Prefix search on email |
| Unique partial `{ createdBy: 1, idempotencyKey: 1 }` | Idempotent create |

## Code review findings (section 3)

Starting from the provided auth snippet, these problems were fixed:

1. **`jwt.decode` instead of `jwt.verify`** — forged tokens accepted. → `jwt.verify` with `{ algorithms: ["HS256"] }`.
2. **Hardcoded secret `"sarh-secret-2026"`** — committed secret. → `JWT_SECRET` from env; server fails fast if missing; only `.env.example` is committed.
3. **Token accepted from `?token=`** — leaks via logs, history, Referer. → removed; Bearer header only.
4. **Admin check only in React** — agents could DELETE via API. → `requireRole("admin")` on the server.
5. **Plain-text password in the DB query** — → bcrypt hash + `bcrypt.compare`.
6. **NoSQL injection** — `password: { $ne: null }` bypass. → zod requires email/password to be strings.
7. **No token expiry** — → `expiresIn` from `JWT_EXPIRES_IN` (default `8h`).
8. **Design gaps** — no 404/invalid-id handling, no async error handler, no login rate limit, DB access mixed into routes. → layered model/repo/service/controller, central error middleware, rate limit on login.

### Where the token is stored (client)

The JWT is stored in `localStorage` and sent as `Authorization: Bearer` on each request (axios interceptor). This prevents CSRF because the browser never attaches the token automatically to cross-site requests. It does **not** protect against XSS: any script on the page can read and steal the token. Mitigation: short-lived expiry via `JWT_EXPIRES_IN` and React’s default output escaping.

## Product question — “Delete all cancelled orders”

Before building it I would ask: **why** do you want them gone — list clutter, storage, compliance, or something else? Who else depends on cancelled orders (refunds, chargebacks, finance reporting, legal retention)? If she cannot answer, I would propose **hiding cancelled by default** (filter) or a soft-delete/archive — not a hard mass delete — until the retention reason is clear.

## What I skipped and why

- **Optional O1 / O2** — stayed inside the time budget; a weak optional is worse than none.
- **Cursor pagination / virtualisation** — skip/limit + paginated MUI table meets the brief (“server-side pagination and/or virtualised”); page never holds more than `pageSize` rows.
- **Shared validation package** — frontend and backend each have their own zod schemas (two independent projects). Duplication is small; a monorepo shared package would remove drift at the cost of setup complexity.
- **Contains-search** — prefix search keeps indexes usable; full substring search would need a text index or external search.
- **No e2e / Docker / deploy** — not required; local README path is enough.
- **`SCALE.md`** — Junior submission.

## Project layout

```text
backend/   Express API (model → repository → service → controller → route)
frontend/  React UI (Vite + MUI)
```

See [DECISIONS.md](./DECISIONS.md) for trade-offs and AI disclosure.
