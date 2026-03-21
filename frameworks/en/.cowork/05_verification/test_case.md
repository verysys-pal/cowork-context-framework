# Test Case

> Test-case document that defines the input, procedure, and expected result for each verification item

---

## Document Info

| Item | Value |
| --- | --- |
| Related Intent | Refer to the active Intent or the relevant `INT-*` |
| Related Milestone | Target `MS-*` to verify (if applicable) |
| Related Test Strategy | `test_strategy.md` |
| Related Verification Evidence | `verification_evidence.md` |
| Version | Project baseline |

---

## Purpose

This document breaks the scenarios in `test_strategy.md` down into **executable individual cases**
so anyone can reproduce the same result.

---

## Split-Promotion Criteria

- The default is to keep this document as a single canonical document. If the scale is still small, do not create a `test_cases/` structure yet.
- Start reviewing a split into `test_cases/TC-*.md` when at least one of the following is true:
  - real `TC-*` cases exceed **12**, excluding empty samples
  - real rows in `Recent Execution Summary` exceed **15**
  - in **2 or more of the last 3 sessions**, only part of the same feature / same `MS-*` / same requirement bundle is repeatedly referenced while the other cases remain untouched
- After a split is approved, `test_case.md` keeps the overall summary and traceability index, and detailed procedures and execution history move into `test_cases/TC-*.md`.
- Even after splitting, keep the `FR-*` / `NFR-*`, `TS-*`, and `EV-*` links intact so traceability to `test_strategy.md`, `verification_evidence.md`, and the gate criteria is preserved.

---

## Writing Rules

- In this document, use visible status values such as `TBD`, `Not written`, and `None` instead of HTML-comment placeholders.
- If there are no test cases yet, keep only the minimum structure. Once real cases exist, repeat the `TC-*` structure and append them.

---

## Test Case List

### TC-001: TBD test case name

| Item | Value |
| --- | --- |
| Related Function | `FUNC-*` (if applicable) |
| Related Milestone | `MS-*` (if applicable) |
| Related User Story | `US-*` (if applicable) |
| Related Requirement | `FR-*` / `NFR-*` (if applicable) |
| Related Test Scenario | `TS-*` (if applicable) |
| Related Verification Evidence | `EV-*` (if applicable) |
| Type | Unit / Integration / E2E |
| Priority | P1 / P2 / P3 |
| Case Status | Draft / Ready / Deprecated |
| Latest Execution Result | Not Run / Pass / Fail / Blocked |
| Last Executed At | YYYY-MM-DD (if applicable) |

#### Preconditions

- None

#### Test Procedure

| Step | Action | Input Data | Expected Result |
| --- | --- | --- | --- |
| 1 | Not written yet | Not written yet | Not written yet |

#### Postconditions

- None

---

## Recent Execution Summary

| TC ID | Test Name | Related Requirement | Related Test Scenario | Related Milestone | Type | Priority | Latest Result | Execution Date | Evidence ID | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| None | No registered execution result yet | - | - | - | - | - | - | - | - | - |
