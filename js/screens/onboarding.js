/* ============================================================
   온보딩 — 첫 화면·로그인·동의 → 사는 곳 → 가게 → 인원 → 예산 → 못 먹는 재료 → 조미료
   ============================================================ */

/* ============================================================
   ④ 온보딩 (처음 한 번만) — 순서는 ONB 배열로 정해져요
   ============================================================ */
function landing() {
  const start = "S.sheet='agree';render()";
  $("#app").innerHTML = `<div class="land">
${BOWL_BAP}
<h1 class="word">살림밥상${leaf(26)}</h1>
</div>
<div class="foot"><button class="btn pill" onclick="${start}">회원가입 ${ic("right")}</button>${authOn() ? `<button class="link" style="margin-top:6px" onclick="S.lmode='login';openLogin()">이미 계정이 있어요 · 로그인</button>` : ""}</div>${overlays()}`;
}
// 첫 화면 — 초록 밥그릇 안에서 고개를 내민 밥풀이 (뒤쪽 그릇 안 → 밥풀이 그림 → 앞쪽 그릇 순서로 겹쳐요) + 김
const BOWL_BAP = `<svg class="bowlbap" viewBox="0 0 300 320" role="img" aria-label="밥그릇 안의 밥풀이">
<defs><radialGradient id="bwF" cx=".38" cy=".18" r=".95"><stop offset="0" stop-color="#a9bf88"/><stop offset=".5" stop-color="#8ea86d"/><stop offset="1" stop-color="#647f49"/></radialGradient>
<linearGradient id="bwS" x1="0" y1="0" x2="1" y2="0"><stop offset=".1" stop-color="#fff" stop-opacity="0"/><stop offset=".24" stop-color="#fff" stop-opacity=".28"/><stop offset=".34" stop-color="#fff" stop-opacity="0"/></linearGradient>
<radialGradient id="bwIn" cx=".5" cy=".75" r=".7"><stop offset="0" stop-color="#4f6739"/><stop offset="1" stop-color="#6a8550"/></radialGradient>
<linearGradient id="bwDim" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3d5129" stop-opacity="0"/><stop offset="1" stop-color="#3d5129" stop-opacity=".35"/></linearGradient>
<radialGradient id="bwSh" cx=".5" cy=".5" r=".5"><stop offset="0" stop-color="#6b5a3a" stop-opacity=".25"/><stop offset="1" stop-color="#6b5a3a" stop-opacity="0"/></radialGradient></defs>
<g class="steam" fill="none" stroke="#e3d8c2" stroke-width="5" stroke-linecap="round"><path d="M222 64c-10-12 10-18 0-32"/><path d="M241 78c-9-11 9-17 0-30"/></g>
<ellipse cx="150" cy="306" rx="96" ry="10" fill="url(#bwSh)"/>
<ellipse cx="150" cy="182" rx="114" ry="22" fill="url(#bwIn)"/>
<path d="M36 182c18-15 64-22 114-22s96 7 114 22" fill="none" stroke="#e9e2c9" stroke-width="5"/>
<image class="bwbap" href="img/bapuri-hero.webp" x="22" y="34" width="256" height="256"/>
<rect x="60" y="176" width="180" height="30" fill="url(#bwDim)"/>
<path d="M106 270h88l5 32c-12 4-29 6-49 6s-37-2-49-6z" fill="#6c8750"/>
<path d="M36 182c0 66 46 110 114 110s114-44 114-110c-18 15-64 22-114 22s-96-7-114-22z" fill="url(#bwF)"/>
<path d="M36 182c0 66 46 110 114 110s114-44 114-110c-18 15-64 22-114 22s-96-7-114-22z" fill="url(#bwS)"/>
<path d="M36 182c18 15 64 22 114 22s96-7 114-22" fill="none" stroke="#eee8d2" stroke-width="7" stroke-linecap="round"/>
</svg>`;
// (예전) 첫 화면 배경 장식: 창가 식물 그림자(흐리게) · 린넨 행주 · 허브 잎 — 지금은 쓰지 않아요
const SHADE_BRANCH = `<svg viewBox="0 0 200 260"><g fill="#2f3a24"><path d="M100 260C96 180 80 110 40 20" stroke="#2f3a24" stroke-width="5" fill="none"/>${[
  [-40],
  [30],
  [-55],
  [40],
  [-35],
  [25],
  [-70],
  [-20],
]
  .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="30" ry="11" transform="rotate(${r} ${x} ${y})"/>`)
  .join("")}</g></svg>`;
const HERB = `<svg viewBox="0 0 120 120"><path d="M10 110C40 80 60 60 100 40" stroke="#58743f" stroke-width="2.4" fill="none" stroke-linecap="round"/>${[
  [-30],
  [10],
  [-50],
  [20],
  [40],
  [-10],
]
  .map(
    ([x, y, r]) =>
      `<path d="M${x} ${y}c-8-10-4-22 6-24 2 6 10 6 9 14 6 1 8 9 2 13-5 4-12 2-17-3z" fill="#6f9258" transform="rotate(${r} ${x} ${y})"/>`
  )
  .join("")}</svg>`;
// 로그인 화면 — Google / 이메일, 그리고 '로그인 없이 시작'
function loginScreen() {
  const signup = S.lmode === "signup";
  $("#app").innerHTML =
    `<div class="top"><button class="back" onclick="S.view='app';render()" aria-label="뒤로가기">${ic("back")}</button></div><main class="loginscr">
