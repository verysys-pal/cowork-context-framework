# User Story Registry

> User Story 인덱스 — 요구사항 흐름과 구현 추적의 연결 지점을 관리한다

---

## 목적

- User Story의 상태와 우선순위를 짧게 관리한다
- Story 상세는 `user_stories/US-*.md`에서 관리한다
- Intent, Milestone, Task를 연결하는 추적 인덱스로 사용한다

---

## 기록 규칙

- registry에는 `US-000` 같은 더미 ID를 남기지 않는다.
- 항목이 없을 때는 표에 예시 행을 넣지 않고 `현재 등록 User Story 없음`만 남긴다.
- `관련 Intent`, `관련 Milestone`은 실제 연결된 ID만 기록하고, 미연결 항목은 `없음`으로 적거나 비운다.
- `문서 경로`는 상세 Story 문서를 만들었을 때만 채운다.

---

## User Story 목록

| User Story ID | 제목 | 관련 Intent | 관련 Milestone | 우선순위 | 상태 | 문서 경로 | 비고 |
|---------------|------|-------------|----------------|----------|------|----------|------|

> 현재 등록 User Story 없음

- `우선순위`: `Must` / `Should` / `Could` / `Won't`
- `상태`: `Draft` / `Approved` / `Implemented` / `Deferred`

---

## 운영 규칙

- Story가 생기면 `user_stories/US-*.md`를 생성하고 여기에 등록한다.
- Story 상태는 구현 진행과 함께 갱신한다.
- 상세 Acceptance Criteria는 개별 Story 문서에 기록한다.
