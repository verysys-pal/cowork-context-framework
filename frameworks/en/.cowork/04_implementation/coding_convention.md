# Coding Convention

> Explicit rules that keep AI-generated code and Human-written code in the same style

---

## How To Use This Document

1. **When the tech stack is confirmed**: once a technology is confirmed in `03_design_artifacts/tech_stack.md`, the AI automatically configures the language- or framework-specific sections of this document.
   - Only convention sections for confirmed technologies should remain.
   - Do not include conventions for technologies the project does not use.
   - If a new technology is selected, the AI proposes an initial convention draft based on best practices.
2. **Automatic AI application**: because `CLAUDE.md`, `AGENTS.md`, `GEMINI.md`, and `copilot-instructions.md` refer to this file, the AI follows the convention automatically after session start.
3. **Add / modify freely**: adjust each section to fit the team's actual rules.

---

## Shared Rules (All Languages)

| Item | Rule |
|------|------|
| File Encoding | UTF-8 |
| Line Endings | LF (use CRLF for Windows-native projects if the team requires it) |
| Trailing Whitespace | Remove |
| Final Newline | Exactly one newline at end of file |
| Conversation Language | English |
| Code / Commit Language | English |

### Comment Rules (Shared)

| Item | Rule |
|------|------|
| Public APIs | Always write documentation comments |
| Complex Logic | Comment the why, not the what |
| TODO | `// TODO(owner): description` |
| FIXME | `// FIXME: description + reproduction condition` |

### Git Convention (Shared)

**Commit Message (Conventional Commits)**
```text
<type>(<scope>): <subject>

<body>

<footer>
```
**Types:** `feat` `fix` `refactor` `docs` `test` `chore` `perf` `ci`

**Branch Naming**
```text
<type>/<short-description>
for example: feat/motion-planner-refactor, fix/velocity-overflow
```

### Git Workflow (Team Project)

> The table below is the default template. Early in the project, the AI analyzes team size and project shape, proposes the strategy, and the Human confirms it.

**Branch Strategy**

| Branch | Role | Merge Target |
|---------|------|-------------|
| `main` | Stable release | <- `develop` (after Quality Gate passes) |
| `develop` | Integration development | <- `feature/*`, `fix/*`, `docs/*` |
| `feature/<description>` | Feature development | -> `develop` |
| `fix/<description>` | Bug fix | -> `develop` |
| `docs/<description>` | Document changes (including `.cowork/`) | -> `develop` |

> For solo projects or very small teams, a simpler `main` + `feature/*` structure is usually enough.

**Merge Rules**

| Target | Rule |
|------|------|
| feature -> develop | PR required, with at least one review if the team has 2 or more people |
| develop -> main | Quality Gate passed + Master approval |
| urgent hotfix | branch from main -> merge into both main and develop |

**Commit Separation Principle**

| Commit Type | Prefix | Example |
|------------|--------|---------|
| `.cowork/` document changes | `docs(cowork):` | `docs(cowork): update project_state for Phase 2` |
| source-code changes | `feat/fix/refactor:` | `feat(planner): add velocity limit check` |
| test changes | `test:` | `test(planner): add boundary condition tests` |

> Separate `.cowork/` document changes and source-code changes into different commits.

### Preventing And Resolving `.cowork` File Conflicts

These rules reduce merge conflicts in `.cowork/` files for team projects.

**Conflict-Prevention Design**

| File | Edit Scope | Conflict Risk |
|------|-----------|---------------|
| `project_state.md` | Sync at session end | Medium - always pull before push |
| `team_board.md` | Edit only the rows you own | Low - row-level separation keeps conflicts small |
| `my_state.md` | Edited only by the owner | None |
| personal `session_logs/` | Created only by the owner, git-ignored | None |
| ADR files | Normally newly created rather than edited in place | Low |
| `deliverable_plan.md` | Changes are rare once confirmed | Low |
| shared source documents such as `requirement_spec.md` | Multiple teammates may edit | Medium - consider docs branches |

**Conflict Resolution Priority**

1. **`project_state.md`**: prefer the most recent session data.
2. **`team_board.md`**: prefer the version from the owner of each row.
3. **Shared source documents**: approved ADR / decision record first -> session log -> conversation content.
4. **If still unclear**: preserve both versions and ask the Human to resolve it.

---

## Language- Or Framework-Specific Conventions

> Once the tech stack is confirmed in `03_design_artifacts/tech_stack.md`,
> the AI automatically configures the convention sections that match the selected technologies.
>
> - generate sections only for confirmed technologies
> - exclude technologies the project does not use
> - if a new technology is selected, let the AI propose an initial convention draft based on best practices

- No additional tech-specific rules have been confirmed yet.
- Add the real language / framework sections below after the tech stack is confirmed.