<h1>${signup ? "회원가입" : "로그인"}</h1><p class="sub">로그인하면 기록이 계정에 저장돼서<br>다른 기기에서도 이어서 쓸 수 있어요.</p>
${
  !A.ready
    ? `<div class="workcard card"><span class="spin dark"></span>로그인 준비 중…</div>`
    : A.err
      ? `<div class="note bad">${esc(A.err)}</div>`
      : `
${AUTH_METHODS.google ? `<button class="btn gbtn" ${A.busy ? "disabled" : ""} onclick="loginGoogle()"><span class="gmark">G</span>Google로 계속하기</button>` : ""}
${AUTH_METHODS.google && AUTH_METHODS.email ? `<div class="ordiv"><span>또는 이메일로</span></div>` : ""}
${
  AUTH_METHODS.email
    ? `<label class="fl">이메일<input id="lEmail" class="field" type="email" autocomplete="email" value="${esc(S.lemail || "")}" placeholder="you@example.com"></label>
<label class="fl" style="margin-top:12px">비밀번호<input id="lPw" class="field" type="password" autocomplete="${signup ? "new-password" : "current-password"}" placeholder="${signup ? "6자 이상" : "비밀번호"}" onkeydown="if(event.key==='Enter')loginEmail()"></label>
${S.lerr ? `<div class="note bad" style="margin-top:12px">${S.lerr}</div>` : ""}
<button class="btn" style="margin-top:16px" ${A.busy ? "disabled" : ""} onclick="loginEmail()">${A.busy ? `<span class="spin"></span>확인 중…` : signup ? "가입하고 시작하기" : "이메일로 로그인"}</button>
<div class="logrow"><button class="link" onclick="S.lmode='${signup ? "login" : "signup"}';S.lerr='';render()">${signup ? "이미 계정이 있어요 · 로그인" : "처음이에요 · 회원가입"}</button>${signup ? "" : `<button class="link" onclick="resetPw()">비밀번호 찾기</button>`}</div>`
    : S.lerr
      ? `<div class="note bad">${S.lerr}</div>`
      : ""
}`
}
${authOn() ? "" : `<button class="link skip" onclick="skipLogin()">로그인 없이 시작하기 <small>(이 기기에만 저장돼요)</small></button>`}
</main>${overlays()}`;
}

const LAND_DECO = `<div class="deco" aria-hidden="true">
<div class="shade" style="left:-30px;top:120px;width:230px;height:300px;transform:rotate(-20deg)">${SHADE_BRANCH}</div>
<div class="shade" style="left:10px;top:420px;width:180px;height:240px;transform:rotate(25deg)">${SHADE_BRANCH}</div>
<div class="shade" style="right:-40px;top:250px;width:160px;height:210px;transform:rotate(160deg);opacity:.06">${SHADE_BRANCH}</div>
<div class="linen"></div>
<div class="herb" style="right:-14px;top:-10px;width:120px;height:120px;transform:rotate(-20deg)">${HERB}</div>
<div class="herb" style="right:-44px;top:300px;width:96px;height:96px;transform:rotate(160deg)">${HERB}</div>
</div>`;

// 동의 화면 — 가입에 필요한 내용만 짧게, 자세한 내용은 개인정보 처리방침(privacy.html)에서
const CONSENT_VER = "2026-11-10";
const PRIVACY_URL = "privacy.html";
function agreeModal() {
  const c = S.cons || (S.cons = { age: false, privacy: false, allergy: false });
  const row = (k, tag, t, sub) =>
    `<label class="agree cons"><span class="ck ${c[k] ? "on" : ""}">${c[k] ? ic("check") : ""}</span><input type="checkbox" hidden ${c[k] ? "checked" : ""} onchange="toggleCons('${k}',this)"><span class="ctx"><b><em class="${tag === "필수" ? "req" : "opt"}">[${tag}]</em> ${t}</b>${sub ? `<small>${sub}</small>` : ""}</span></label>`;
  return `<div class="modal-bg" onclick="if(event.target===this){S.sheet=null;render()}"><div class="modal"><div class="grab"></div>
