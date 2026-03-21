# Upgrade Manifest

> File classification table read by AI during framework upgrades

---

## Version Info

| Item | Value |
|------|------|
| Version | 1.0.0 |
| From | 0.0.0 |
| Date | 2026-03-21 |
> `From = 0.0.0` means the framework is not installed yet.
> In other words, the `v1.0.0` manifest should be interpreted as the **baseline install** for a fresh framework setup.
> If you introduce it into a project that already contains an arbitrary `.cowork/` structure, treat that as a **migration**, not an automatic upgrade, and confirm with the Human first.

---

## Change Summary

- First official baseline of the `cowork-context-framework` repository
- The `.cowork` structure follows the `Governance / Canonical / Registry / Instance / Template / Log-Archive` model
- The default work-breakdown axis is `Intent -> Milestone -> Task`
- Tool- and environment-dependent operating rules are managed separately in `tooling_environment_guide.md`
- Starting with `v1.1.0+`, sequential upgrades use the `From` field chain

---

## File Classification

> **ADD**: copy during a new baseline install
> **REPLACE**: not used for the baseline draft
> **MERGE**: not used for the baseline draft
> **SKIP**: not used for the baseline draft

> Because `v1.0.0` is a fresh-install baseline, every file included in the distribution starts as `ADD`.
> Beginning with later versions, file-specific `REPLACE / MERGE / SKIP` policy is introduced.

### Entry Point Files (Project Root)

| File | Class | Change |
|------|------|--------|
| `AGENTS.md` | ADD | Add the Codex / Cursor entrypoint |
| `CLAUDE.md` | ADD | Add the Claude Code entrypoint |
| `GEMINI.md` | ADD | Add the Gemini Code Assist entrypoint |
| `.github/copilot-instructions.md` | ADD | Add the GitHub Copilot entrypoint |

### `.cowork` Root

| File | Class | Change |
|------|------|--------|
| `.cowork/cowork.md` | ADD | Define framework principles and overall structure |
| `.cowork/README.md` | ADD | Explain `.cowork` usage |
| `.cowork/upgrade_manifest.md` | ADD | This baseline manifest |
| `.cowork/.upgrade/.gitkeep` | ADD | Scaffold for upgrade work |

### 01_cowork_protocol/

| File | Class | Change |
|------|------|--------|
| `.cowork/01_cowork_protocol/session_protocol.md` | ADD | Session start / in-progress / end protocol |
| `.cowork/01_cowork_protocol/tooling_environment_guide.md` | ADD | Tool- and environment-dependent operations |
| `.cowork/01_cowork_protocol/communication_convention.md` | ADD | Communication rules |
| `.cowork/01_cowork_protocol/decision_authority_matrix.md` | ADD | Decision authority matrix |
| `.cowork/01_cowork_protocol/escalation_policy.md` | ADD | Escalation policy |
| `.cowork/01_cowork_protocol/document_role_inventory.md` | ADD | Document role inventory |
| `.cowork/01_cowork_protocol/document_change_impact_matrix.md` | ADD | Change impact matrix |

### 02_project_definition/

| File | Class | Change |
|------|------|--------|
| `.cowork/02_project_definition/intent_registry.md` | ADD | Intent index |
| `.cowork/02_project_definition/user_story_registry.md` | ADD | User Story index |
| `.cowork/02_project_definition/requirement_spec.md` | ADD | Requirement specification |
| `.cowork/02_project_definition/functional_spec.md` | ADD | Functional specification |
| `.cowork/02_project_definition/domain_glossary.md` | ADD | Domain glossary |
| `.cowork/02_project_definition/risk_register.md` | ADD | Risk register |
| `.cowork/02_project_definition/deliverable_plan.md` | ADD | Deliverable plan |
| `.cowork/02_project_definition/templates/intent_template.md` | ADD | Intent template |
| `.cowork/02_project_definition/templates/user_story_template.md` | ADD | User Story template |
| `.cowork/02_project_definition/intents/.gitkeep` | ADD | Intent instance folder scaffold |
| `.cowork/02_project_definition/user_stories/.gitkeep` | ADD | User Story instance folder scaffold |

