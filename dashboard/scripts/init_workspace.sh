#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${TARGET_DIR:-/home/mhdev/workspace_private/nexusSynapse}"
TMP_ROOT="${TMP_ROOT:-/home/mhdev/tmp}"
COWORK_TMP="${COWORK_TMP:-$TMP_ROOT/cowork-repo}"
PROJECT_NAME="${PROJECT_NAME:-nexusSynapse}"
PROJECT_TITLE="${PROJECT_TITLE:-NexusSynapse}"
CODEX_HOME="${CODEX_HOME:-$HOME/.codex}"

log() {
  printf '[init_workspace] %s\n' "$*"
}

warn() {
  printf '[init_workspace] WARNING: %s\n' "$*" >&2
}

die() {
  printf '[init_workspace] ERROR: %s\n' "$*" >&2
  exit 1
}

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || die "필수 명령어가 없습니다: $1"
}

cleanup() {
  rm -rf "$COWORK_TMP"
}

backup_file() {
  local path="$1"
  [[ -e "$path" ]] || return 0

  local stamp backup
  stamp="$(date +%Y%m%d_%H%M%S)"
  backup="${path}.bak.${stamp}"
  cp -a "$path" "$backup"
  log "Backed up $path -> $backup"
}

replace_project_name() {
  local file="$1"
  [[ -f "$file" ]] || return 0
  sed -i "s/PROJECT_NAME/${PROJECT_TITLE}/g; s/\\[프로젝트명\\]/${PROJECT_TITLE}/g" "$file"
}

install_oma() {
  require_cmd bun

  log "Installing oh-my-agent globally"
  bun install --global oh-my-agent@latest

  require_cmd oma
  log "Running oma install"
  oma install
}

install_cowork_framework() {
  require_cmd git

  mkdir -p "$TMP_ROOT"
  cleanup

  log "Fetching cowork-context-framework"
  git clone --depth 1 https://github.com/lim8603/cowork-context-framework.git "$COWORK_TMP"

  [[ -d "$COWORK_TMP/frameworks/ko/.cowork" ]] || die "cowork framework .cowork 디렉터리를 찾지 못했습니다."

  backup_file ".cowork"
  rm -rf .cowork
  cp -a "$COWORK_TMP/frameworks/ko/.cowork" ./

  replace_project_name ".cowork/06_evolution/project_state.md"
  cleanup
}

init_gbrain() {
  if command -v gbrain >/dev/null 2>&1; then
    log "Initializing gbrain from $HOME"
    (cd "$HOME" && gbrain init --pglite)
  else
    warn "gbrain 명령어가 없어 초기화를 건너뜁니다."
  fi
}

install_delegate_script() {
  local source_script="$CODEX_HOME/scripts/delegate-gemma4.sh"
  local target_script="scripts/delegate-gemma4.sh"

  mkdir -p scripts

  if [[ -x "$source_script" ]]; then
    cp -a "$source_script" "$target_script"
    chmod +x "$target_script"
    log "Installed $target_script from $source_script"
  elif [[ -f "$source_script" ]]; then
    cp -a "$source_script" "$target_script"
    chmod +x "$target_script"
    log "Installed $target_script from $source_script"
  else
    warn "$source_script 파일이 없어 delegate 스크립트 설치를 건너뜁니다."
  fi
}