<h1 style="margin-top:0">시작하기 전에<br>확인해 주세요</h1>
<div class="card consent"><b>개인정보 수집·이용 안내</b>
<dl>
<dt>이용 목적</dt><dd>계정 생성과 로그인, 맞춤 메뉴·레시피 추천, 장보기·냉장고 기록 저장, 서비스 개선을 위한 이용 통계</dd>
<dt>수집 항목</dt><dd>이메일, 계정 식별자(UID)(Google 로그인 시 Google 계정 이메일·이름·프로필 사진), 장보기 지역·매장, 가구원 수, 추천 끼니 수, 장보기 예산, 싫어하는 재료, 보유 재료·조미료, 입력한 메뉴, 장보기 기록(산 품목·금액), 레시피 기록, 앱을 연 날짜와 AI 메뉴 조합 결과(통과·실패 횟수)</dd>
<dt>보유·이용 기간</dt><dd>회원 탈퇴 또는 '모든 정보와 기록 지우기'를 하면 바로 삭제해요. 공모전 종료 후 30일 이내에 모든 계정과 기록을 삭제해요.</dd>
<dt>동의 거부</dt><dd>동의하지 않을 수 있어요. 다만 필수 항목에 동의하지 않으면 가입할 수 없어요.</dd>
</dl>
<a class="plink" href="${PRIVACY_URL}" target="_blank" rel="noopener">개인정보 처리방침 보기 ${ic("right")}</a></div>
${row("age", "필수", "만 14세 이상이에요", "만 14세 미만은 가입할 수 없어요.")}
${row("privacy", "필수", "개인정보 수집·이용에 동의해요", "")}
${row("allergy", "선택", "알레르기 정보 수집·이용에 동의해요", "알레르기는 건강 관련 정보라 따로 여쭤봐요. 동의하지 않아도 가입할 수 있고, 알레르기 고르기만 건너뛰어요.")}
<div class="card consent"><b>AI 사용 안내</b><p class="m">메뉴와 레시피는 AI(Anthropic Claude)가 추천해요. 추천을 위해 지역·인원·예산·재료·입력한 메뉴가 Anthropic(미국)으로 전송되며, 이메일 같은 계정 정보는 보내지 않아요. 장보기 예상 금액은 조사 가격과 지역 평균을 바탕으로 계산해 실제 구매 가격과 다를 수 있어요.</p>
<p class="m warnline">알레르기 유발 성분은 구매·조리 전에 꼭 직접 확인해 주세요.</p></div>
<button class="btn" ${c.age && c.privacy ? "" : "disabled"} onclick="afterAgree()">동의하고 회원가입</button>
</div></div>`;
}

// 동의 체크 — 화면을 다시 그리지 않고(시트가 다시 올라오지 않게) 체크 표시와 버튼만 바꿔요
// 동의 후: 로그인을 쓰면 로그인 화면, 아니면 바로 온보딩
function afterAgree() {
  const c = S.cons || {};
  if (!(c.age && c.privacy)) return;
  DB.consent = { v: CONSENT_VER, at: Date.now(), age14: true, privacy: true, allergy: !!c.allergy };
  save();
  S.sheet = null;
  if (authOn() && !A.user) {
    S.lmode = "signup";
    return openLogin();
  }
  go(1);
}
function toggleCons(k, el) {
  const c = S.cons;
  c[k] = el.checked;
  const ck = el.parentElement.querySelector(".ck");
  ck.classList.toggle("on", c[k]);
  ck.innerHTML = c[k] ? ic("check") : "";
  S.agree = c.age && c.privacy;
  const b = el.closest(".modal").querySelector(".btn");
  if (b) b.disabled = !S.agree;
}
/* 1. 사는 곳 — 구와 동(법정동, 주소에 쓰는 동 이름)을 골라요. 동 목록은 서울시 자치구별 동 현황 기준 */
const normDong = t => String(t || "").replace(/\s/g, "");
// "중계2,3동"·"종로5.6가동"·"신문로1.2가" 같은 묶음 이름은 하나씩도 받아요 (중계2동, 중계3동 …)
function expandName(n) {
  const m = n.match(/^(.*?)(\d+(?:[.,]\d+)+)(가동|동|가)$/);
  return m ? [n, ...m[2].split(/[.,]/).map(d => m[1] + d + m[3])] : [n];
}
// 구별 '입력 가능한 동 이름 → 그 동네 법정동들' 표 (처음 한 번 만들어 둬요)
const DONG_IDX = (() => {
  const out = {};
  Object.entries(DONGS).forEach(([gu, rows]) => {
    const m = new Map(),
      add = (k, ls) => {
        const set = m.get(k) || new Set();
        ls.forEach(x => set.add(x));
        m.set(k, set);
      };
    rows.forEach(([h, ls]) => {
      const legal = ls.flatMap(expandName);
      expandName(h).forEach(k => add(k, legal));
      legal.forEach(l => add(l, [l]));
    });
    out[gu] = m;
  });
  return out;
})();
// ── 법정동 목록 (주소에 쓰는 동) — '어디 사세요?'에서 이걸로 골라요 ──
//   행정동(자양1~4동)은 법정동(자양동) 하나로 합치고, 'N가'로 나뉜 법정동도 하나로 묶어요
//   (성수동1가·2가 → 성수동, 종로1가~6가 → 종로1~6가). 가게 주소의 동과 그대로 맞춰져요.
const legalBase = n => n.replace(/\d+가$/, "");
const LEGAL = (() => {
  const out = {};
  Object.entries(DONGS).forEach(([gu, rows]) => {
    const g = new Map();
    rows.forEach(([h, ls]) =>
      ls
        .flatMap(expandName)
        .filter(l => !/[.,]/.test(l))
        .forEach(l => {
          const b = legalBase(l),
            e = g.get(b) || { base: b, legals: new Set(), gas: [], hs: new Set() };
          e.legals.add(l);
          const m = l.match(/(\d+)가$/);
          if (m) e.gas.push(+m[1]);
          else e.plain = true;
          e.hs.add(h);
          g.set(b, e);
        })
    );
    out[gu] = [...g.values()]
      .map(e => {
        const gas = [...new Set(e.gas)].sort((a, b) => a - b);
        // 화면 이름: '…동'이면 그대로(성수동), 아니면 가 범위(종로1~6가). 가가 하나뿐이면 원래 이름(회현동1가 → 회현동, 신문로1가 → 신문로1가)
        const name =
          /동$/.test(e.base) || !gas.length || e.plain
            ? e.base
            : gas.length === 1
              ? `${e.base}${gas[0]}가`
              : `${e.base}${gas[0]}~${gas[gas.length - 1]}가`;
        // 괄호 힌트: 이름이 전혀 다른 행정동만 (관악구 봉천동 ← 청룡동·보라매동 …). 자양1~4동처럼 같은 이름은 안 붙여요
        const stem = x => x.replace(/[\d.,]/g, "").replace(/(본동|가동|동|가)$/, "");
        const hints = [...e.hs].filter(h => stem(h) !== stem(e.base));
        return { name, legals: e.legals, hints };
      })
      .sort((a, b) => a.name.localeCompare(b.name, "ko"));
  });
  return out;
})();
const legalEntry = (gu, t) => (LEGAL[gu] || []).find(e => e.name === normDong(t));
const validDong = (gu, t) => !!legalEntry(gu, t);
// 우리 동네 법정동들 — 예전에 행정동(자양3동)으로 저장한 사람도 그대로 맞춰져요
const legalOf = (gu, t) => legalEntry(gu, t)?.legals || DONG_IDX[gu]?.get(normDong(t)) || new Set();
const hintTxt = e =>
  e.hints.length
    ? ` (${e.hints
        .slice(0, 3)
        .map(h => h.replace(/[.,]/g, "·"))
        .join(", ")}${e.hints.length > 3 ? " 등" : ""})`
    : "";
function sArea() {
  const p = S.p,
    ds = LEGAL[p.district] || [],
    ok = p.district && validDong(p.district, p.dong);
  shell(
    `<h1>어디 사세요?</h1><p class="sub">구와 동을 고르면 우리 동네 시장·마트부터 보여드려요.<br>상세 주소는 받지 않아요.</p>
