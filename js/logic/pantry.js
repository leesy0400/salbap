/* ============================================================
   냉장고 — 재료 남은 양·다 씀·버림, 조미료 있음/다 씀, 조미료 고르기
   ============================================================ */

/* ============================================================
   ③-1 냉장고 — 재료는 넉넉/보통/조금/다 씀, 조미료는 있음/조금/다 떨어짐
   ============================================================ */
const LV = { full: "넉넉", mid: "보통", low: "조금" },
  LV_NEXT = { full: "mid", mid: "low", low: "full" };
const SV = { have: "있음", low: "조금", out: "다 떨어짐" },
  SV_NEXT = { have: "low", low: "out", out: "have" },
  SV_CLS = { have: "full", low: "low", out: "out" };
const stock = () => DB.pantry.filter(x => x.level !== "out").sort((a, b) => a.addedAt - b.addedAt); // 오래된 것부터
const outs = () => DB.pantry.filter(x => x.level === "out");
// 산 재료가 어떻게 됐는지 — purchases[].fate: used(다 씀) / tossed(버림) / rebought(다 쓰기 전에 같은 재료를 또 삼 → 새 기록으로 넘어가요)
function setFate(pid, fate) {
  const p = pid && DB.purchases.find(x => x.id === pid);
  if (!p) return;
  if (fate) Object.assign(p, { fate, fateAt: Date.now() });
  else {
    delete p.fate;
    delete p.fateAt;
  }
}
// 다 쓰거나 버린 재료는 기록으로 남겨요 — 같은 재료를 또 넣거나 사 오면 새 항목으로 들어가요(예전 기록은 그대로)
function putPantry(name, level, src, pid) {
  const ex = DB.pantry.find(x => x.level !== "out" && coreName(x.name) === coreName(name));
  if (ex && ex.level !== "out" && ex.pid && pid) setFate(ex.pid, "rebought");
  if (ex) Object.assign(ex, { level, addedAt: Date.now(), src, pid, tossed: false });
  else DB.pantry.push({ id: uid(), name, level, addedAt: Date.now(), src, pid });
}
function cycleLv(id) {
  const x = DB.pantry.find(p => p.id === id);
  if (x) {
    x.level = LV_NEXT[x.level];
    save();
    keep();
  }
}
function useUp(id) {
  const x = DB.pantry.find(p => p.id === id);
  if (!x) return;
  x.level = "out";
  x.tossed = false;
  x.outAt = Date.now();
  setFate(x.pid, "used");
  save();
  toast(`${x.name}: 다 썼어요`);
  keep();
}
function tossOut(id) {
  const x = DB.pantry.find(p => p.id === id);
  if (!x) return;
  x.level = "out";
  x.tossed = true;
  x.outAt = Date.now();
  setFate(x.pid, "tossed");
  save();
  toast(`${x.name}: 버린 재료로 기록했어요`);
  keep();
}
function restore(id) {
  const x = DB.pantry.find(p => p.id === id);
  if (!x) return;
  setFate(x.pid, null);
  const dup = DB.pantry.find(p => p.id !== id && p.level !== "out" && coreName(p.name) === coreName(x.name)); // 같은 재료가 이미 냉장고에 있으면 그쪽 하나만 남겨요
  if (dup) DB.pantry = DB.pantry.filter(p => p.id !== id);
  else {
    x.level = "mid";
    x.tossed = false;
    delete x.outAt;
  }
  save();
  keep();
}
function delPantry(id) {
  DB.pantry = DB.pantry.filter(x => x.id !== id);
  save();
  keep();
}
function addPantry(name) {
  const v = (name || $("#pIn").value).trim();
  if (!v) return;
  if (!name && !isFoodWord(v)) {
    setInErr("pantry", `'${esc(v)}'은(는) 식재료로 판단되지 않아요. 재료 이름으로 적어주세요.`);
    keep();
    setTimeout(() => {
      const el = $("#pIn");
      if (el) {
        el.value = v;
        el.focus();
        el.select();
      }
    }, 0);
    return;
  }
  setInErr();
  putPantry(v, "mid", "manual");
  save();
  keep();
}
// 조미료는 있으면 넉넉한 것으로 봐요. 다 쓰면 [다 씀]으로 냉장고 탭 목록에서 빠져요(값은 out으로 남아 장보기에 떠요)
// 조미료 회전판 — 가운데 온 조미료가 크고 앞으로, 양옆은 작고 뒤로 (돌림판을 옆에서 보는 느낌)
function turnSeas(el) {
  if (!el) return;
  const r = el.getBoundingClientRect(),
    c = r.left + r.width / 2;
  el.querySelectorAll(".sj").forEach(x => {
    const b = x.getBoundingClientRect(),
      d = Math.max(-1, Math.min(1, (b.left + b.width / 2 - c) / (r.width / 2)));
    x.style.transform = `translateY(${(d * d * 18).toFixed(1)}px) scale(${(1 - Math.abs(d) * 0.28).toFixed(3)})`;
    x.style.opacity = (1 - Math.abs(d) * 0.45).toFixed(2);
    x.style.zIndex = 10 - Math.round(Math.abs(d) * 9);
  });
}
// ◀ ▶ 버튼 — 한 칸씩 돌려요
function moveSeas(d) {
  const el = $(".seasl"),
    x = el && el.querySelector(".sj");
  if (x) el.scrollBy({ left: d * (x.offsetWidth + 4), behavior: "smooth" });
}
function seasOut(n) {
  DB.seas[n] = "out";
  save();
  toast(`${n}: 다 썼어요`);
  keep();
}