write_agents_md() {
  backup_file "AGENTS.md"

  log "Writing agent-first AGENTS.md"
  cat > AGENTS.md <<'EOF'
# nexusSynapse - AGENTS.md

이 파일은 OpenAI Codex와 Cursor가 세션 시작 시 먼저 읽는 **에이전트 실행 규약**이다.
목표는 사람이 읽기 좋은 설명보다, 에이전트가 바로 따라 할 수 있는 절차와 우선순위를 제공하는 것이다.

다른 AI 도구의 진입점은 다음과 같다.

- Claude Code: `CLAUDE.md`
- GitHub Copilot: `.github/copilot-instructions.md`
- Gemini Code Assist: `GEMINI.md`
- 공통 컨텍스트: `.cowork/`

---

## 0. 우선순위

명령이 충돌하면 아래 순서로 해석한다.

1. 시스템 / 런타임 / 도구 안전 규칙
2. 사용자의 최신 요청
3. 이 `AGENTS.md`
4. `.cowork/`의 Governance / Canonical / Registry 문서
5. OMA 관리 블록과 `.agents/` 규칙
6. 일반 관례 또는 추론

불확실한 경우에는 추측으로 문서 구조를 바꾸지 말고, 필요한 최소 질문을 한 뒤 진행한다.

---

## 1. 세션 부팅 절차

새 세션을 시작하면 다음 순서로 로드한다.

1. `gbrain query` 또는 `gbrain search`로 관련 지식을 먼저 검색한다.
2. 이 파일을 읽고 실행 규약을 확정한다.
3. `.cowork/06_evolution/project_state.md`를 읽어 현재 Phase, 활성 Intent, 활성 Milestone, 다음 시작점을 확인한다.
4. `project_state.md`의 Context Loading Guide가 지정한 registry/canonical 문서를 우선 로드한다.
5. 첫 세션이거나 맥락이 부족하면 `.cowork/cowork.md`와 `.cowork/01_cowork_protocol/document_role_inventory.md`를 읽는다.
6. `.cowork/members/*/workspace/session_logs/`에서 최신 개인 세션 로그를 확인한다.
7. `.cowork/members/*/proposals/`에 Pending Proposal이 있으면 사용자에게 알린다.
8. 대화 언어, 작업 문서 언어, export 문서 언어를 확인한다. 기본 대화 언어는 한국어다.
9. 프로젝트 현황, 활성 Intent / Milestone, 활성 Task, 사용 가능한 키워드를 먼저 브리핑한다.
10. 사용자의 최신 요청과 브리핑을 매칭해 작업 모드를 정한다.

세션 로그 자동 생성이나 `.gitignore` 갱신은 프로젝트 구조가 확인된 뒤 수행한다. 사용자 요청이 단일 파일 수정처럼 좁고 명확하면, 필요한 범위만 로드하고 과도한 부팅 절차는 생략할 수 있다.

---

## 2. 작업 모드 판별

사용자의 문장을 다음 규칙으로 해석한다.

- "읽고 시작", "이어서 진행": 세션 부팅 후 브리핑한다.
- "TASK-NNN": 해당 Task의 기준 문서와 로그를 찾고 다음 실행 단계를 제안한다.
- "업데이트", "수정", "고쳐줘", "구현": 합리적 범위가 명확하면 바로 실행한다.
- "계획", "검토", "비교", "브레인스토밍": 코드 변경 없이 분석과 선택지를 먼저 낸다.
- "리뷰": 코드 리뷰 모드로 진입해 결함, 회귀 위험, 누락 테스트를 우선 보고한다.
- "마무리", "끝", "오늘 여기까지": 세션 종료 절차를 수행한다.

기본 루프는 `Plan → Approve → Execute`다. 다만 사용자가 명시적으로 수정을 요청했고 범위가 안전하게 한정되면 승인 대기 없이 실행한다.

---

## 3. 위임 라우팅

복합 저장소 작업에서는 먼저 `agent-organizer`를 사용해 라우팅한다. 단, 런타임이 네이티브 subagent 호출을 허용하지 않거나 사용자가 위임을 원하지 않는 경우에는 로컬 실행으로 대체하고 그 사실을 명시한다.

`agent-organizer`는 항상 다음을 결정한다.

- 사용할 실제 upstream subagent
- 각 subagent의 `gemma4` 모델 티어
- 병렬 실행 여부
- 각 작업의 파일 / 모듈 소유권
- 통합 및 검증 방식

`agent-organizer`의 출력 형식은 항상 다음 구조를 따른다.

A) Local now  
B) Delegation lineup  
C) Ownership split  
D) Prompt skeletons  
E) Wait strategy  
F) Risks  
G) Final integration notes