${A.user && !DB.onboarded && S.view !== "edit" ? `<div class="acline" style="display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;margin:0 2px 16px;font-size:13px;color:var(--m)"><span>${esc(maskEmail(A.user.email) || "로그인됨")}으로 로그인됨</span><button class="link" style="display:inline;width:auto;margin:0;padding:0;font-size:13px;font-weight:600;color:var(--pri);text-decoration:underline" onclick="S.sheet='onblogout';render()">다른 계정으로 로그인</button></div>` : ""}
<label class="fl">구<select class="field" onchange="pickArea(this.value)"><option value="">구를 골라주세요</option>${DISTRICTS.map(d => `<option ${p.district === d ? "selected" : ""}>${d}</option>`).join("")}</select></label>
<label class="fl" style="margin-top:16px">동<select class="field" ${p.district ? "" : "disabled"} onchange="setDong(this.value)" aria-label="동 고르기"><option value="">${p.district ? "동을 골라주세요" : "구를 먼저 골라주세요"}</option>${ds.map(e => `<option value="${esc(e.name)}" ${p.dong === e.name ? "selected" : ""}>${esc(e.name)}</option>`).join("")}</select></label>
${p.district ? `<p class="m" style="margin:8px 2px 0">${esc(p.district)} 법정동 ${ds.length}개</p>` : ""}
${p.district && p.dong && !ok ? `<div class="note warn" style="margin-top:12px">예전에 고른 '${esc(p.dong)}'은(는) 주소용 동 이름으로 다시 골라주세요.</div>` : ""}
${DISTRICTS.length ? "" : `<div class="note bad">가게 데이터를 불러오지 못했어요.</div>`}`,
    `<button class="btn" ${ok ? "" : "disabled"} onclick="nextFrom('area')">${S.view === "edit" ? "다음" : nextLabel()}</button>`
  );
}
function pickArea(d) {
  const p = S.p;
  if (p.district !== d) {
    p.district = d;
    p.dong = "";
    p.mart = "";
    p.martAvg = false;
  }
  render();
}
function setDong(d) {
  Object.assign(S.p, { dong: d, mart: "", martAvg: false });
  render();
}
const dongOf = a => String(a || "").split(" ")[2] || ""; // "서울 광진구 자양동 680-1" → "자양동"
// 이 가게가 우리 동네(입력한 동이 걸친 법정동)에 있나
const sameDong = (m, p) => {
  if (!m.address) return false;
  const set = legalOf(p.district, p.dong),
    d = dongOf(m.address);
  return set.has(d) || set.has(d.replace(/\d+가$/, ""));
};

/* 2. 가게 선택 — 같은 동 가게 먼저, 그다음 같은 구 다른 동네. 지번 주소 + 지도 링크로 위치 확인
   (가게 사이 거리는 데이터에 없어서 '가까운 순'이라고 하지 않아요) */
const MART_ICON = { 전통시장: "market", 대형마트: "cart" };
const foodCount = id =>
  Object.keys((SHOP.prices || {})[id] || {}).filter(c => FOOD_BY_CODE[c] && rawPrice(id, c)).length;
const kakaoMap = m => `https://map.kakao.com/link/search/${encodeURIComponent(m.address)}`; // API 키 없이 열리는 카카오맵 검색 링크
function storeTile(m) {
  const on = S.p.mart === m.id;
  return `<div class="tile wide store ${on ? "on" : ""}" onclick="S.p.mart='${m.id}';S.p.martAvg=false;render()">
<span class="ibox">${ic(MART_ICON[m.type] || "store")}</span><span class="wtx"><b>${esc(m.name)}</b><small>${esc(m.type)} · 식재료 가격 ${foodCount(m.id)}개</small><small class="addr">${m.address ? esc(m.address.replace(/^서울\s*/, "")) : "주소 정보 없음"}</small></span>
</div>`;
}
function sShop() {
  const p = S.p,
    dn = esc(String(p.dong || "").trim());
  const typeOrd = (a, b) =>
    a.type === b.type ? a.name.localeCompare(b.name, "ko") : a.type === "전통시장" ? -1 : 1;
  const all = (STORES[p.district] || [])
    .slice()
    .sort(
      (a, b) => (dongOf(a.address) || "힣").localeCompare(dongOf(b.address) || "힣", "ko") || typeOrd(a, b)
    );
  const near = all.filter(m => sameDong(m, p)).sort(typeOrd),
    rest = all.filter(m => !sameDong(m, p));
  // 우리 동네 가게가 없으면 '구 평균 가격'을 다른 동네 가게보다 먼저 보여줘요
  const avgTile = `<div class="tiles"><div class="tile wide ${p.martAvg ? "on" : ""}" onclick="S.p.mart='';S.p.martAvg=true;render()"><span class="ibox">${ic("map")}</span><span class="wtx"><b>${esc(p.district)} 평균 가격으로 볼게요</b><small>${all.length}곳에서 조사된 가격의 평균이에요</small></span></div></div>`;
  shell(
    `<h1>어디서 장 보세요?</h1><p class="sub">고른 가게에서 조사된 가격으로 보여줘요.<br>이름이 낯설면 아래 주소로 확인해 보세요.</p>
<div style="text-align:center;margin:4px 0 6px"><div class="zipchip"><span>${esc(p.district)} ${dn}</span><button onclick="${S.view === "edit" ? "S.editKey='area';render()" : "go(1)"}">변경</button></div></div>
${
  near.length
    ? `<p class="sec">${ic("pin")} ${dn} 시장·마트 ${near.length}곳</p><div class="tiles">${near.map(storeTile).join("")}</div>
${rest.length ? `<p class="sec sep">${esc(p.district)} 다른 동네 ${rest.length}곳</p><div class="tiles">${rest.map(storeTile).join("")}</div>` : ""}`
    : `<p class="m emptyline">${dn} 시장·마트는 아직 데이터를 준비 중이에요. ${esc(p.district)} 평균 가격으로 보거나, 다른 동네 가게를 골라주세요.</p>
${avgTile}
${rest.length ? `<p class="sec">${ic("pin")} ${esc(p.district)} 다른 동네 ${rest.length}곳</p><div class="tiles">${rest.map(storeTile).join("")}</div>` : ""}`
}
${near.length ? `<p class="sec">맞는 가게가 없다면</p>${avgTile}` : ""}
<p class="m" style="margin-top:12px">가게 사이 거리는 아직 데이터에 없어서, 다른 동네는 동 이름 순서로 보여드려요.</p>`,
    `<button class="btn" ${p.mart || p.martAvg ? "" : "disabled"} onclick="nextFrom('shop')">${nextLabel()}</button>`
  );
}

