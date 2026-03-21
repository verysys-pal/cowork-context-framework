# ADR Registry

> Architecture decision index that briefly tracks approved decisions and decisions still under review

---

## Purpose

- Check ADR status, title, and date quickly.
- Manage detailed decision content in `adrs/ADR-*.md`.
- Use this as the traceability baseline for tech stack decisions, design changes, and major exception decisions.

---

## Recording Rules

- Do not leave dummy IDs such as `ADR-000` in the registry.
- When there are no items, do not keep example rows in the table; leave only `No registered ADR yet`.
- In `Related Intent` and `Related Milestone`, write only actual linked IDs. If there is no relationship, use `None` or leave it blank.
- Do not delete replaced or deprecated ADRs. Update the real status and note the replacing ADR in `Notes` when applicable.

---

## ADR List

| ADR ID | Title | Status | Date | Related Intent | Related Milestone | Document Path | Notes |
|--------|-------|--------|------|----------------|------------------|---------------|------|

> No registered ADR yet

- `Status`: `Proposed` / `Accepted` / `Deprecated` / `Superseded`
- `Date`: `YYYY-MM-DD`

---

## Operating Rules

- Not every design memo becomes an ADR. Promote a decision to ADR only when at least one of `constraints`, `cost`, `scalability`, `security`, or `operations impact` is long-lived and hard to reverse, or when two or more of those axes are intertwined.
- Smaller decisions that do not meet that bar should stay in the relevant canonical document or the session log, not in the ADR registry.
- When ADR promotion is needed, create `adrs/ADR-*.md` and register it here.
- Link major decisions in `tech_stack.md`, `domain_model.md`, and `interface_contract.md` to the related ADR.
- Do not delete deprecated ADRs; update only their status.
