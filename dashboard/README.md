# Cowork Monitoring Dashboard

이 대시보드는 AI-Human 협업 프레임워크(`.cowork`)를 기반으로 한 프로젝트 관리 상태, 파일 시스템 모니터링, 그리고 시스템 리소스 현황을 통합 시각화하는 고성능 웹 대시보드입니다.

## 🚀 주요 기능

### 1. 지능형 파일 모니터링 (Monitoring)
- **자유로운 경로 탐색**: 프로젝트 루트부터 사용자 홈 디렉토리(`/home/mhdev`)까지 자유롭게 이동하며 모니터링 대상을 변경할 수 있습니다.
- **실시간 변화 감지**: 마지막 수정 시간(mtime) 및 Git 상태(`M`, `A`, `D` 등)를 기반으로 날짜별 변경 내역을 트래킹합니다.
- **지능형 폴더 제외 (Exclusion System)**: `node_modules`, `.git` 등 불필요한 폴더를 UI에서 즉시 제외하고 관리할 수 있습니다. (설정은 `server/data/config.json`에 영구 저장)

### 2. 프로젝트 트레이서빌리티 (Traceability Map)
- **Registry 기반 시각화**: Intent-Milestone-Task-ADR 간의 유기적인 연결 관계를 Mermaid.js 그래프로 시각화합니다.
- **문서 연동**: 그래프의 각 노드에 대응하는 마크다운 파일을 즉시 확인하고 탐색할 수 있습니다.

### 3. 실시간 시스템 리소스 대시보드 (OpenCode Usage)
- **OpenCode 통계**: 모델별 메시지 사용량 및 토큰 소모량을 실시간 스냅샷으로 제공합니다.
- **GPU 모니터링 (`nvtop`)**: GPU 사용량 및 프로세스를 대시보드 내에서 실시간으로 스트리밍합니다.
- **시스템 모니터링 (`glances`)**: 1초 단위로 갱신되는 CPU, 메모리, 네트워크 현황을 제공합니다.

### 4. 퍼스널 링크 및 메모 매니저
- **Link 저장소**: 유용한 웹 링크와 함께 마크다운 기반의 전용 메모를 작성하고 관리할 수 있습니다.
- **태그 분류**: 태그별로 링크를 그룹화하여 효율적인 관리가 가능합니다.

---

## 🛠 설치 및 실행 방법

### 1. 시스템 의존성 설치
대시보드의 전체 기능을 위해 다음 도구들이 시스템에 설치되어 있어야 합니다.
- **Node.js**: v18 이상
- **nvtop**: GPU 모니터링용
- **glances**: 시스템 모니터링용 (`pip install glances` 권장)
- **Git**: 파일 상태 추적용

### 2. 프로젝트 의존성 설치
```bash
# 클라이언트 및 서버 의존성 통합 설치
npm install
```

### 3. 대시보드 실행
```bash
# 클라이언트(3001) 및 서버(3002) 동시 실행
npm run dev
```

### 4. 모니터링 도구(nvtop, glances) 수동 시작 (필요 시)
대시보드 내 실시간 모니터링 화면이 보이지 않을 경우 아래 터미널 명령어를 실행하십시오.
```bash
# GPU 모니터 터미널 스트리밍 (Port 7681)
./dashboard/server/.bin/ttyd -p 7681 nvtop

# 시스템 모니터 웹 서비스 (Port 61208)
glances -w -t 1
```

---

## 📂 프로젝트 구조

- `client/`: React + Vite + Vanilla CSS 기반의 최첨단 UI (TypeScript)
- `server/`: Express 기반의 지능형 백엔드 API (TypeScript)
  - `data/`: 사용자 설정(`config.json`) 및 링크 데이터 저장
- `.bin/`: `ttyd` 등 무설치 실행을 위한 유틸리티 바이너리 저장소

## 📝 환경 설정
서버 실행 시 `MONITOR_FOLDER` 환경 변수를 통해 초기 모니터링 경로를 강제할 수 있습니다. (설정된 값은 이후 `config.json`에 의해 유지됩니다.)

---
*Created and maintained by Antigravity AI.*