/* 3. 가구원 수 */
function sPeople() {
  const p = S.p;
  shell(
    `<h1>몇 명이 함께 먹나요?</h1><p class="sub">인원에 맞춰 레시피 분량과 예산을 정해요.</p>
<div class="center"><div class="stepper">
<button class="rb" ${p.people <= 1 ? "disabled" : ""} onclick="S.p.people--;render()">−</button>
<div><div class="bignum">${p.people}</div><div class="m">${p.people >= 4 ? "명 이상" : "명"}</div></div>
<button class="rb" ${p.people >= 4 ? "disabled" : ""} onclick="S.p.people++;render()">+</button></div></div>`,
    `<button class="btn" onclick="nextFrom('people')">${nextLabel()}</button>`
  );
}

/* 4. 한 번에 추천받을 끼니 수 — 이만큼의 메뉴와, 그 안에서 다 쓸 장볼 재료를 짜줘요 */
const MEAL_PRESETS = [
  [3, "가볍게"],
  [5, "평일 저녁"],
  [7, "하루 한 끼"],
  [10, "넉넉히"],
];
// 추천 표시 — 이 선택지에 배지를 달고 굵게 보여줘요. 기본값(RULES.mealsDefault)과 같은 끼니로 맞춰요.
//   ※ '가장 많이 골라요' 같은 문구는 실제 사용자 선택 통계가 생긴 뒤에 label만 바꿔주세요 (지금은 근거가 없어서 '추천').
const MEAL_PICK = {
  value: RULES.mealsDefault,
  label: "추천",
  why: "한 번 장 볼 때 남기지 않고 다 쓰기 좋아요",
};
function sMeals() {
  const n = S.p.meals;
  shell(
    `<h1>몇 끼니씩<br>추천받고 싶으세요?</h1><p class="sub">한 번 장 볼 때 이만큼 먹을 재료를 골라드려요.<br>산 재료는 이 끼니 안에 남김없이 쓰도록 맞춰요.</p>
<div class="center">
<div class="stepper">
<button class="rb" ${n <= RULES.mealsMin ? "disabled" : ""} onclick="setMeals(${n - 1})">−</button>
<div><div class="bignum">${n}</div><div class="m">끼씩</div></div>
<button class="rb" ${n >= RULES.mealsMax ? "disabled" : ""} onclick="setMeals(${n + 1})">+</button></div>
<div class="presets" style="margin-top:22px">${MEAL_PRESETS.map(([v, t]) => `<span class="chip ${n === v ? "on" : ""} ${v === MEAL_PICK.value ? "best" : ""}" onclick="setMeals(${v})">${v === MEAL_PICK.value ? `<em class="pickb">${MEAL_PICK.label}</em>` : ""}${v}끼 <span class="m">${t}</span></span>`).join("")}</div>
<div class="mealnotes"><p class="m pickwhy">${ic("bulb")} ${MEAL_PICK.value}끼: ${MEAL_PICK.why}</p>
<p class="m">장볼 때마다 몇 끼 해 먹을지 다시 정할 수 있어요. 여기서 고른 끼니 수는 처음 추천에 써요.</p></div>
</div>`,
    `<button class="btn" onclick="nextFrom('meals')">${nextLabel()}</button>`
  );
}
function setMeals(v) {
  S.p.meals = Math.min(RULES.mealsMax, Math.max(RULES.mealsMin, v));
  if (S.view !== "edit") S.p.monthly = null;
  render();
} // 끼니가 바뀌면 예산 추천값도 다시 계산