위임이 실행되어야 하는 작업에서 `agent-organizer`는 계획만 내고 멈추지 않는다. 위임 결과를 통합하고, 파일과 line reference를 직접 검증한 뒤 최종 결론을 낸다.

---

## 4. Upstream Subagent 카탈로그

존재하는 upstream subagent만 사용한다. 새 이름을 만들지 않는다.

대표적으로 사용할 수 있는 agent:

- `reviewer`
- `docs-researcher`
- `debugger`
- `error-detective`
- `code-mapper`
- `test-automator`
- `security-auditor`
- `performance-engineer`
- `frontend-developer`
- `backend-developer`
- `fullstack-developer`
- `devops-engineer`
- `deployment-engineer`
- `build-engineer`
- `docker-expert`
- `python-pro`
- `typescript-pro`
- `javascript-pro`
- `golang-pro`
- `java-architect`
- `cpp-pro`
- `csharp-developer`
- `kotlin-specialist`
- `powershell-7-expert`

원하는 역할이 실제 `.codex/agents/*.toml` 또는 upstream package에 없으면, 가장 가까운 실제 agent로 해석한다.

`language-specialist`는 추상 역할이다. 반드시 실제 agent로 변환한다.

| 파일 확장자 | 실제 agent |
|------------|------------|
| `.py` | `python-pro` |
| `.ts` | `typescript-pro` |
| `.js` | `javascript-pro` |
| `.cpp`, `.cc`, `.cxx`, `.h`, `.hpp` | `cpp-pro` |
| `.cs` | `csharp-developer` |
| `.kt` | `kotlin-specialist` |
| `.ps1` | `powershell-7-expert` |

---

## 5. Gemma4 위임 실행 규약

위임 subagent는 일반적으로 다음 명령을 호출한다.

```bash
MODEL=<model> bash "${CODEX_HOME:-$HOME/.codex}/scripts/delegate-gemma4.sh" <prompt-file>
```

프로젝트 루트에 호환 가능한 `scripts/delegate-gemma4.sh`가 있으면 그 파일을 우선 사용한다.

규칙:

- `<prompt-file>`은 전체 위임 프롬프트를 담은 실제 파일 경로여야 한다.
- `-f <prompt-file>`은 호환 목적으로만 허용한다.
- 정상 위임에서는 직접 prompt string을 쓰지 않는다.
- `MODEL` 환경변수는 필수다.
- 전체 multiline 출력을 보존한다.
- 마지막 줄만 잘라 쓰지 않는다.
- 실패는 non-zero exit code로 전파한다.
- delegate output을 해당 subtask의 primary analysis result로 취급한다.
- 최종 보고 전에는 delegate의 주장을 repository 파일과 line reference로 검증한다.

허용 모델은 다음뿐이다.

| 모델 | 용도 |
|------|------|
| `gemma4:31b` | 깊은 추론, 아키텍처, 보안, 회귀 리뷰, 교차 파일 검증 |
| `gemma4:26b` | 구현, 리팩터, 타깃 코드 변경, 테스트 |
| `gemma4:e4b` | 스캔, 매핑, 가벼운 분석, 저장소 정찰 |

추가 규칙:

- subagent가 모델을 직접 선택하지 않는다.
- `agent-organizer`가 모델을 지정한다.
- `reviewer`는 항상 `gemma4:31b`를 사용한다.
- 위임 스크립트는 허용 목록 밖의 모델을 거부해야 한다.

---

## 6. 병렬 실행과 소유권

독립적인 subtask는 병렬 실행한다. 단, 같은 파일이나 같은 모듈을 동시에 쓰게 하지 않는다.

각 위임 prompt에는 반드시 다음을 포함한다.

- bounded scope
- exact files or modules
- ownership boundary
- testable deliverable
- 다른 작업자의 변경을 되돌리지 말라는 지시

권장 패턴:

- 기능 구현: language specialist + layer agent + reviewer + test-automator
- 버그 수정: debugger 또는 error-detective + language specialist + reviewer
- 문서 불일치: docs-researcher + code-mapper + reviewer

병렬 실행 중 기다리는 전략:

