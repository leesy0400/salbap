/* ============================================================
   레시피 — 냉장고 재료로 메뉴 추천, 먹고 싶은 메뉴 확인, ♥ 저장, 해먹었어요 → 남은 양
   ============================================================ */

/* ============================================================
   ③-3 레시피 — 냉장고 재료로 추천 → ♥ 저장 → 해먹었어요 → 남은 양 반영
   ============================================================ */
const findR = id => DB.recipes.find(r => r.id === id) || DB.scraps.find(r => r.id === id);
const isScrap = id => DB.scraps.some(r => r.id === id);
function toggleScrap(id) {
  if (isScrap(id)) {
    DB.scraps = DB.scraps.filter(r => r.id !== id);
    toast("즐겨찾기에서 뺐어요");
  } else {
    const r = findR(id);
    DB.scraps.unshift({ ...r });
    toast("즐겨찾기에 담았어요");
  }
  save();
  keep();
}
function openRecipe(id) {
  S.openR = id;
  S.rtab = "uses";
  S.left = null;
  S.stepsErr = "";
  render();
  const r = findR(id);
  if (r && !(r.steps || []).length) ensureSteps(id);
}

// 오늘 뭐 해먹지? — ① 지금 냉장고 재료로 만들 수 있는 메뉴를 먼저 보여주고 ② 고른 메뉴의 레시피를 만들어요
const fridgeSig = () =>
  stock()
    .map(x => x.name + x.level)
    .join("|") +
  "#" +
  JSON.stringify(DB.seas); // 냉장고가 바뀌었는지 확인용
const needMenus = () => stock().length > 0 && (!S.menus || S.menuSig !== fridgeSig());
const ingLine = () =>
  stock()
    .map(x => `${x.name}(${LV[x.level]}, ${daysAgo(x.addedAt)}일째)`)
    .join(", ") || "없음";
function seasLine() {
  const m = DB.seasSet ? DB.seas : Object.fromEntries(DEFAULT_SEASONINGS.map(n => [n, "have"]));
  return (
    Object.entries(m)
      .filter(([, v]) => v !== "out")
      .map(([k, v]) => `${k}(${SV[v]})`)
      .join(", ") || "없음"
  );
}

async function suggestMenus() {
  if (S.work) return;
  S.req = "";
  if (!stock().length) {
    S.menus = [];
    return render();
  }
  S.work = "menus";
  startProg("menus");
  S.tab = "recipe";
  S.rview = "make";
  S.view = "app";
  render(); // 메뉴 자리에 '찾는 중' 표시
  const sys =
    '당신은 "냉장고 털기" 집밥 도우미입니다. 반드시 JSON만 출력하세요(설명·코드블록 금지). 형식: {"menus":[{"title":"메뉴명","desc":"지금 이 메뉴가 좋은 이유 한 줄(예: 오래된 양파를 다 써요)","uses":["쓰는 냉장고 재료명"],"time_min":20}]}. 규칙: 메뉴 5개, 서로 겹치지 않게. 냉장고 재료·보유 조미료·물만으로 만들 수 있는 것만(전부 쓸 필요는 없음). 메뉴마다 냉장고 재료 중 주재료(채소·고기·생선·달걀·두부·김치 등)를 1가지 이상 꼭 쓰고 uses에 적기 — 조미료나 밥·면만으로 만드는 메뉴는 금지. 만들 수 있는 게 없으면 menus를 빈 배열로. 오래됐거나 넉넉한 재료를 많이 쓰는 메뉴를 앞에. 이번 주 먹고 싶다고 한 메뉴를 만들 수 있으면 맨 앞에. 기피 재료는 절대 사용 금지. 가격 숫자 금지. 의료·치료 조언 금지.';
  const usr = `냉장고 재료(남은 양, 보관 일수): ${ingLine()}\n보유 조미료: ${seasLine()}\n이번 장보기 때 먹고 싶다고 한 메뉴: ${lastPlan()?.wish || "없음"}\n기피/알레르기: ${avoidText()}\n인원: ${P().people}명\n추가 요청: ${S.req || "없음"}`;
  let list;
  try {
    const m = (await askJSON(sys, usr, LLM.model, LLM_FAST)).menus;
    if (!Array.isArray(m) || !m.length) throw new Error("형식 오류");
    list = m
      .slice(0, 5)
      .map(x => ({
        title: String(x.title || ""),
        desc: String(x.desc || ""),
        uses: (x.uses || []).map(String),
        time_min: x.time_min,
      }));
    S.note = "";
  } catch (e) {
    list = []; // 실패하면 예시 메뉴로 채우지 않아요
    S.note = LLM.proxy
      ? `메뉴를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.${errTail(e.message)}`
      : "AI가 연결되지 않아 메뉴를 추천할 수 없어요. LLM 설정에 API 키를 넣거나 Claude 미리보기에서 열어주세요.";
  }
  list = list.filter(
    m => !avoidHit(m.title) && !m.uses.some(u => avoidHit(u) || (matchItem(u) && !allowed(matchItem(u))))
  ); // 못 먹는 재료 크로스체크
  list = list.filter(m =>
    m.uses.some(u => {
      const f = fridgeOf(u);
      if (!f) return false;
      const it = matchItem(f.name);
      return !(it && NOT_MAIN.has(it.group));
    })
  ); // 냉장고 주재료를 하나도 안 쓰는 메뉴(조미료만)는 빼요
  S.menus = list;
  S.menuSig = fridgeSig();
  if (list.length) {
    setProg("img");
    await waitPhotos(list.map(m => m.title));
  }
  S.work = null;
  S.tab = "recipe";
  S.rview = "make";
  S.view = "app";
  render();
  scrollTo(0, 0);
}

