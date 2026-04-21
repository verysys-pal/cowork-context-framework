# Cowork Monitoring Dashboard

이 대시보드는 `.cowork` 폴더 내의 프로젝트 관리 상태(Intents, Milestones, Tasks, ADRs)를 시각화하고, 로컬 파일 시스템 및 Git 상태를 실시간으로 모니터링하는 웹 기반 도구입니다.

## 주요 기능

- **폴더별 파일 뷰**: 프로젝트 구조를 폴더 카드 형태로 한눈에 파악
- **실시간 변화 감지**: Git 상태(`M`, `A`, `??`, `D`)를 기반으로 최근 변경 사항 트래킹
- **Traceability Map**: Mermaid.js를 이용한 레지스트리 파일 간 유기적 연결망 시각화
- **마크다운 프리뷰**: 대시보드 내에서 마크다운 문서 내용을 즉시 확인

## 설치 및 실행 방법

### 1. 의존성 설치
대시보드 루트(이 폴더) 및 클라이언트/서버 폴더에서 의존성을 설치해야 합니다.

```bash
# 전체 의존성 설치 (루트에서 실행)
npm install
```

### 2. 실행
개발 모드에서 클라이언트와 서버를 동시에 실행합니다.

```bash
npm run dev
```

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:3002

## 프로젝트 구조

- `client/`: React + Vite 기반의 프론트엔드 (TypeScript)
- `server/`: Express 기반의 백엔드 API (TypeScript)
- `scripts/`: 프로젝트 초기화 및 유틸리티 스크립트

## 참고 사항

- 이 대시보드는 프로젝트 루트에 있는 `.cowork` 폴더를 자동으로 스캔합니다.
- Traceability Map은 각 문서 상단의 `| ID |` 테이블을 파싱하여 생성됩니다.
