/* ============================================================
   공통 뼈대 — 칩·상단 머리·하단 탭·로딩 화면
   ============================================================ */

/* ============================================================
   공통 뼈대
   ============================================================ */
const chip = (t, on, fn) => `<span class="chip ${on ? "on" : ""}" onclick="${fn}">${t}</span>`;
// 준비 중 화면 로고: 심볼 + 김 세 줄 + 손글씨 로고
const brandLoad = () =>
  `<div class="brandload"><svg class="steam" width="40" height="22" viewBox="0 0 40 22" aria-hidden="true"><g stroke="var(--sage)" stroke-width="2.4" stroke-linecap="round" fill="none"><path d="M12 19c-3-4 3-6 0-10"/><path d="M20 17c-3-4 3-6 0-11"/><path d="M28 19c-3-4 3-6 0-10"/></g></svg>${symbol(78)}<span class="word">살림밥상</span></div>`;
const overlays = () =>
  `${aiLoad()}${S.sheet === "meal" && S.mf ? mealSheet() : ""}${S.sheet === "pay" && S.pay ? paySheet() : ""}${S.sheet === "droptrip" ? dropTripSheet() : ""}${reactLayer()}${S.sheet === "onblogout" && A.user ? onbLogoutSheet() : ""}${S.sheet === "delacct" ? delAcctSheet() : ""}${S.sheet === "wipe" ? wipeSheet() : ""}${S.sheet === "manual" ? manualSheet() : ""}${S.sheet === "agree" ? agreeModal() : ""}${S.sheet === "seas" ? seasSheet() : ""}${S.left ? leftSheet() : S.openR ? recipeSheet() : ""}`;

// 온보딩·초기정보 수정 화면 뼈대: 위에 [← + 진행 막대], 아래에 고정 버튼
function shell(body, foot) {
  const edit = S.view === "edit";
  const top = edit
    ? `<div class="subtop"><button class="back" onclick="closeEdit()" aria-label="뒤로가기">${ic("back")}</button><b>초기 정보 수정</b></div>`
    : `<div class="top"><button class="back" onclick="onbBack()" aria-label="뒤로가기">${ic("back")}</button><div class="prog"><i style="width:${Math.round((S.step / (ONB.length - 1)) * 100)}%"></i></div></div>`;
  $("#app").innerHTML = `${top}<main>${body}</main><div class="foot">${foot || ""}</div>${overlays()}`;
}
// 로그인한 채 온보딩 첫 단계(어디 사세요?)에서 뒤로 가면 → 로그아웃할지 물어봐요 (첫 화면은 회원가입 화면이라 로그인한 채로는 못 가요)
const onbAtFirst = () => !!A.user && !DB.onboarded && S.step <= 1;
function onbBack() {
  if (onbAtFirst()) {
    S.sheet = "onblogout";
    return render();
  }
  go(S.step - 1);
}
const go = n => {
  S.inErr = null;
  S.step = Math.max(A.user && !DB.onboarded ? 1 : 0, n);
  S.err = "";
  render();
  scrollTo(0, 0);
};
// 다음 버튼: 온보딩이면 다음 단계, 수정 중이면 저장 (자치구는 가게 고르기까지 이어서)
function nextFrom(name) {
  if (S.view === "edit") {
    if (name === "area") {
      S.editKey = "shop";
      return render();
    }
    return saveEdit();
  }
  go(ONB.indexOf(name) + 1);
}
const nextLabel = () => (S.view === "edit" ? "저장하기" : "다음");

// 앱 화면 뼈대: 본문 + (버튼) + 하단 탭
// 하단 탭 3개 [키, 아이콘, 이름] — 장보기·냉장고·레시피는 홈 바로가기로 들어가요
const TABS = [
  ["home", "home", "홈"],
  ["pantry", "fridge", "냉장고"],
  ["history", "chart", "기록"],
  ["me", "user", "내 정보"],
];
const TAB_TITLE = {
  pick: "메뉴 정하기",
  record: "구매기록",
  pantry: "우리집 냉장고",
  recipe: "오늘 뭐 해먹지?",
};
// 이번 주 집밥 루틴 — 홈 단계와 각 화면 위 흐름 막대가 같은 이름을 써요. phase: before=장 보기 전, after=장 보고 와서
const FLOW = [["pick"], ["record"]]; // 위에 4단계 진행선을 보여주는 화면
// 이번 주 장보기 루틴 4단계 — 앞 단계를 마쳐야 다음 단계가 열리고, 뒤로는 언제든 돌아가 고칠 수 있어요
function routine() {
  const pl = plan(),
    dr = draft(),
    bought = false; // 결제액을 기록하면 장보기 건이 끝나요
  const R = [
    { k: "wish", i: "bulb", t: "끼니·메뉴 정하기", done: !!dr || !!pl, go: "goTab('pick','wish')" },
    { k: "combo", i: "pot", t: "메뉴 조합", done: !!pl, go: "goTab('pick','combo')" },
    {
      k: "list",
      i: "cart",
      t: "장볼 목록",
      done: !!pl && (!!pl.ready || bought),
      go: "goTab('pick','list')",
    },
  ]; // [장볼 목록 확정]을 누르면 끝나요   // 구매기록은 단계에 넣지 않아요
  R.forEach((x, j) => (x.on = j === 0 || R[j - 1].done));
  return R;
}
// 단계 화면 상단: [뒤로] [루틴 n/3 · 제목] [다음 단계 ›] + 아래 3칸 진행선(눌러서 이동)
// 단계 화면 상단 — 진행선은 지금 위치 표시만 해요. 단계 이동은 화면 안의 진한 초록 버튼으로만.
function flowHead() {
  const R = routine(),
    rec = S.tab === "record",
    k = rec ? 3 : { wish: 0, combo: 1, list: 2 }[pickView()];
  return `<header class="fhead"><div class="fhrow"><button class="back" onclick="flowBack()" aria-label="뒤로가기">${ic("back")}</button>
<div class="ttl"><b>${rec ? "구매기록" : R[k].t}</b></div></div>
${rec ? "" : `<div class="flowline" aria-label="3단계 중 ${k + 1}단계">${R.map((x, i) => `<span class="${i <= k ? "on" : ""}"><i></i></span>`).join("")}</div>`}</header>`;
} // 진행선은 위치 표시만 (눌러도 안 움직여요)
const tabbar = () =>
  `<nav class="tabbar">${TABS.map(([k, i, t]) => `<button class="${S.tab === k || (k === "home" && !TABS.some(x => x[0] === S.tab)) ? "on" : ""}" onclick="goTab('${k}')">${ic(i)}${t}</button>`).join("")}</nav>`;
