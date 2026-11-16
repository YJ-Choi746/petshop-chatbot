// 펫샵 챗봇 API — 로컬 서버(server.js)와 Firebase Cloud Functions(index.js)가 함께 쓰는 코드
// 저장소(store)만 다르게 주입: 로컬은 data/ 폴더 JSON 파일, Firebase는 Firestore
//
// 공개 API (고객)
//   GET  /api/health                 서버·AI 키 상태 (?check=1 이면 AI에 1토큰 요청으로 실제 연결 확인)
//   GET  /api/public-data            상품·재고·정책 (주문·배송·고객 정보 제외)
//   POST /api/verify                 주문번호/운송장 + 연락처 뒤 4자리 본인 확인 → 해당 주문만 반환
//   POST /api/chat                   AI 상담 (지시사항·데이터·피드백 지침은 서버가 붙임, 스트리밍)
//   POST /api/logs                   대화 메시지 기록
//   POST /api/logs/report            답변 신고
// 관리자 API (Authorization: Bearer 토큰)
//   POST /api/admin/login            관리자 비밀번호 → 토큰(12시간)
//   GET|PUT /api/admin/data          전체 데이터 조회·저장
//   GET  /api/admin/defaults         기본 데이터
//   GET|DELETE /api/admin/logs       대화 기록 조회·전체 삭제
//   POST /api/admin/logs/feedback    답변 피드백 저장
//   GET|POST /api/admin/guides, PATCH|DELETE /api/admin/guides/:id   피드백 지침
const crypto = require('crypto');
const DEFAULTS = require('./defaults');

const LIMITS = {
  message: 500,            // 고객 질문 최대 글자 수
  history: 6,              // AI에 함께 보내는 이전 대화 수
  historyText: 2000,
  logText: 4000,
  sessionMessages: 300,    // 대화 1건당 최대 메시지 수
  sessions: 300,           // 관리자 화면에 불러오는 최대 대화 수
  guide: 500, guideQuestion: 300, guideAnswer: 1500,
  guidesInPrompt: 20,
  verifyTries: 5, verifyLockMinutes: 30,
  chatPerHour: 30,         // 방문자 1명당 시간당 AI 질문 수
  tokenHours: 12
};
const REPORT_REASONS = ['사실과 다름', '질문을 이해 못함', '부적절한 표현', '기타'];
const PET_OFF = '잘 모르겠어요, 펫 쇼핑몰 관련 질문만 부탁드려요.';
const PET_RULES = `당신은 반려동물 쇼핑몰 '펫샵'의 AI 상담원입니다. (데모: 상품은 펫프렌즈 노출 상품 참고, 재고·주문·배송은 가상 데이터)
규칙:
1. 아래 [데이터]만 근거로 답하세요. 데이터에 없는 가격·재고·배송일·정책은 지어내지 말고 "확인되지 않는 정보"라고 안내하세요.
2. 반려동물 쇼핑(상품·사료·간식·용품 추천, 주문, 배송, 재고, 교환/반품, 결제, 쿠폰)과 무관한 질문에는 다른 말 없이 정확히 "${PET_OFF}"라고만 답하세요.
3. 2~4문장으로 짧게, 결론부터. 친절한 상담원 말투.
4. 상품을 추천·언급하면 문장 끝에 [[P003]]처럼 상품ID 태그를 붙이세요(최대 3개). 품절 상품은 입고 예정일을 함께 알리고 대체 상품을 제안하세요.
5. [주문]에는 이 대화에서 본인 확인을 마친 주문만 들어 있어요. 그 밖의 주문을 물으면 "주문번호를 입력하고 연락처 뒤 4자리로 본인 확인을 해 주세요"라고 안내하고, 다른 고객의 주문 여부는 추측하지 마세요.
6. 질병·증상 관련 질문은 수의사 상담을 권하세요.
7. 마크다운 기호(**, #, - 목록 등)를 쓰지 말고 일반 문장으로 답하세요.
8. 재고 상태가 '소량'이면 "남은 수량이 적어요"라고 안내하고 "충분하다"고 말하지 마세요.`;

