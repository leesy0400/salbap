/* ============================================================
   장보기 건·끼니 기록·집밥 수·배달 대비 아낀 돈
   ============================================================ */

/* ============================================================
   v2 장보기 건 · 끼니 기록 · 밥풀이
   trip   : 진행 중인 장보기 {id,at,meals,picked:[냉장고에서 이번에 쓸 재료]}  ← 장보기마다 끼니 수를 따로 정해요
   trips  : 마친 장보기 {id,at,meals,paid,paidAt,label,n,menus} · 직접 기록한 결제는 {manual:true,memo}
   meals  : 끼니 기록 {id,date:"YYYY-MM-DD",slot,type:home|deliv|out,menu,cost,inst(배달 대신 해 먹음)}
   months : 달마다 고친 장보기 예산 {"2026-11":{budget}}
   ============================================================ */
const trip = () => DB.trip || null;
// 예전(주 단위) 기록을 쓰던 사람 — 이번 주에 짜다 만 장보기가 있으면 장보기 한 건으로 옮겨요
function migrateV2() {
  if (DB.v2) return;
  DB.v2 = 1;
  DB.trips = DB.trips || [];
  DB.meals = DB.meals || [];
  DB.months = DB.months || {};
  const pl = DB.plan && DB.plan.wk === NOW_WK && Array.isArray(DB.plan.recipes) ? DB.plan : null,
    dr = DB.draft && DB.draft.wk === NOW_WK ? DB.draft : null;
  if ((pl || dr) && !DB.purchases.some(x => x.week === NOW_WK) && !DB.trip) {
    const t = {
      id: uid(),
      at: (pl || dr).at || Date.now(),
      meals: (pl || dr).meals || P().meals,
      picked: [],
    };
    DB.trip = t;
    if (pl) pl.trip = t.id;
    if (dr) dr.trip = t.id;
    if (DB.cart && DB.cart.wk === NOW_WK) DB.cart.trip = t.id;
  }
  save();
}
function newTrip(meals) {
  const t = { id: uid(), at: Date.now(), meals, picked: [] };
  DB.trip = t;
  DB.draft = null;
  DB.cart = { wk: NOW_WK, trip: t.id, items: [] };
  return t;
}
// 진행 중인 장보기 그만두기 — 받은 조합·장볼 목록은 지우고, 만들어 둔 레시피(해먹을 메뉴)는 남겨요
function dropTrip() {
  DB.trip = null;
  DB.draft = null;
  DB.cart = { wk: NOW_WK, trip: null, items: [] };
  S.sheet = null;
  save();
}
// 장보기 마치기 — 실제 결제액을 한 번만 기록해요 (월 예산은 이 금액만 빼요)
function finishTrip(paid) {
  const t = trip();
  if (!t) return;
  const pl = plan();
  Object.assign(t, {
    paid: Math.max(0, Math.round(+paid || 0)),
    paidAt: Date.now(),
    label: `${t.meals}끼 장보기${pl && pl.label ? ` · ${pl.label}` : ""}`,
    n: cart().filter(x => x.bought !== false).length,
    menus: pl
      ? pl.recipes
          .map(findR)
          .filter(Boolean)
          .map(r => r.title)
      : [],
    recipes: pl ? pl.recipes.slice() : [],
  });
  DB.trips = [...(DB.trips || []), t];
  DB.trip = null;
}
// 장보기 이름 — 마친 날짜 + 그날 몇 번째인지: "11월 17일 장보기 목록 (1)", 같은 날 또 하면 (2)
function tripName(t) {
  const at = t.paidAt || t.at,
    d = new Date(at),
    k = ymd(d);
  const same = (DB.trips || [])
    .filter(x => !x.manual && x.paid != null && ymd(new Date(x.paidAt || x.at)) === k)
    .sort((a, b) => (a.paidAt || a.at) - (b.paidAt || b.at));
  const i = same.findIndex(x => x.id === t.id);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 장보기 목록 (${i < 0 ? same.length + 1 : i + 1})`;
}
// 지난 장보기의 메뉴 레시피 (예전 기록은 메뉴 이름으로 찾아요)
const tripRecs = t => {
  const a = (t.recipes || []).map(findR).filter(Boolean);
  if (a.length) return a;
  return (t.menus || []).map(n => [...DB.recipes].reverse().find(r => r.title === n)).filter(Boolean);
};
const pastTrips = () =>
  [...(DB.trips || [])]
    .filter(x => !x.manual && x.paid != null)
    .sort((a, b) => (b.paidAt || b.at) - (a.paidAt || a.at));
function openPastTrip(id) {
  Object.assign(S, { tab: "home", view: "app", htab: "rec", rsub: "past", rtrip: id });
  render();
  scrollTo(0, 0);
}
// 끼니 기록
const SLOTS = [
    ["b", "아침"],
    ["l", "점심"],
    ["d", "저녁"],
    ["s", "간식"],
  ],
  MTYPES = [
    ["home", "집밥"],
    ["deliv", "배달"],
    ["out", "외식"],
  ];
const slotName = k => (SLOTS.find(x => x[0] === k) || [, ""])[1],
  typeName = k => (MTYPES.find(x => x[0] === k) || [, ""])[1];
const mealList = () => DB.meals || (DB.meals = []);
// 집밥 수 = 레시피에서 [해먹었어요]를 누른 횟수 (+ 예전에 직접 적은 집밥 기록). 끼니를 따로 입력받지 않아요
const cookedList = () =>
  DB.recipes.filter(r => r.cooked).sort((a, b) => (b.cookedAt || 0) - (a.cookedAt || 0));
const homeCount = () => cookedList().length + mealList().filter(m => m.type === "home").length;
const todayKey = () => ymd(new Date());
const nowSlot = () => {
  const h = new Date().getHours();
  return h < 10 ? "b" : h < 15 ? "l" : h < 21 ? "d" : "s";
};

// 배달 대비 아낀 돈 — 마친 장보기마다 (끼니 수 × 배달 한 끼 고정값) − 실제 결제액
// 고정값 근거: 소비자공익네트워크, 2024년 하반기 배달앱 입점 업주 502명 조사 — 평균 최소주문금액 약 1만 4천 원
// (배민 14,079 · 쿠팡이츠 14,404 · 요기요 14,724 · 공공배달앱 13,589원). 배달비는 빼고 잡은 값이라 실제보다 적게 나와요.
const DELIV_MEAL = 14000;
function saveCalc(list) {
  const meals = list.reduce((a, t) => a + (+t.meals || 0), 0),
    paid = list.reduce((a, t) => a + (+t.paid || 0), 0),
    deliv = meals * DELIV_MEAL;
  return { n: list.length, meals, paid, deliv, total: deliv - paid };
}
const savingsOf = (ym = NOW_YM) =>
  saveCalc(
    (DB.trips || []).filter(t => !t.manual && t.paid != null && +t.meals > 0 && ymOf(t.paidAt || t.at) === ym)
  );
