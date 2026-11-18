/* ============================================================
   기록 화면 — 캘린더 · 식재료 기록(월별)
   ============================================================ */

/* ============================================================
   ⑥-1 기록 — 캘린더 · 버린 재료
   ============================================================ */
// 기록 — [캘린더] 한 달 동안 해 먹은 날(하루 여러 끼일수록 진하게) / [버린 재료] 남김없이 다 쓴 비율과 다 쓴·버린 재료 목록
const HSUBS = [
  ["cal", "캘린더"],
  ["toss", "식재료 기록"],
];
function cookedOn(d) {
  return cookedList()
    .filter(r => r.cookedAt && ymd(new Date(r.cookedAt)) === d)
    .map(r => r.title)
    .concat(
      mealList()
        .filter(m => m.type === "home" && m.date === d)
        .map(m => m.menu || "집밥")
    );
}
function calView() {
  const ym = S.cym || NOW_YM,
    y = +ym.slice(0, 4),
    mo = +ym.slice(5) - 1,
    first = new Date(y, mo, 1).getDay(),
    dim = new Date(y, mo + 1, 0).getDate(),
    today = todayKey(),
    cur = ym === NOW_YM;
  const days = [...Array(dim)].map((_, i) => {
    const d = `${ym}-${String(i + 1).padStart(2, "0")}`;
    return { d, i: i + 1, c: cookedOn(d) };
  });
  const total = days.reduce((a, x) => a + x.c.length, 0),
    lv = c => (c >= 3 ? 3 : c),
    sel = S.cday && S.cday.startsWith(ym) ? days.find(x => x.d === S.cday) : null;
  return `<div class="mnav"><button onclick="S.cym=ymAdd('${ym}',-1);S.cday=null;keep()" aria-label="이전 달">${ic("back")}</button><b>${ymLabel(ym)}</b><button onclick="S.cym=ymAdd('${ym}',1);S.cday=null;keep()" ${cur ? "disabled" : ""} aria-label="다음 달">${ic("right")}</button></div>
<p class="calsum">${total ? `${ymLabel(ym)}에 집밥 <b>${total}끼</b> 해 먹었어요` : `${ymLabel(ym)}엔 아직 해 먹은 집밥이 없어요`}</p>
<div class="cal"><div class="calh">${"일월화수목금토"
    .split("")
    .map(w => `<span>${w}</span>`)
    .join("")}</div>
<div class="calg">${"<i></i>".repeat(first)}${days.map(x => `<button class="cd l${lv(x.c.length)} ${x.d === today ? "today" : ""} ${x.d > today ? "fut" : ""} ${sel && sel.d === x.d ? "sel" : ""}" ${x.d > today ? "disabled" : ""} onclick="S.cday='${x.d}';keep()" aria-label="${x.i}일 집밥 ${x.c.length}끼">${x.d === today && !x.c.length ? "✦" : x.i}</button>`).join("")}</div>
<div class="callg"><span><i class="l0"></i>안 먹음</span><span><i class="l1"></i>1끼</span><span><i class="l2"></i>2끼</span><span><i class="l3"></i>3끼 이상</span></div></div>
${sel ? `<p class="calday"><b>${+sel.d.slice(5, 7)}월 ${sel.i}일</b> ${sel.c.length ? esc(sel.c.join(", ")) : "해 먹은 집밥이 없어요"}</p>` : ""}`;
}
// 식재료 기록 — 달마다, 그 달에 냉장고에 들어온 재료(장 본 것 + 직접 넣은 것)를 세요. 같은 재료라도 들어온 번마다 따로예요
function tossView() {
  const ym = S.tym || NOW_YM,
    cur = ym === NOW_YM,
    all = DB.pantry.filter(x => ymOf(x.addedAt || Date.now()) === ym),
    n = all.length;
  const o = all
      .filter(x => x.level === "out")
      .sort((a, b) => (b.outAt || b.addedAt || 0) - (a.outAt || a.addedAt || 0)),
    tz = o.filter(x => x.tossed),
    us2 = o.filter(x => !x.tossed);
  const used = us2.length,
    tossed = tz.length,
    left = n - used - tossed,
    pct = n ? Math.round((used / n) * 100) : 0;
  const day = t => {
    const d = new Date(t);
    return `${d.getMonth() + 1}월 ${d.getDate()}일`;
  };
  const row =
    x => `<div class="li" style="cursor:default"><div class="em" style="opacity:.5">${ingIc(x.name)}</div><div class="tx"><b style="color:var(--m)">${esc(x.name)}</b>${x.outAt ? `<span class="m">${day(x.outAt)}</span>` : ""}</div>
<button class="used" onclick="restore('${x.id}')">아직 있어요</button><button class="x" onclick="delPantry('${x.id}')" aria-label="목록에서 지우기">${ic("x")}</button></div>`;
  return `<div class="mnav"><button onclick="S.tym=ymAdd('${ym}',-1);keep()" aria-label="이전 달">${ic("back")}</button><b>${ymLabel(ym)}</b><button onclick="S.tym=ymAdd('${ym}',1);keep()" ${cur ? "disabled" : ""} aria-label="다음 달">${ic("right")}</button></div>
${
  n
    ? `<section class="usecard" style="margin-top:6px">
 <div class="usebig"><b>${pct}%</b><span>다 썼어요</span></div>
 <div class="meter3"><i class="u" style="width:${(used / n) * 100}%"></i><i class="t" style="width:${(tossed / n) * 100}%"></i></div>
 <div class="uselegend"><span><i class="u"></i>다 씀 ${used}</span><span><i class="l"></i>남음 ${left}</span><span><i class="t"></i>버림 ${tossed}</span></div></section>`
    : `<p class="m" style="margin:14px 2px">${ymLabel(ym)}에 냉장고에 넣은 재료가 없어요</p>`
}
${tz.length ? `<p class="sec">버린 재료</p><div class="list">${tz.map(row).join("")}</div>` : ""}
${us2.length ? `<p class="sec">다 쓴 재료</p><div class="list">${us2.map(row).join("")}</div>` : ""}`;
}
function historyPage() {
  const k = HSUBS.some(x => x[0] === S.hsub) ? S.hsub : "cal";
  page(`<h1 style="margin-top:18px">기록</h1>
<nav class="rsubs">${HSUBS.map(([x, t]) => `<button class="${x === k ? "on" : ""}" onclick="S.hsub='${x}';keep()">${t}</button>`).join("")}</nav>
${k === "cal" ? calView() : tossView()}`);
}

