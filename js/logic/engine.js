/* ============================================================
   장보기 엔진 — ①못 먹는 재료 ②냉장고·조미료 ③먹고 싶은 메뉴 ④남는 재료 순으로 배정
   AI는 레시피만 만들고, 분류·수량·가격은 전부 이 코드가 실제 데이터로 계산해요
   ============================================================ */

/* ============================================================
   ③-2.6 장보기 엔진 — 순서: ①못 먹는 재료 ②냉장고·조미료 ③먹고 싶은 메뉴 ④남는 재료로 나머지 끼니
   AI는 레시피(메뉴·재료·조리법)만 만들어요. 그 재료가 냉장고/조미료/살 것 중 무엇인지, 몇 개 사고
   얼마나 남는지, 가격은 전부 프로그램이 실제 데이터(shopping_db.json)로만 계산하고 검사해요.
   ============================================================ */

// ── 수량 읽기 ──
// 판매 단위 → {g | ml | cnt | pack+word}  ("1망1kg"→1000g, "1개200g x 4개입"→800g, "10개"→10개, "1단"→1단)
function unitAmt(u) {
  u = String(u || "").replace(/\s/g, "");
  let m,
    o = {};
  if ((m = u.match(/^(\d+)(개|봉|캔|통|병|포|팩|단|포기|송이|마리|모)/))) {
    o.pack = +m[1];
    o.word = m[2];
  } // 앞의 '1개'·'1봉' 같은 포장 단위
  if ((m = u.match(/([\d.]+)(kg|g)x(\d+)개입/i))) {
    o.g = +m[1] * (/kg/i.test(m[2]) ? 1000 : 1) * +m[3];
    o.cnt = +m[3];
    return o;
  }
  if ((m = u.match(/([\d.]+)(kg|g)(?![a-z])/i))) o.g = +m[1] * (/kg/i.test(m[2]) ? 1000 : 1);
  else if ((m = u.match(/([\d.]+)(ml|l)(?![a-z])/i))) o.ml = +m[1] * (/^l$/i.test(m[2]) ? 1000 : 1);
  if ((m = u.match(/(\d+)개입/)) || (m = u.match(/^(\d+)개$/))) o.cnt = +m[1];
  if (!o.pack && o.g == null && o.ml == null && o.cnt == null) {
    o.pack = 1;
    o.word = "";
  }
  return o;
}
// 레시피 분량 → {g | ml | cnt+word} (모르면 null)
const SPOON = { 큰술: 15, 작은술: 5, 스푼: 15, 티스푼: 5, 컵: 200 };
function needAmt(q, u) {
  q = +q || 0;
  u = String(u || "").trim();
  if (!q) return null;
  if (/^kg$/i.test(u)) return { g: q * 1000 };
  if (/^g$/i.test(u)) return { g: q };
  if (/^l$/i.test(u)) return { ml: q * 1000 };
  if (/^ml$/i.test(u)) return { ml: q };
  if (SPOON[u]) return { ml: q * SPOON[u] };
  if (/^(개|알|마리|모|단|포기|송이|통|봉|캔|팩|장)$/.test(u)) return { cnt: q, word: u };
  return null;
}
const PACKW = ["개", "모", "캔", "봉", "팩", "통", "병", "포"]; // 한 덩어리로 파는 상품 단위끼리는 같은 '개수'로 봐요
const fmtAmt = (v, u) =>
  u === "g" && v >= 1000
    ? `${+(v / 1000).toFixed(1)}kg`
    : u === "ml" && v >= 1000
      ? `${+(v / 1000).toFixed(1)}L`
      : `${Math.round(v * 10) / 10}${u}`;
