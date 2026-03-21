# Architecture Decision Record (ADR) Template

> Architecture decision record that leaves future us an explanation of why this decision was made

---

## Template Usage Rules

- This file is a copy source. When creating a real ADR, replace `ADR-000`, `INT-000`, and `MS-000` with real IDs.
- For `Requirement / Story`, keep only actual linked `FR-*`, `NFR-*`, and `US-*` values. If there is no relationship, write `None` or mark it not applicable.
- Do not leave unreviewed option sections in place. Delete them or replace them with real options.
- `<!-- -->` guide comments are for drafting before approval; remove them when registering the ADR.
- The `ADR Need Check` below is the minimum filter to avoid promoting every design memo to an ADR. If it does not apply, record the item only in the related canonical document or session log.

---

## ADR ID
`ADR-000`

## Title
<!-- One-line decision statement -->

## Status
<!-- Proposed / Accepted / Deprecated / Superseded by ADR-XXX -->

## Date
<!-- YYYY-MM-DD -->

---

## ADR Need Check
<!-- Keep only the dimensions with long-term or hard-to-reverse impact. Delete lines that do not apply if needed. -->

- [ ] Constraints: does this decision narrow future options in a long-term way?
- [ ] Cost: does this decision create a meaningful difference in implementation, operation, or migration cost?
- [ ] Scalability: does this decision have long-term impact on future feature expansion, performance scaling, or structural separation?
- [ ] Security: does this decision affect authorization, data protection, attack surface, or regulatory response?
- [ ] Operations Impact: does this decision change deployment, incident response, observability, rollback, or operating procedure?
- [ ] At least one of the axes above is long-lived and hard to reverse, or two or more axes are intertwined enough to justify an ADR.
- [ ] If the criteria do not apply, record the decision in the related canonical document or session log instead of an ADR.

---

## Context
<!-- Background and current situation that make this decision necessary -->

## Decision Drivers
<!-- Key drivers that influence the decision -->
-
-

## Options Considered

### Option A:
- Pros:
- Cons:

### Option B:
- Pros:
- Cons:

### Option C:
- Pros:
- Cons:

## Decision
<!-- Final choice and why it was selected -->

## Consequences
<!-- Positive and negative consequences of this decision -->

### Positive
-

### Negative / Trade-offs
-

## Related Documents
| Item | Reference |
|------|-----------|
| Related Intent | `INT-000` |
| Related Milestone | `MS-000` (if applicable) |
| Related Requirement / User Story | `FR-*`, `NFR-*`, `US-*` (if applicable) |
| Related ADR | `ADR-000` (if applicable) |