/* 5. 한 달 집밥 예산 — 버튼 3개(보통이 기본 선택) + 직접 수정 */
function sBudget() {
  const p = S.p;
  if (p.monthly == null) p.monthly = presetMonthly(1);
  const ref = BUDGET_REF[Math.min(4, Math.max(1, p.people))],
    ps = presets(),
    max = ps[2][1] * 2;
  shell(
    `<h1>한 달 장보기 예산을<br>정해볼까요?</h1>
<div class="center" style="min-height:280px">
<div class="pre3">${ps.map(([t, m]) => `<button class="pre ${p.monthly === m ? "on" : ""}" data-v="${m}" onclick="setMonthly(${m})"><b>${t}</b><span>${m / 10000}만 원</span></button>`).join("")}</div>
<p class="bcap"><span>참고: ${ref.label} 평균 식료품 지출은 월 약 ${Math.round(ref.amount / 10000)}만 원 (${BUDGET_REF_SRC})</span></p>
<div class="moneyblock"><div class="moneyin"><input id="mIn" inputmode="numeric" value="${p.monthly.toLocaleString()}" oninput="typeMonthly(this)" aria-label="한 달 집밥 예산 직접 입력"><span>원</span></div>
<p class="m" id="bweek"></p></div>
<div class="slide"><input type="range" id="bRange" min="${BUDGET_RANGE.min}" max="${max}" step="${BUDGET_RANGE.step}" value="${Math.min(max, p.monthly)}" oninput="slideMonthly(this)" aria-label="한 달 집밥 예산 조절">
<div class="range-l"><span>${BUDGET_RANGE.min / 10000}만</span><span>밀어서 조절하거나 숫자를 눌러 입력하세요</span><span>${max / 10000}만</span></div></div>
<div id="bwarn" style="width:100%"></div></div>`,
    `<button id="bBtn" class="btn" onclick="nextFrom('budget')">${nextLabel()}</button>`
  );
  updBudget();
  fillRange($("#bRange"));
}
// 예산 바꾸기: 버튼·숫자 입력은 슬라이더가 그 값으로 미끄러지듯 이동, 슬라이더는 숫자를 바로 바꿔요
function syncBudget(v) {
  S.p.monthly = v;
  document.querySelectorAll(".pre").forEach(b => b.classList.toggle("on", +b.dataset.v === v));
  updBudget();
}
function fillRange(r) {
  r.style.setProperty("--p", ((r.value - r.min) / (r.max - r.min)) * 100 + "%");
}
function glide(to) {
  const r = $("#bRange");
  if (!r) return;
  to = Math.max(+r.min, Math.min(+r.max, to));
  const from = +r.value,
    t0 = performance.now();
  cancelAnimationFrame(glide.id);
  const step = now => {
    const k = Math.min(1, (now - t0) / 320),
      e = 1 - Math.pow(1 - k, 3);
    r.value = from + (to - from) * e;
    fillRange(r);
    if (k < 1) glide.id = requestAnimationFrame(step);
  };
  if (matchMedia("(prefers-reduced-motion:reduce)").matches) {
    r.value = to;
    fillRange(r);
  } else glide.id = requestAnimationFrame(step);
}
function setMonthly(v) {
  $("#mIn").value = v.toLocaleString();
  syncBudget(v);
  glide(v);
}
function slideMonthly(r) {
  const v = +r.value;
  fillRange(r);
  $("#mIn").value = v.toLocaleString();
  syncBudget(v);
}
function typeMonthly(el) {
  const v = +el.value.replace(/[^0-9]/g, "");
  el.value = v ? v.toLocaleString() : "";
  syncBudget(v);
  glide(v);
}
function updBudget() {
  const v = S.p.monthly || 0,
    min = minMonthly(),
    ok = v >= min;
  const meals = ((S.p.meals * daysIn()) / 7) * hh(),
    per = Math.round(v / Math.max(1, meals) / 100) * 100; // 한 끼(1인) 재료비
  $("#bweek").textContent = `한 끼에 약 ${won(per)}꼴이에요`;
  $("#bwarn").innerHTML = !v
    ? `<div class="note bad">예산을 입력해 주세요.</div>`
    : ok
      ? ""
      : `<div class="note warn guide"><b>예산을 조금만 올려볼까요?</b>한 끼 ${won(per)}으로는 담을 수 있는 재료가 많지 않아서, 원하는 메뉴를 담기 어려울 수 있어요. 한 달 ${min / 10000}만 원 이상을 추천해요.
<button class="chip on" onclick="setMonthly(${min})">${min / 10000}만 원으로 맞추기</button><span class="m">이대로 진행해도 괜찮아요</span></div>`;
  $("#bBtn").disabled = !v || (RULES.blockBelowMin && !ok);
}

