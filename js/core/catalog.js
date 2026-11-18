/* ============================================================
   가게·품목 목록 만들기 — data/prices.js 와 data/foods.js 를 합쳐 화면에서 쓸 모양으로
   ============================================================ */

// 3) 실제 가격 데이터 — data/prices.js(shopping_db.json 그대로)를 읽어요.
//    stores[자치구] = [{id,name,type,address(지번)}], prices[가게id][품목코드] = {name,spec,unit,price,date}
//    ※ 여기 없는 정보는 화면에 '데이터 없음'으로 보여요. 예시값·추정값으로 채우지 않아요.
const SHOP = (() => {
  const d = window.SHOP_DB;
  return d && typeof d === "object" ? d : { stores: {}, prices: {} };
})();
// 데이터 정리: 이름에 섞인 HTML 문자(&amp;middot; 등) 풀기, 같은 id 가게가 두 번 있으면 한 번만
const unent = t =>
  String(t || "")
    .replace(/&amp;/g, "&")
    .replace(/&middot;/g, "·")
    .replace(/&nbsp;/g, " ");
const STORES = (() => {
  const seen = new Set(),
    out = {};
  Object.entries(SHOP.stores || {}).forEach(([gu, l]) => {
    out[gu] = (l || [])
      .filter(x => !seen.has(x.id) && seen.add(x.id))
      .map(x => ({ ...x, name: unent(x.name) }));
  });
  return out;
})();
const DISTRICTS = Object.keys(STORES).sort((a, b) => a.localeCompare(b, "ko"));
const STORE_BY_ID = Object.fromEntries(
  Object.entries(STORES).flatMap(([gu, l]) => l.map(x => [x.id, { ...x, gu }]))
);
// 품목코드별 데이터 이름 — 가게마다 같은 코드면 가장 많이 쓰인 이름
const DATA_NAME = (() => {
  const cnt = {};
  Object.values(SHOP.prices || {}).forEach(items =>
    Object.entries(items).forEach(([code, v]) => {
      const m = cnt[code] || (cnt[code] = {});
      m[v.name] = (m[v.name] || 0) + 1;
    })
  );
  return Object.fromEntries(
    Object.entries(cnt).map(([code, m]) => [code, Object.entries(m).sort((a, b) => b[1] - a[1])[0][0]])
  );
})();
const ITEMS = FOOD_DEF.map(([id, label, group, emoji, alias, al]) => {
  const name = unent(DATA_NAME[id] || label);
  return {
    id,
    name,
    group,
    emoji,
    alias: [...new Set([label, ...alias])].filter(a => a !== name),
    allergens: [name, label, ...alias, ...al],
  };
});
const FOOD_BY_CODE = Object.fromEntries(ITEMS.map(i => [i.id, i]));
