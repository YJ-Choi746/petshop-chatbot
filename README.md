# 🐾 펫샵 AI 상담 챗봇

고객 상담 챗봇 + 관리자 페이지. 상품 재고·가격은 데이터로 즉시 답하고, 주문·배송은 **연락처 뒤 4자리 본인 확인** 후 조회하며, 추천 같은 자유 질문은 Claude API가 답해요.
관리자는 대화 기록과 신고된 답변을 보고 피드백을 남기면, 그 피드백이 **다음 AI 답변 지침**으로 바로 반영돼요.

- 로컬 실행: `npm start` (저장: `data/` 폴더)
- 배포: Firebase Hosting + Cloud Functions + Firestore (저장: Firestore, 비밀 값: Secret Manager)

> 상품명·가격은 펫프렌즈 모바일 메인 노출 상품(2026-11-16)을 참고한 **데모용 데이터**이고, 재고·주문·배송·고객은 모두 가상 데이터예요.

## 1. 로컬 실행
준비물: **Node.js 18 이상**, **Anthropic API 키**(`sk-ant-...`)

1. `.env.example`을 복사해 `.env`를 만들고 값을 채워요.
   ```
   ANTHROPIC_API_KEY=sk-ant-xxxxxxxx
   ADMIN_PASSWORD=관리자-비밀번호
   ```
2. 실행
   ```bash
   npm start
   ```
3. 브라우저에서 **http://localhost:3000** → 상단 **연결 확인**이 초록색(● API 연결됨)이면 성공. 종료는 `Ctrl + C`.

> `.env`와 `data/`는 `.gitignore`에 있어 GitHub에 올라가지 않아요. 키·비밀번호는 서버만 읽고 브라우저로 보내지 않아요.

## 2. 테스트해 볼 것
| 입력 | 동작 |
|---|---|
| `PF-261112-003` → 연락처 뒤 4자리 `1192` | 본인 확인 후 주문·배송 조회. 5번 틀리면 그 주문은 30분 잠금(새로고침해도 유지) |
| `오리젠 재고 있어요?` | 재고·가격 카드 즉시 표시 |
| `알러지 있는 소형견 사료 추천해 주세요` | **AI 답변** + 추천 상품 카드 |
| `오늘 날씨 어때?` | 쇼핑 무관 질문 → 거절 문구 |
| 답변 아래 **🚩 답변 신고** | 사유 선택 → 관리자 › 대화 기록에 표시 |

관리자 탭은 **관리자 비밀번호**로 로그인해요. (테스트용 연락처 뒤 4자리는 관리자 › 주문 내역에 있어요)

## 3. Firebase 배포
필요한 것: Firebase 프로젝트(**Blaze 요금제** — Cloud Functions·Secret Manager 사용 조건), Firebase CLI

```bash
npm install -g firebase-tools      # 또는 npx firebase-tools ...
firebase login
firebase use --add                 # 배포할 프로젝트 선택
cd functions && npm install && cd ..
firebase functions:secrets:set ANTHROPIC_API_KEY   # 값 입력 (화면에 안 보임)
firebase functions:secrets:set ADMIN_PASSWORD      # 관리자 비밀번호 입력
firebase deploy
```
배포가 끝나면 `Hosting URL: https://<프로젝트ID>.web.app` 주소가 나와요.
Firestore 데이터베이스가 없으면 Firebase 콘솔 › Firestore Database › **데이터베이스 만들기**(위치: asia-northeast3 서울)를 먼저 해 주세요.

## 4. 구조
```
petshop-chatbot/
├─ public/index.html          챗봇 + 관리자 화면 (HTML/CSS/JS 한 파일)
├─ functions/                 서버 API (로컬·Firebase 공용)
│  ├─ api.js                  API 전체: 본인 확인, AI 상담(지시사항·지침은 서버에서 붙임), 대화 기록, 관리자
│  ├─ defaults.js             기본(가상) 데이터
│  ├─ index.js                Firebase Cloud Functions 진입점 (비밀 값: Secret Manager)
│  └─ store-firestore.js      Firestore 저장소
├─ server.js                  로컬 서버 (functions/api.js + 파일 저장소)
├─ store-file.js              로컬 저장소 (data/*.json)
├─ firebase.json              Hosting(/api/** → 함수) · Functions · Firestore 설정
├─ firestore.rules            브라우저의 Firestore 직접 접근 차단 (모든 데이터는 서버 경유)
└─ .env.example               로컬 환경 변수 예시
```

## 5. 데이터는 어디에 저장되나요
| 데이터 | 로컬 | Firebase |
|---|---|---|
| 상품·재고·주문·배송·정책 | `data/shop.json` | Firestore `shop/main` |
| 대화 기록·신고·피드백 | `data/sessions.json` | Firestore `sessions` |
| 피드백 지침 | `data/guides-store.json` | Firestore `guides` |
| 본인 확인 잠금 | `data/locks.json` | Firestore `locks` |
| AI 사용량 (방문자당 시간 30회) | `data/rate.json` | Firestore `rate` |
| AI 키·관리자 비밀번호 | `.env` | Secret Manager |
| 방문자 ID | 브라우저 localStorage (브라우저를 구분하는 표시) | 같음 |
| 관리자 로그인 토큰(12시간) | 브라우저 sessionStorage | 같음 |

## 문제 해결
- **● .env에 ANTHROPIC_API_KEY가 없어요** → `.env` 저장 확인 (서버 재시작 불필요)
- **관리자 비밀번호가 아직 설정되지 않았어요** → `.env`(로컬) 또는 `firebase functions:secrets:set ADMIN_PASSWORD`(배포)
- **연결 실패: invalid x-api-key** → 키 앞뒤 공백·따옴표 제거
- **EADDRINUSE** → 3000 포트 사용 중. `.env`의 `PORT=3001`로 바꾸고 재실행
