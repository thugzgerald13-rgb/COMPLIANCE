---
name: testing-biz-comply
description: How to run and end-to-end test the BIZ-COMPLY (COMPLIANCE repo) BIR tax-compliance dashboard locally — auth, client/deadline flows, status labels, and the Notification Hub.
---

# Testing BIZ-COMPLY locally

## Running the app
- Package manager is **bun**; it lives at `~/.bun/bin` (`export PATH=$HOME/.bun/bin:$PATH`).
- `bun install` → `bun run dev` serves on **http://localhost:3000** (host 0.0.0.0).
- `bun run lint` is `tsc --noEmit`. `bun run test` / `bun run test:coverage` run vitest.
- `bun run build` prints a "chunks larger than 500 kB" advisory — that is pre-existing, not a failure.

## Auth / data
- Supabase creds are usually absent, so the app runs **local-only** and persists to `localStorage`.
  The sidebar still says "Cloud Ready" — that is not evidence of a working Supabase connection.
- You can just **register a new account** on the auth page (name + email + password ≥ 6 chars);
  no email verification is needed in local-only mode. Clearing localStorage resets all data.

## UI navigation gotchas
- The **Notification Hub is not a bell icon**: click the user avatar at the bottom of the sidebar →
  **Settings**. Tabs inside: User Account / Web Push Audit Logs / Gateway Preferences.
  "Test Web Push" lives under Gateway Preferences and needs "Enable Web Push" first
  (Chrome shows a native permission prompt — accept it; a real desktop notification then fires and the
  audit-log counter increments).
- The **period picker** is the `input type="month"` at the top of the sidebar. Almost everything
  (which forms are visible, which deadlines are computed) depends on it.
- Typing into `input type="month"` / `input type="date"` with xdotool frequently produces malformed
  values (e.g. `202026-08-03`) because focus lands mid-segment. Click the **leftmost segment** first and
  type the digits with no separators (`08202026` for a date, `08` + Right + `2026` for a month), then
  verify the value in the DOM before asserting.

## Domain behaviour worth knowing when writing assertions
- Deadlines falling on a weekend are shifted: Saturday → +2 days, Sunday → +1 day.
- Forms only render in the months they are due (0619-E only in transaction months, 1701Q in May/Aug/Nov,
  quarterly forms in the month following the quarter close). If all forms show in every month, something broke.
- Status label comes from `getComplianceStatusInfo` in `src/utils.ts`: `BOTH ON TIME`, `BOTH ON LATE`,
  `FILED ON TIME (UNPAID)`, `FILED LATE (UNPAID)`, `ON TIME BUT PAID LATE`, `FILED LATE BUT PAID ON TIME`,
  `OVERDUE`, `Due Today`, `Due in N days`.
- "With Payable" opens `UpdatePayableModal`; status only flips to **Paid** when all 4 details
  (Date Filed, Date Paid, Amount, Reference No.) are present, otherwise it stays In Processing.
- The Notification Hub only counts forms that are overdue / due today / due within **7 days**, so the
  "Pending Due Items Monitored" number is usually smaller than the number of pending forms on screen.

## Known / possible pre-existing bug
- **1702-RT** ("15th day of the 4th month following the close of the taxable year") resolves to
  **Jan 15** instead of Apr 15, so it shows up in January and is missing from April. If you see this,
  it is pre-existing — report it rather than treating it as a regression.

## Devin Secrets Needed
- None for local-only testing. Supabase URL/anon key would only be needed to exercise cloud sync.
