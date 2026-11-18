/* ============================================================
   홈 — 위쪽 탭 [밥풀이·장보기·레시피·예산]
   ============================================================ */

/* ============================================================
   ⑤-1 홈 — 이번 달 예산 · 이번 주 할 일 · 냉장고 · 저장한 레시피 · 지난 기록
   ============================================================ */
/* ============================================================
   ⑤-1 홈 — 위쪽 탭 [오늘 · 장보기 · 예산]. 탭을 바꾸면 본문만 바뀌고 아래 메뉴는 그대로예요
   ============================================================ */
const HTABS = [
  ["today", "밥풀이"],
  ["shop", "장보기"],
  ["rec", "레시피"],
  ["budget", "예산"],
];
// 위쪽 탭은 메뉴 정하기·장볼 목록·구매기록 화면에서도 같은 자리에 보여요 (어느 화면에서 눌러도 그 탭으로)
function setHtab(k) {
  Object.assign(S, { tab: "home", view: "app", htab: k, editB: false, recorded: 0, inErr: null });
  render();
  scrollTo(0, 0);
}
const htopBar = t =>
  `<header class="htop"><nav class="htabs" role="tablist">${HTABS.map(([k, n]) => `<button role="tab" aria-selected="${t === k}" class="${t === k ? "on" : ""}" onclick="setHtab('${k}')">${n}</button>`).join("")}</nav></header>`;
function home() {
  const t = HTABS.some(x => x[0] === S.htab) ? S.htab : "today";
  const body = t === "shop" ? shopTab() : t === "budget" ? budgetTab() : t === "rec" ? recTab() : todayTab();
  page(body, t === "shop" ? shopFoot() : null, htopBar(t));
}

// 레시피 — 이번 장보기로 고른 메뉴의 레시피 (누르면 재료·조리법), 저장한 레시피
const RSUBS = [
  ["now", "이번 메뉴"],
  ["past", "지난 메뉴"],
  ["fav", "즐겨찾기"],
];
function setRsub(k) {
  S.rsub = k;
  S.rtrip = null;
  render();
  scrollTo(0, 0);
}
function recTab() {
  const k = RSUBS.some(x => x[0] === S.rsub) ? S.rsub : "now";
  let body;
  const empty = (t, b) => `<div class="recempty">${bapImg("tofu", "bmini")}<p>${t}</p>${b || ""}</div>`;
  if (k === "now") {
    const rs = planRecs();
    body = rs.length
      ? `<p class="sec" style="margin-top:6px">이번에 고른 메뉴 · ${planMeals()}끼</p><div class="rlist">${rs.map(rcard).join("")}</div>`
      : empty(
          "장보기에서 메뉴를 고르면<br>여기서 레시피를 볼 수 있어요",
          `<button class="btn gobtn" onclick="setHtab('shop')">${ic("cart")} 장보러 가기</button>`
        );
  } else if (k === "past") {
    const t = S.rtrip && (DB.trips || []).find(x => x.id === S.rtrip);
    if (t) {
      const rs = tripRecs(t);
      body = `<button class="tlink backlink" onclick="S.rtrip=null;render()">${ic("back")} 지난 메뉴</button>
<h3 class="tripttl">${esc(tripName(t))}</h3>
${rs.length ? `<div class="rlist">${rs.map(rcard).join("")}</div>` : empty("이 장보기의 레시피를 찾지 못했어요")}`;
    } else {
      const ts = pastTrips();
      body = ts.length
        ? `<div class="list">${ts.map(tripRow).join("")}</div>`
        : empty("장보기를 마치면<br>여기에 지난 메뉴가 쌓여요");
    }
  } else {
    const sc = DB.scraps || [];
    body = sc.length
      ? `<div class="rlist">${sc.map(rcard).join("")}</div>`
      : empty("레시피에서 ♡를 누르면<br>여기에 모아 둘게요");
  }
  return `<nav class="rsubs">${RSUBS.map(([x, n]) => `<button class="${x === k ? "on" : ""}" onclick="setRsub('${x}')">${n}${x === "fav" && (DB.scraps || []).length ? ` <em>${DB.scraps.length}</em>` : ""}</button>`).join("")}</nav>
${body}`;
}