// 살 양 계산 — 판매 단위로 몇 개 사야 하고, 다 쓰고 얼마나 남는지 (가격은 데이터 값 × 개수)
function buyQty(pr, needs) {
  const U = unitAmt(pr.unit),
    per100 = pr.unit === "100g";
  let tot = null,
    dim = null;
  if (needs.length && needs.every(Boolean)) {
    if (needs.every(n => n.g != null || n.ml != null)) {
      dim = "w";
      tot = needs.reduce((a, n) => a + (n.g ?? n.ml), 0);
    } else if (needs.every(n => n.cnt != null && (n.word === "개" || n.word === "알")) && U.cnt) {
      dim = "c";
      tot = needs.reduce((a, n) => a + n.cnt, 0);
    } else if (
      needs.every(
        n =>
          n.cnt != null && U.word && (n.word === U.word || (PACKW.includes(n.word) && PACKW.includes(U.word)))
      )
    ) {
      dim = "p";
      tot = needs.reduce((a, n) => a + n.cnt, 0);
    }
  } // 두부 1모 ↔ 1개380g
  if (per100) {
    if (dim === "w") {
      const k = Math.max(1, Math.ceil(tot / 100 - 1e-9));
      return { packs: k, label: `${k * 100}g`, cost: k * pr.price, need: tot, left: k * 100 - tot, lu: "g" };
    }
    return { packs: 1, label: "100g", cost: pr.price, left: null, unknown: true };
  }
  const cap = dim === "w" ? (U.g ?? U.ml) : dim === "c" ? U.cnt : dim === "p" ? U.pack : null;
  if (cap && tot != null) {
    const k = Math.max(1, Math.ceil(tot / cap - 1e-9));
    return {
      packs: k,
      label: k > 1 ? `${pr.unit} × ${k}` : pr.unit,
      cost: k * pr.price,
      need: tot,
      left: k * cap - tot,
      lu: dim === "w" ? (U.g != null ? "g" : "ml") : dim === "c" ? "개" : U.word || "개",
    };
  }
  return { packs: 1, label: pr.unit, cost: pr.price, left: null, unknown: true };
}

// ── 재료 분류: 물 / 조미료 / 냉장고 / 살 것(이 가게 데이터) / 없음 ──
const WATER = /^(물|찬물|뜨거운물|끓는물|얼음|얼음물|생수)$/;
const seasMapNow = () =>
  DB.seasSet
    ? Object.fromEntries(Object.entries(DB.seas).map(([k, v]) => [k, v === "low" ? "have" : v]))
    : Object.fromEntries(DEFAULT_SEASONINGS.map(n => [n, "have"]));
const squash = n => coreName(n).replace(/\s/g, "");
function seasKeyOf(n) {
  const c = squash(n);
  if (isSeasName(c)) return c;
  const it = matchItem(c);
  return it && it.group === "seas" ? coreName(it.name) : null;
}
function fridgeOf(n) {
  const b = squash(n);
  return stock().find(x => {
    const a = squash(x.name);
    return a === b || (a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a)));
  });
}
function buyOf(n) {
  const it = matchItem(n),
    pr = it && price(it);
  return pr ? { kind: "buy", it, pr } : null;
} // 이 가게(또는 구 평균) 데이터에 값이 있는 것만
function classify(n) {
  if (WATER.test(squash(n))) return { kind: "water" };
  const sk = seasKeyOf(n);
  if (sk) {
    const lv = seasMapNow()[sk];
    if (lv === "have" || lv === "low") return { kind: "seas", key: sk, lv };
    return buyOf(n) || { kind: "none", why: "가진 조미료가 아니고 가게 데이터에도 없어요" };
  }
  const fx = fridgeOf(n);
  if (fx) return { kind: "fridge", item: fx };
  return buyOf(n) || { kind: "none", why: `${placeOf(P())} 가격 데이터에 없는 재료예요` };
}

// ── ① 못 먹는 재료 검사 — 재료 이름, 메뉴 이름, 조리법 문장까지 ──
function avoidHit(text) {
  const t = String(text || "").replace(/\s/g, "");
  return avoidAll().find(a => (a.length >= 2 ? t.includes(a) : squash(text) === a)) || null;
}
function recipeAvoid(r) {
  for (const g of r.ingredients || []) {
    const h = avoidHit(g.name);
    if (h) return h;
    const it = matchItem(g.name);
    if (it && !allowed(it)) return it.name;
  }
  const h = avoidHit(r.title);
  if (h) return h;
  for (const st of r.steps || []) {
    const t = String(st).replace(/\s/g, "");
    const a = avoidAll().find(a => a.length >= 2 && t.includes(a));
    if (a) return a;
  }
  return null;
}

