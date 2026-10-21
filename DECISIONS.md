# Decisions

## 1. Idempotent create via `Idempotency-Key` + unique index (R2)

Require an `Idempotency-Key` header. Insert the order with `{ createdBy, idempotencyKey }`. On MongoDB duplicate-key error `E11000`, reload the existing order and return it (`200`) if the request hash matches, or `422` if the body differs.

**Limits:**
- No key TTL — reusing a key forever still binds to that order.
- Protects retries / double-clicks, not “user intentionally creates two different orders” (those need two keys).

---

## 2. Skip/limit pagination + MUI table (not cursor, not virtualised)

**Choice:** `page` / `pageSize` with `skip` + `limit` and `countDocuments`, rendered in an MUI `Table` + `TablePagination`.

**Alternative considered:** Keyset (cursor) pagination and/or a virtualised infinite list.

**Why rejected:** Agents navigate with search/filter more than deep scrolling; numbered pages and a total count fit that workflow. Virtualisation only pays off when many rows are mounted at once — a page of 25–50 does not need it. Trade-off: deep `skip` is slower than a cursor, and concurrent inserts can shift rows between pages. At 50k rows with compound indexes this stayed acceptable; I would revisit cursors if we grew to millions or dropped the total count.

---

## 3. Two independent projects (no shared package)

**Choice:** Separate `frontend/` and `backend/` folders, each with its own `package.json`. Zod schemas are duplicated.

**Alternative considered:** npm workspaces with a `shared/` package for validation types/schemas.

**Why rejected:** The brief rewards a setup that runs in under five minutes from the README. Two plain projects are easier to explain in a live interview. Schema drift is a real risk, but the create payload is small; I call out the duplication here rather than add workspace tooling for one file.

---

## AI disclosure

I used Cursor as a coding assistant for boilerplate, and iterating on tests and structure. I directed the architecture, reviewed the generated code, and ran seed + test suites locally. I can walk through and modify any of this code in the interview.