// 밥풀이 탭(첫 화면) — 밥풀이 · 누적 집밥 · 이번 달 남은 장보기 예산 · [장보러 가기] 버튼 하나
function streakLine() {
  const { streak } = streakInfo(); // 이번 장보기 n/m끼 표시는 없앴어요(연속 기록만)
  return streak ? `<div class="streak"><b>${emo("🔥")} 장보기 ${streak}번 연속 목표 달성!</b></div>` : "";
}
function todayTab() {
  const n = homeCount(),
    mb = monthBudget(),
    left = leftMonth();
  const msg = n
    ? `집밥 <b>${n}</b>번째,<br>오늘도 맛있는 집밥 먹어요!`
    : `레시피로 해 먹으면<br>밥풀이가 기뻐해요`;
  return `<section class="today">
<h2 class="tmsg">${msg}</h2>
${moodHero()}
${streakLine()}
<div class="tbud ${mb && left < 0 ? "over" : ""}">
 <small>${ymLabel(NOW_YM)} 남은 장보기 예산</small><b>${mb ? (left < 0 ? `${won(-left)} 초과` : won(left)) : "월 예산을 정해 주세요"}</b>
 ${mb ? `<span class="tbud-bar"><i style="width:${Math.max(0, Math.min(100, (left / mb) * 100))}%"></i></span>` : ""}</div>
<button class="btn gobtn" onclick="goTab('recipe','make')">${ic("pot")} 집밥 하러 가기</button>
</section>`;
}

