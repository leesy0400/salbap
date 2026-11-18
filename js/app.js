/* ============================================================
   시작점 — render()로 지금 화면 그리기, 뒤로 가기 기록, 첫 실행
   ※ 이 파일은 index.html에서 맨 마지막에 불러와야 해요 (앞 파일의 함수를 바로 써요)
   ============================================================ */

/* ============================================================
   ⑦ render — 지금 상태에 맞는 화면 하나를 그려요
   ============================================================ */
function updBar() {
  let b = $(".sbar");
  const H = document.documentElement.scrollHeight,
    V = innerHeight;
  if (H - V < 24 || S.busy) {
    if (b) b.remove();
    return;
  } // 실제로 내려볼 내용이 있을 때만
  if (!b) {
    b = document.createElement("div");
    b.className = "sbar";
    b.innerHTML = "<i></i>";
    document.body.appendChild(b);
  }
  const bottom = $(".tabbar") ? 72 : 12,
    track = V - 12 - bottom,
    th = Math.max(36, (track * V) / H);
  b.style.height = track + "px";
  b.style.bottom = "";
  b.firstChild.style.height = th + "px";
  b.firstChild.style.top = (scrollY / (H - V)) * (track - th) + "px";
}
addEventListener("scroll", updBar, { passive: true });
addEventListener("resize", updBar);
function render() {
  draw();
  fillPhotos();
  turnSeas(document.querySelector(".seasl"));
  // 바텀시트는 처음 열릴 때만 아래에서 올라와요 (열린 채로 화면을 다시 그릴 땐 움직이지 않게)
  const sk = S.sheet || (S.openR ? "r" + S.openR : null);
  if (sk && S._shownSheet === sk)
    document.querySelectorAll(".modal").forEach(m => (m.style.animation = "none"));
  S._shownSheet = sk;
  requestAnimationFrame(updBar);
  navSync();
}
/* ============================================================
   뒤로 가기 — 화면이 바뀔 때마다 브라우저 기록에 남겨서
   휴대폰 뒤로 가기·브라우저 뒤로 가기·화면 위 ← 버튼이 모두 바로 전 화면으로 돌아가요
   ============================================================ */
const NAV_KEYS = [
  "view",
  "tab",
  "htab",
  "rsub",
  "rtrip",
  "step",
  "sheet",
  "pview",
  "rview",
  "openR",
  "editKey",
];
const NAV_ID = Math.random().toString(36).slice(2); // 새로고침 전 기록과 섞이지 않게
let NAV = [],
  NI = -1,
  navSkip = 0,
  navBusy = false;
// 같은 화면이 다른 이름으로 두 번 쌓이지 않게, 그 화면에서 안 쓰는 값은 비워서 비교해요 (예: 메뉴 정하기의 pview는 실제로 보이는 단계로)
const navSnap = () => {
  const o = Object.fromEntries(NAV_KEYS.map(k => [k, S[k] ?? null])),
    app = o.view === "app" && !!DB.onboarded;
  if (!(app && o.tab === "home")) o.htab = null;
  if (!(app && o.tab === "home" && o.htab === "rec")) {
    o.rsub = null;
    o.rtrip = null;
  } else if (o.rsub !== "past") o.rtrip = null;
  if (!(app && o.tab === "recipe")) o.rview = null;
  o.pview = app && o.tab === "pick" ? pickView() : null;
  return JSON.stringify(o);
};
let navReplace = false,
  navLater = false; // navReplace: 지금 화면 자리를 바꿔요 (← 버튼으로 앞 단계에 갈 때 기록이 꼬이지 않게)