### 03_design_artifacts/

| File | Class | Change |
|------|------|--------|
| `.cowork/03_design_artifacts/adr_registry.md` | ADD | ADR index |
| `.cowork/03_design_artifacts/domain_model.md` | ADD | Domain model |
| `.cowork/03_design_artifacts/interface_contract.md` | ADD | Interface contract |
| `.cowork/03_design_artifacts/data_model.md` | ADD | Data model |
| `.cowork/03_design_artifacts/ui_spec.md` | ADD | UI specification |
| `.cowork/03_design_artifacts/tech_stack.md` | ADD | Tech stack registry |
| `.cowork/03_design_artifacts/templates/adr_template.md` | ADD | ADR template |
| `.cowork/03_design_artifacts/adrs/.gitkeep` | ADD | ADR instance folder scaffold |

### 04_implementation/

| File | Class | Change |
|------|------|--------|
| `.cowork/04_implementation/milestone_registry.md` | ADD | Milestone index |
| `.cowork/04_implementation/task_registry.md` | ADD | Task index |
| `.cowork/04_implementation/coding_convention.md` | ADD | Coding conventions |
| `.cowork/04_implementation/review_checklist.md` | ADD | Review checklist |
| `.cowork/04_implementation/templates/milestone_template.md` | ADD | Milestone template |
| `.cowork/04_implementation/templates/task_template.md` | ADD | Task template |
| `.cowork/04_implementation/milestones/.gitkeep` | ADD | Milestone instance folder scaffold |
| `.cowork/04_implementation/tasks/.gitkeep` | ADD | Task instance folder scaffold |

### 05_verification/

| File | Class | Change |
|------|------|--------|
| `.cowork/05_verification/quality_gate.md` | ADD | Quality gate rules |
| `.cowork/05_verification/test_strategy.md` | ADD | Test strategy |
| `.cowork/05_verification/verification_evidence.md` | ADD | Verification evidence index |
| `.cowork/05_verification/test_case.md` | ADD | Test cases |

### 06_evolution/

| File | Class | Change |
|------|------|--------|
| `.cowork/06_evolution/project_state.md` | ADD | Shared state index |
| `.cowork/06_evolution/knowledge_base.md` | ADD | Knowledge store |
| `.cowork/06_evolution/retrospective.md` | ADD | Retrospective |
| `.cowork/06_evolution/templates/session_log_template.md` | ADD | Session log template |
| `.cowork/06_evolution/imported_context/.gitkeep` | ADD | External-context folder scaffold |

### 07_delivery/

| File | Class | Change |
|------|------|--------|
| `.cowork/07_delivery/export_spec.md` | ADD | Export rules |
| `.cowork/07_delivery/release_note.md` | ADD | Release notes |
| `.cowork/07_delivery/operation_guide.md` | ADD | Operation guide |
| `.cowork/07_delivery/user_manual.md` | ADD | User manual |

### members/

| File | Class | Change |
|------|------|--------|
| `.cowork/members/.gitkeep` | ADD | Members folder scaffold |
| `.cowork/members/profile_template.md` | ADD | Profile template |
| `.cowork/members/proposal_template.md` | ADD | Proposal template |
| `.cowork/members/my_state_template.md` | ADD | Personal-state template |
| `.cowork/members/team_board.md` | ADD | Team board |

---

## Application Notes

- In `v1.0.0`, the framework does not inherit the old `cowork-context-template` release chain, legacy `From` inference, or earlier zip naming.
- Starting with `v1.1.0+`, enforce the `From = previous version` rule on top of this baseline.
- The English variant under `frameworks/en` is published on the same release line as the Korean baseline under `frameworks/ko`.

---

<!-- CUMULATIVE:START -->
## Cumulative Change Index (Auto-generated)

> Auto-updated during release to support sequential upgrades.

| Version | Key Change Summary |
|---------|--------------------|
| 1.0.0 | First official baseline of the `cowork-context-framework` repository |
<!-- CUMULATIVE:END -->
