// Firebase 배포용 저장소: Firestore (컬렉션: shop, sessions, guides, locks, rate)
// 브라우저는 Firestore에 직접 접근하지 않고(firestore.rules에서 모두 차단), Cloud Functions만 관리자 권한으로 읽고 씀
function createFirestoreStore(db) {
  const ref = (col, id) => db.collection(col).doc(id);
  const clean = obj => JSON.parse(JSON.stringify(obj));   // undefined 값 제거 (Firestore는 undefined 저장 불가)
  return {
    async get(col, id) { const s = await ref(col, id).get(); return s.exists ? s.data() : null; },
    async set(col, id, obj) { await ref(col, id).set(clean(obj)); },
    async remove(col, id) { await ref(col, id).delete(); },
    async update(col, id, fn) {
      return db.runTransaction(async tx => {
        const s = await tx.get(ref(col, id));
        const next = fn(s.exists ? s.data() : null);
        if (next) tx.set(ref(col, id), clean(next));
        return next;
      });
    },
    async list(col, { orderBy, desc, limit } = {}) {
      let q = db.collection(col);
      if (orderBy) q = q.orderBy(orderBy, desc ? 'desc' : 'asc');
      if (limit) q = q.limit(limit);
      return (await q.get()).docs.map(d => d.data());
    },
    async clear(col) {
      let n = 0;
      for (;;) {
        const snap = await db.collection(col).limit(300).get();
        if (snap.empty) return n;
        const batch = db.batch(); snap.docs.forEach(d => batch.delete(d.ref)); await batch.commit(); n += snap.size;
      }
    }
  };
}
module.exports = { createFirestoreStore };