// 먹고 싶은 메뉴 — 메뉴 이름만 받아요. 지금 냉장고 재료·조미료·물로 만들 수 있으면 레시피를 바로 열고,
//   안 되면 무엇이 더 있어야 하는지 알려줘요. (AI 답은 코드가 재료를 하나씩 다시 확인해요)
async function askWant() {
  if (S.work) return;
  const v = String($("#want")?.value ?? S.want ?? "")
    .trim()
    .slice(0, 20);
  S.want = v;
  S.wantRes = null;
  setInErr();
  if (!v) {
    setInErr("want", "김치찌개처럼 먹고 싶은 메뉴 이름을 적어주세요.");
    return keep();
  }
  {
    const m = safetyHit(v);
    if (m) {
      setInErr("want", m);
      return keep();
    }
  }
  const pw = parseWish(v);
  if (pw.bad.length || pw.menus.length !== 1) {
    setInErr(
      "want",
      pw.menus.length > 1
        ? "메뉴는 하나만 적어주세요."
        : `'${esc(v)}'은(는) 메뉴 이름이 아니에요. 김치찌개처럼 메뉴 이름만 적어주세요.`
    );
    return keep();
  }
  const menu = pw.menus[0];
  if (avoidHit(menu)) {
    setInErr("want", `'${esc(menu)}'에는 못 먹는 재료(${esc(avoidHit(menu))})가 들어가요.`);
    return keep();
  }
  S.work = "want";
  startProg("recipe");
  keep();
  const sys =
    '당신은 집밥 레시피 도우미입니다. 반드시 JSON만 출력하세요(설명·코드블록 금지). 형식: {"can":true,"recipe":{"title":"메뉴명","time_min":20,"level":"쉬움|보통","ingredients":[{"name":"재료명","qty":"분량"}],"steps":["단계"]},"need":["더 필요한 재료명"]}. 규칙: 요청한 메뉴를 [냉장고 재료]·[보유 조미료]·물만으로 제대로 만들 수 있으면 can:true와 그 재료만 쓴 레시피, need는 빈 배열. 그 메뉴의 핵심 재료가 없으면 억지로 바꾸지 말고 can:false, recipe는 null, need에 꼭 필요한데 없는 재료 이름만. 재료 name은 목록에 있는 이름 그대로. 기피 재료 금지. 가격 숫자 금지. 의료·치료 조언 금지.';
  const usr = `먹고 싶은 메뉴: ${menu}\n[냉장고 재료] ${ingLine()}\n[보유 조미료] ${seasLine()}\n기피/알레르기: ${avoidText()}\n인원: ${P().people}명`;
  let x;
  try {
    x = await askJSON(sys, usr, LLM.model, LLM_FAST);
  } catch (e) {
    S.work = null;
    S.wantRes = {
      ok: false,
      msg: LLM.proxy
        ? `'${esc(menu)}'을(를) 확인하지 못했어요. 잠시 후 다시 시도해 주세요.`
        : "AI가 연결되지 않아 확인할 수 없어요.",
    };
    return keep();
  }
  const r = x && x.recipe,
    ings = (r && Array.isArray(r.ingredients) ? r.ingredients : [])
      .map(g => ({ name: String(g.name || "").trim(), qty: String(g.qty || "").trim() }))
      .filter(g => g.name);
  // 코드 확인: 레시피 재료가 전부 냉장고·보유 조미료·물이어야 '만들 수 있음'
  const miss = ings
    .filter(g => !["fridge", "seas", "water"].includes(classify(g.name).kind))
    .map(g => g.name);
  let need = [
    ...new Set([
      ...miss,
      ...(Array.isArray(x?.need)
        ? x.need
            .map(String)
            .map(t => t.trim())
            .filter(Boolean)
        : []),
    ]),
  ]
    .filter(n => !avoidHit(n))
    .slice(0, 6);
  const steps = (r && Array.isArray(r.steps) ? r.steps : []).map(String).filter(Boolean);
  const okMain = ings.some(g => {
    const c = classify(g.name);
    if (c.kind !== "fridge") return false;
    const it = matchItem(c.item.name);
    return !(it && NOT_MAIN.has(it.group));
  });
  if (x && x.can && !need.length && steps.length && okMain) {
    const chk = { title: menu, steps, ingredients: ings };
    const h = recipeAvoid(chk);
    if (h) {
      S.work = null;
      S.wantRes = {
        ok: false,
        msg: `'${esc(menu)}' 레시피에 못 먹는 재료(${esc(h)})가 들어가서 보여드리지 않았어요.`,
      };
      return keep();
    }
    const rec = {
      title: menu,
      time_min: r.time_min,
      level: r.level,
      uses: ings.map(g => `${g.name}${g.qty ? " " + g.qty : ""}`),
      steps,
      id: uid(),
      at: Date.now(),
      week: NOW_WK,
      cooked: false,
    };
    DB.recipes.push(rec);
    save();
    S.results = [rec.id, ...(S.results || []).filter(i => i !== rec.id)].slice(0, 5);
    S.wantRes = { ok: true, msg: `지금 냉장고 재료로 '${esc(menu)}'을(를) 만들 수 있어요!` };
    setProg("img");
    await waitPhotos([rec.title]);
    S.work = null;
    S.openR = rec.id;
    S.rtab = "uses";
    S.left = null;
    return render();
  }
  S.work = null;
  S.wantRes = {
    ok: false,
    msg: need.length
      ? `'${esc(menu)}'을(를) 만들려면 <b>${esc(need.join(", "))}</b>이(가) 더 있어야 해요.`
      : `지금 냉장고 재료로는 '${esc(menu)}'을(를) 만들기 어려워요.`,
  };
  keep();
}

