# Decision Authority Matrix

> Defines who decides what: Human / AI / Joint decision boundaries

---

## Purpose

When AI and Humans collaborate, not every decision needs the same level of validation.
This document makes authority levels explicit so the team can **reduce unnecessary waiting and focus on the important decisions**.

---

## Authority Levels

| Level | Name | Description |
|-------|------|-------------|
| **H** | Human Decides | The Human makes the final decision. The AI presents options and reasoning. |
| **J** | Joint Decision | The AI proposes, then the Human reviews and approves before proceeding. |
| **A** | AI Autonomous | The AI proceeds autonomously. Review can happen afterward. |

---

## Decision Matrix

| Area | Decision | Level | Notes |
|------|----------|-------|------|
| **Architecture** | Core tech-stack selection | H | |
| | Design-pattern selection | J | AI presents trade-off analysis |
| | Internal module structure | A | Within the coding convention |
| **Requirements** | Scope confirmation | H | |
| | Requirement elaboration | J | AI drafts, Human validates |
| | Acceptance criteria writing | J | |
| **Implementation** | Algorithm / logic choice | J | |
| | Variable names / function signatures | A | Assuming conventions are followed |
| | Error-handling strategy | J | |
| | Refactoring | A | When behavior does not change |
| **Testing** | Test strategy | J | |
| | Test-code writing | A | |
| **Documentation** | Structural changes / registry promotion | H | Proceed only after Human approval |
| | Writing or editing document content | A | With Human review expected |
| **Version Control** | Branch strategy | H | |
| | Commit message | A | Must follow the convention |