- 즉시 필요한 blocking 결과는 로컬에서 처리한다.
- sidecar 분석이나 독립 검증만 병렬 위임한다.
- delegate가 끝나면 결과를 그대로 믿지 말고, 최소한 변경 파일과 핵심 line reference를 직접 확인한다.

---

## 7. 문서와 의사결정

문서 역할과 의사결정은 `.cowork/`의 기준 문서를 따른다.

- 의사결정 권한: `.cowork/01_cowork_protocol/decision_authority_matrix.md`
- 문서 역할 구분: `.cowork/01_cowork_protocol/document_role_inventory.md`
- 커뮤니케이션 규칙: `.cowork/01_cowork_protocol/communication_convention.md`
- 도구 / 승인 / 업그레이드 운영: `.cowork/01_cowork_protocol/tooling_environment_guide.md`
- 코딩 컨벤션: `.cowork/04_implementation/coding_convention.md`

주요 설계 결정은 ADR로 기록한다.

```text
.cowork/03_design_artifacts/adrs/ADR-NNN_[summary].md
```

문서 구조 변경과 Registry 승격은 Human 승인 후 진행한다. 외부 대화나 메모를 반입할 때는 원문을 `.cowork/06_evolution/imported_context/`에 보관하고, 필요한 사실만 registry/canonical 문서에 반영한다.

---

## 8. 자동 기록

Codex 또는 Cursor는 다음을 별도 허락 없이 수행할 수 있다.

- 세션 시작 시 `.cowork/members/<name>/workspace/session_logs/session_YYYY-MM-DD_NNN.md` 생성
- 세션 로그 제외 규칙이 없으면 `.gitignore` 갱신
- 주요 상태 변경 시 `.cowork/06_evolution/project_state.md` 갱신
- 파일 생성 / 수정 / 삭제를 세션 로그에 기록
- 주요 결정, 승인, 거부를 세션 로그에 기록
- 세션 종료 시 개인 `my_state.md` 동기화
- "마무리" 선언 시 세션 로그 마감

사용자 요청이 단순 파일 수정이고 세션 로그 컨텍스트가 준비되지 않은 경우, 작업 완료를 우선하고 자동 기록 미수행 사실을 최종 보고에 남긴다.

---

## 9. 자동화 키워드

| 키워드 | 동작 |
|--------|------|
| `마무리` / `끝` / `오늘 여기까지` | Session End Enrichment Check → 세션 로그 마감 → `my_state.md` 동기화 |
| `~로 가자` / `~로 결정` | ADR 생성 및 채번 |
| `제안` | Change Proposal 생성 |
| `~단계로 넘어가자` | Pre-Gate Harvest → `quality_gate.md` 점검 |
| `릴리즈` / `문서 생성` / `export` | Pre-Release Harvest → Gate 5 점검 → `docs/` 산출 |
| `업그레이드` | `tooling_environment_guide.md` + `upgrade_manifest.md` 기준 프레임워크 갱신 |

트리거가 감지되면 먼저 관련 `.cowork/` 기준 문서를 확인한 뒤 실행한다.

---

## 10. 최종 검증

최종 답변 전에 다음을 확인한다.

- 실제 repository path가 존재하는가
- 수정한 파일이 의도한 범위 안에 있는가
- line reference가 현재 파일 기준으로 맞는가
- delegate 결과와 로컬 확인이 충돌하지 않는가
- 중복 finding을 합쳤는가
- 테스트나 검증을 못 했다면 그 이유를 명시했는가
- 불확실성은 추측으로 덮지 않고 별도로 표시했는가

---

## 11. 프로젝트 컨텍스트

아래 항목은 프로젝트 시작 시 채우고, 변경되면 갱신한다.

- **프로젝트:** nexusSynapse
- **기술 스택:**
- **주 언어:**
- **핵심 문서:** `AGENTS.md`, `.cowork/`, `.agents/`
- **현재 Phase:**
- **마일스톤:**

---

<!-- OMA:START — managed by oh-my-agent. Do not edit this block manually. -->

# oh-my-agent

## Architecture