function goTab(k, sub) {
  if (k === "record") {
    if (trip() && plan() && !plan().ready) confirmList();
    else setHtab("shop");
    return;
  } // 구매기록은 장보기 탭 체크리스트에서 해요
  if (k === "home") S.htab = "today";
  S.tab = k;
  S.view = "app";
  S.inErr = null; // 아래 홈을 누르면 첫 탭(밥풀이)부터
  if (k === "recipe" && sub) S.rview = sub;
  if (k === "pick") {
    S.pview = sub || null;
    if (sub === "wish" && !S.wish) {
      const pl = draft() || plan();
      S.wish = pl ? pl.wish : "";
      S.noWish = !!pl && !pl.wish;
    }
    S.planNote = "";
  }
  if (k !== "record") S.recorded = 0;
  if (k === "recipe" && S.rview === "make" && needMenus() && !planRecs().length) return suggestMenus(); // 짜둔 메뉴가 있으면 그걸 먼저 보여줘요   // 오늘 뭐 해먹지? → 만들 수 있는 메뉴부터
  render();
  scrollTo(0, 0);
}
// 탭 화면(홈·기록·내 정보)은 하단 탭, 바로가기 화면(장보기·냉장고·레시피)은 위에 뒤로가기
function page(body, foot, head) {
  const isTab = TABS.some(t => t[0] === S.tab);
  const inFlow = FLOW.some(f => f[0] === S.tab);
  const top = isTab
    ? head
      ? `<div class="hstick">${head}</div>`
      : ""
    : inFlow
      ? `<div class="hstick">${htopBar("shop")}${flowHead()}</div>`
      : `<div class="subtop"><button class="back" onclick="navBack()" aria-label="뒤로가기">${ic("back")}</button><b>${TAB_TITLE[S.tab]}</b></div>`;
  // 하단 탭은 모든 앱 화면에 고정 (홈·냉장고·기록·내 정보)
  $("#app").innerHTML =
    `${top}<main class="tab ${inFlow ? "flow" : ""} ${foot ? "hasfoot" : ""}">${body}</main>${foot ? `<div class="foot tab">${foot}</div>` : ""}${tabbar()}${overlays()}`;
}

/* 로딩 화면 — 온보딩을 마칠 때 한 번만 써요 (재료·메뉴·레시피는 화면 안에서 '~하는 중'으로 보여줘요) */
const LOADERS = {
  build: {
    title: () => "살림밥상을 준비하는 중...",
    checks: ["한 달 장보기 예산 준비하는 중", () => `${placeOf(P())} 가격 불러오는 중`, "냉장고 준비하는 중"],
  },
};
function loader() {
  const L = LOADERS[S.busy.kind],
    i = S.busy.i;
  $("#app").innerHTML = `<div class="load">${
    L.checks
      ? `${brandLoad()}<h2>${L.title()}</h2><div class="checks">${L.checks.map((c, k) => `<div class="${k < i ? "done" : ""}"><i>${k < i ? ic("check") : ""}</i>${typeof c === "function" ? c() : c}</div>`).join("")}</div>`
      : `<div class="seek"><span>${L.orb()}</span></div><h2>${L.title()}</h2><div class="dots">${[0, 1].map(k => `<i class="${k === Math.min(i, 1) ? "on" : ""}"></i>`).join("")}</div>`
  }</div>`;
}
function runLoader(kind, n, ms, done) {
  S.busy = { kind, i: 0 };
  render();
  const t = setInterval(() => {
    S.busy.i++;
    if (S.busy.i > n) {
      clearInterval(t);
      S.busy = null;
      done();
    } else render();
  }, ms);
}
