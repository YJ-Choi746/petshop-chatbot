// 로컬 개발용 저장소: data/<컬렉션>.json 파일 (Firebase 배포에서는 functions/store-firestore.js 사용)
const fs = require('fs');
const path = require('path');

function createFileStore(dir) {
  fs.mkdirSync(dir, { recursive: true });
  const file = col => path.join(dir, `${col}.json`);
  const read = col => { try { return JSON.parse(fs.readFileSync(file(col), 'utf8')) || {}; } catch (e) { return {}; } };
  const write = (col, obj) => { const tmp = file(col) + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(obj, null, 2)); fs.renameSync(tmp, file(col)); };
  let chain = Promise.resolve();   // 쓰기 작업을 한 줄로 세워 동시 저장 충돌 방지
  const serial = fn => (chain = chain.then(fn, fn));

  // 예전 형식(data/petshop-data.json, data/guides.json)이 있으면 한 번만 옮김
  const legacyData = path.join(dir, 'petshop-data.json'), legacyGuides = path.join(dir, 'guides.json');
  if (!fs.existsSync(file('shop')) && fs.existsSync(legacyData)) { try { write('shop', { main: JSON.parse(fs.readFileSync(legacyData, 'utf8')) }); } catch (e) {} }
  if (fs.existsSync(legacyGuides) && !fs.existsSync(file('guides-store'))) {
    try { const g = JSON.parse(fs.readFileSync(legacyGuides, 'utf8')).guides || []; write('guides-store', Object.fromEntries(g.map(x => [x.id, x]))); } catch (e) {}
  }
  const real = col => col === 'guides' ? 'guides-store' : col;   // 예전 guides.json과 이름이 겹치지 않게

  return {
    async get(col, id) { return read(real(col))[id] ?? null; },
    set(col, id, obj) { return serial(() => { const all = read(real(col)); all[id] = obj; write(real(col), all); }); },
    remove(col, id) { return serial(() => { const all = read(real(col)); delete all[id]; write(real(col), all); }); },
    update(col, id, fn) {
      return serial(() => { const all = read(real(col)); const next = fn(all[id] ? JSON.parse(JSON.stringify(all[id])) : null); if (next) { all[id] = next; write(real(col), all); } return next; });
    },
    async list(col, { orderBy, desc, limit } = {}) {
      let arr = Object.values(read(real(col)));
      if (orderBy) arr.sort((a, b) => String(a[orderBy] || '').localeCompare(String(b[orderBy] || '')) * (desc ? -1 : 1));
      return limit ? arr.slice(0, limit) : arr;
    },
    clear(col) { return serial(() => { const n = Object.keys(read(real(col))).length; write(real(col), {}); return n; }); }
  };
}
module.exports = { createFileStore };
