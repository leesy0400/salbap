/* ============================================================
   날짜·예산 계산 — 숫자는 전부 여기서 (AI는 숫자를 만들지 않아요)
   ============================================================ */

/* ============================================================
   ② 날짜·예산 계산 (숫자는 전부 여기서 — AI는 숫자를 만들지 않아요)
   ============================================================ */
function mondayOf(t) {
  const x = new Date(t);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - ((x.getDay() + 6) % 7));
  return x;
}
const ymd = d =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const wkKey = (t = Date.now()) => ymd(mondayOf(t));
function wkLabel(k) {
  const th = new Date(new Date(k + "T00:00:00").getTime() + 3 * DAY);
  return `${th.getMonth() + 1}월 ${Math.ceil(th.getDate() / 7)}주차`;
}
const NOW_WK = wkKey();
const daysIn = (d = new Date()) => new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
const sameMonth = (t, d = new Date()) => {
  const x = new Date(t);
  return x.getFullYear() === d.getFullYear() && x.getMonth() === d.getMonth();
};
const daysAgo = t => Math.max(0, Math.floor((Date.now() - t) / DAY));

// 예산 프리셋 금액 = 주당 끼니 × 1인 1끼 재료비 × 인원 배수 × 이번 달 주 수
// 프리셋 금액 = 기준 금액 × 인원 배수 × (주 끼니 ÷ 15) → 10만 원 단위로 반올림, 세 버튼은 항상 서로 다른 금액
function presets() {
  let last = 0;
  return BUDGET_PRESETS.map(([t, base]) => {
    let m = Math.max(100000, Math.round((base * hh() * P().meals) / 15 / 100000) * 100000);
    if (m <= last) m = last + 100000;
    last = m;
    return [t, m];
  });
}
const presetMonthly = i => presets()[i][1];
const minMonthly = () => Math.ceil((P().meals * RULES.minPerMeal * hh() * daysIn()) / 7 / 10000) * 10000;
// 월 장보기 예산 — 그달에 따로 고친 금액이 있으면 그 금액, 없으면 기본 예산 (가입한 달도 나누지 않아요)
const ymOf = (t = Date.now()) => {
  const d = new Date(t);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
};
const NOW_YM = ymOf();
const ymArg = x => (typeof x === "string" ? x : ymOf(x ? x.getTime() : Date.now()));
const ymAdd = (ym, n) => ymOf(new Date(+ym.slice(0, 4), +ym.slice(5) - 1 + n, 1).getTime());
const ymLabel = ym =>
  `${+ym.slice(0, 4) !== new Date().getFullYear() ? ym.slice(0, 4) + "년 " : ""}${+ym.slice(5)}월`;
function monthBudget(ym = NOW_YM) {
  const p = DB.profile;
  if (!p) return 0;
  const o = (DB.months || {})[ymArg(ym)];
  return o && o.budget > 0 ? o.budget : +p.monthly || 0;
}
const spentIn = f => DB.purchases.filter(f).reduce((a, x) => a + (+x.price || 0), 0);
// 결제 내역 — 장보기를 마칠 때 기록한 실제 결제액(장보기 한 건 = 한 줄)만 예산에서 빼요.
// 예전 방식(품목마다 가격을 적던 때) 기록은 장 본 날 하루치를 한 줄로 묶어 보여줘요.
function payments(ym) {
  ym = ymArg(ym);
  const t = (DB.trips || [])
    .filter(x => x.paid != null && ymOf(x.paidAt || x.at) === ym)
    .map(x => ({
      id: x.id,
      kind: x.manual ? "manual" : "trip",
      at: x.paidAt || x.at,
      amount: +x.paid || 0,
      label: x.manual ? x.memo || "직접 기록한 장보기" : tripName(x),
      meals: x.meals,
      n: x.n || 0,
    }));
  const by = {};
  DB.purchases
    .filter(x => !x.trip && ymOf(x.at) === ym)
    .forEach(x => {
      const k = ymd(new Date(x.at));
      (by[k] = by[k] || []).push(x);
    });
  const old = Object.entries(by).map(([k, a]) => ({
    id: "d:" + k,
    kind: "legacy",
    at: a[0].at,
    amount: a.reduce((s, x) => s + (+x.price || 0), 0),
    label: `장보기 ${a.length}개 품목`,
    n: a.length,
  }));
  return [...t, ...old].sort((a, b) => b.at - a.at);
}
const spentMonth = d => payments(d).reduce((a, x) => a + x.amount, 0);
const leftMonth = (ym = NOW_YM) => monthBudget(ym) - spentMonth(ym);
const spentWeek = (k = NOW_WK) => spentIn(x => x.week === k);
// (주 단위 예산·응원 문구·주별 절약 계산은 v2에서 월 예산·실제 결제액·끼니 기록으로 바뀌었어요)
