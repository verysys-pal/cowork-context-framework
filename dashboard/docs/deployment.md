# Deployment and External Access Guide

이 문서는 Cowork Monitoring Dashboard를 데몬(Daemon)으로 실행하고, 외부 환경에서 접속할 수 있도록 설정하는 방법을 설명합니다.

---

## 1. PM2를 이용한 데몬 실행 (추천)

PM2는 Node.js 애플리케이션을 백그라운드에서 유지하고 관리해주는 프로세스 매니저입니다.

### PM2 설치
```bash
npm install -g pm2
```

### 서버 및 클라이언트 시작
```bash
# 1. 서버 실행 (Backend)
cd dashboard/server
pm2 start npm --name "cowork-api" -- run start

# 2. 클라이언트 실행 (Frontend)
cd ../client
pm2 start npm --name "cowork-ui" -- run dev
```

서버는 `dashboard/server/package.json`의 `start` 스크립트(`node --loader ts-node/esm index.ts`)를 기준으로 실행합니다. 개발 중 자동 재시작이 필요하면 서버 명령만 `pm2 start npm --name "cowork-api" -- run dev`로 바꿀 수 있습니다.

### 모니터링 도구 데몬 실행
```bash
cd dashboard

# nvtop (ttyd) 데몬
pm2 start ./server/.bin/ttyd --name "cowork-nvtop" -- -p 7681 nvtop

# glances 데몬
pm2 start glances --name "cowork-glances" -- -w -t 1
```

`ttyd` 바이너리는 현재 대시보드 구성 기준으로 `dashboard/server/.bin/ttyd`에 있어야 합니다. `glances`는 시스템에 별도로 설치되어 있어야 하며, 일반적으로 `pip install glances`로 설치합니다.

---

## 2. 외부 접속 설정 (External Access)

외부에서 대시보드에 접속하려면 포트 포워딩이나 리버스 프록시 설정이 필요합니다. 현재 프론트엔드는 API를 `http://localhost:3002/api/workspace`로 호출하고, nvtop/glances iframe은 `window.location.hostname`과 고정 포트(`7681`, `61208`)를 사용합니다.

### A. Nginx 리버스 프록시 설정 (보안 및 성능 권장)
외부 80(HTTP) 또는 443(HTTPS) 포트로 들어오는 UI/API 요청을 내부 포트로 전달합니다.

> 현재 `App.tsx`의 `API_BASE`는 `localhost:3002`를 직접 가리키므로, 외부 브라우저에서 API를 사용하려면 `API_BASE`를 배포 도메인 기준으로 조정해야 합니다. 예를 들어 같은 도메인에서 Nginx로 `/api`를 프록시한다면 `API_BASE`를 `/api/workspace`로 바꾸는 방식이 가장 단순합니다.

`/etc/nginx/sites-available/cowork` 설정 예시:
```nginx
server {
    listen 80;
    server_name your.domain.com; # 또는 IP 주소

    # Frontend UI
    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

nvtop과 glances iframe은 현재 각각 `http://<접속한 호스트>:7681`, `http://<접속한 호스트>:61208`로 열립니다. 따라서 별도 코드 변경 없이 사용하려면 아래 포트 포워딩 또는 방화벽 허용이 필요합니다. 이 둘까지 Nginx 하위 경로(`/nvtop/`, `/glances/`)로 통합하려면 `App.tsx`의 iframe `src`도 해당 경로로 함께 변경해야 합니다.

### B. 포트 포워딩 (공유기 환경)
공유기를 사용 중이고 Nginx만으로 모든 트래픽을 통합하지 않는다면 다음 포트들을 대시보드가 설치된 PC의 IP로 포워딩해야 합니다.
- **3001**: 메인 화면 (UI)
- **3002**: API 서버
- **7681**: nvtop 화면
- **61208**: glances 화면

단, Vite 개발 서버는 기본 설정에서 외부 인터페이스가 아니라 localhost에만 바인딩될 수 있습니다. Nginx를 같은 서버에서 리버스 프록시로 쓰는 경우에는 문제가 없지만, 3001 포트를 직접 외부에 열어 접속하려면 `dashboard/client/vite.config.ts`의 `server.host`를 `0.0.0.0`으로 설정하거나 동등한 실행 옵션을 사용해야 합니다.

---

## 3. 주의 사항

1.  **방화벽(Firewall)**: 직접 포트 접속을 사용할 경우 `ufw`나 `iptables`에서 위 포트들을 허용해야 합니다.
    ```bash
    sudo ufw allow 3001,3002,7681,61208/tcp
    ```
2.  **보안**: 외부에서 접속할 경우 대시보드와 파일 탐색 API가 노출될 수 있으므로, 반드시 Nginx의 `auth_basic` 또는 VPN/방화벽 allowlist 등을 이용해 **인증과 접근 제한**을 설정할 것을 강력히 권장합니다.
3.  **API_BASE 확인**: 외부 브라우저에서 접속할 때 `localhost`는 서버가 아니라 사용자의 PC를 의미합니다. 배포 환경에서는 `App.tsx`의 `API_BASE`를 실제 API 접근 경로에 맞게 조정해야 합니다.
4.  **iframe 접속 방식 확인**: nvtop/glances iframe은 현재 접속한 호스트명과 고정 포트를 사용하므로, 도메인 접속 시에도 `7681`, `61208` 포트가 외부에서 접근 가능해야 합니다. 포트를 숨기려면 Nginx 프록시 설정과 `App.tsx` iframe 경로를 함께 변경하십시오.

---
*Last Updated: 2026-04-24*
