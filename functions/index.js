// Firebase Cloud Functions 진입점 — Hosting의 /api/** 요청을 받아 functions/api.js로 처리
// 비밀 값(API 키, 관리자 비밀번호)은 Google Secret Manager에 보관: firebase functions:secrets:set 이름
const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const { createApi } = require('./api');
const { createFirestoreStore } = require('./store-firestore');

admin.initializeApp();
const ANTHROPIC_API_KEY = defineSecret('ANTHROPIC_API_KEY');
const ADMIN_PASSWORD = defineSecret('ADMIN_PASSWORD');
// 모델은 비밀 값이 아니라서 환경 변수(선택)로, 없으면 기본값 사용
const MODEL = () => process.env.ANTHROPIC_MODEL || 'claude-haiku-4-5';

let handler;
exports.api = onRequest(
  { region: 'asia-northeast3', secrets: [ANTHROPIC_API_KEY, ADMIN_PASSWORD], timeoutSeconds: 60, memory: '256MiB', maxInstances: 5 },
  (req, res) => {
    handler = handler || createApi({
      store: createFirestoreStore(admin.firestore()),
      getKey: () => ANTHROPIC_API_KEY.value(),
      getModel: MODEL,
      getAdminPassword: () => ADMIN_PASSWORD.value(),
      mode: 'firebase'
    });
    return handler(req, res);
  }
);