- **SSOT**: `.agents/` directory (do not modify directly)
- **Response language**: Follows `language` in `.agents/oma-config.yaml`
- **Skills**: `.agents/skills/` (domain specialists)
- **Workflows**: `.agents/workflows/` (multi-step orchestration)
- **Subagents**: Same-vendor native dispatch via Codex custom agents in `.codex/agents/{name}.toml`; cross-vendor fallback via `oma agent:spawn`

## Per-Agent Dispatch

1. Resolve `target_vendor_for_agent` from `.agents/oma-config.yaml`.
2. If `target_vendor_for_agent === current_runtime_vendor`, use the runtime's native subagent path.
3. If vendors differ, or native subagents are unavailable, use `oma agent:spawn` for that agent only.

## Workflows

Execute by naming the workflow in your prompt. Keywords are auto-detected via hooks.

| Workflow | File | Description |
|----------|------|-------------|
| orchestrate | `orchestrate.md` | Parallel subagents + Review Loop |
| work | `work.md` | Step-by-step with remediation loop |
| ultrawork | `ultrawork.md` | 5-Phase Gate Loop (11 reviews) |
| plan | `plan.md` | PM task breakdown |
| brainstorm | `brainstorm.md` | Design-first ideation |
| review | `review.md` | QA audit |
| debug | `debug.md` | Root cause + minimal fix |
| scm | `scm.md` | SCM + Git operations + Conventional Commits |

To execute: read and follow `.agents/workflows/{name}.md` step by step.

## Auto-Detection

Hooks: `UserPromptSubmit` (keyword detection), `PreToolUse`, `Stop` (persistent mode)
Keywords defined in `.agents/hooks/core/triggers.json` (multi-language).
Persistent workflows (orchestrate, ultrawork, work) block termination until complete.
Deactivate: say "workflow done".

## Rules

1. **Do not modify `.agents/` files** — SSOT protection
2. Workflows execute via keyword detection or explicit naming — never self-initiated
3. Response language follows `.agents/oma-config.yaml`

## Project Rules

Read the relevant file from `.agents/rules/` when working on matching code.

| Rule | File | Scope |
|------|------|-------|
| debug | `.agents/rules/debug.md` | on request |
| quality | `.agents/rules/quality.md` | on request |
| i18n-guide | `.agents/rules/i18n-guide.md` | always |
| backend | `.agents/rules/backend.md` | on request |
| frontend | `.agents/rules/frontend.md` | **/*.{tsx,jsx,css,scss} |
| design | `.agents/rules/design.md` | on request |
| commit | `.agents/rules/commit.md` | on request |
| infrastructure | `.agents/rules/infrastructure.md` | **/*.{tf,tfvars,hcl} |
| dev-workflow | `.agents/rules/dev-workflow.md` | on request |
| mobile | `.agents/rules/mobile.md` | **/*.{dart,swift,kt} |
| database | `.agents/rules/database.md` | **/*.{sql,prisma} |

<!-- OMA:END -->

## 12. 지식망 연동 (GBrain)
모든 작업 전 반드시 글로벌 환경에 연동된 `gbrain query`나 `gbrain search`를 통해 관련 지식을 탐색하고, 새로운 아키텍처 결정은 장기 기억으로 기록하라.
EOF
}

validate_workspace() {
  [[ -d .cowork ]] || die ".cowork 디렉터리가 없습니다."
  [[ -f AGENTS.md ]] || die "AGENTS.md 파일이 없습니다."
  grep -q '<!-- OMA:START' AGENTS.md || die "AGENTS.md에 OMA 시작 마커가 없습니다."
  grep -q '<!-- OMA:END' AGENTS.md || die "AGENTS.md에 OMA 종료 마커가 없습니다."
  bash -n scripts/init_workspace.sh
}

main() {
  trap cleanup EXIT

  mkdir -p "$TARGET_DIR"
  cd "$TARGET_DIR"

  install_oma
  install_cowork_framework
  init_gbrain
  install_delegate_script
  write_agents_md
  validate_workspace

  log "완료: workspace initialization finished"
}

main "$@"
