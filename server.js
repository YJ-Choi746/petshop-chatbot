// 펫샵 AI 상담 챗봇 - 로컬 서버 (외부 패키지 없음, Node 18+)
// - public/ 화면 제공
// - /api/* : functions/api.js (Firebase 배포와 같은 코드), 저장은 data/ 폴더 JSON 파일
// - 키·비밀번호: .env 의 ANTHROPIC_API_KEY, ADMIN_PASSWORD (요청마다 다시 읽어 재시작 없이 반영)
const http = require('http');
const fs = require('fs');
const path = require('path');
const { createApi } = require('./functions/api');
const { createFileStore } = require('./store-file');

const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, 'public');

function readEnv() {
  const env = {};
  try {
    for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (m) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '').trim();
    }
  } catch (e) { /* .env 없음 */ }
  return env;
}
const env = k => readEnv()[k] || process.env[k] || '';

const api = createApi({
  store: createFileStore(path.join(ROOT, 'data')),
  getKey: () => env('ANTHROPIC_API_KEY'),
  getModel: () => env('ANTHROPIC_MODEL') || 'claude-haiku-4-5',
  getAdminPassword: () => env('ADMIN_PASSWORD'),
  mode: 'local'
});

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) return api(req, res);
  if (req.method !== 'GET') { res.writeHead(405); return res.end(); }
  const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname).replace(/^\/+/, '');
  const file = path.normalize(path.join(PUBLIC_DIR, rel));
  if (!file.startsWith(PUBLIC_DIR + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); return res.end('not found'); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'cache-control': 'no-cache' });
  fs.createReadStream(file).pipe(res);
});

const port = Number(env('PORT') || 3000);
server.listen(port, '127.0.0.1', () => {
  console.log(`\n🐾 펫샵 AI 상담 챗봇 실행 중 → http://localhost:${port}`);
  console.log(`   모델: ${env('ANTHROPIC_MODEL') || 'claude-haiku-4-5'} · API 키: ${/^sk-ant-/.test(env('ANTHROPIC_API_KEY')) ? '확인됨 ✅' : '없음 ⚠️  (.env에 ANTHROPIC_API_KEY 입력)'} · 관리자 비밀번호: ${env('ADMIN_PASSWORD') ? '설정됨 ✅' : '없음 ⚠️  (.env에 ADMIN_PASSWORD 입력)'}`);
  console.log('   저장: data/ 폴더 (Firebase 배포 시 Firestore)');
  console.log('   종료: Ctrl + C\n');
});