const clip = (v, n) => String(v ?? '').trim().slice(0, n);
const nowIso = () => new Date().toISOString();
const newId = p => p + '-' + Date.now().toString(36).toUpperCase() + crypto.randomBytes(2).toString('hex').toUpperCase();
const safeId = v => /^[A-Za-z0-9_-]{1,64}$/.test(String(v || '')) ? String(v) : '';

function stockLabel(inv) {
  if (!inv) return '정보없음'; const s = +inv.stock || 0;
  return s <= 0 ? '품절' : s <= (+inv.safetyStock || 0) ? '소량' : '충분';
}
function normOrderNo(v) { const m = String(v || '').match(/PF-?\s?(\d{6})-?(\d{3})/i); return m ? `PF-${m[1]}-${m[2]}` : ''; }
function validShopData(d) { return d && ['products', 'inventory', 'orders', 'shipping'].every(k => Array.isArray(d[k])) && d.policy && typeof d.policy.text === 'string'; }

function createApi({ store, getKey, getModel, getAdminPassword, mode }) {
  // ---------- 공통 ----------
  const send = (res, status, obj, headers = {}) => {
    res.writeHead(status, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers });
    res.end(JSON.stringify(obj));
  };
  async function body(req, limit = 64 * 1024) {
    let raw;
    if (req.rawBody) raw = req.rawBody.toString('utf8');            // Cloud Functions (이미 읽힌 본문)
    else raw = await new Promise((resolve, reject) => {
      let size = 0; const chunks = [];
      req.on('data', c => { size += c.length; if (size > limit) { reject(Object.assign(new Error('요청이 너무 커요'), { status: 413 })); req.destroy(); } else chunks.push(c); });
      req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8'))); req.on('error', reject);
    });
    if (raw.length > limit) throw Object.assign(new Error('요청이 너무 커요'), { status: 413 });
    if (!raw) return {};
    try { return JSON.parse(raw); } catch (e) { throw Object.assign(new Error('잘못된 JSON 형식'), { status: 400 }); }
  }
  async function shopData() {
    const d = await store.get('shop', 'main');
    return validShopData(d) ? d : JSON.parse(JSON.stringify(DEFAULTS));
  }
  const keyOk = () => /^sk-ant-/.test(getKey() || '');

  // ---------- 관리자 토큰 (비밀번호에서 서명 키를 만들어, 비밀번호를 바꾸면 기존 토큰은 무효) ----------
  const signKey = () => crypto.createHash('sha256').update('petshop-admin:' + (getAdminPassword() || '')).digest();
  function makeToken() {
    const exp = Date.now() + LIMITS.tokenHours * 3600e3;
    const sig = crypto.createHmac('sha256', signKey()).update(String(exp)).digest('base64url');
    return { token: `${exp}.${sig}`, expiresAt: new Date(exp).toISOString() };
  }
  function isAdmin(req) {
    if (!getAdminPassword()) return false;
    const m = String(req.headers.authorization || '').match(/^Bearer (\d+)\.([\w-]+)$/); if (!m) return false;
    if (+m[1] < Date.now()) return false;
    const want = crypto.createHmac('sha256', signKey()).update(m[1]).digest('base64url');
    return want.length === m[2].length && crypto.timingSafeEqual(Buffer.from(want), Buffer.from(m[2]));
  }

  // ---------- 사용량 제한 (방문자별 시간당 AI 질문 수) ----------
  async function allowChat(visitorId) {
    const hour = new Date().toISOString().slice(0, 13).replace(/\D/g, '');
    let ok = true;
    await store.update('rate', `${visitorId || 'anon'}_${hour}`, cur => {
      const n = (cur && cur.n) || 0; if (n >= LIMITS.chatPerHour) { ok = false; return cur; }
      return { n: n + 1, visitorId: visitorId || 'anon', hour, updatedAt: nowIso() };
    });
    return ok;
  }

  // ---------- 대화 기록 ----------
  async function appendLog(sessionId, visitorId, device, msg) {
    await store.update('sessions', sessionId, cur => {
      const s = cur || { id: sessionId, visitorId, device: clip(device, 40), startedAt: nowIso(), user: { verifiedOrders: [], customers: [] }, messages: [] };
      if (s.messages.length >= LIMITS.sessionMessages) return s;
      if (!s.messages.some(m => m.id === msg.id)) s.messages.push(msg);
      s.updatedAt = nowIso(); return s;
    });
  }

  // ---------- AI 지시사항 ----------
  async function buildPrompt(sessionId, message) {
    const d = await shopData();
    const findInv = id => d.inventory.find(i => i.productId === id);
    const pr = d.products.map(p => { const i = findInv(p.id) || {}; return `${p.id}|${p.name}|${p.brand}|${p.category}|정가 ${p.price}|판매가 ${p.salePrice}|리뷰 ${p.reviews}|재고 ${i.stock ?? '?'}(${stockLabel(findInv(p.id))})|입고예정 ${i.restockDate || '-'}|${p.desc || ''}|${i.memo || ''}`; }).join('\n');
    const s = sessionId ? await store.get('sessions', sessionId) : null;
    const nos = new Set((s && s.user && s.user.verifiedOrders) || []);
    const od = d.orders.filter(o => nos.has(o.orderNo)).map(o => `${o.orderNo}|${o.date}|${o.customer}|${o.productId}|${o.option || '-'}|수량 ${o.qty}|${o.amount}원|${o.payment}|${o.status}`).join('\n') || '(본인 확인된 주문 없음)';
    const sh = d.shipping.filter(x => nos.has(x.orderNo)).map(x => `${x.orderNo}|${x.carrier}|${x.trackingNo}|${x.status}|${x.location}|도착예정 ${x.eta}`).join('\n') || '(없음)';
    const guides = (await store.list('guides')).filter(g => g.active).sort((a, b) => String(a.createdAt).localeCompare(String(b.createdAt))).slice(-LIMITS.guidesInPrompt);
    const gb = guides.length ? `\n\n[관리자 피드백 지침 — 실제 상담에서 나온 개선 사항. 위 규칙과 충돌하면 위 규칙을 따르세요]\n${guides.map((g, i) => `${i + 1}. ${g.question ? `(예: 고객 "${g.question.slice(0, 80)}") ` : ''}${g.guide}`).join('\n')}` : '';
    return { text: `[지시사항]\n${PET_RULES}${gb}\n\n[데이터]\n[상품·재고]\n${pr}\n\n[주문 - 본인 확인된 주문만]\n${od}\n\n[배송]\n${sh}\n\n[정책]\n${d.policy.text}\n\n[고객 메시지]\n${message}`, guides: guides.length };
  }
  async function callAnthropic(payload) {
    return fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': getKey(), 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: getModel(), ...payload })
    });
  }

  // ---------- 라우팅 ----------
  return async function handle(req, res) {
    const url = new URL(req.url, 'http://localhost');
    const p = url.pathname.replace(/\/+$/, '');
    const M = req.method;
    try {
      // ===== 공개 =====
      if (M === 'GET' && p === '/api/health') {
        const info = { ok: true, hasKey: keyOk(), model: getModel(), mode, adminReady: !!getAdminPassword() };
        if (url.searchParams.get('check') === '1' && info.hasKey) {
          const r = await callAnthropic({ max_tokens: 1, messages: [{ role: 'user', content: 'ping' }] });
          if (!r.ok) { const e = await r.json().catch(() => ({})); return send(res, 502, { ...info, ok: false, error: (e.error && e.error.message) || 'HTTP ' + r.status }); }
          info.aiConnected = true;
        }
        return send(res, 200, info);
      }
      if (M === 'GET' && p === '/api/public-data') {
        const d = await shopData();
        return send(res, 200, { products: d.products, inventory: d.inventory, policy: d.policy });
      }
      if (M === 'POST' && p === '/api/verify') {
        const b = await body(req);
        const sessionId = safeId(b.sessionId), visitorId = safeId(b.visitorId);
        if (!sessionId) return send(res, 400, { error: '대화 ID가 없어요' });
        const last4 = String(b.last4 || '').replace(/\D/g, '');
        if (!/^\d{4}$/.test(last4)) return send(res, 400, { error: '연락처 뒤 4자리 숫자를 입력해 주세요' });
        const d = await shopData();
        let orderNo = normOrderNo(b.orderNo), ship = null;
        const trk = String(b.trackingNo || '').replace(/\D/g, '');
        if (!orderNo && trk.length >= 10) { ship = d.shipping.find(x => String(x.trackingNo).replace(/\D/g, '') === trk); orderNo = ship ? ship.orderNo : 'TRK-' + trk; }
        if (!orderNo) return send(res, 400, { error: '주문번호 또는 운송장번호를 확인해 주세요' });
        // 잠금은 주문 기준(방문자 ID를 바꿔도 우회 불가), 30분 뒤 자동 해제. 없는 주문도 같은 방식으로 세어 주문 존재 여부를 알 수 없게 함
        const lockId = 'L_' + crypto.createHash('sha256').update(orderNo).digest('hex').slice(0, 24);
        const lock = await store.get('locks', lockId);
        const fresh = lock && Date.now() - Date.parse(lock.firstFailAt || 0) < LIMITS.verifyLockMinutes * 60e3 ? lock : null;
        if (fresh && fresh.fails >= LIMITS.verifyTries) return send(res, 200, { ok: false, reason: 'locked', minutes: LIMITS.verifyLockMinutes });
        const o = d.orders.find(x => x.orderNo === orderNo);
        if (o && !/^\d{4}$/.test(String(o.phoneLast4 || ''))) return send(res, 200, { ok: false, reason: 'nophone' });
        if (!o || String(o.phoneLast4) !== last4) {
          let fails = 0;
          await store.update('locks', lockId, cur => {
            const c = cur && Date.now() - Date.parse(cur.firstFailAt || 0) < LIMITS.verifyLockMinutes * 60e3 ? cur : { firstFailAt: nowIso(), fails: 0 };
            fails = c.fails + 1; return { ...c, fails, updatedAt: nowIso() };
          });
          return send(res, 200, fails >= LIMITS.verifyTries ? { ok: false, reason: 'locked', minutes: LIMITS.verifyLockMinutes } : { ok: false, reason: 'mismatch', remaining: LIMITS.verifyTries - fails });
        }
        await store.remove('locks', lockId);
        await store.update('sessions', sessionId, cur => {
          const s = cur || { id: sessionId, visitorId, device: clip(b.device, 40), startedAt: nowIso(), user: { verifiedOrders: [], customers: [] }, messages: [] };
          if (!s.user.verifiedOrders.includes(o.orderNo)) s.user.verifiedOrders.push(o.orderNo);
          if (o.customer && !s.user.customers.includes(o.customer)) s.user.customers.push(o.customer);
          s.updatedAt = nowIso(); return s;
        });
        const { phoneLast4, ...order } = o;   // 연락처 정보는 돌려주지 않음
        return send(res, 200, { ok: true, orderNo: o.orderNo, order, shipping: d.shipping.find(x => x.orderNo === o.orderNo) || null });
      }
      if (M === 'POST' && p === '/api/chat') {
        if (!keyOk()) return send(res, 503, { error: { message: 'AI 키가 설정되지 않았어요' } });
        const b = await body(req);
        const message = String(b.message || '').trim();
        if (!message) return send(res, 400, { error: { message: '질문을 입력해 주세요' } });
        if (message.length > LIMITS.message) return send(res, 400, { error: { message: `질문은 ${LIMITS.message}자 이내로 입력해 주세요` } });
        const visitorId = safeId(b.visitorId);
        if (!(await allowChat(visitorId))) return send(res, 429, { error: { message: `AI 질문은 1시간에 ${LIMITS.chatPerHour}번까지 가능해요. 잠시 후 다시 시도해 주세요` } });
        const history = (Array.isArray(b.history) ? b.history : []).slice(-LIMITS.history)
          .filter(m => m && (m.role === 'user' || m.role === 'assistant')).map(m => ({ role: m.role, content: clip(m.content, LIMITS.historyText) || '-' }));
        while (history.length && history[0].role !== 'user') history.shift();
        if (history.length && history[history.length - 1].role === 'user') history.pop();
        const prompt = await buildPrompt(safeId(b.sessionId), message);
        let up;
        try { up = await callAnthropic({ max_tokens: 700, stream: true, messages: history.concat([{ role: 'user', content: prompt.text }]) }); }
        catch (e) { return send(res, 502, { error: { message: 'AI 서버 접속 실패' } }); }
        res.writeHead(up.status, { 'content-type': up.headers.get('content-type') || 'application/json', 'cache-control': 'no-cache', 'x-guides-applied': String(prompt.guides) });
        if (!up.body) return res.end();
        try { for await (const chunk of up.body) res.write(chunk); } catch (e) { /* 연결 끊김 */ }
        return res.end();
      }
      if (M === 'POST' && p === '/api/logs') {
        const b = await body(req, 32 * 1024);
        const sessionId = safeId(b.sessionId), visitorId = safeId(b.visitorId), m = b.message || {};
        const id = safeId(m.id);
        if (!sessionId || !id || !['user', 'bot'].includes(m.role)) return send(res, 400, { error: '형식 오류' });
        await appendLog(sessionId, visitorId, b.device, {
          id, role: m.role, text: clip(m.text, LIMITS.logText), at: nowIso(),
          route: ['user', 'instant', 'ai', 'error'].includes(m.route) ? m.route : (m.role === 'user' ? 'user' : 'instant'),
          sec: Number.isFinite(+m.sec) && m.sec !== null ? +(+m.sec).toFixed(2) : null,
          products: (Array.isArray(m.products) ? m.products : []).map(x => clip(x, 10)).slice(0, 3), report: null, feedback: null
        });
        return send(res, 200, { ok: true });
      }
      if (M === 'POST' && p === '/api/logs/report') {
        const b = await body(req);
        const sessionId = safeId(b.sessionId), messageId = safeId(b.messageId);
        if (!sessionId || !messageId || !REPORT_REASONS.includes(b.reason)) return send(res, 400, { error: '형식 오류' });
        let found = false;
        await store.update('sessions', sessionId, cur => {
          if (!cur) return cur; const m = cur.messages.find(x => x.id === messageId && x.role === 'bot');
          if (m) { found = true; m.report = { reason: b.reason, note: clip(b.note, 200), at: nowIso() }; cur.updatedAt = nowIso(); }
          return cur;
        });
        return found ? send(res, 200, { ok: true }) : send(res, 404, { error: '메시지를 찾을 수 없어요' });
      }

      // ===== 관리자 =====
      if (M === 'POST' && p === '/api/admin/login') {
        if (!getAdminPassword()) return send(res, 503, { error: '관리자 비밀번호가 설정되지 않았어요 (ADMIN_PASSWORD)' });
        const b = await body(req);
        const a = crypto.createHash('sha256').update(String(b.password || '')).digest(), w = crypto.createHash('sha256').update(getAdminPassword()).digest();
        if (!crypto.timingSafeEqual(a, w)) { await new Promise(r => setTimeout(r, 800)); return send(res, 401, { error: '비밀번호가 맞지 않아요' }); }
        return send(res, 200, makeToken());
      }
      if (p.startsWith('/api/admin/')) {
        if (!isAdmin(req)) return send(res, 401, { error: '관리자 로그인이 필요해요' });
        if (M === 'GET' && p === '/api/admin/data') return send(res, 200, await shopData());
        if (M === 'GET' && p === '/api/admin/defaults') return send(res, 200, DEFAULTS);
        if (M === 'PUT' && p === '/api/admin/data') {
          const d = await body(req, 2 * 1024 * 1024);
          if (!validShopData(d)) return send(res, 400, { error: '형식 오류' });
          await store.set('shop', 'main', { products: d.products, inventory: d.inventory, orders: d.orders, shipping: d.shipping, policy: { text: String(d.policy.text) }, updatedAt: nowIso() });
          return send(res, 200, { ok: true });
        }
        if (M === 'GET' && p === '/api/admin/logs') {
          const list = await store.list('sessions', { orderBy: 'updatedAt', desc: true, limit: LIMITS.sessions });
          return send(res, 200, { sessions: list });
        }
        if (M === 'DELETE' && p === '/api/admin/logs') { const n = await store.clear('sessions'); return send(res, 200, { ok: true, deleted: n }); }
        if (M === 'POST' && p === '/api/admin/logs/feedback') {
          const b = await body(req); const sessionId = safeId(b.sessionId), messageId = safeId(b.messageId), f = b.feedback || {};
          if (!sessionId || !messageId || !['good', 'bad'].includes(f.rating)) return send(res, 400, { error: '형식 오류' });
          let found = false;
          await store.update('sessions', sessionId, cur => {
            if (!cur) return cur; const m = cur.messages.find(x => x.id === messageId && x.role === 'bot');
            if (m) { found = true; m.feedback = { rating: f.rating, comment: clip(f.comment, LIMITS.guide), guideId: safeId(f.guideId) || null, applyError: clip(f.applyError, 100) || undefined, at: nowIso() }; }
            return cur;
          });
          return found ? send(res, 200, { ok: true }) : send(res, 404, { error: '메시지를 찾을 수 없어요' });
        }
        if (p === '/api/admin/guides' || p.startsWith('/api/admin/guides/')) {
          const id = safeId(decodeURIComponent(p.split('/')[4] || ''));
          if (M === 'GET' && !id) return send(res, 200, { guides: await store.list('guides') });
          if (M === 'POST' && !id) {
            const b = await body(req); const guide = clip(b.guide, LIMITS.guide);
            if (!guide) return send(res, 400, { error: '지침 내용을 입력해 주세요' });
            const g = { id: newId('G'), guide, question: clip(b.question, LIMITS.guideQuestion), badAnswer: clip(b.badAnswer, LIMITS.guideAnswer), reason: clip(b.reason, 50),
              source: b.source && typeof b.source === 'object' ? { sessionId: safeId(b.source.sessionId), messageId: safeId(b.source.messageId) } : null,
              active: true, createdAt: nowIso(), updatedAt: nowIso() };
            await store.set('guides', g.id, g); return send(res, 201, { guide: g });
          }
          const g = id && await store.get('guides', id);
          if (!g) return send(res, 404, { error: '지침을 찾을 수 없어요' });
          if (M === 'PATCH') {
            const b = await body(req);
            if ('guide' in b) { const t = clip(b.guide, LIMITS.guide); if (!t) return send(res, 400, { error: '지침 내용을 입력해 주세요' }); g.guide = t; }
            if ('active' in b) g.active = !!b.active;
            g.updatedAt = nowIso(); await store.set('guides', id, g); return send(res, 200, { guide: g });
          }
          if (M === 'DELETE') { await store.remove('guides', id); return send(res, 200, { ok: true }); }
        }
      }
      return send(res, 404, { error: 'not found' });
    } catch (e) {
      return send(res, e.status || 500, { error: e.status ? e.message : '서버 오류가 발생했어요' });
    }
  };
}

module.exports = { createApi, LIMITS };
