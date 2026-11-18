/* ============================================================
   식재료 — 가격(가게·구 평균), 조사일, 알레르기·못 먹는 재료 판별, 이모지
   ============================================================ */

/* 식재료·가격 */
// 가격 — 가게를 골랐으면 그 가게에서 조사된 값만, '구 평균'을 골랐으면 그 구 가게들 평균(같은 규격·단위끼리만)
//   데이터가 없으면 null → 화면에 '데이터 없음'. 다른 가게 값이나 추정값으로 대신 채우지 않아요.
function rawPrice(id, code) {
  const v = ((SHOP.prices || {})[id] || {})[code];
  return v && +v.price >= DATA_RULES.minValidPrice ? v : null;
}
const AREA_CACHE = {};
function areaPrice(gu, code) {
  const k = gu + "|" + code;
  if (k in AREA_CACHE) return AREA_CACHE[k];
  const rows = (STORES[gu] || []).map(x => rawPrice(x.id, code)).filter(Boolean);
  if (!rows.length) return (AREA_CACHE[k] = null);
  const key = v => v.spec + "|" + v.unit,
    cnt = {};
  rows.forEach(v => (cnt[key(v)] = (cnt[key(v)] || 0) + 1));
  const top = Object.entries(cnt).sort((a, b) => b[1] - a[1])[0][0],
    same = rows.filter(v => key(v) === top);
  return (AREA_CACHE[k] = {
    ...same[0],
    price: Math.round(same.reduce((a, v) => a + v.price, 0) / same.length / 10) * 10,
    date: same
      .map(v => v.date)
      .sort()
      .pop(),
    n: same.length,
    src: "area",
  });
}
function price(it) {
  if (!it) return null;
  const p = P();
  if (p.mart) {
    const v = rawPrice(p.mart, it.id);
    return v ? { ...v, src: "store" } : null;
  }
  return p.district ? areaPrice(p.district, it.id) : null;
}
const specOf = pr => (pr && pr.spec && pr.spec !== "-" ? unent(pr.spec) : "");
const ageDays = d => Math.floor((Date.now() - new Date(d + "T00:00:00").getTime()) / DAY);
// 조사일 표시: "1월 12일 조사" (+ 60일 넘으면 '오래된 가격')
function dateTxt(pr) {
  if (!pr || !pr.date) return "";
  const d = new Date(pr.date + "T00:00:00"),
    y = d.getFullYear() !== new Date().getFullYear() ? `${d.getFullYear()}년 ` : "";
  return `${y}${d.getMonth() + 1}월 ${d.getDate()}일 조사${pr.src === "area" ? ` · ${pr.n}곳 평균` : ""}`;
}
const staleTag = pr =>
  pr && pr.date && ageDays(pr.date) > DATA_RULES.staleDays ? ` <span class="tag o">오래된 가격</span>` : "";
// 알레르기는 [선택] 동의를 한 경우에만 받고 써요. 이 기능 전에 가입한 계정(동의 기록 없음)은 예전처럼 써요.
const allergyOK = () => !DB.consent || !!DB.consent.allergy;
const allergies = () => (allergyOK() ? P().allergies || [] : []);
const avoidWords = () => (P().avoid || "").split(/[,，\s]+/).filter(Boolean); // 직접 적은 못 먹는 재료
// 지금 고른 알레르기 성분이 든 단어 — 정답표 단어 + 해당 품목의 이름·별칭
function tableWords() {
  const al = allergies();
  if (!al.length) return [];
  const has = v => v.split(",").some(a => al.includes(a));
  return [
    ...Object.keys(ALLERGY_TABLE).filter(k => has(ALLERGY_TABLE[k])),
    ...ITEMS.filter(i => ALLERGY_CODE[i.id] && has(ALLERGY_CODE[i.id])).flatMap(i => [
      coreName(i.name),
      ...i.alias,
    ]),
  ];
}
const avoidList = () => [
  ...new Set([...avoidWords(), ...allergies().flatMap(a => (ALLERGENS.find(x => x[0] === a) || [, []])[1])]),
]; // 직접 적은 재료 + 알레르기 기본 단어
const avoidAll = () => [...new Set([...avoidList(), ...tableWords()])]; // 글자로 찾을 때(재료 이름·메뉴 이름·조리법) 쓰는 전체 단어
// 가격 데이터 품목이 정답표에서 고른 알레르기 성분을 가졌는지
const tableBad = it => {
  const v = ALLERGY_CODE[it.id],
    al = allergies();
  return !!v && v.split(",").some(a => al.includes(a));
};
// AI에 알려줄 문장 — "새우, 고수 / 알레르기: 우유, 대두"
const avoidText = () =>
  [P().avoid && P().avoid.trim(), allergies().length && `알레르기: ${allergies().join(", ")}`]
    .filter(Boolean)
    .join(" / ") || "없음";
// 기피 매칭 — 한 글자 키워드(무·배·감·콩·김…)는 정확히 같을 때만 ('배추'를 피한다고 '배'까지 빼지 않게)
function allowed(it) {
  return (
    !tableBad(it) &&
    !avoidList().some(x =>
      it.allergens.some(a => (a.length < 2 || x.length < 2 ? a === x : x.includes(a) || a.includes(x)))
    )
  );
}
const coreName = n =>
  String(n)
    .replace(/\(.*?\)/g, "")
    .trim();
const itemByName = n => matchItem(n);
// 재료 이름 → 이모지 (목록에 없는 재료는 🥫, 조미료는 🧂)
const emojiOf = n => {
  const it = itemByName(n);
  if (it) return it.emoji;
  if (SEASONINGS.includes(coreName(n))) return "🧂";
  const c = (DB.cats || {})[coreName(n)];
  return c ? catOf(c)[1] : "🥫";
};
const ingIc = n => emo(emojiOf(n));
// 레시피에 이 재료가 들어가는지 (이름 전체, 3글자 이상이면 앞 2글자로도 확인)
function mentions(r, n) {
  const t = (r.title || "") + " " + (r.uses || []).join(" "),
    c = coreName(n);
  return !!c && (t.includes(c) || (c.length >= 3 && t.includes(c.slice(0, 2))));
}
// 메뉴 이모지 — 메뉴 이름에 나온 주재료(고기·생선 먼저, 그다음 이름에서 앞에 나온 것)를 먼저 봐요.
//   이름에 재료가 없을 때만 들어가는 재료 목록에서 찾아요 (예전엔 목록 순서라 닭고기 요리에 마늘이 떴어요)
const IC_PRI = { meat: 0, fish: 0, processed: 1, dairy: 1, staple: 2, veg: 3, fruit: 4 };
function titleIc(t) {
  t = String(t || "");
  let best = null;
  for (const i of ITEMS) {
    if (!(i.group in IC_PRI)) continue;
    const ns = [coreName(i.name), ...i.alias.map(coreName)].filter(
      n => n.length >= 2 || (i.group === "meat" && n.length === 1)
    );
    const p = Math.min(
      ...ns.map(n => {
        const k = t.indexOf(n);
        return k < 0 ? 1e9 : k;
      })
    );
    if (p >= 1e9) continue;
    const sc = IC_PRI[i.group] * 1000 + p;
    if (!best || sc < best.sc) best = { i, sc };
  }
  return best && best.i;
}
