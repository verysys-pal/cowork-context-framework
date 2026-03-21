# Test Strategy

> Test strategy that defines what will be verified, how it will be verified, and to what depth

---

## Document Info

| Item | Value |
|------|------|
| Related Intent | Refer to the active Intent or the relevant `INT-*` |
| Related Milestone | `MS-*` that this verification strategy supports (if applicable) |
| Related Requirement Spec | `02_project_definition/requirement_spec.md` |
| Related Verification Evidence | `verification_evidence.md` |
| Version | Project baseline |

---

## 1. Test Pyramid

| Layer | Scope | Owner | Tool |
|------|------|-------|------|
| Unit Test | Function / module unit | Written by AI, reviewed by Human | |
| Integration Test | Module integration | Written by AI, reviewed jointly | |
| E2E Test | Scenario based | Designed jointly, written by AI | |
| Performance Test | NFR validation | Joint | |

---

## 2. Coverage Targets

| Area | Target Coverage | Notes |
|------|-----------------|------|
| Core domain logic | | |
| API / interface | | |
| Error handling | | |
| Overall | | |

---

## 3. Test Scenarios

| ID | Scenario | Related Milestone | Type | Priority | Status |
|----|----------|------------------|------|----------|--------|
| TS-001 | | `MS-*` (if applicable) | Unit / Integration / E2E / Performance | P1 / P2 / P3 | Planned / Detailed / Covered / Deprecated |

---

## 4. Requirement Traceability Table

> Minimum-application rule: do not try to fill every requirement at once. Connect the core `FR-*` / `NFR-*` items needed for the current gate first.

| Requirement ID | Requirement Summary | Related Test Scenarios | Related Test Cases | Latest Result / Evidence | Verification Status | Notes |
|----------------|---------------------|------------------------|-------------------|--------------------------|--------------------|------|
| `FR-*` | | `TS-*` | `TC-*` | `EV-*`, Pass / Fail / Partial / Not Run | Covered / Partial / Planned / Gap | |
| `NFR-*` | | `TS-*` | `TC-*` | `EV-*`, Pass / Fail / Partial / Not Run | Covered / Partial / Planned / Gap | |

---

## 5. Test Environments

| Environment | Setup | Purpose |
|------|------|--------|
| Local | | Fast verification during development |
| CI | | Automated verification before PR merge |
| Staging | | Integrated validation |

---

## 6. Assumptions

| ID | Assumption | Impact |
|----|-----------|--------|
| ASM-001 | | |

---

## 7. Open Verification Questions

| ID | Item | Question | Status |
|----|------|----------|--------|
| OQ-001 | | | Open / Resolved / Deferred |

---

## 8. Evidence & Sources

> Keep the summary evidence and link index used for gate decisions together in `verification_evidence.md`.

| ID | Evidence | Source Document / Conversation | Notes |
|----|----------|-------------------------------|------|
| SRC-001 | | | |
