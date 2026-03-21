# Intent Registry

> Project Intent index that tracks which Intent is active and what its priority and status are

---

## Purpose

- Load this first at session start.
- Check the active Intent and its priority quickly.
- Manage detailed content in `intents/INT-*.md`.

---

## Recording Rules

- A registry is an **index of real active / historical data**, so do not record dummy IDs such as `INT-000`.
- When there are no items, do not keep sample rows in the table; leave only `No registered Intent yet`.
- Fill `Document Path` only when a detail document exists. It may stay blank in lightweight operation.
- In `Related Milestone`, write only actual linked `MS-*` values. If there is no linked milestone, write `None`.

---

## Intent List

| Intent ID | Title | Status | Priority | Current Focus Phase | Related Milestone | Document Path | Notes |
|-----------|-------|--------|----------|---------------------|------------------|---------------|------|

> No registered Intent yet

- `Status`: `Draft` / `Approved` / `Superseded` / `Split` / `Closed`
- `Priority`: `Must` / `Should` / `Could`
- `Current Focus Phase`: `Define` / `Design` / `Build` / `Verify` / `Evolve` / `Deliver`

---

## Active Intent Summary

- Current active Intent: None
- Next approval target: None
- Items that require Human confirmation: None

---

## Operating Rules

- When a new Intent is needed, create `intents/INT-*.md` and register it here.
- When active state changes, update this document together with `project_state.md`.
- Do not delete closed Intents; update only their status.
