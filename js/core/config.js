/* ============================================================
   설정 — 로그인(Firebase 웹 설정)·AI 모델·규칙값
   ※ API 키는 여기 없어요. 서버(Vercel 환경변수)에만 있어요. Firebase 웹 설정은 원래 공개용이에요.
   ============================================================ */

// 0) 로그인(Firebase) — 비워두면(null) 로그인 없이 이 기기 브라우저에만 저장해요.
//    Firebase 콘솔 → 프로젝트 설정 → 내 앱(웹) → firebaseConfig 객체를 그대로 붙여넣으세요.
//    콘솔에서 할 일: ①Authentication에서 'Google'·'이메일/비밀번호' 사용 설정 ②승인된 도메인에 배포 주소 추가
//                  ③Firestore Database 만들기 + 보안 규칙(본인 문서만 읽고 쓰기)
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDLj2cNxe5M6MN8Ma5ap0noK-eQBKqzXmk",
  authDomain: "salbap.firebaseapp.com",
  projectId: "salbap",
  storageBucket: "salbap.firebasestorage.app",
  messagingSenderId: "160348386794",
  appId: "1:160348386794:web:ef27b902511c04fc22ae93",
  measurementId: "G-H3C8F2B41J",
};
// 예: {apiKey:"AIza...", authDomain:"xxx.firebaseapp.com", projectId:"xxx", appId:"1:..."}
const AUTH_METHODS = { google: true, email: true };
const FB_VER = "10.12.2"; // Firebase JS SDK (compat) 버전 — 고정

// 1) LLM 설정 — apiKey를 넣으면 레시피가 실시간 생성됩니다.
//    키가 비어 있으면 Claude 앱 미리보기에서만 되는 방식으로 한 번 시도하고, 안 되면 '연결 안 됨' 안내만 보여줘요(예시로 채우지 않아요).
//    ※ API 키는 이 파일에 넣지 않아요. 배포(Vercel)에서는 서버 함수 /api/llm 이 키를 붙여서 Claude를 불러요.
//      키는 Vercel 환경변수 ANTHROPIC_API_KEY 에만 넣으세요.
const LLM = {
  model: "claude-haiku-5-5", // 기본 모델 — 냉장고 메뉴 추천·레시피·조리법
  planModel: "claude-haiku-5-5", // 메뉴 조합 3안 짜기 모델 — 빠르게(목표 10초 안팎). 더 정교하게 하고 싶으면 "claude-sonnet-5-5"(대신 느려져요)
  previewModel: "claude-sonnet-4-6", // 키 없이 Claude 미리보기에서 쓸 모델명
  url: "https://api.anthropic.com/v1/messages", // Claude 앱 미리보기(키 없음)에서만 써요
  proxy: "/api/llm", // 배포 주소에서 쓰는 서버 함수
  timeoutMs: 60000,
};

// 2) 주차 표시는 오늘 날짜로 자동 계산돼요 (예: "10월 3주차"). 월요일 시작 기준.

const DATA_RULES = {
  minValidPrice: 100, // 100원 미만은 입력 오류로 보고 쓰지 않아요 (예: 김치 3.3kg 6원)
  staleDays: 60, // 조사일이 60일보다 오래된 가격에는 '오래된 가격' 표시
};

// 7) 규칙값
const RULES = {
  minPerMeal: 1500, // 집밥 1끼(1인 기준) 재료비 하한 — 이보다 적으면 장볼 재료를 제대로 담기 어려워 적정 예산을 권해요(실패케이스①). 알뜰(10만 원)이 딱 이 선이에요
  blockBelowMin: false, // true로 바꾸면 예전처럼 기준보다 적은 예산일 때 다음 버튼을 막아요
  warnRatio: 0.9, // 90% 이상 주의, 100% 초과 강경고
  mealsMin: 1,
  mealsDefault: 5,
  mealsMax: 14, // 한 번에 추천받을 끼니 수: 최소·기본·최대 (한 번 추천 = 일주일 장보기 1번으로 보고 예산을 나눠요)
};
// 인원이 늘면 1인당 재료비가 조금씩 줄어드는 걸 반영한 배수 (1명=1, 2명=1.7, 3명=2.4, 4명=3.1)
const householdRate = people => 1 + 0.7 * (people - 1);

const WISH_MAX = 200; // 직접 쓰는 요청 글자 수 제한 (아주 긴 입력 대비)
