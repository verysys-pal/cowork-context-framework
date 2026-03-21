# Member Profile

> Team-member profile template automatically generated at the first session start

---

## Template Usage Rules

- This file is the template for `members/<name>/profile.md`.
- Remove `<!-- -->` comments after the real profile is written.
- Write the real role and ownership area. If still undecided, mark them as `TBD`.
- Keep the folder name and the `Name` field aligned to the same user identifier confirmed by the Human.
- In a solo project, start with the solo default `Authority = Master`, `Role = Project Owner`, `Ownership Area = Whole Project`, then narrow the wording later if needed.

---

| Item | Value |
| --- | --- |
| Name | <!-- user name --> |
| Role | <!-- for example: project lead, backend engineer, QA --> |
| Ownership Area | <!-- for example: system architecture, device abstraction --> |
| Authority | Member / Master |

---

## Personal Workspace

Use the structure below as the default when the profile is created.
Even in a solo project, start with the same `workspace/session_logs/` structure as a team project and keep the operation simpler rather than changing the layout.

```text
members/<name>/
├── profile.md              <- this file
├── proposals/              <- Change Proposal storage
└── workspace/              <- personal workspace
    ├── my_state.md         <- personal state index (read first by the next AI)
    └── session_logs/       <- personal session logs (shared structure for solo/team, git-ignored)
```
