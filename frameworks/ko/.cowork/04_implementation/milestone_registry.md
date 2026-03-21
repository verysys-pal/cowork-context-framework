# Milestone Registry

> 마일스톤 인덱스 — Intent와 Task 사이의 중간 완료 지점을 관리한다

---

## 목적

Milestone은 `Phase`와 다르다.
`Phase`가 프레임워크의 고정 라이프사이클이라면, Milestone은 프로젝트별 중간 완료 단위다.

- 어떤 묶음이 "의미 있게 끝났다"고 볼 수 있는지 정의한다
- Task를 묶는 중간 계층으로 사용한다
- 작은 프로젝트에서는 상세 파일 없이 이 문서만으로 경량 운영할 수 있다

---

## 기록 규칙

- registry에는 `MS-000` 같은 더미 ID를 남기지 않는다.
- 항목이 없을 때는 표에 예시 행을 넣지 않고 `현재 등록 Milestone 없음`만 남긴다.
- `문서 경로`는 상세 Milestone 문서를 만든 경우에만 채우고, 경량 운영이면 비워둘 수 있다.
- `관련 Task`에는 현재 진행을 대표하는 `TASK-*`만 짧게 적고, 연결된 Task가 없으면 `없음`으로 적거나 비운다.

---

## Milestone 목록

| Milestone ID | 제목 | 관련 Intent | 주 Phase | 상태 | 관련 Task | 문서 경로 | 비고 |
|--------------|------|-------------|----------|------|-----------|----------|------|

> 현재 등록 Milestone 없음

- `주 Phase`: `Define` / `Design` / `Build` / `Verify` / `Evolve` / `Deliver`
- `상태`: `Planned` / `In Progress` / `Review` / `Done` / `Deferred`

---

## 운영 규칙

- AI가 초안을 제안하고 Human이 승인하여 확정한다.
- 상세 계획이 필요한 경우 `milestones/MS-*.md`를 생성한다.
- 짧은 프로젝트에서는 이 문서의 행 단위로만 관리할 수 있다.
