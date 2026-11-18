/* ============================================================
   저장소 — 이 기기(localStorage)의 DB 한 덩어리 + 이용 통계 횟수
   ============================================================ */

/* ============================================================
   ① 저장소 — 이 기기 브라우저(localStorage)에 한 덩어리로 저장해요.
   나중에 서버 DB로 옮길 때 아래 항목이 그대로 테이블이 돼요.
   profile   : 초기 정보 (구·동·가게id·인원·끼니·월 예산·못 먹는 재료)
   seas      : 조미료 상태 {간장:"have"|"low"|"out"}
   pantry    : 냉장고 재료 [{id,name,level:"full"|"mid"|"low"|"out",addedAt,src,pid}]
   purchases : 산 기록 [{id,week,at,name,price,kind,src}]   (아이콘은 이름으로 찾아요)   ← 지출 통계는 전부 여기서 계산
   cart      : 이번 주 장볼 목록
   plan      : 이번 주 장볼 재료 {wk,wish,meals,items,fridge,tip}  ← '메뉴 정하기'에서 AI가 골라준 것
   weeks     : 주차별 예산 {"2026-10-19":{budget}}
   recipes   : 추천받은 레시피 기록 (해먹으면 cooked:true)
   scraps    : 저장한(♥) 레시피
   stats     : 이용 통계 {days:[앱을 연 날짜], combo:{first,retry,pass1,pass2,err,why}}  ← 실사용 테스트 숫자용 (내용 없이 횟수만)
   ============================================================ */
const KEY = "salim_v3"; // v3부터 실제 데이터 — 예전(예시 데이터) 기록과 섞이지 않게 새 칸에 저장해요
const EMPTY = () => ({
  onboarded: false,
  profile: null,
  seasSet: false,
  seas: {},
  pantry: [],
  purchases: [],
  cart: { wk: "", items: [] },
  plan: null,
  weeks: {},
  recipes: [],
  scraps: [],
  stats: { days: [], combo: {} },
});
let DB = (() => {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "null");
    return d ? { ...EMPTY(), ...d } : EMPTY();
  } catch (e) {
    return EMPTY();
  }
})();
function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(DB));
  } catch (e) {}
  pushRemote();
}
// 이용 통계 — 앱을 연 날짜(하루 한 번)와 AI 메뉴 조합 결과 횟수만 남겨요. 실사용 테스트에서 재방문·조합 통과율을 셀 때 써요.
const stats = () => {
  const t = DB.stats || (DB.stats = {});
  t.days = t.days || [];
  t.combo = t.combo || {};
  return t;
};
function markVisit() {
  if (!DB.onboarded) return;
  const t = stats(),
    d = ymd(new Date());
  if (t.days.includes(d)) return;
  t.days = [...t.days, d].slice(-180);
  save();
}
// 조합이 규칙에 걸린 이유를 종류별로 세요 (가장 자주 틀리는 유형을 보려고)
// 조합을 끝내 못 만들었을 때 — 내부 검사 문구 대신 사용자가 할 수 있는 일을 알려줘요 (자세한 이유는 통계에만 남겨요)
function failNote(why, wishM) {
  const w = why.map(x => comboWhy(x.replace(/^[^:]+: /, "")));
  if (wishM.length && w.every(x => x === "먹고 싶은 메뉴 빠짐" || x === "못 먹는 재료"))
    return `'${esc(wishM.join(", "))}'을(를) 넣은 조합을 만들지 못했어요. 메뉴를 바꾸거나 다시 받아 주세요.`;
  return "이번엔 조건에 맞는 조합이 안 나왔어요. 버튼을 한 번 더 눌러 주세요.";
}
function comboWhy(p) {
  return /끼니 합/.test(p)
    ? "끼니 수"
    : /먹고 싶은 메뉴/.test(p)
      ? "먹고 싶은 메뉴 빠짐"
      : /고른 냉장고 재료/.test(p)
        ? "고른 재료 빠짐"
        : /못 먹는 재료/.test(p)
          ? "못 먹는 재료"
          : /구할 수 없는|가격 데이터/.test(p)
            ? "목록 밖 재료"
            : /한 끼에만|조금밖에/.test(p)
              ? "적은 재료 여러 번"
              : /두 번/.test(p)
                ? "같은 메뉴 중복"
                : /비어/.test(p)
                  ? "재료 없음"
                  : "기타";
}
function countCombo(round, kind, why) {
  const c = stats().combo;
  c[round] = (c[round] || 0) + 1;
  if (kind === "pass")
    c[round === "first" ? "pass1" : "pass2"] = (c[round === "first" ? "pass1" : "pass2"] || 0) + 1;
  if (kind === "err") c.err = (c.err || 0) + 1;
  if (why) {
    c.why = c.why || {};
    c.why[why] = (c.why[why] || 0) + 1;
  }
}