// 메뉴를 고르면 그 메뉴의 레시피를 만들어 바로 열어요 (한 번 만든 건 다시 열기만)
async function makeRecipe(i) {
  const m = (S.menus || [])[i];
  if (!m) return;
  if (m.rid && findR(m.rid)) return openRecipe(m.rid);
  if (S.work) return;
  S.work = "recipe:" + i;
  startProg("recipe");
  render(); // 고른 메뉴 카드에 '만드는 중' 표시
  const sys =
    '당신은 집밥 레시피 도우미입니다. 반드시 JSON만 출력하세요(설명·코드블록 금지). 형식: {"recipes":[{"title":"","time_min":20,"level":"쉬움|보통","uses":["재료 분량"],"steps":["단계"]}]}. 규칙: 요청한 메뉴 1개의 레시피만. 제공된 재료·조미료·물만 사용(전부 쓸 필요는 없음). "넉넉"이거나 오래된 재료를 우선 쓰고, "조금" 남은 재료는 적게. "조금" 남은 조미료는 적게 쓰거나 다른 조미료로 대체. 기피 재료는 절대 사용 금지. 인원수에 맞는 분량. 가격·금액 숫자는 쓰지 말 것. 의료·치료 조언 금지.';
  const usr = `만들 메뉴: ${m.title}\n냉장고 재료(남은 양, 보관 일수): ${ingLine()}\n보유 조미료: ${seasLine()}\n기피/알레르기: ${avoidText()}\n인원: ${P().people}명`;
  let r;
  try {
    r = (await askJSON(sys, usr, LLM.model, LLM_FAST)).recipes?.[0];
    if (!r || !Array.isArray(r.steps) || !r.steps.length) throw new Error("형식 오류");
    r.title = r.title || m.title;
    S.note = "";
  } catch (e) {
    S.work = null; // 실패하면 예시 레시피로 채우지 않아요
    S.note = LLM.proxy
      ? `'${esc(m.title)}' 레시피를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.${errTail(e.message)}`
      : "AI가 연결되지 않아 레시피를 만들 수 없어요. LLM 설정에 API 키를 넣거나 Claude 미리보기에서 열어주세요.";
    return render();
  }
  {
    const chk = {
      title: r.title,
      steps: r.steps || [],
      ingredients: (r.uses || []).map(u => ({ name: String(u) })),
    };
    const h = recipeAvoid(chk);
    if (h) {
      S.work = null;
      S.note = `'${esc(r.title)}' 레시피에 못 먹는 재료(${esc(h)})가 들어가서 보여드리지 않았어요. 다른 메뉴를 골라주세요.`;
      return render();
    }
  }
  const rec = {
    title: String(r.title),
    time_min: r.time_min,
    level: r.level,
    uses: (r.uses || []).map(String),
    steps: (r.steps || []).map(String),
    id: uid(),
    at: Date.now(),
    week: NOW_WK,
    cooked: false,
  };
  DB.recipes.push(rec);
  m.rid = rec.id;
  save();
  S.results = [rec.id, ...S.results.filter(x => x !== rec.id)].slice(0, 5);
  setProg("img");
  await waitPhotos([rec.title]);
  S.work = null;
  S.openR = rec.id;
  S.rtab = "uses";
  S.left = null;
  render();
}