// ── ②·③·④ 배정 — 우선순위대로(먹고 싶은 메뉴 먼저) 재료를 냉장고/조미료/살 것에 나눠 담아요 ──
//   냉장고·조미료가 '조금'이면 한 끼에서만 쓰고(그다음 끼니는 사야 해요), '보통·넉넉'이면 이번엔 안 사요.
function allocate(recs) {
  const used = {},
    buys = {},
    fr = {},
    ok = [],
    bad = [];
  for (const r of recs) {
    const plan = [];
    let fail = null;
    for (const g of r.ingredients) {
      let c = classify(g.name);
      if (c.kind === "water") continue;
      if (c.kind === "none") {
        fail = `'${g.name}': ${c.why}`;
        break;
      }
      const once =
        c.kind === "fridge" && c.item.level === "low"
          ? "f" + c.item.id
          : c.kind === "seas" && c.lv === "low"
            ? "s" + c.key
            : null;
      // 조금 남은 것을 또 쓰면 → 사는 것으로 돌려요. 조미료는 가게 가격이 없어도 한 숟갈 정도라 그냥 써요(조합을 버리지 않아요)
      if (once && used[once]) {
        const b = buyOf(g.name);
        if (b) c = b;
        else if (c.kind === "seas") c = { ...c, lv: "have" };
        else {
          fail = `'${g.name}'이(가) 조금밖에 없어 한 끼에만 쓸 수 있어요`;
          break;
        }
      }
      plan.push({ ...c, g, once: c.kind === "buy" || (once && used[once]) ? null : once });
    }
    if (fail) {
      bad.push({ r, reason: fail });
      continue;
    }
    plan.forEach(c => {
      if (c.once) used[c.once] = 1;
      if (c.kind === "fridge")
        (fr[c.item.id] || (fr[c.item.id] = { item: c.item, recipes: [] })).recipes.push(r.title);
      if (c.kind === "buy") {
        const b = buys[c.it.id] || (buys[c.it.id] = { it: c.it, pr: c.pr, needs: [], recipes: [] });
        b.needs.push(needAmt(c.g.qty, c.g.unit));
        b.recipes.push(r.title);
      }
    });
    ok.push(r);
  }
  return {
    ok,
    bad,
    items: Object.values(buys).map(b => ({ ...b, q: buyQty(b.pr, b.needs) })),
    fridge: Object.values(fr),
    used,
  };
}

// ── 마지막 크로스체크 — 문제가 있으면 그 메뉴를 빼고 다시 배정해요 ──
function crossCheck(recs, al) {
  const issues = [],
    titles = new Set();
  recs.forEach(r => {
    const h = recipeAvoid(r);
    if (h) issues.push({ title: r.title, msg: `못 먹는 재료(${h})` });
    if (titles.has(r.title)) issues.push({ title: r.title, msg: "같은 메뉴가 두 번" });
    titles.add(r.title);
    if (!r.ingredients.length) issues.push({ title: r.title, msg: "재료가 비어 있어요" });
    r.ingredients.forEach(g => {
      if (classify(g.name).kind === "none")
        issues.push({ title: r.title, msg: `구할 수 없는 재료(${g.name})` });
    });
  });
  al.items.forEach(b => {
    if (!allowed(b.it)) issues.push({ title: b.recipes[0], msg: `못 먹는 재료를 사려고 해요(${b.it.name})` });
    if (!rawPriceOk(b)) issues.push({ title: b.recipes[0], msg: `가격 데이터가 없는 재료(${b.it.name})` });
  });
  return issues;
}
const rawPriceOk = b => !!price(b.it) && price(b.it).price === b.pr.price;

// ── AI 레시피 요청 ──
const RECIPE_FMT =
  '{"recipes":[{"title":"메뉴명","time_min":20,"level":"쉬움|보통","ingredients":[{"name":"재료명","qty":300,"unit":"g"}],"steps":["조리 단계"]}]}';
