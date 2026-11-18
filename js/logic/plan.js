/* ============================================================
   메뉴 정하기 — 먹고 싶은 메뉴 → AI가 필요한 식재료만 골라요
   ============================================================ */

/* ============================================================
   ③-2.5 메뉴 정하기 — 먹고 싶은 메뉴(자연어, 없어도 OK) → AI가 필요한 식재료만 리스트업
   레시피는 여기서 안 짜요(→ '오늘 뭐 해먹지?'에서). 대신 수량은 '먹고 싶은 메뉴 + 남는 양으로 다른 요리까지'
   생각해서 실제 판매 단위로 잡고, 남으면 뭘 해먹을 수 있는지(also)도 같이 받아요.
   가격: 실제 데이터에 있는 재료만 프로그램이 계산하고, 없으면 '가격 데이터 없음'으로 보여요 (AI는 가격을 만들지 않아요).
   ============================================================ */
const lastPlan = () => (DB.plan && Array.isArray(DB.plan.recipes) ? DB.plan : null);
const plan = () => {
  const pl = lastPlan(),
    t = trip();
  return pl && t && pl.trip === t.id ? pl : null;
}; // 진행 중인 장보기의 장볼 목록   // 예전 형식(레시피 없는 계획)은 다시 짜요
function setNoWish() {
  S.noWish = !S.noWish;
  if (S.noWish) S.wish = "";
  keep();
}
function typeWish(el) {
  S.wish = el.value;
  if (S.noWish) {
    S.noWish = false;
    document.querySelector(".chip.nowish")?.classList.remove("on");
  }
}
function openPlanEdit() {
  const pl = draft() || plan();
  S.planEdit = true;
  S.pview = "wish";
  S.wish = pl ? pl.wish : "";
  S.noWish = !!pl && !pl.wish;
  S.planNote = "";
  render();
  scrollTo(0, 0);
}
// 이름으로 식재료 찾기 — ①이름·다른 이름이 정확히 같으면 그것 ②아니면 이름이 포함된 것 중 가장 긴 이름(2글자 이상)
//   ("대파 1단" → 대파, "양파" → 양파(대파 아님), "닭가슴살" → 없음: 데이터의 닭고기는 육계 1kg라 다른 상품이에요)
function matchItem(n) {
  const c = coreName(n)
    .replace(/\s*[\d.]+\s*(kg|g|개|단|마리|봉|팩|통|모|쪽|줌|컵|큰술|작은술).*$/, "")
    .trim();
  if (!c) return null;
  const names = i => [i.name, coreName(i.name), ...i.alias];
  const exact = ITEMS.filter(i => names(i).includes(c));
  if (exact.length) return exact.sort((a, b) => (price(a) ? 0 : 1) - (price(b) ? 0 : 1))[0]; // 소고기처럼 둘이면 가격 있는 쪽
  let best = null,
    len = 0;
  ITEMS.forEach(i =>
    names(i).forEach(k => {
      if (k.length >= 2 && c.includes(k) && k.length > len) {
        best = i;
        len = k.length;
      }
    })
  );
  return best;
}
const avoided = n => avoidAll().some(a => n.includes(a));
const isSeasName = n => SEASONINGS.includes(n) || Object.prototype.hasOwnProperty.call(DB.seas, n);
const inFridge = n =>
  stock().some(x => {
    const a = coreName(x.name),
      b = coreName(n);
    return a === b || (a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a)));
  });
const parseG = t => {
  const m = String(t || "").match(/([\d.]+)\s*(kg|g)/i);
  return m ? Math.round(+m[1] * (m[2].toLowerCase() === "kg" ? 1000 : 1)) : 0;
};
