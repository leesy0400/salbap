/* ============================================================
   메뉴 조합 3안 — 먹고 싶은 메뉴 이름 읽기(parseWish), AI 조합 요청, 안마다 검사·가격 계산
   ============================================================ */

// ── ③ 먹고 싶은 메뉴로 N끼 조합 3안 (AI) → 프로그램이 안마다 검사·가격 계산 → 사용자가 하나 고르면 장볼 목록 ──
//   먹고 싶은 메뉴는 모든 안에 꼭 들어가고, 한 번 만들어 2끼로 먹어요(끼니가 모자라면 1끼).
const isMenuName = t => {
  if (t.length < 2 || t.length > 15 || !/^[가-힣]+$/.test(t)) return false;
  if (NOT_MENU.some(w => t.includes(w))) return false;
  return MENU_NAMES.includes(t) || MENU_END.some(e => t.length > e.length && t.endsWith(e));
};
// 문장 → {menus:[메뉴 이름], bad:[메뉴가 아닌 말]}
function parseWish(text) {
  const menus = [],
    bad = [];
  let cur = [];
  const flush = () => {
    if (!cur.length) return;
    const t = cur.join("");
    (isMenuName(t) ? menus : bad).push(cur.join(" "));
    cur = [];
  };
  const words = String(text || "")
    .replace(/[.!?~…"'“”]/g, " ")
    .split(/[\s,，、·\/&+\n]+/)
    .filter(Boolean)
    .map(w => w.replace(/(을|를)?(해)?(먹고|만들어)?싶\S*$/, "").replace(/(해주세요|해줘|주세요)$/, ""))
    .filter(Boolean);
  for (const w of words) {
    if (WISH_FILL.test(w)) {
      flush();
      continue;
    }
    const head = cur.join("");
    if (isMenuName(head) && isMenuName(w)) {
      flush();
      cur.push(w);
      continue;
    } // "김치찌개 파스타" → 두 메뉴
    if (isMenuName(head + w)) {
      cur.push(w);
      continue;
    }
    const p = WISH_PART.find(
      p => w.length > p.length && w.endsWith(p) && isMenuName(head + w.slice(0, -p.length))
    );
    if (p) {
      cur.push(w.slice(0, -p.length));
      flush();
      continue;
    } // "김치찌개와" → 김치찌개 + (다음 메뉴)
    cur.push(w);
  }
  flush();
  return { menus: [...new Set(menus.map(m => m.replace(/\s/g, "")))], bad };
}
const COMBO_FMT =
  '{"wishes":["먹고 싶은 메뉴명"],"combos":[{"label":"짧은 이름","desc":"이 안의 특징 한 줄","menus":[{"title":"메뉴명","wish":true,"meals":2,"time_min":20,"level":"쉬움|보통","ingredients":[{"name":"재료명","qty":300,"unit":"g"}]}]}]}';
const draft = () => {
  const t = trip();
  return DB.draft && t && DB.draft.trip === t.id ? DB.draft : null;
};
// 한 안이 규칙에 맞는지 — 끼니 합, 먹고 싶은 메뉴 포함, 못 먹는 재료, 구할 수 있는 재료, 크로스체크
// 주재료 — 조미료·물·쌀/면/즉석밥이 아닌 재료(채소·고기·생선·달걀·두부·김치 등). 메뉴마다 1가지 이상 있어야 해요 (조미료만으로 만드는 메뉴 금지)
const NOT_MAIN = new Set(["seas", "staple"]);
function mainIngs(r) {
  return (r.ingredients || []).filter(g => {
    const c = classify(g.name);
    if (c.kind === "buy") return !NOT_MAIN.has(c.it.group);
    if (c.kind === "fridge") {
      const it = matchItem(c.item.name);
      return !(it && NOT_MAIN.has(it.group));
    }
    return false;
  });
}
function comboProblem(recs, wishes, N) {
  if (!recs.length) return "메뉴가 없어요";
  for (const r of recs)
    if (!mainIngs(r).length) return `'${r.title}'에 주재료가 없어요(조미료만으로 만드는 메뉴는 안 돼요)`;
  const sum = recs.reduce((a, r) => a + r.meals, 0);
  if (sum !== N) return `끼니 합이 ${sum}끼예요`;
  for (const w of wishes) {
    const b = squash(w);
    if (
      !recs.some(r => {
        const a = squash(r.title);
        return r.wish && (a.includes(b) || b.includes(a));
      })
    )
      return `먹고 싶은 메뉴 '${w}'이(가) 빠졌어요`;
  }
  for (const n of trip()?.picked || []) {
    const b = squash(n);
    if (
      !recs.some(r =>
        r.ingredients.some(g => {
          const a = squash(g.name);
          return a === b || (a.length >= 2 && b.length >= 2 && (a.includes(b) || b.includes(a)));
        })
      )
    )
      return `고른 냉장고 재료 '${n}'을(를) 안 썼어요`;
  }
  for (const r of recs) {
    const h = recipeAvoid(r);
    if (h) return `'${r.title}'에 못 먹는 재료(${h})가 있어요`;
  }
  const al = allocate(recs);
  if (al.bad.length) return `'${al.bad[0].r.title}' — ${al.bad[0].reason}`;
  const iss = crossCheck(recs, al);
  if (iss.length) return `'${iss[0].title}' — ${iss[0].msg}`;
  return null;
}
// 조합 3안은 동시에 요청해요 — 안마다 방향을 하나씩 맡겨 짧게 답하게 하면 한 번에 3안을 받는 것보다 훨씬 빨라요
const COMBO_DIRS = [
  ["남김없이", "사고 남는 재료(판매 단위가 큰 재료)를 여러 메뉴에 나눠 끝까지 쓰기"],
  ["알뜰하게", "새로 살 재료 합계를 가장 적게, 냉장고 재료를 최대한 쓰기"],
  ["간단하게", "조리가 짧고 재료 가짓수가 적은 메뉴 위주"],
];
const COMBO_ONE =
  '{"wishes":["먹고 싶은 메뉴명"],"desc":"이 조합의 특징 한 줄","menus":[{"t":"메뉴명","w":1,"m":1,"i":[["재료명",300,"g"]]}]}';
function parseCombo(c) {
  const recs = (c.menus || [])
    .map(m => {
      const ings = (m.i || m.ingredients || []).map(g =>
        Array.isArray(g) ? { name: g[0], qty: g[1], unit: g[2] } : g
      );
      return {
        ...normRecipe({ title: m.t || m.title, ingredients: ings, steps: [] }, !!(m.w ?? m.wish)),
        meals: Math.max(1, Math.round(+(m.m ?? m.meals) || 1)),
      };
    })
    .filter(r => r.title);
  return {
    wishes: (c.wishes || []).map(x => String(x).trim()).filter(Boolean),
    desc: String(c.desc || ""),
    recipes: recs,
  };
}
async function makeCombos() {
  const el = $("#wish");
  S.wish = (el ? el.value : S.wish || "").trim().slice(0, WISH_MAX);
  const wish = S.wish;
  {
    const m = safetyHit(wish);
    if (m) {
      S.planNote = m;
      S.wish = "";
      return render();
    }
  }
  const N = tripMeals(),
    pw = parseWish(wish),
    wishM = pw.menus;
  if (wish && (pw.bad.length || !wishM.length)) {
    S.planNote = `${pw.bad.length ? `'${esc(pw.bad[0])}'은(는) 메뉴 이름이 아니에요. ` : ""}김치찌개처럼 메뉴 이름만 적어주세요.`;
    return render();
  }
  if (wishM.length > N) {
    S.planNote = `먹고 싶은 메뉴가 ${N}끼보다 많아요. 끼니 수를 늘리거나 메뉴를 줄여주세요.`;
    return render();
  }
  if (S.work) return;
  S.work = "plan";
  S.planNote = "";
  startProg("plan");
  render();
  if (!trip()) newTrip(N);
  Object.assign(trip(), { meals: N, picked: pickedNow() });
  const room = Math.max(0, leftMonth()),
    pk = trip().picked,
    why = [],
    errs = [],
    valid = [];
  const sysBase = `당신은 "냉장고 털기" 집밥 식단 도우미입니다. ${N}끼 메뉴 조합 1개를 만듭니다. 반드시 JSON만, 아래 형식 그대로 짧게 출력하세요(설명·코드블록 금지): ${COMBO_ONE}. t=메뉴명, w=먹고 싶은 메뉴면 1 아니면 0, m=이 메뉴로 먹는 끼니 수, i=[재료명, 분량, 단위] 목록(그 메뉴 m끼 전체 분량). 규칙: 사용자가 먹고 싶다고 한 메뉴는 wishes에 그대로 적고 w:1로 꼭 넣기. 나머지 메뉴는 w:0, 서로 겹치지 않게. m은 기본 1. 김치찌개·카레·곰탕처럼 한 끼 분량만 만들기 어려운 메뉴는 m:2로 해도 되지만 꼭 그럴 필요는 없음(먹고 싶은 메뉴라고 무조건 2끼로 하지 말기). m 합은 정확히 ${N}. 먹고 싶은 메뉴가 없으면 wishes는 빈 배열. 사고 남는 재료와 냉장고 재료는 다른 메뉴에서 이어 써서 남김없이 쓰기. 모든 메뉴에는 조미료·물·쌀·면 말고 주재료(채소·고기·생선·달걀·두부·김치 등)가 꼭 1가지 이상 들어가야 함 — 냉장고에 없으면 [살 수 있는 재료]에서 사는 것으로 넣기. 조미료만으로 만드는 메뉴, 재료를 하나도 안 사려고 억지로 짠 메뉴는 금지. 예산이 모자라도 메뉴는 정상적으로 짜고, 예산 판단은 앱이 함.${pk.length ? ` 사용자가 이번에 꼭 쓰겠다고 고른 냉장고 재료(${pk.join(", ")})는 모두 어떤 메뉴에든 넣고, 여러 개면 그 재료들을 함께 쓰는 메뉴를 menus 맨 앞에 두기.` : ""} ${ingRules()}`;
  const usr = `먹고 싶은 메뉴: ${wishM.join(", ") || "없음"}\n끼니 수: ${N}끼\n이번 달 남은 장보기 예산: ${room > 0 ? room + "원(참고만, 넘어도 메뉴는 정상적으로)" : "이미 다 씀(그래도 필요한 재료는 사야 함)"}\n[냉장고 재료] ${fridgeLines()}${pk.length ? `\n[이번에 꼭 쓸 냉장고 재료] ${pk.join(", ")}` : ""}\n[가진 조미료] ${seasLines()}\n[살 수 있는 재료(${placeOf(P())} 실제 가격)] ${catLinesShort()}\n인원: ${P().people}명\n기피/알레르기: ${avoidText()}`;
  const keyOf = c =>
    c.recipes
      .map(r => r.title)
      .sort()
      .join("+");
  const lastWhy = {}; // 안마다 직전에 버린 이유 — 다시 요청할 때 AI에게 알려줘서 같은 실수를 안 하게 해요
  const ask = (k, prev) =>
    askJSON(
      sysBase + ` 이번 조합의 방향: '${COMBO_DIRS[k][0]}' — ${COMBO_DIRS[k][1]}.`,
      usr +
        (prev.length ? `\n이미 나온 조합(이것과 다르게): ${prev.join(" / ")}` : "") +
        (lastWhy[k]
          ? `\n직전에 짠 조합은 이 문제로 쓸 수 없었어요: ${lastWhy[k]}. 이 문제가 안 생기게 재료나 메뉴를 바꿔서 새로 짜기.`
          : ""),
      LLM.planModel,
      LLM_PLAN
    ).then(t => ({ k, label: COMBO_DIRS[k][0], ...parseCombo(t), wishes: wishM })); // 먹고 싶은 메뉴는 코드가 읽은 이름으로 검사해요
  // 받은 안 검사 — 규칙에 안 맞으면 그 자리만 다시 요청해요 (시간 초과·연결 오류는 다시 요청하지 않아요)
  const take = (settled, ks, round) => {
    const retry = [];
    settled.forEach((r, j) => {
      const k = ks[j];
      if (r.status !== "fulfilled") {
        const m = r.reason?.message || "오류";
        errs.push(m);
        countCombo(round, "err", /형식|JSON|Unexpected/.test(m) ? "형식 오류" : "연결·시간 초과");
        return;
      }
      const c = r.value,
        p = comboProblem(c.recipes, c.wishes, N);
      if (!p && valid.some(v => keyOf(v) === keyOf(c))) {
        countCombo(round, "rule", "다른 안과 같음");
        retry.push(k);
        return;
      }
      if (p) {
        const w = `${c.label}: ${p}`;
        if (!why.includes(w)) why.push(w);
        lastWhy[k] = p;
        countCombo(round, "rule", comboWhy(p));
        retry.push(k);
      } else {
        countCombo(round, "pass");
        valid.push(c);
      }
    });
    return retry;
  };
  let retry = take(await Promise.allSettled([0, 1, 2].map(k => ask(k, []))), [0, 1, 2], "first");
  if (retry.length) {
    const prev = valid.map(keyOf);
    retry = take(await Promise.allSettled(retry.map(k => ask(k, prev))), retry, "retry");
  }
  if (!valid.length && retry.length && why.length)
    take(await Promise.allSettled(retry.map(k => ask(k, []))), retry, "retry"); // 하나도 못 건졌으면 이유를 알려주고 한 번 더
  save();
  S.work = null;
  S.tab = "pick";
  S.view = "app";
  if (!valid.length) {
    S.planNote =
      errs.length && !why.length
        ? LLM.proxy
          ? `메뉴 조합을 만들지 못했어요. 잠시 후 다시 시도해 주세요.${errTail(errs[0])}`
          : "AI가 연결되지 않아 메뉴 조합을 만들 수 없어요. LLM 설정에 API 키를 넣거나 Claude 미리보기에서 열어주세요."
        : failNote(why, wishM);
    return render();
  }
  valid.sort((a, b) => a.k - b.k);
  DB.draft = {
    wk: NOW_WK,
    trip: trip().id,
    at: Date.now(),
    wish,
    meals: N,
    wishes: valid[0].wishes,
    combos: valid.map(({ k, wishes, ...c }) => c),
    dropped: 3 - valid.length,
  };
  S.comboSel = null;
  S.planEdit = false;
  S.pview = "combo";
  S.planNote = "";
  save();
  render();
  scrollTo(0, 0);
}

// 고른 조합으로 장볼 목록 확정 — 지금 냉장고·가격으로 다시 배정하고 크로스체크한 뒤 저장
function confirmCombo() {
  const dr = draft();
  if (!dr) return;
  const pl = plan();
  if (S.comboSel == null && pl && pl.draftAt === dr.at) S.comboSel = dr.sel; // 전에 고른 안 그대로 눌러도 넘어가요
  const c = dr.combos[S.comboSel];
  if (!c) return;
  const recs = c.recipes,
    al = allocate(recs),
    p = comboProblem(recs, dr.wishes, dr.meals);
  if (p) {
    S.planNote = `이 조합은 지금 쓸 수 없어요: ${p}. 메뉴를 다시 받아주세요.`;
    return render();
  }
  const notes = [],
    room = Math.max(0, leftMonth()),
    total = al.items.reduce((a, b) => a + b.q.cost, 0);
  if (total > room)
    notes.push(
      room > 0
        ? `예산이 ${won(total - room)} 부족해요. ${ymLabel(NOW_YM)} 남은 장보기 예산은 ${won(room)}이에요.`
        : `${ymLabel(NOW_YM)} 장보기 예산을 이미 다 썼어요. 이번 장보기는 ${won(total)}이 더 들어요.`
    );
  const old = plan();
  if (old) DB.recipes = DB.recipes.filter(r => !(old.recipes.includes(r.id) && !r.cooked && !isScrap(r.id)));
  const ids = recs.map(r => {
    const rec = { ...r, steps: [], id: uid(), at: Date.now(), week: NOW_WK, planWk: NOW_WK, cooked: false };
    DB.recipes.push(rec);
    return rec.id;
  }); // 조리법은 열어볼 때 만들어요
  const items = al.items.map(b => ({
    key: "p:" + b.it.id,
    name: b.it.name,
    unit: b.q.label,
    spec: specOf(b.pr),
    price: b.q.cost,
    pr: b.pr,
    date: b.pr.date,
    kind: b.it.group === "seas" ? "seas" : "item",
    for: [...new Set(b.recipes)],
    left: b.q.left,
    lu: b.q.lu,
    unknown: !!b.q.unknown,
  }));
  DB.plan = {
    wk: NOW_WK,
    trip: trip()?.id,
    at: Date.now(),
    wish: dr.wish,
    meals: dr.meals,
    label: c.label,
    recipes: ids,
    items,
    notes,
    fridge: al.fridge.map(f => ({
      name: f.item.name,
      level: f.item.level,
      recipes: [...new Set(f.recipes)],
    })),
    check: { ok: true, avoid: avoidText() === "없음" ? "" : avoidText() },
  };
  cart();
  DB.cart.items = DB.cart.items
    .filter(x => !x.key.startsWith("p:"))
    .concat(items.map(({ pr, ...x }) => ({ ...x, bought: true })));
  dr.sel = S.comboSel;
  DB.plan.draftAt = dr.at; // 조합은 지우지 않고 남겨둬요 (2단계로 돌아가 다시 고를 수 있게)
  S.comboSel = null;
  S.menus = null;
  S.pview = "list";
  save();
  render();
  scrollTo(0, 0);
}

// 레시피 조리법은 처음 열어볼 때 만들어요 (재료·분량은 고른 조합 그대로, 새 재료 추가 금지)
async function ensureSteps(id) {
  const r = findR(id);
  if (!r || (r.steps && r.steps.length) || S.stepsWork) return;
  S.stepsWork = id;
  S.stepsErr = "";
  startProg("steps");
  render();
  const sys =
    '당신은 집밥 레시피 도우미입니다. 반드시 JSON만 출력하세요(설명·코드블록 금지). 형식: {"steps":["조리 단계"],"time_min":20,"level":"쉬움|보통"}. 규칙: 주어진 재료와 분량만 사용(물 제외, 새 재료 추가 금지). 기피·알레르기 재료는 절대 쓰지 말기. 가격 숫자 금지. 의료·치료 조언 금지.';
  const usr = `메뉴: ${r.title}${r.meals > 1 ? ` (${r.meals}끼분을 한 번에 만들어요)` : ""}\n재료: ${(r.uses || []).join(", ")}\n인원: ${P().people}명\n기피/알레르기: ${avoidText()}`;
  try {
    const x = await askJSON(sys, usr, LLM.model, LLM_FAST),
      st = (x.steps || []).map(String).filter(Boolean);
    if (!st.length) throw new Error("형식 오류");
    const h = recipeAvoid({ ...r, steps: st });
    if (h) throw new Error(`조리법에 못 먹는 재료(${h})가 들어가 보여드리지 않았어요`);
    Object.assign(r, { steps: st, time_min: r.time_min || x.time_min, level: r.level || x.level });
    save();
  } catch (e) {
    S.stepsErr =
      LLM.proxy || !/연결/.test(e.message)
        ? `조리법을 불러오지 못했어요. 잠시 후 다시 시도해 주세요.${errTail(e.message)}`
        : "AI가 연결되지 않아 조리법을 만들 수 없어요.";
  }
  S.stepsWork = null;
  render();
}
const planRecs = () => {
  const pl = lastPlan();
  return pl ? pl.recipes.map(findR).filter(Boolean) : [];
};
const planMeals = () => planRecs().reduce((a, r) => a + (r.meals || 1), 0);
