/* ============================================================
   내 정보 — 처음 입력한 정보 항목별 수정, 로그아웃
   ============================================================ */

/* ============================================================
   ⑥-2 초기 정보 수정 — 항목별로 따로 고쳐요
   ============================================================ */
function settingsPage() {
  const p = DB.profile,
    seas = Object.entries(DB.seas)
      .filter(([, v]) => v !== "out")
      .map(([k]) => k);
  const rows = [
    ["area", "pin", "동네·가게", `${p.district} ${p.dong || ""} · ${placeOf(p)}`],
    ["people", "users", "함께 먹는 사람", `${p.people}명`],
    ["budget", "wallet", "한 달 장보기 예산", won(p.monthly)],
    [
      "avoid",
      "ban",
      "못 먹는 재료",
      [...(p.allergies || []), p.avoid].filter(Boolean).join(", ") || "없어요",
    ],
  ];
  page(`<h1 style="margin-top:18px">내 정보</h1>${accountCard()}
<div class="list">${rows.map(([k, i, t, v]) => `<div class="setrow" onclick="${k === "seas" ? "openSeas('settings')" : k === "deliv" ? "S.sheet='save';render()" : `openEdit('${k}')`}"><div class="ibox">${ICONS[i] ? ic(i) : emo(i)}</div><div class="tx"><b>${t}</b><span>${esc(v)}</span></div>${ic("right")}</div>`).join("")}</div>
<p class="sec" style="margin-top:26px">개인정보</p>
<div class="list"><div class="setrow" onclick="setAllergyConsent(${!allergyOK()})"><div class="ibox">${ic("ban")}</div><div class="tx"><b>[선택] 알레르기 정보 수집·이용</b><span>${allergyOK() ? "동의함 · 누르면 철회하고 알레르기 정보를 지워요" : "동의 안 함 · 누르면 동의해요"}</span></div>${ic("right")}</div>
<a class="setrow" href="${PRIVACY_URL}" target="_blank" rel="noopener" style="color:inherit;text-decoration:none"><div class="ibox">${ic("bulb")}</div><div class="tx"><b>개인정보 처리방침</b><span>수집 항목, 보관·삭제 기준, 위탁 업체</span></div>${ic("right")}</a></div>
<button class="link" style="margin-top:28px;color:var(--r)" onclick="wipeAll()">모든 정보와 기록 지우기</button>`);
}
// 화면에 보이는 이메일은 앞 두 글자만 남기고 가려요 (예: ab***@gmail.com)
const maskEmail = e => {
  const m = String(e || "").match(/^([^@]*)@(.+)$/);
  if (!m) return e || "";
  const id = m[1];
  return `${id.slice(0, Math.min(2, id.length))}${"*".repeat(Math.max(3, id.length - 2))}@${m[2]}`;
};
// 계정 카드 — 로그인 상태 · 저장 위치 · 로그아웃/탈퇴
function accountCard() {
  if (!authOn())
    return `<div class="card acct"><div class="acrow"><div class="ibox">${ic("user")}</div><div class="tx"><b>로그인 없이 쓰는 중</b><span>기록은 이 기기에만 저장돼요</span></div></div></div>`;
  if (!A.user)
    return `<div class="card acct"><div class="acrow"><div class="ibox">${ic("user")}</div><div class="tx"><b>로그인하면 기록을 지킬 수 있어요</b><span>지금은 이 기기에만 저장돼요</span></div></div>
<button class="btn" style="margin-top:14px" onclick="S.lmode='login';openLogin()">로그인 · 계정 만들기</button></div>`;
  const g = (A.user.providerData || []).some(x => x.providerId === "google.com");
  return `<div class="card acct"><div class="acrow"><div class="ibox">${ic("user")}</div><div class="tx"><b>${esc(maskEmail(A.user.email) || "로그인됨")}</b><span>${g ? "Google 계정" : "이메일 계정"} · 기록이 계정에 저장돼요</span></div></div>
${A.syncErr ? `<div class="note bad" style="margin-top:12px">${A.syncErr}</div>` : ""}
<div class="acbtns"><button class="link" onclick="logout()">로그아웃</button><button class="link" style="color:var(--r)" onclick="S.sheet='delacct';render()">회원 탈퇴</button></div></div>`;
}
function onbLogoutSheet() {
  return `<div class="modal-bg" onclick="if(event.target===this){S.sheet=null;render()}"><div class="modal" role="alertdialog"><div class="grab"></div>
<h1 style="margin-top:0">로그아웃할까요?</h1><p class="sub">${esc(maskEmail(A.user && A.user.email) || "지금 계정")}에서 로그아웃하고 처음 화면으로 돌아가요. 지금까지 입력한 내용은 저장되지 않아요.<br>다른 계정으로 쓰려면 처음 화면에서 '이미 계정이 있어요 · 로그인'을 눌러 주세요.</p>
<button class="btn" onclick="logout()">로그아웃하고 처음으로</button>
<button class="link" onclick="S.sheet=null;render()">취소</button></div></div>`;
}
function delAcctSheet() {
  return `<div class="modal-bg" onclick="if(event.target===this){S.sheet=null;render()}"><div class="modal" role="alertdialog"><div class="grab"></div>
<h1 style="margin-top:0">정말 탈퇴할까요?</h1><p class="sub">계정과 서버에 저장된 모든 기록(장 본 기록, 레시피, 냉장고)이 지워지고 되돌릴 수 없어요.</p>
<button class="btn" style="background:var(--r)" ${A.busy ? "disabled" : ""} onclick="deleteAccount()">${A.busy ? `<span class="spin"></span>지우는 중…` : "탈퇴하고 모두 지우기"}</button>
<button class="link" onclick="S.sheet=null;render()">취소</button></div></div>`;
}
function openEdit(k) {
  S.p = { ...DB.profile };
  S.view = "edit";
  S.editKey = k;
  S.err = "";
  render();
  scrollTo(0, 0);
}
function closeEdit() {
  S.p = null;
  S.view = "app";
  S.tab = "me";
  S.err = "";
  render();
}
function saveEdit() {
  const o = DB.profile,
    n = S.p;
  if (o.monthly !== n.monthly || o.people !== n.people || o.meals !== n.meals) delete DB.weeks[NOW_WK]; // 이번 주 예산 다시 계산
  DB.profile = { ...n };
  S.p = null;
  S.view = "app";
  S.tab = "me";
  save();
  toast("저장했어요");
  render();
}
// 모든 정보와 기록 지우기: 앱 안 확인 창 → 지우면 첫 화면으로
// (브라우저 기본 confirm 창은 일부 미리보기·앱 환경에서 막혀서 직접 만든 창을 써요)
function wipeAll() {
  S.sheet = "wipe";
  render();
}
function wipeSheet() {
  const n = DB.purchases.length,
    r = DB.recipes.length,
    s = stock().length;
  return `<div class="modal-bg" onclick="if(event.target===this){S.sheet=null;render()}"><div class="modal" role="alertdialog" aria-labelledby="wipeT"><div class="grab"></div>
<h1 id="wipeT" style="margin-top:0">정말 모든 정보와<br>기록을 지울까요?</h1>
<p class="sub">지운 내용은 되돌릴 수 없어요. ${A.user ? "로그인은 그대로 두고, 초기 정보 입력부터 다시 시작해요." : "처음 화면부터 다시 시작해요."}</p>
<div class="card wipelist"><p>${ic("pin")} 동네·가게, 인원, 예산 등 초기 정보</p><p>${ic("fridge")} 냉장고 재료 ${s}개</p><p>${ic("chart")} 장보기 기록 ${n}건 · 레시피 ${r}개</p></div>
<button class="btn danger" onclick="doWipe()">모두 지우기</button>
<button class="link" onclick="S.sheet=null;render()">취소</button></div></div>`;
}
function doWipe() {
  const cons = DB.consent;
  try {
    localStorage.removeItem(KEY);
  } catch (e) {}
  DB = EMPTY();
  if (cons && A.user) DB.consent = cons; // 로그인 유지 중이면 동의 기록은 남겨요
  if (A.user) {
    clearTimeout(pushT);
    userDoc()
      .delete()
      .catch(() => {});
  } // 로그인했으면 서버 기록도 지워요 (계정은 남아요)
  Object.assign(S, {
    step: A.user ? 1 : 0,
    p: null,
    view: "app",
    tab: "home",
    agree: !!A.user,
    sheet: null,
    results: [],
    rsel: null,
    recorded: 0,
    editKey: null,
    openR: null,
    left: null,
    wish: "",
    noWish: false,
    planEdit: false,
    planNote: "",
    menus: null,
    menuSig: "",
  });
  render();
  scrollTo(0, 0);
  toast("모든 정보와 기록을 지웠어요");
}