function recipeRules() {
  return `반드시 JSON만 출력하세요(설명·코드블록 금지). 형식: ${RECIPE_FMT}. 규칙: ${ingRules()}`;
}
function ingRules() {
  return `재료 name은 반드시 아래 [냉장고 재료]·[가진 조미료]·[살 수 있는 재료] 목록에 있는 이름 그대로 쓰기(물은 써도 됨). 목록에 없는 재료는 절대 쓰지 말고, 대체할 수 없으면 그 메뉴는 만들지 말기. unit은 g, ml, 개, 큰술, 작은술, 컵, 단, 모, 마리, 포기, 장 중 하나. '100g 단위'나 무게로 파는 재료는 g으로, 10개·4개입처럼 개수로 파는 재료와 두부·통조림처럼 한 개씩 파는 상품은 개로. ${P().people}명 분량. 기피·알레르기 재료(${avoidText()})는 메뉴 이름·재료·조리법 어디에도 절대 쓰지 말기. 냉장고나 조미료가 '조금'인 것은 전체에서 한 메뉴에만 쓰기. 가격·금액 숫자는 쓰지 말기. 의료·치료 조언 금지.`;
}
// AI에 보내는 가격표는 짧게 — 이름·판매 단위·가격만 (상품 상세 규격은 프로그램이 계산할 때만 써요)
function catLinesShort() {
  return (
    ITEMS.filter(allowed)
      .map(it => ({ it, pr: price(it) }))
      .filter(x => x.pr)
      .map(({ it, pr }) => `${it.name}(${pr.unit} ${pr.price}원)`)
      .join(", ") || "없음"
  );
}
function catLines() {
  return (
    ITEMS.filter(allowed)
      .map(it => ({ it, pr: price(it) }))
      .filter(x => x.pr)
      .map(
        ({ it, pr }) =>
          `${it.name}${specOf(pr) ? `[${specOf(pr)}]` : ""}(${pr.unit === "100g" ? "100g 단위" : pr.unit + " 단위"} ${pr.price}원)`
      )
      .join(", ") || "없음"
  );
}
function fridgeLines(skip) {
  return (
    stock()
      .filter(x => (!skip || !skip["f" + x.id]) && !avoidHit(x.name))
      .map(
        x => `${x.name}(${LV[x.level]}${x.level === "low" ? ": 한 끼에만" : ""}, ${daysAgo(x.addedAt)}일째)`
      )
      .join(", ") || "없음"
  );
}
function seasLines(skip) {
  return (
    Object.entries(seasMapNow())
      .filter(([k, v]) => v !== "out" && (!skip || !skip["s" + k]) && !avoidHit(k))
      .map(([k, v]) => `${k}${v === "low" ? "(조금: 한 끼에만)" : ""}`)
      .join(", ") || "없음"
  );
}
function normRecipe(x, wish) {
  /* meals: 이 메뉴로 몇 끼를 먹는지 (먹고 싶은 메뉴는 2끼) */ const ings = (x.ingredients || [])
    .map(g => ({ name: String(g.name || "").trim(), qty: +g.qty || 0, unit: String(g.unit || "").trim() }))
    .filter(g => g.name);
  return {
    title: String(x.title || "").trim(),
    wish: !!wish,
    time_min: x.time_min,
    level: x.level,
    ingredients: ings,
    steps: (x.steps || []).map(String).filter(Boolean),
    uses: ings.map(g => `${g.name}${g.qty ? ` ${g.qty}${g.unit}` : ""}`),
  };
}
async function askRecipes(sys, usr) {
  const r = await askJSON(sys, usr, LLM.model, LLM_FAST);
  if (!Array.isArray(r.recipes)) throw new Error("형식 오류");
  return r.recipes;
}
function leftLines(al) {
  return (
    al.items
      .map(
        b =>
          `${b.it.name}${specOf(b.pr) ? `[${specOf(b.pr)}]` : ""}: ${b.q.label} 사서 ${b.q.need != null ? fmtAmt(b.q.need, b.q.lu) + " 씀" : "일부 씀"} → ${b.q.left != null ? `${fmtAmt(b.q.left, b.q.lu)} 남음` : "남은 양 모름(남았다고 보고 꼭 쓰기)"}`
      )
      .join("\n") || "없음"
  );
}