// 장보기 — 진행 중인 장보기 이어서 하기 또는 새 장보기 시작 · 지난 장보기
function tripStep() {
  const R = routine(),
    k = R.findIndex(x => !x.done);
  return { k: k < 0 ? 3 : k, R };
} // k=3이면 장보기 체크리스트 차례
// 장볼 목록 확정 → 장보기 탭이 마트에서 보는 체크리스트로 바뀌어요 (살 때 [구매] 체크, 실제 가격 고치기)
function confirmList() {
  const pl = plan();
  if (!pl) return;
  pl.ready = true;
  cart().forEach(x => {
    if (x.key.startsWith("p:")) x.bought = false;
  });
  save();
  setHtab("shop");
  toast("장보기 체크리스트를 만들었어요");
}
const gotItems = () => cart().filter(x => x.bought);
const gotTotal = () => gotItems().reduce((a, x) => a + (+x.price || 0), 0);
const ckRow =
  x => `<div class="li ckrow ${x.bought ? "on" : ""}"><button class="ckb" onclick="toggleBought('${q(x.key)}')" role="checkbox" aria-checked="${!!x.bought}" aria-label="${esc(x.name)} 구매"><span class="cb">${x.bought ? ic("check") : ""}</span></button>
<div class="tx" onclick="toggleBought('${q(x.key)}')"><b>${esc(x.name)}</b></div>
<span class="ckp"><input class="priceIn" inputmode="numeric" value="${+x.price ? (+x.price).toLocaleString() : ""}" placeholder="가격" onchange="setPrice('${q(x.key)}',this.value)" aria-label="${esc(x.name)} 실제 가격"><em>원</em></span>
${x.key.startsWith("p:") ? "" : `<button class="x" onclick="removeCart('${q(x.key)}')" aria-label="${esc(x.name)} 빼기">${ic("x")}</button>`}</div>`;
function checklist() {
  const c = cart(),
    got = gotItems();
  return `<section class="cklist"><div class="row"><div class="ckhd"><b class="ttl2">장보기 체크리스트</b>${c.length ? `<button class="ckall ${got.length === c.length ? "on" : ""}" onclick="toggleAllBought()"><span class="cb">${got.length === c.length ? ic("check") : ""}</span>${got.length === c.length ? "전부 해제" : "전부 구매"}</button>` : ""}</div><span class="tag o">${got.length}/${c.length} 구매</span></div>
${c.length ? `<div class="list">${c.map(ckRow).join("")}</div>` : `<p class="m" style="margin:10px 0 0">살 재료가 없어요.</p>`}
<button class="btn ghost extra" style="margin-top:12px" onclick="S.sheet='manual';S.mqty='mid';render()">${ic("plus")} 목록에 없던 것도 샀어요</button>
<div class="cklinks"><button class="link" onclick="goTab('pick','list')">장볼 목록 고치기</button><button class="link" onclick="startTrip()">새로 시작하기</button></div></section>`;
}
const shopFoot = () => {
  const t = trip();
  if (!t || tripStep().k !== 3) return null;
  const got = gotItems();
  return `<button class="btn" ${got.length ? "" : "disabled"} onclick="openPay('trip')">${got.length ? `장보기 마치고 결제액 적기 <span class="btn-sub">${got.length}개 · ${won(gotTotal())}</span>` : "산 재료를 체크해 주세요"}</button>`;
};
function startTrip() {
  if (trip() && (draft() || plan() || cart().length)) {
    S.sheet = "droptrip";
    return render();
  }
  if (trip()) dropTrip();
  Object.assign(S, { tm: P().meals || 5, picked: [], wish: "", noWish: false, planEdit: false });
  goTab("pick", "wish");
}
function continueTrip() {
  const t = trip();
  if (!t) return startTrip();
  Object.assign(S, { tm: t.meals, picked: [...(t.picked || [])] });
  const { k, R } = tripStep();
  if (k === 3) return setHtab("shop");
  goTab("pick", R[k].k === "wish" ? "wish" : R[k].k);
}
function shopTab() {
  const t = trip(),
    done = pastTrips().slice(0, 5);
  let cur;
  if (t && tripStep().k === 3) cur = checklist();
  else if (t) {
    const { k, R } = tripStep(),
      pl = plan(),
      ct = cartTotal();
    cur = `<section class="card tripcard"><div class="row"><b class="ttl2">진행 중인 장보기</b><span class="tag o">${k + 1}/3 단계</span></div>
<p class="tripmeta">${t.meals}끼 · ${R[k].t}</p>
${
  pl
    ? `<p class="m" style="margin:6px 0 0">${pl.recipes
        .map(findR)
        .filter(Boolean)
        .slice(0, 4)
        .map(r => esc(r.title))
        .join(", ")}${pl.recipes.length > 4 ? " 외" : ""}</p>`
    : ""
}
${ct ? `<p class="m" style="margin:6px 0 0">예상 장보기 금액 ${won(ct)}</p>` : ""}
<ol class="tsteps">${R.map((x, i) => `<li class="${x.done ? "done" : i === k ? "now" : ""}"></li>`).join("")}</ol>
<button class="btn" style="margin-top:16px" onclick="continueTrip()">이어서 하기 ${ic("right")}</button>
<button class="link" onclick="startTrip()">새로 시작하기</button></section>`;
  } else if (S.recorded)
    cur = `<section class="card donecard"><b>${ic("check")} 장보기를 마쳤어요</b><p class="m">${S.recorded > 0 ? `산 재료 ${S.recorded}개가 냉장고에 들어갔어요. ` : ""}결제액 ${won(S.paidJust || 0)}을 ${ymLabel(NOW_YM)} 장보기 예산에 반영했어요. 남은 예산은 ${won(leftMonth())}이에요.</p>
<button class="btn" onclick="setHtab('rec')">레시피 보기 ${ic("right")}</button><button class="link" onclick="startTrip()">새 장보기 시작</button></section>`;
  else
    cur = `<section class="card tripcard empty">${bapImg("tofu", "bmini")}<b class="ttl2">새 장보기를 시작해 볼까요?</b>
<p class="m">몇 끼를 해 먹을지 정하면, 냉장고 재료를 먼저 쓰는 메뉴 조합과 장볼 목록을 만들어 드려요.</p>
<button class="btn" style="margin-top:16px" onclick="startTrip()">${ic("plus")} 새 장보기 시작</button></section>`;
  return `${cur}
${done.length ? `<p class="sec">지난 장보기</p><div class="list">${done.map(tripRow).join("")}</div>` : ""}`;
}
const tripRow = x =>
  `<div class="li triprow" onclick="openPastTrip('${x.id}')"><div class="em">${ic("basket")}</div><div class="tx"><b>${esc(tripName(x))}</b><span class="m">${x.meals}끼${x.menus && x.menus.length ? ` · ${esc(x.menus.slice(0, 3).join(", "))}${x.menus.length > 3 ? " 외" : ""}` : ""}</span></div><div class="pr">${won(x.paid)}</div></div>`;