/* 조미료 고르기 (온보딩 화면 · 바텀시트 공용) — 종류별 묶음 + 직접 추가 */
function seasPicker() {
  const custom = [...new Set([...S.seasDraft, ...Object.keys(DB.seas)])].filter(n => !SEASONINGS.includes(n));
  const tile = n =>
    `<div class="tile ${S.seasDraft.includes(n) ? "on" : ""}" onclick="toggleDraft('${q(n)}')">${esc(n)}</div>`;
  const more = SEAS_GROUPS; // 기본 조미료도 다른 묶음과 같이 눌러서 펼쳐요
  const pill = n =>
    `<span class="chip ${S.seasDraft.includes(n) ? "on" : ""}" onclick="toggleDraft('${q(n)}')">${esc(n)}</span>`;
  return (
    `<div class="seasacc" style="margin-top:14px">${more
      .map(([g, l]) => {
        const open = S.seasOpen.includes(g),
          cnt = l.filter(n => S.seasDraft.includes(n)).length;
        return `<div class="accrow"><button class="acchd" onclick="toggleSeasGrp('${g}')" aria-expanded="${open}"><span class="acct">${g}</span><span class="accn">${cnt ? `<em>${cnt}</em> 선택` : esc(l.slice(0, 3).join(" · ")) + (l.length > 3 ? " …" : "")}</span>${ic(open ? "up" : "down")}</button>${open ? `<div class="accbody">${l.map(pill).join("")}</div>` : ""}</div>`;
      })
      .join("")}</div>` +
    `<p class="seasg">직접 추가</p>${custom.length ? `<div class="tiles three" style="margin-bottom:10px">${custom.map(tile).join("")}</div>` : ""}
<div class="seasadd"><input id="seasIn" class="field" placeholder="목록에 없는 조미료 (예: 와사비)" onkeydown="if(event.key==='Enter')addSeasDraft()"><span class="chip on" onclick="addSeasDraft()">추가</span></div>${inErr("seas")}`
  );
}
function toggleSeasGrp(g) {
  S.seasOpen = S.seasOpen.includes(g) ? S.seasOpen.filter(x => x !== g) : [...S.seasOpen, g];
  keep();
}
function addSeasDraft() {
  const v = ($("#seasIn")?.value || "").trim();
  if (!v) return;
  if (!isSeasWord(v)) {
    setInErr("seas", `'${esc(v)}'은(는) 조미료로 판단되지 않아요. 조미료 이름으로 적어주세요.`);
    keep();
    setTimeout(() => {
      const el = $("#seasIn");
      if (el) {
        el.value = v;
        el.focus();
        el.select();
      }
    }, 0);
    return;
  }
  setInErr();
  if (!S.seasDraft.includes(v)) S.seasDraft = [...S.seasDraft, v];
  keep();
  setTimeout(() => $("#seasIn")?.focus(), 0);
}
function seasDefaults() {
  const own = Object.keys(DB.seas).filter(k => DB.seas[k] !== "out");
  return own.length ? own : [...DEFAULT_SEASONINGS];
}
function toggleDraft(s) {
  S.seasDraft = S.seasDraft.includes(s) ? S.seasDraft.filter(x => x !== s) : [...S.seasDraft, s];
  keep();
}
function openSeas(ctx) {
  S.inErr = null;
  S.seasCtx = ctx;
  S.seasDraft = seasDefaults();
  S.sheet = "seas";
  render();
}
function saveSeas() {
  const nw = {};
  S.seasDraft.forEach(n => (nw[n] = DB.seas[n] && DB.seas[n] !== "out" ? DB.seas[n] : "have"));
  Object.keys(DB.seas).forEach(n => {
    if (!(n in nw) && DB.seas[n] === "out") nw[n] = "out";
  }); // 다 떨어진 건 장보기 알림용으로 남겨요
  DB.seas = nw;
  DB.seasSet = true;
  save();
  const ctx = S.seasCtx;
  S.sheet = null;
  if (ctx === "recipe") suggestMenus();
  else {
    toast("조미료를 저장했어요");
    render();
  }
}
