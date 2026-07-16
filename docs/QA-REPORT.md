# Vallety — QA Report

_Automated test pass over the business-critical logic._

## Test infrastructure

| Tool | Purpose | Status |
|------|---------|--------|
| **Vitest 4** | Unit / integration runner | ✅ configured (`vitest.config.ts`) |
| **jsdom** | DOM + `localStorage` for the local-first data layer | ✅ |
| **@testing-library/react** + **user-event** | Component tests | ✅ installed, ready |
| **@testing-library/jest-dom** | DOM matchers | ✅ wired in `src/test/setup.ts` |
| **@vitest/coverage-v8** | Coverage | ✅ `npm run test:coverage` |
| Test factories | Realistic data (`makeInvoice`, `makeHolding`, …) | ✅ `src/test/factories.ts` |

Scripts: `npm test` / `test:unit` / `test:watch` / `test:coverage`.

## Results

**89 tests, 9 files, all passing.** ~6s.

Focused on the money math — where a bug costs a real euro:

| Area | File | What's covered |
|------|------|----------------|
| Finnish VAT (ALV) | `business.test.ts` | gross/VAT exact at 25.5 / 14 / 10 / 0 %; gross = net + VAT invariant |
| Business summary | `business.test.ts` | paid-vs-sent revenue, VAT owed (collected − deductible, floored), advance tax (25 % of YTD profit), **YEL for all three age brackets**, comma-decimal YEL income, end-to-end safe-to-pay, month vs YTD windowing |
| Portfolio | `portfolio.test.ts` | value/cost/gain/gain %, weighted **prevPrice** on price update, day change, allocation by type, top concentration, movers sort, empty → 0 |
| Net worth | `netWorth.test.ts` | assets − liabilities, liability classification, monthly delta vs prior snapshot, **one-snapshot-per-month idempotency** |
| Budgets | `budgets.test.ts` | in-month/in-category spend, over-budget > 100 %, threshold colors, €0 budget → 0 % |
| Goals | `goals.test.ts` | progress % (clamped), remaining, monthly-needed, €0 target |
| Debt payoff | `debts.test.ts` | snowball/avalanche ordering, interest accrual, extra-payment shortening, **non-amortising debt flagged unpayable**, snowball rollover |
| CSV import | `csvParser.test.ts` | Nordic number parsing, 3 date formats + 2-digit years, duplicate detection (existing + in-file), import counts (no partial corruption) |
| Transactions | `transactions.test.ts` | filter by type/category/date/search + combined, auto-categorization, CRUD persistence |
| Formatting | `formatters.test.ts` | euro formatting, comma-decimal parsing, edge cases |

Every calculation has an explicit **empty-data / divide-by-zero** test asserting `0` (never `NaN`/`Infinity`).

## Bug found and fixed

- **`formatEuro` rendered "-€0"** for any value in (−0.5, 0): the sign was taken from the raw value while the magnitude rounded to zero. On a hero number this looks broken. **Fixed** by deriving the sign from the rounded value, plus a `NaN`/`Infinity` → `€0` guard. Regression tests added.

## Architecture note — what these tests deliberately do NOT cover

Vallety's financial data (transactions, budgets, goals, bills, debts, accounts, snapshots, invoices, expenses, clients, holdings, watchlist) is **local-first — stored in `localStorage`, not Supabase.** Supabase is used only for auth + the profile row. Consequently:

- **Row-Level-Security cross-user tests don't apply** — there is no server-side per-user domain data to isolate. (When/if data moves server-side, RLS tests become essential and must run against a real Supabase.)
- Offline persistence is inherent: writes already survive offline and reconnect with no sync queue.

## Not testable in this environment (manual pre-launch QA required)

- **Real Supabase auth** — signup/login/magic-link/OAuth/reset against a live project (dummy creds can't complete `getSession`).
- **Google OAuth** provider round-trip.
- **Real bank CSV exports** from OP/Nordea/S-Pankki/Danske/Handelsbanken (only representative fixtures tested).
- **Stripe / billing**, **email delivery**, **push notifications on a physical device**.
- **Cross-browser E2E matrix** (Chromium/Firefox/WebKit) — needs a running backend; RTL/Playwright scaffolding is in place to add these.
- **Finnish tax constants** (ALV 25.5 %, YEL rates, 25 % advance-tax estimate) — the _math_ is verified; the _rates_ should be reviewed by a Finnish tax professional before launch, and the UI already labels them as estimates.
