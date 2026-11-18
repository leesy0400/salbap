/* ============================================================
   화면 상태 S (저장 안 됨)와 기본 프로필
   ============================================================ */

/* 화면 상태 (저장 안 됨) */
const S = {
  htab: "today",
  bym: null,
  editB: false,
  tm: null,
  picked: [],
  mf: null,
  pay: null,
  react: null,
  paidJust: 0,
  step: 0,
  busy: null,
  sheet: null,
  agree: false,
  p: null,
  err: "",
  view: "app",
  tab: "home",
  editKey: null,
  editW: false,
  mcat: "채소",
  recorded: 0,
  rview: "make",
  rsel: null,
  rcount: 3,
  extra: "",
  req: "",
  results: [],
  note: "",
  openR: null,
  rtab: "uses",
  left: null,
  seasCtx: null,
  seasDraft: [...DEFAULT_SEASONINGS],
  openWk: null,
  wish: "",
  noWish: false,
  planEdit: false,
  planNote: "",
  lmode: "signup",
  lemail: "",
  lerr: "",
  menus: null,
  menuSig: "",
  mqty: "mid",
  seasOpen: [],
  work: null,
  comboSel: null,
  stepsWork: null,
  stepsErr: "",
};

// 가격 기준 장소 이름: 가게를 골랐으면 가게, 아니면 '○○구 평균'
const placeOf = p => (p.mart ? STORE_BY_ID[p.mart]?.name || "가게 정보 없음" : `${p.district} 평균`);
const DEFAULT_PROFILE = () => ({
  allergies: [],
  district: "",
  dong: "",
  mart: "",
  martAvg: false,
  people: 1,
  meals: RULES.mealsDefault,
  monthly: null,
  avoid: "",
  startedAt: Date.now(),
});
const P = () => S.p || DB.profile || DEFAULT_PROFILE(); // 수정 중이면 수정본, 아니면 저장된 초기 정보
const hh = () => householdRate(P().people);