function navSync() {
  if (navBusy) return;
  if (navSkip) {
    navLater = true;
    return;
  } // 브라우저가 아직 뒤로 가는 중이면, 끝난 뒤에 맞춰요 (기록이 어긋나지 않게)
  const sig = navSnap(),
    rp = navReplace;
  navReplace = false;
  if (NI >= 0 && NAV[NI] === sig) return;
  // 이미 지나온 화면으로 다시 가면 새로 쌓지 않고 그 자리로 돌아가요 → 뒤로 가기가 왔다 갔다 하지 않아요
  const j = NI > 0 ? NAV.lastIndexOf(sig, NI - 1) : -1;
  if (j >= 0) {
    navSkip++;
    try {
      history.go(j - NI);
    } catch (e) {
      navSkip--;
    }
    NI = j;
    return;
  }
  if (rp && NI >= 0) {
    NAV = NAV.slice(0, NI + 1);
    NAV[NI] = sig;
    try {
      history.replaceState({ salimNav: NI, id: NAV_ID }, "");
    } catch (e) {}
    return;
  }
  NAV = NAV.slice(0, NI + 1);
  NAV.push(sig);
  NI++;
  try {
    const st = { salimNav: NI, id: NAV_ID };
    NI === 0 ? history.replaceState(st, "") : history.pushState(st, "");
  } catch (e) {}
}
// 돌아갈 화면이 지금 상태에서 그릴 수 없는 화면이면 고쳐서 그려요 (예: 로그인한 뒤의 로그인 화면)
function navFix(st) {
  if (A.user && st.view === "login") st.view = "app";
  if (st.view === "edit" && !S.p && DB.profile) S.p = { ...DB.profile };
  if (!DB.onboarded && A.user && st.step < 1) {
    st.step = 1;
    if (!st.sheet || st.sheet === "agree") st.sheet = "onblogout";
  }
  if (!DB.onboarded && !S.p) S.p = DEFAULT_PROFILE();
  return st;
}
window.addEventListener("popstate", e => {
  if (navSkip) {
    navSkip--;
    if (!navSkip && navLater) {
      navLater = false;
      navSync();
    }
    return;
  }
  const h = e.state;
  if (!h || h.id !== NAV_ID || !NAV[h.salimNav]) {
    if (h && h.id && h.id !== NAV_ID) history.back();
    return;
  }
  const before = navSnap(),
    st = navFix(JSON.parse(NAV[h.salimNav]));
  NI = h.salimNav;
  ["htab", "rview", "rsub"].forEach(k => {
    if (st[k] == null) delete st[k];
  });
  navBusy = true;
  Object.assign(S, st);
  S.err = "";
  S.left = null;
  render();
  navBusy = false;
  const now = navSnap();
  NAV[NI] = now;
  if (now === before && NI > 0) {
    navSkip++;
    NI--;
    history.back();
    return;
  } // 바뀐 게 없으면 한 번 더 뒤로
  scrollTo(0, 0);
});
function navBack() {
  if (NI > 0) history.back();
  else goTab("home");
}
// 장보기 단계 화면의 ← : 늘 한 단계 앞으로 가요  기록 → 장볼 목록 → 메뉴 조합 → 메뉴 정하기 → 홈 장보기 탭
function flowBack() {
  const v = S.tab === "pick" ? pickView() : null;
  navReplace = true;
  S.sheet = null;
  if (S.tab === "record") {
    if (NI > 0) {
      navReplace = false;
      return history.back();
    }
    if (trip() && plan()) return goTab("pick", "list");
  } // 구매기록은 들어온 곳(홈·장보기 탭·장볼 목록)으로 돌아가요
  if (v === "list" && draft()) return goTab("pick", "combo");
  if (v === "combo" || v === "list") {
    S.planNote = "";
    return goTab("pick", "wish");
  }
  Object.assign(S, { tab: "home", view: "app", htab: "shop", recorded: 0, inErr: null });
  render();
  scrollTo(0, 0);
}
function draw() {
  if (S.busy) return loader();
  if (S.view === "login") return loginScreen();
  if (!DB.onboarded) {
    if (!S.p) S.p = DEFAULT_PROFILE();
    return SCR[ONB[S.step]]();
  }
  if (!DB.v2) migrateV2();
  if (DB.seas && Object.values(DB.seas).includes("low"))
    for (const k in DB.seas) if (DB.seas[k] === "low") DB.seas[k] = "have"; // 조미료는 있음/다 씀 두 가지만 (예전 '조금'은 있음으로)
  if (S.view === "edit") return SCR[S.editKey]();
  return {
    home,
    pick: pickPage,
    record: recordPage,
    pantry: pantryPage,
    recipe: recipePage,
    history: historyPage,
    me: settingsPage,
  }[S.tab]();
}
render();
if (!authOn()) markVisit();
initAuth(); // 로그인 설정이 있으면 Firebase를 불러와요 (없으면 아무것도 안 해요)
