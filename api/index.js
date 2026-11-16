// Vercel 서버 함수 진입점 — /api/* 요청을 functions/api.js(로컬·Firebase와 같은 코드)로 처리하고, 데이터는 Firebase Firestore에 저장
// Vercel 환경 변수(프로젝트 Settings › Environment Variables, 암호화 보관):
//   ANTHROPIC_API_KEY        Claude API 키
//   ADMIN_PASSWORD           관리자 화면 비밀번호
//   FIREBASE_SERVICE_ACCOUNT Firebase 서비스 계정 키(JSON 파일 내용 전체)
//   ANTHROPIC_MODEL          (선택) 기본 claude-haiku-4-5
const admin = require('firebase-admin');
const { createApi } = require('../functions/api');
const { createFirestoreStore } = require('../functions/store-firestore');

let handler = null, initError = null;
function init() {
  if (handler || initError) return;
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT || '';
    if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT 환경 변수가 없어요');
    const sa = JSON.parse(raw.trim().startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8'));
    if (!admin.apps.length) admin.initializeApp({ credential: admin.credential.cert(sa), projectId: sa.project_id });
    handler = createApi({
      store: createFirestoreStore(admin.firestore()),
      getKey: () => process.env.ANTHROPIC_API_KEY || '',
      getModel: () => process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5',
      getAdminPassword: () => process.env.ADMIN_PASSWORD || '',
      mode: 'vercel'
    });
  } catch (e) {
    initError = e.message.includes('JSON') || e.message.includes('Unexpected') ? 'FIREBASE_SERVICE_ACCOUNT 형식이 올바르지 않아요 (JSON 파일 내용 전체를 넣어 주세요)' : e.message;
  }
}

module.exports = async (req, res) => {
  init();
  if (initError) {
    // 데이터 저장소 연결 전에도 상태 확인은 가능하게
    if (String(req.url || '').startsWith('/api/health')) {
      res.writeHead(200, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, hasKey: /^sk-ant-/.test(process.env.ANTHROPIC_API_KEY || ''), model: process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5', mode: 'vercel', adminReady: !!process.env.ADMIN_PASSWORD, error: initError }));
    }
    res.writeHead(503, { 'content-type': 'application/json; charset=utf-8' });
    return res.end(JSON.stringify({ error: '데이터 저장소 설정이 필요해요: ' + initError }));
  }
  return handler(req, res);
};