/* 6. 못 먹는 재료 */
const AVOID_QUICK = ["계란", "두부", "생선", "돼지고기", "닭고기", "밀가루"];
function sAvoid() {
  const a = avoidWords(),
    al = allergies(),
    open = S.allergyOpen;
  shell(
    `<h1>못 먹는 재료가 있나요?</h1><p class="sub">알레르기나 싫어하는 재료는 장보기·레시피에서 빼드려요.</p>
<p class="seasg">알레르기</p>
${allergyOK() ? "" : `<div class="consentask"><b>알레르기 정보 수집에 동의해 주세요</b><p>동의하면 알레르기 22종에서 골라 장보기·레시피에서 빼드려요.</p><button class="btn ghost" onclick="setAllergyConsent(true)">동의하고 알레르기 고르기</button></div>`}
${
  allergyOK()
    ? `<div class="seasacc"><div class="accrow"><button class="acchd" onclick="S.allergyOpen=!S.allergyOpen;keep()" aria-expanded="${!!open}"><span class="acct">알레르기 22종에서 고르기</span><span class="accn">${al.length ? `<em>${al.length}</em> ${esc(al.slice(0, 3).join("·"))}${al.length > 3 ? " …" : ""}` : "없어요"}</span>${ic(open ? "up" : "down")}</button>
${open ? `<div class="accbody">${ALLERGENS.map(([n]) => `<span class="chip ${al.includes(n) ? "on" : ""}" onclick="toggleAllergy('${n}')">${n}</span>`).join("")}</div>` : ""}</div></div>`
    : ""
}
<p class="seasg">싫어하는 재료</p>
<div class="chips">${chip(`${ic("ban")} 없어요`, !a.length && !al.length, "S.p.avoid='';S.p.allergies=[];render()")}${AVOID_QUICK.map(x => chip(x, a.includes(x), `toggleAvoid('${x}')`)).join("")}</div>
<input class="field" style="margin-top:12px" value="${esc(S.p.avoid || "")}" placeholder="직접 입력 · 예) 고수, 가지 (쉼표로 구분)" onchange="setAvoid(this.value)">${inErr("avoid")}
<div class="note" style="margin-top:16px">식약처 알레르기 표시 기준 22종으로 걸러요. 브랜드가 정해지지 않은 소스·양념은 대표 제품의 원재료를 기준으로 해서, 제품마다 다를 수 있어요. 같은 제조시설에서 섞일 가능성까지는 반영하지 않으니, 포장의 원재료명과 알레르기 표시를 꼭 확인해 주세요.</div>
${S.err ? `<div class="note bad">${S.err}</div>` : ""}`,
    `<button class="btn" onclick="checkAvoid()">${nextLabel()}</button>`
  );
}
function setAvoid(v) {
  const ws = String(v || "")
      .split(/[,，\s]+/)
      .map(x => x.trim())
      .filter(Boolean),
    ok = [...new Set(ws.filter(isAvoidWord))],
    bad = ws.filter(w => !isAvoidWord(w));
  S.p.avoid = ok.join(", ");
  setInErr(
    "avoid",
    bad.length
      ? `${bad.map(b => `'${esc(b)}'`).join(", ")}은(는) 재료로 판단되지 않아 넣지 않았어요. 재료 이름으로 적어주세요.`
      : ""
  );
  render();
}
function toggleAvoid(x) {
  const a = avoidWords();
  S.p.avoid = (a.includes(x) ? a.filter(v => v !== x) : [...a, x]).join(", ");
  render();
}
// 알레르기 [선택] 동의·철회 — 철회하면 저장된 알레르기 정보도 지워요
function setAllergyConsent(on) {
  DB.consent = {
    ...(DB.consent || { v: CONSENT_VER, age14: true, privacy: true }),
    allergy: !!on,
    allergyAt: Date.now(),
  };
  if (!on) {
    if (DB.profile) DB.profile.allergies = [];
    if (S.p) S.p.allergies = [];
  }
  save();
  toast(on ? "알레르기 정보 수집에 동의했어요" : "알레르기 정보를 지우고 동의를 철회했어요");
  keep();
}
function toggleAllergy(n) {
  if (!allergyOK()) return;
  const a = S.p.allergies || [];
  S.p.allergies = a.includes(n) ? a.filter(x => x !== n) : [...a, n];
  keep();
}
function checkAvoid() {
  nextFrom("avoid");
}

