# Document Change Impact Matrix

> Impact matrix for quickly checking which files should be reviewed together when one file changes

---

## Quick Usage

- Start from the row that matches the file or change type you are editing.
- `Required Review` means the file must be reviewed in the same working session.
- `Additional Review` expands only when paths, terminology, roles, output behavior, or automation text change.
- Simple project-data accumulation usually has a narrow impact range, but structure / role / gate / export / automation changes should be checked against this document first.

---

## Impact Types

| Type | Meaning |
|------|---------|
| Content Sync | Explanations, terms, and rule wording must stay aligned |
| Structure Sync | Paths, filenames, role classification, and folder structure must stay aligned |
| Automation Sync | Entrypoint automation text, gates, export rules, and scripts must stay aligned |
| Operation Sync | Real usage flow, loading order, and approval rules must stay aligned |

---

## Fast Check Rules

- If the change is structural: review `cowork.md` + `README.md` + `session_protocol.md` + `tooling_environment_guide.md` + `document_role_inventory.md` + the four entrypoints first.
- If the change touches gates: review `quality_gate.md` + `cowork.md` + `README.md` + `session_protocol.md` together.
- If the change touches export: review `export_spec.md` + `deliverable_plan.md` + `README.md` + `session_protocol.md` together.
- If you add a new canonical source document: review `document_role_inventory.md` + `deliverable_plan.md` + `project_state.md` first, then `quality_gate.md` + `export_spec.md` if needed.
- If a registry or template changes: review the corresponding registry, template, `project_state.md`, `session_protocol.md`, and `quality_gate.md` together.
- If you changed one entrypoint: review the other three entrypoints as well.
- If a path or filename changes: review not only the documents but also `upgrade_manifest.md` and the four entrypoints.

---

## Impact Matrix

