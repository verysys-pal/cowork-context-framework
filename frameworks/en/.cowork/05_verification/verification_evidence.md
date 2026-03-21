# Verification Evidence

> Evidence index that summarizes and connects test, review, NFR, and release-readiness evidence in one place

---

## Purpose

This document organizes evidence created during Verify into the **canonical evidence index** used for gate decisions.

- Quickly restore verification evidence scattered across session logs and individual Task documents.
- Show what has been verified and where the basis lives when deciding Gate 4 or Gate 5.
- Keep only **summary + source location** here instead of duplicating raw logs, screenshots, or external reports.
- Even in projects where test volume keeps growing, this document should remain a **trusted evidence index**, not a log warehouse.

---

## Document Info

| Item | Value |
|------|------|
| Related Intent | Refer to the active Intent or the relevant `INT-*` |
| Related Milestone | `MS-*` that the evidence is linked to (if applicable) |
| Related Test Strategy | `test_strategy.md` |
| Related Test Case | `test_case.md` |
| Version | Project baseline |

---

## Operating Principles

- This document is the **evidence summary index** for Verify / Release decisions.
- Detailed procedures and expected results belong in `test_strategy.md`, `test_case.md`, `review_checklist.md`, and related `TASK-*` documents.
- Keep raw execution logs, external reports, and measurement results in their original location, and write only what they prove and where they live in this document.
- When possible, track Gate 4 and Gate 5 items with `EV-*` IDs.
- If evidence is still missing, do not delete the item; leave it in `Open Evidence Gaps`.

---

## Evidence Area Summary

| Area | Latest Status | Main Evidence Documents | Last Updated | Notes |
|------|--------------|-------------------------|-------------|------|
| Review Evidence | Not Started / In Progress / Ready | `04_implementation/review_checklist.md`, related `TASK-*` | | |
| Test Execution Evidence | Not Started / In Progress / Ready | `test_case.md`, related execution logs / reports | | |
| NFR Evidence | Not Started / In Progress / Ready | `test_strategy.md`, related measurement results | | |
| Release Readiness Evidence | Not Started / In Progress / Ready | `quality_gate.md`, `project_state.md`, related release sources | | |

---

## Evidence Index

| EV ID | Type | Verification Target / Scope | Result | Related Gate | Raw Evidence Location | Last Updated | Notes |
|-------|------|-----------------------------|--------|-------------|----------------------|-------------|------|
| EV-001 | Review / Unit / Integration / E2E / NFR / Release | | Pass / Fail / Partial / Deferred | Gate 4 / Gate 5 | | YYYY-MM-DD | |

---

## Gate Decision Notes

| Gate | Decision Status | Core EV ID | Summary | Notes |
|------|-----------------|-----------|---------|------|
| Gate 4 | Ready / Blocked / Partial | `EV-*` | | |
| Gate 5 | Ready / Blocked / Partial | `EV-*` | | |

---

## Open Evidence Gaps

| ID | Item | Missing Evidence | Next Action | Status |
|----|------|------------------|------------|--------|
| GAP-001 | | | | Open / Resolved / Deferred |