/* 7. 조미료 — 건너뛰면 레시피 받을 때 물어봐요 */
function sSeas() {
  shell(
    `<h1>집에 어떤 조미료가<br>있나요?</h1>
${seasPicker()}`,
    `<button class="btn" onclick="onbSeas(true)">다 골랐어요</button><button class="link" onclick="onbSeas(false)">나중에 할게요</button>`
  );
}
function onbSeas(saveIt) {
  if (saveIt) {
    DB.seas = {};
    S.seasDraft.forEach(n => (DB.seas[n] = "have"));
    DB.seasSet = true;
  }
  finishOnb();
}
function finishOnb() {
  DB.profile = { ...S.p, startedAt: Date.now() };
  DB.onboarded = true;
  S.p = null;
  S.sheet = null;
  markVisit();
  save();
  runLoader("build", 3, 600, () => {
    S.view = "app";
    S.tab = "home";
    render();
    scrollTo(0, 0);
  });
}

const ONB = ["landing", "area", "shop", "people", "budget", "avoid", "seas"]; // 끼니 수는 장볼 때마다 골라요 (온보딩에서 안 물어요)
const SCR = {
  landing,
  area: sArea,
  shop: sShop,
  people: sPeople,
  meals: sMeals,
  budget: sBudget,
  avoid: sAvoid,
  seas: sSeas,
};
