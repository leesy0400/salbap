/* ============================================================
   장보기 — 장볼 목록 담기 → 산 것 체크(가격 수정·직접 추가) → 냉장고로
   ============================================================ */

/* ============================================================
   ③-2 장보기 — 장볼 목록 담기 → 산 것 체크(가격 수정·직접 추가) → 기록하면 냉장고로
   ============================================================ */
function cart() {
  const id = trip()?.id || null;
  if ((DB.cart.trip || null) !== id) {
    DB.cart = { wk: NOW_WK, trip: id, items: [] };
  }
  return DB.cart.items;
}
const inCart = key => cart().some(x => x.key === key);
const cartTotal = () => cart().reduce((a, x) => a + (+x.price || 0), 0);
function cartItemOf(key) {
  if (key.startsWith("m:")) {
    const n = key.slice(2);
    return { key, name: n, unit: "", price: 0, kind: "manual", bought: true };
  }
  if (key.startsWith("p:")) {
    const x = (DB.plan?.items || []).find(i => i.key === key);
    if (x) return { ...x, bought: true };
  }
  return { key, name: key, unit: "", price: 0, kind: "manual", bought: true };
}
function toggleCart(key) {
  const c = cart(),
    i = c.findIndex(x => x.key === key);
  if (i >= 0) c.splice(i, 1);
  else c.push({ ...cartItemOf(key), ...(plan()?.ready && key.startsWith("p:") ? { bought: false } : {}) });
  save();
  keep();
}
// 장볼 목록에서 '보유중' — 이미 집에 있으면 0원으로 빼고 냉장고에 넣어요 (냉장고에 미처 안 적은 재료 대비). 다시 누르면 되돌려요
function toggleHave(key) {
  const pl = plan(),
    x = pl && pl.items.find(i => i.key === key);
  if (!x) return;
  if (!x.have) {
    x.have = true;
    DB.cart.items = cart().filter(c => c.key !== key);
    const ids = new Set(DB.pantry.map(p => p.id));
    putPantry(x.name, "full", "have");
    x.haveId = (DB.pantry.find(p => !ids.has(p.id)) || {}).id || null;
    toast(`${x.name}을(를) 냉장고에 넣었어요`);
  } else {
    x.have = false;
    if (x.haveId) DB.pantry = DB.pantry.filter(p => p.id !== x.haveId);
    x.haveId = null;
    if (!inCart(key)) toggleCart(key);
  }
  save();
  keep();
}
function toggleBought(key) {
  const x = cart().find(i => i.key === key);
  if (x) {
    x.bought = !x.bought;
    save();
    keep();
  }
}
// 체크리스트 [전부 구매] — 다 체크돼 있으면 [전부 해제]
function toggleAllBought() {
  const c = cart(),
    all = c.length && c.every(x => x.bought);
  c.forEach(x => {
    x.bought = !all;
  });
  save();
  keep();
}
function removeCart(key) {
  DB.cart.items = cart().filter(x => x.key !== key);
  save();
  keep();
}
function setPrice(key, v) {
  const x = cart().find(i => i.key === key);
  if (x) {
    x.price = Math.max(0, +String(v).replace(/[^0-9]/g, "") || 0);
    save();
    keep();
  }
}
// 목록에 없는 것도 샀어요: 품목 종류(드롭다운) + 이름 + 가격
const catOf = n => CATS.find(c => c[0] === n) || CATS[CATS.length - 1];
function setCat(v) {
  S.mcat = v;
  const c = catOf(v);
  $("#mName").placeholder = c[2].length ? `예: ${c[2].slice(0, 2).join(", ")}` : "산 것을 적어주세요";
}
// 추가로 산 것 시트 안내 — 시트를 다시 그리지 않고 입력칸 밑에만 띄워요(적은 값이 지워지지 않게)
function manErr(m) {
  const el = $("#mName");
  if (!el) return;
  let e = $("#mErr");
  if (!e) {
    e = document.createElement("p");
    e.id = "mErr";
    e.className = "inerr";
    e.setAttribute("role", "alert");
    el.closest("label").after(e);
  }
  e.innerHTML = m;
  el.focus();
  el.select();
}
function addManual() {
  const n = $("#mName").value.trim(),
    pr = +String($("#mPrice").value).replace(/[^0-9]/g, "") || 0,
    cat = S.mcat;
  if (!n) {
    $("#mName").focus();
    return toast("산 재료 이름을 적어주세요");
  }
  if (!isFoodWord(n) && !isSeasWord(n)) {
    manErr(`'${esc(n)}'은(는) 식재료로 판단되지 않아요. 재료 이름으로 적어주세요.`);
    return;
  } // 냉장고 직접 입력과 같은 검사
  DB.cats = DB.cats || {};
  DB.cats[coreName(n)] = cat;
  cart().push({
    key: "m:" + n + ":" + uid(),
    name: n,
    unit: "",
    price: pr,
    kind: isSeasName(coreName(n)) ? "seas" : "manual",
    cat,
    qty: S.mqty,
    bought: true,
  });
  S.sheet = null;
  S.mqty = "mid";
  save();
  keep();
  toast(`${n}을(를) 산 것에 넣었어요`);
}
// 얼마나 샀나요? — 많이/보통/적게 → 냉장고 남은 양(넉넉/보통/조금)으로 들어가요
const QTY = [
  ["full", "많이"],
  ["mid", "보통"],
  ["low", "적게"],
];
const qtyLabel = k => (QTY.find(x => x[0] === k) || [])[1] || "";
function setQty(k) {
  S.mqty = k;
  document.querySelectorAll(".qseg button").forEach(b => b.classList.toggle("on", b.dataset.k === k));
}
function commitCart(paid) {
  const c = cart(),
    b = c.filter(x => x.bought !== false),
    tid = trip()?.id || null; // 체크리스트에서 [구매]로 체크한 것만 산 것
  b.forEach(x => {
    const pid = uid();
    DB.purchases.push({
      id: pid,
      week: NOW_WK,
      at: Date.now(),
      name: x.name,
      price: +x.price || 0,
      kind: x.kind,
      src: x.kind === "manual" ? "manual" : "rec",
      trip: tid,
    });
    if (x.kind === "seas") DB.seas[coreName(x.name)] = "have";
    else putPantry(x.name, x.qty || "full", "buy", pid);
  }); // 얼마나 샀는지 → 냉장고 남은 양
  S.paidJust = Math.max(0, Math.round(+paid || 0));
  finishTrip(paid);
  DB.cart = { wk: NOW_WK, trip: null, items: [] };
  S.recorded = b.length || -1;
  S.sheet = null;
  save();
  toast(b.length ? `${b.length}개를 냉장고에 넣고 결제액을 기록했어요` : "결제액을 기록했어요"); // 조미료는 온보딩·냉장고·내 정보·'오늘 뭐 해먹지?'에서 따로 확인해요
  render();
  scrollTo(0, 0);
}
function delPurchase(id) {
  DB.purchases = DB.purchases.filter(x => x.id !== id);
  DB.pantry = DB.pantry.filter(x => x.pid !== id);
  save();
  keep();
}
