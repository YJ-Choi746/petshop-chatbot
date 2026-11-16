# CLAUDE.md

펫샵 AI 상담 챗봇 데모. 사용자는 비개발자(기획/PM)이므로 설명은 한국어로 쉽게.

## 실행
- 로컬: `npm start` → http://localhost:3000 (Node 18+, 외부 의존성 없음). `.env`: `ANTHROPIC_API_KEY`, `ADMIN_PASSWORD`, `ANTHROPIC_MODEL`(기본 claude-haiku-4-5). 요청마다 다시 읽음 → 재시작 불필요
- 배포 A(현재): Vercel(`vercel.json`, `api/index.js`, 서울 icn1) + Firestore(서비스 계정 키는 Vercel 환경 변수 `FIREBASE_SERVICE_ACCOUNT`). 배포 B: Firebase Hosting + Cloud Functions `api`(Blaze 필요, 비밀 값은 Secret Manager)

## 구조
- `functions/api.js`: API 전체 (로컬·Firebase 공용). 저장소만 주입: 로컬 `store-file.js`(data/*.json), Firebase `functions/store-firestore.js`
  - 공개: `/api/health`, `/api/public-data`(상품·재고·정책만), `/api/verify`(주문 본인 확인, 5회 실패 30분 잠금), `/api/chat`(지시사항·데이터·피드백 지침은 서버에서 붙임, 500자·방문자당 시간 30회 제한), `/api/logs`, `/api/logs/report`
  - 관리자(Bearer 토큰, `/api/admin/login`): `/api/admin/data|defaults|logs|logs/feedback|guides`
- `public/index.html`: 단일 파일 프론트엔드. 브라우저는 주문·배송·고객 정보를 갖지 않음(본인 확인된 주문만 메모리에)
  - `instantReply()` — 재고/가격/정책은 규칙 기반 즉시 응답, 주문번호·운송장은 `askVerify()` → `checkVerify()`(서버)
  - 그 외 → `petSend()` → `streamChat()` (`/api/chat`), 응답의 `[[P003]]` 태그를 상품 카드로 렌더
  - 대화 기록 `logMessage()` → `/api/logs`. 방문자 ID만 localStorage, 관리자 토큰은 sessionStorage
- `functions/defaults.js`: 기본 가상 데이터

## 규칙
- API 키·관리자 비밀번호를 프론트엔드 코드나 로그에 절대 넣지 말 것 (`.env`, `data/`는 gitignore됨)
- Firestore는 브라우저 직접 접근 차단(`firestore.rules`) — 데이터 접근은 항상 functions/api.js 경유
