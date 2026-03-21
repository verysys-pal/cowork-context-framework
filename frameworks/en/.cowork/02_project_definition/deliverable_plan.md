# Deliverable Plan

> Document that confirms project-specific official deliverable scope and manages missing data

---

## Purpose

Not every project needs the full default set of 14 recommended deliverables.
This document confirms the **actual deliverable scope** for the project and manages a plan for **intentional data collection**
so each deliverable has the information it needs.

- Early in the Define phase, the AI profiles the project and proposes whether each deliverable is needed.
- Once the Human approves it, the plan is fixed and later AI questions and data collection are guided by it.
- Revisit it when the Intent changes substantially through a Pivot or Split.

---

## Operating Boundary

- This document manages **what will be generated** and **what is still missing**.
- The `Core Source Documents` column is a planning note. The real source-document priority and generation method follow `07_delivery/export_spec.md`.
- The active status, approval timing, and re-review triggers for the default recommended 14 deliverables and approved extension deliverables (15+) are confirmed here.

---

## Project Profile

| Item | Value |
|------|------|
| Project Type | Library / Service / CLI / Desktop App / Mobile App / Embedded / Other |
| Has UI | Yes / No |
| Uses DB | Yes / No |
| External Delivery | Internal Tool / Public Product / Client Delivery |
| Team Size | Solo / Small (2 to 5) / Medium (6 to 15) / Large (16+) |
| Operating Environment | Local / Cloud / On-Prem / Hybrid |

---

## Default Recommended 14 Deliverables Table

> The 14 items below are the default recommendation set.
> The real generation targets are the items marked `Required` or `Recommended` in this table, plus any Human-approved items in `Extension Deliverables (15+)` below.

| # | Deliverable | Need Level | Confirmed At | Last Approval | Re-Review Trigger | Core Source Documents | Collection Status | Notes |
|---|-------------|-----------|-------------|---------------|-------------------|----------------------|------------------|------|
| 1 | Requirements Specification | Required / Recommended / Not Applicable | | YYYY-MM-DD / Human | | `requirement_spec.md` | | |
| 2 | Domain Glossary | | | | | `domain_glossary.md` | | |
| 3 | Functional Specification | | | | | `functional_spec.md` | | |
| 4 | UI Specification | | | | | `ui_spec.md` | | |
| 5 | WBS | | | | | `milestone_registry.md` + `task_registry.md` + `tasks/TASK-*.md` (optional) | | |
| 6 | System Architecture Design | | | | | `domain_model.md` + `tech_stack.md` + related ADRs | | |
| 7 | API Specification | | | | | `interface_contract.md` | | |
| 8 | Database Design | | | | | `data_model.md` | | |
| 9 | Test Scenarios | | | | | `test_strategy.md` | | |
| 10 | Test Cases | | | | | `test_case.md` | | |
| 11 | Release Notes | | | | | `release_note.md` | | |
| 12 | Operation Guide | | | | | `operation_guide.md` | | |
| 13 | User Manual | | | | | `user_manual.md` | | |
| 14 | README | | | | | Full-context synthesis (`export_spec.md` reference) | | |

### Need-Level Rules

- `Required`: must be generated when the project is completed.
- `Recommended`: recommended for project quality, but skippable.
- `Not Applicable`: does not apply to this project.

---

## Extension Deliverables (15+)

Use this section only when the default 14 deliverables are not sufficient.

| # | Deliverable | Proposed By | Proposal Basis | Need Level | Confirmed At | Last Approval | Re-Review Trigger | Core Source Documents | Collection Status | Notes |
|---|-------------|------------|---------------|-----------|-------------|---------------|-------------------|----------------------|------------------|------|
| 15+ | | AI / Human | | Required / Recommended / Not Applicable | | YYYY-MM-DD / Human | | | | |

- Extension deliverables are numbered after the default 14 (`15+`).
- `Proposed By = AI` means the AI proposed the need first; it is not confirmed until the Human approves it.
- Use `YYYY-MM-DD / Human` as the default format for `Last Approval`.
- In `Re-Review Trigger`, write only the conditions that should reopen this plan, such as Intent change, scope growth, or delivery-target change.
- If a new canonical body or a new source-document path is required, check `01_cowork_protocol/document_change_impact_matrix.md` first.

---

## Missing Data List

| Deliverable | Needed Data | Collection Method | Owner | Priority | Status |
|-------------|------------|------------------|-------|----------|--------|
| | | Question / Analysis / Code Extraction / External Reference | Human / AI | High / Medium / Low | Not Collected / In Progress / Complete |

> For items that use a registry + instance structure, refer to both the index document and the detail documents.

### Collection-Status Rules

- `Not Collected`: the core source document is still empty or has no evidence.
- `In Progress`: some data is available, but it is still insufficient for official deliverable generation.
- `Complete`: the minimum required source documents are ready to generate the current deliverable.