| Change Target | Required Review | Additional Review | Impact Type |
|------|------------------|------------------|-------------|
| `cowork.md` | `README.md`, `01_cowork_protocol/session_protocol.md`, `01_cowork_protocol/tooling_environment_guide.md`, `01_cowork_protocol/document_role_inventory.md`, 4 entrypoints | `05_verification/quality_gate.md`, `07_delivery/export_spec.md`, `02_project_definition/deliverable_plan.md`, `upgrade_manifest.md` | Content Sync / Structure Sync / Operation Sync |
| `README.md` | `cowork.md`, `01_cowork_protocol/session_protocol.md`, `01_cowork_protocol/tooling_environment_guide.md`, `01_cowork_protocol/document_role_inventory.md` | 4 entrypoints, `05_verification/quality_gate.md`, `07_delivery/export_spec.md` | Content Sync / Operation Sync |
| `01_cowork_protocol/session_protocol.md` | `cowork.md`, `README.md`, `01_cowork_protocol/decision_authority_matrix.md`, `01_cowork_protocol/document_role_inventory.md`, `06_evolution/project_state.md` | `01_cowork_protocol/tooling_environment_guide.md`, `05_verification/quality_gate.md`, `07_delivery/export_spec.md`, 4 entrypoints, `members/team_board.md`, `02_project_definition/deliverable_plan.md` | Content Sync / Operation Sync / Automation Sync |
| `01_cowork_protocol/tooling_environment_guide.md` | `01_cowork_protocol/session_protocol.md`, `01_cowork_protocol/document_role_inventory.md`, `upgrade_manifest.md` | `cowork.md`, `README.md`, 4 entrypoints, `01_cowork_protocol/document_change_impact_matrix.md` | Content Sync / Structure Sync / Automation Sync |
| `01_cowork_protocol/document_role_inventory.md` | `cowork.md`, `README.md`, `01_cowork_protocol/session_protocol.md`, `01_cowork_protocol/tooling_environment_guide.md` | `06_evolution/project_state.md`, `05_verification/quality_gate.md`, `07_delivery/export_spec.md`, `02_project_definition/deliverable_plan.md`, 4 entrypoints | Structure Sync / Operation Sync |
| `01_cowork_protocol/document_change_impact_matrix.md` | `cowork.md`, `README.md`, `01_cowork_protocol/document_role_inventory.md` | None | Operation Sync |
| new canonical source document added (AI proposal + Human approval) | `01_cowork_protocol/document_role_inventory.md`, `02_project_definition/deliverable_plan.md`, `06_evolution/project_state.md`, `01_cowork_protocol/document_change_impact_matrix.md` | `05_verification/quality_gate.md`, `07_delivery/export_spec.md`, `cowork.md`, `README.md`, `upgrade_manifest.md` | Structure Sync / Operation Sync / Automation Sync |
| `01_cowork_protocol/decision_authority_matrix.md` | `01_cowork_protocol/session_protocol.md`, `cowork.md` | 4 entrypoints, `05_verification/quality_gate.md` | Content Sync / Operation Sync |
| `01_cowork_protocol/communication_convention.md` | `cowork.md`, `README.md`, 4 entrypoints | `06_evolution/project_state.md` | Content Sync / Operation Sync |
| `01_cowork_protocol/escalation_policy.md` | `01_cowork_protocol/session_protocol.md`, `cowork.md` | `01_cowork_protocol/communication_convention.md`, 4 entrypoints | Content Sync / Operation Sync |
| `06_evolution/project_state.md` | `01_cowork_protocol/session_protocol.md`, `cowork.md`, `README.md`, `01_cowork_protocol/document_role_inventory.md` | 4 entrypoints, `members/my_state_template.md`, `members/team_board.md` | Structure Sync / Operation Sync |
| `02_project_definition/deliverable_plan.md` | `07_delivery/export_spec.md`, `05_verification/quality_gate.md`, `README.md`, `01_cowork_protocol/session_protocol.md` | `cowork.md`, `06_evolution/project_state.md` | Content Sync / Automation Sync |
| `05_verification/quality_gate.md` | `cowork.md`, `README.md`, `01_cowork_protocol/session_protocol.md` | `07_delivery/export_spec.md`, 4 entrypoints | Content Sync / Automation Sync |
| `07_delivery/export_spec.md` | `02_project_definition/deliverable_plan.md`, `05_verification/quality_gate.md`, `README.md`, `01_cowork_protocol/session_protocol.md` | `cowork.md`, 4 entrypoints | Content Sync / Automation Sync |
| `02_project_definition/intent_registry.md` | `02_project_definition/templates/intent_template.md`, `06_evolution/project_state.md`, `01_cowork_protocol/session_protocol.md` | `02_project_definition/deliverable_plan.md`, `members/team_board.md`, `05_verification/quality_gate.md` | Structure Sync / Operation Sync |
| `02_project_definition/user_story_registry.md` | `02_project_definition/templates/user_story_template.md`, `01_cowork_protocol/session_protocol.md` | `05_verification/quality_gate.md`, `02_project_definition/deliverable_plan.md` | Structure Sync / Operation Sync |
| `03_design_artifacts/adr_registry.md` | `03_design_artifacts/templates/adr_template.md`, `03_design_artifacts/tech_stack.md`, `01_cowork_protocol/session_protocol.md` | `01_cowork_protocol/tooling_environment_guide.md`, 4 entrypoints, `07_delivery/export_spec.md`, `02_project_definition/deliverable_plan.md` | Structure Sync / Operation Sync |
| `04_implementation/milestone_registry.md` | `04_implementation/templates/milestone_template.md`, `06_evolution/project_state.md`, `members/team_board.md`, `01_cowork_protocol/session_protocol.md` | `02_project_definition/deliverable_plan.md`, `05_verification/quality_gate.md` | Structure Sync / Operation Sync |
| `04_implementation/task_registry.md` | `04_implementation/templates/task_template.md`, `members/team_board.md`, `06_evolution/project_state.md`, `01_cowork_protocol/session_protocol.md` | `05_verification/quality_gate.md`, `02_project_definition/deliverable_plan.md`, `07_delivery/export_spec.md` | Structure Sync / Operation Sync |
| `02_project_definition/templates/intent_template.md` | `02_project_definition/intent_registry.md`, `05_verification/quality_gate.md` | `01_cowork_protocol/session_protocol.md`, `upgrade_manifest.md` | Structure Sync |
| `02_project_definition/templates/user_story_template.md` | `02_project_definition/user_story_registry.md`, `05_verification/quality_gate.md` | `01_cowork_protocol/session_protocol.md`, `upgrade_manifest.md` | Structure Sync |
| `03_design_artifacts/templates/adr_template.md` | `03_design_artifacts/adr_registry.md`, `03_design_artifacts/tech_stack.md`, `05_verification/quality_gate.md` | 4 entrypoints, `upgrade_manifest.md` | Structure Sync |
| `04_implementation/templates/milestone_template.md` | `04_implementation/milestone_registry.md`, `05_verification/quality_gate.md` | `01_cowork_protocol/session_protocol.md`, `upgrade_manifest.md` | Structure Sync |
| `04_implementation/templates/task_template.md` | `04_implementation/task_registry.md`, `members/team_board.md`, `05_verification/quality_gate.md` | `01_cowork_protocol/session_protocol.md`, `upgrade_manifest.md` | Structure Sync |
| `06_evolution/templates/session_log_template.md` | `01_cowork_protocol/session_protocol.md`, `06_evolution/project_state.md`, `05_verification/quality_gate.md` | `upgrade_manifest.md` | Structure Sync / Operation Sync |
| `02_project_definition/requirement_spec.md`, `02_project_definition/functional_spec.md`, `02_project_definition/domain_glossary.md`, `02_project_definition/risk_register.md` | usually none | `02_project_definition/deliverable_plan.md`, `07_delivery/export_spec.md`, `05_verification/quality_gate.md`, `01_cowork_protocol/document_role_inventory.md`, `04_implementation/milestone_registry.md` | Content Sync |
| `03_design_artifacts/domain_model.md`, `03_design_artifacts/interface_contract.md`, `03_design_artifacts/data_model.md`, `03_design_artifacts/tech_stack.md`, `03_design_artifacts/ui_spec.md` | usually none | `02_project_definition/deliverable_plan.md`, `07_delivery/export_spec.md`, `05_verification/quality_gate.md`, `03_design_artifacts/adr_registry.md`, `01_cowork_protocol/tooling_environment_guide.md`, 4 entrypoints | Content Sync |
| `04_implementation/coding_convention.md`, `04_implementation/review_checklist.md` | `01_cowork_protocol/session_protocol.md` | `05_verification/quality_gate.md`, 4 entrypoints | Content Sync / Operation Sync |
| `05_verification/test_strategy.md`, `05_verification/test_case.md` | `05_verification/quality_gate.md` | `07_delivery/export_spec.md`, `02_project_definition/deliverable_plan.md`, `04_implementation/milestone_registry.md`, `01_cowork_protocol/document_role_inventory.md` | Content Sync / Operation Sync |
| `05_verification/verification_evidence.md` | `05_verification/quality_gate.md`, `05_verification/test_strategy.md`, `05_verification/test_case.md`, `01_cowork_protocol/document_role_inventory.md` | `04_implementation/review_checklist.md`, `04_implementation/task_registry.md`, `06_evolution/project_state.md`, `07_delivery/export_spec.md` | Content Sync / Operation Sync |
| `06_evolution/knowledge_base.md`, `06_evolution/retrospective.md` | `01_cowork_protocol/session_protocol.md`, `README.md` | `01_cowork_protocol/document_role_inventory.md`, `06_evolution/project_state.md`, `04_implementation/milestone_registry.md` | Operation Sync |
| `07_delivery/release_note.md`, `07_delivery/operation_guide.md`, `07_delivery/user_manual.md` | `07_delivery/export_spec.md`, `02_project_definition/deliverable_plan.md` | `README.md`, `01_cowork_protocol/document_role_inventory.md` | Content Sync |
| `members/my_state_template.md` | `01_cowork_protocol/session_protocol.md`, `06_evolution/project_state.md` | `members/team_board.md`, `01_cowork_protocol/document_role_inventory.md` | Structure Sync / Operation Sync |
| 4 entrypoints (`AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.github/copilot-instructions.md`) | the other 3 entrypoints | `cowork.md`, `README.md`, `01_cowork_protocol/session_protocol.md`, `01_cowork_protocol/tooling_environment_guide.md`, `01_cowork_protocol/document_role_inventory.md` | Content Sync / Automation Sync |
| `.cowork` folder structure or file paths change | `cowork.md`, `README.md`, `01_cowork_protocol/session_protocol.md`, `01_cowork_protocol/tooling_environment_guide.md`, `01_cowork_protocol/document_role_inventory.md`, 4 entrypoints, `upgrade_manifest.md` | `05_verification/quality_gate.md`, `07_delivery/export_spec.md` | Structure Sync / Automation Sync |
| `upgrade_manifest.md` | `cowork.md`, `README.md`, `01_cowork_protocol/session_protocol.md`, `01_cowork_protocol/tooling_environment_guide.md` | `01_cowork_protocol/document_change_impact_matrix.md` | Structure Sync / Automation Sync |

---

## Operating Notes

- This document is not a list of files that must always be edited together; it is a map of impact ranges to review first.
- Simple project-content accumulation usually ends inside the relevant canonical document.
- Changes to roles, paths, states, gates, export rules, or automation text have broad cascading impact, so review this matrix first.