// 끼니 기록 시트 — 날짜(기본 오늘)·끼니·식사 유형은 꼭, 메뉴명·비용은 선택. 같은 날짜·끼니가 있으면 그 기록을 고쳐요
function openMeal(date, slot) {
  const d = date || todayKey(),
    k = slot || nowSlot(),
    ex = mealList().find(m => m.date === d && m.slot === k);
  S.mf = ex ? { ...ex } : { id: null, date: d, slot: k, type: "home", menu: "", cost: "", inst: false };
  S.sheet = "meal";
  render();
}
function mfSync() {
  const f = S.mf;
  if (!f) return;
  const g = id => document.getElementById(id);
  if (g("mfDate")) f.date = g("mfDate").value || f.date;
  if (g("mfMenu")) f.menu = g("mfMenu").value;
  if (g("mfCost")) f.cost = String(g("mfCost").value).replace(/[^0-9]/g, "");
  if (g("mfInst")) f.inst = g("mfInst").checked;
}
function setMf(k, v) {
  mfSync();
  S.mf[k] = v;
  if (k === "date" || k === "slot") {
    const ex = mealList().find(m => m.date === S.mf.date && m.slot === S.mf.slot);
    if (ex) S.mf = { ...ex };
    else S.mf.id = null;
  }
  render();
}
function mealSheet() {
  const f = S.mf,
    home1 = f.type === "home",
    recent = [
      ...new Set([
        ...planRecs().map(r => r.title),
        ...mealList()
          .filter(m => m.menu)
          .slice(-6)
          .map(m => m.menu),
      ]),
    ].slice(0, 6);
  return `<div class="modal-bg" onclick="if(event.target===this){S.sheet=null;render()}"><div class="modal"><div class="grab"></div>
<h1 style="margin-top:0">${f.id ? "끼니 기록 고치기" : "어떤 끼니를<br>먹었나요?"}</h1>
${f.id ? `<p class="sub">이 날짜·끼니에 적은 기록이 있어서 그 기록을 고쳐요.</p>` : ""}
<label class="fl">날짜<input id="mfDate" type="date" class="field" value="${f.date}" max="${todayKey()}" onchange="setMf('date',this.value)"></label>
<div class="fl" style="margin-top:14px">끼니<div class="seg">${SLOTS.map(([k, n]) => `<button type="button" class="${f.slot === k ? "on" : ""}" onclick="setMf('slot','${k}')">${n}</button>`).join("")}</div></div>
<div class="fl">식사 유형<div class="seg">${MTYPES.map(([k, n]) => `<button type="button" class="${f.type === k ? "on" : ""}" onclick="setMf('type','${k}')">${n}</button>`).join("")}</div></div>
<label class="fl">메뉴 (선택)<input id="mfMenu" class="field" maxlength="30" value="${esc(f.menu || "")}" placeholder="${home1 ? "예: 김치찌개" : "예: 치킨"}"></label>
${recent.length && home1 ? `<div class="chips" style="margin-top:8px">${recent.map(t => `<span class="chip" style="padding:6px 12px;font-size:13px" onclick="setMf('menu','${q(t)}')">${esc(t)}</span>`).join("")}</div>` : ""}
<label class="fl" style="margin-top:14px">${home1 ? "이 끼니에 쓴 재료비" : "쓴 돈"} (선택)<span class="won"><input id="mfCost" class="field" inputmode="numeric" value="${f.cost ? (+f.cost).toLocaleString() : ""}" placeholder="0"><em>원</em></span></label>
<button class="btn" style="margin-top:20px" onclick="saveMeal()">저장하기</button>
${f.id ? `<button class="link" style="color:var(--r)" onclick="delMeal('${f.id}')">이 기록 지우기</button>` : ""}
<button class="link" onclick="S.sheet=null;render()">닫기</button></div></div>`;
}
function saveMeal() {
  mfSync();
  const f = S.mf;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.date) || f.date > todayKey()) return toast("날짜를 확인해 주세요");
  const before = homeCount(),
    rec = {
      id: f.id || uid(),
      date: f.date,
      slot: f.slot,
      type: f.type,
      menu: String(f.menu || "")
        .trim()
        .slice(0, 30),
      cost: +f.cost || 0,
      inst: f.type === "home" && !!f.inst,
      at: Date.now(),
    };
  DB.meals = mealList().filter(m => m.id !== rec.id && !(m.date === rec.date && m.slot === rec.slot));
  DB.meals.push(rec);
  const n = homeCount();
  S.sheet = null;
  S.mf = null;
  save();
  if (rec.type === "home" && n > before) showReact("home", `집밥 ${n}번째!`, "맛있게 먹었어요");
  else if (rec.type !== "home")
    showReact(
      "empty",
      rec.type === "deliv" ? "오늘은 배달이었군요" : "오늘은 외식이었군요",
      "다음 끼니는 집밥 어때요?"
    );
  else {
    toast("기록을 고쳤어요");
    render();
  }
}
function delMeal(id) {
  DB.meals = mealList().filter(m => m.id !== id);
  S.sheet = null;
  S.mf = null;
  save();
  toast("기록을 지웠어요");
  render();
}
// 밥풀이 반응 — 저장 직후 크게 보여주고 2초 뒤 사라져요 (눌러도 닫혀요)
let reactT = null;
function showReact(img, title, sub) {
  S.react = { img, title, sub };
  render();
  clearTimeout(reactT);
  reactT = setTimeout(() => {
    S.react = null;
    render();
  }, 2200);
}
const reactLayer = () =>
  S.react
    ? `<div class="react" role="status" onclick="S.react=null;render()">${S.react.img === "mood-happy" ? moodHero("happy", "inpop") : bapImg(S.react.img, "pop")}<b>${esc(S.react.title)}</b><small>${esc(S.react.sub)}</small></div>`
    : "";