// 해먹었어요 → 이 레시피에 쓴 재료만 모아 "얼마나 남았어요?"
function startCook(id) {
  const r = findR(id);
  const rows = stock()
    .filter(x => mentions(r, x.name))
    .map(x => ({ k: "p", id: x.id, name: x.name, lv: x.level })); // 조미료는 조금씩 쓰니 묻지 않아요(냉장고에서 직접 고쳐요)
  S.left = { rid: id, rows };
  render();
}
function setLeft(i, lv) {
  S.left.rows[i].lv = lv;
  render();
}
function finishCook() {
  const { rid, rows } = S.left;
  rows.forEach(r => {
    if (r.k === "p") {
      const x = DB.pantry.find(p => p.id === r.id);
      if (x) {
        x.level = r.lv;
        if (r.lv === "out") {
          x.tossed = false;
          x.outAt = Date.now();
          setFate(x.pid, "used");
        }
      }
    } else DB.seas[r.name] = r.lv;
  });
  const before = homeCount();
  let r = DB.recipes.find(x => x.id === rid);
  if (!r || r.cooked) {
    r = { ...findR(rid), id: uid(), at: Date.now(), week: NOW_WK };
    DB.recipes.push(r);
  } // 저장한 레시피를 또 해먹으면 새 기록으로
  Object.assign(r, { cooked: true, cookedAt: Date.now(), cookedWeek: NOW_WK });
  S.left = null;
  S.openR = null;
  save();
  const n = homeCount(),
    st = streakInfo(),
    goal = st.open && st.open.done === st.open.goal;
  showReact(
    "mood-happy",
    goal ? "이번 장보기 목표 달성!" : `집밥 ${n}번째!`,
    goal ? `장보기 ${st.streak}번 연속이에요` : "냉장고에도 반영했어요"
  );
}
