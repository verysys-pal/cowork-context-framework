# User Story Registry

> User Story index that manages the connection point between requirement flow and implementation traceability

---

## Purpose

- Keep User Story status and priority concise.
- Manage Story details in `user_stories/US-*.md`.
- Use this as the traceability index that connects Intent, Milestone, and Task.

---

## Recording Rules

- Do not leave dummy IDs such as `US-000` in the registry.
- When there are no items, do not keep example rows in the table; leave only `No registered User Story yet`.
- For `Related Intent` and `Related Milestone`, write only actual linked IDs. For unlinked items, use `None` or leave them blank.
- Fill `Document Path` only when a detail Story document has been created.

---

## User Story List

| User Story ID | Title | Related Intent | Related Milestone | Priority | Status | Document Path | Notes |
|---------------|-------|----------------|------------------|----------|--------|---------------|------|

> No registered User Story yet

- `Priority`: `Must` / `Should` / `Could` / `Won't`
- `Status`: `Draft` / `Approved` / `Implemented` / `Deferred`

---

## Operating Rules

- When a new Story appears, create `user_stories/US-*.md` and register it here.
- Update Story status as implementation progresses.
- Record detailed Acceptance Criteria in the individual Story document.