// 예산 — 고른 달의 장보기 예산 · 남은 금액 · 예상 절약액 · 결제 내역
function budgetTab() {
  const ym = S.bym || NOW_YM,
    mb = monthBudget(ym),
    sp = spentMonth(ym),
    left = mb - sp,
    pays = payments(ym),
    sv = savingsOf(ym),
    cur = ym === NOW_YM;
  return `<div class="mnav"><button onclick="S.bym=ymAdd('${ym}',-1);S.editB=false;keep()" aria-label="이전 달">${ic("back")}</button><b>${ymLabel(ym)}</b><button onclick="S.bym=ymAdd('${ym}',1);S.editB=false;keep()" ${cur ? "disabled" : ""} aria-label="다음 달">${ic("right")}</button></div>
<section class="bud3 ${mb && left < 0 ? "over" : ""}">
 ${
   mb
     ? `<small>남은 장보기 예산</small><b class="bbig">${left < 0 ? `${won(-left)} 초과` : won(left)}</b>
 <div class="meter ${left < 0 ? "over" : ""}"><i style="width:${Math.min(100, (sp / mb) * 100)}%"></i></div>
 <div class="bsub"><span>${won(mb)} 중 ${won(sp)} 썼어요</span><button class="tlink" onclick="S.editB=!S.editB;keep()">${S.editB ? "닫기" : "예산 수정"}</button></div>`
     : `<small>장보기 예산</small><b class="bbig none">아직 없어요</b><button class="btn" style="margin-top:12px" onclick="S.editB=true;keep()">월 예산 정하기</button>`
 }
 ${S.editB ? `<div class="row" style="gap:6px;margin-top:10px;justify-content:flex-start"><input id="bIn" class="priceIn" style="width:140px" inputmode="numeric" value="${mb ? mb.toLocaleString() : ""}" placeholder="예: 300,000"><span class="chip on" onclick="saveMonthBudget('${ym}')">저장</span></div>` : ""}
</section>
${sv.n ? `<section class="bsave ${sv.total > 0 ? "" : "flat"}">${bapImg(sv.total > 0 ? "grow" : "home", "bsv")}<div><small>배달 ${sv.meals}끼 ${won(sv.deliv)} → 장보기 ${won(sv.paid)}</small><b>${sv.total > 0 ? `${won(sv.total)} 아꼈어요` : `배달보다 ${won(-sv.total)} 더 썼어요`}</b></div></section>` : ""}
<div class="row" style="margin:22px 2px 6px"><b class="sec" style="margin:0">결제 내역</b><button class="tlink" onclick="openPay('new')">${ic("plus")} 직접 기록</button></div>
${
  pays.length
    ? `<div class="list">${pays.map(x => `<div class="li" ${x.kind === "legacy" ? 'style="cursor:default"' : `onclick="openPay('edit','${x.id}')"`}><div class="em">${ic(x.kind === "manual" ? "wallet" : "basket")}</div><div class="tx"><b>${esc(x.kind === "trip" ? x.label : `${new Date(x.at).getMonth() + 1}월 ${new Date(x.at).getDate()}일 ${x.label}`)}</b></div><div class="pr">${won(x.amount)}</div></div>`).join("")}</div>`
    : `<p class="m" style="margin:4px 2px">아직 결제 기록이 없어요</p>`
}`;
}
function saveMonthBudget(ym) {
  const v = +String($("#bIn").value).replace(/[^0-9]/g, "");
  DB.months = DB.months || {};
  if (v > 0) DB.months[ym] = { budget: v };
  else delete DB.months[ym];
  if (!DB.profile.monthly && v > 0) DB.profile.monthly = v;
  S.editB = false;
  save();
  toast("예산을 저장했어요");
  keep();
}
