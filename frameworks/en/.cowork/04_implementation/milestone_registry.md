# Milestone Registry

> Milestone index that manages the intermediate completion points between Intent and Task

---

## Purpose

A Milestone is different from a `Phase`.
While `Phase` is the framework's fixed lifecycle, a Milestone is a project-specific intermediate completion unit.

- define what counts as "meaningfully finished"
- use it as the middle layer that groups Tasks
- in small projects, operate lightly with this document alone and no detail files if needed

---

## Recording Rules

- Do not leave dummy IDs such as `MS-000` in the registry.
- When there are no items, do not keep example rows in the table; leave only `No registered Milestone yet`.
- Fill `Document Path` only when a detail Milestone document exists. It may stay blank in lightweight operation.
- In `Related Tasks`, write only the `TASK-*` items that best represent current progress. If no Task is linked, write `None` or leave it blank.

---

## Milestone List

| Milestone ID | Title | Related Intent | Main Phase | Status | Related Tasks | Document Path | Notes |
|--------------|-------|----------------|-----------|--------|--------------|---------------|------|

> No registered Milestone yet

- `Main Phase`: `Define` / `Design` / `Build` / `Verify` / `Evolve` / `Deliver`
- `Status`: `Planned` / `In Progress` / `Review` / `Done` / `Deferred`

---

## Operating Rules

- The AI proposes the draft and the Human confirms it.
- Create `milestones/MS-*.md` when detailed planning is needed.
- In short projects, row-level management in this document alone can be enough.
