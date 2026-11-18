/* ============================================================
   장보기 화면 — 메뉴 정하기 → 조합 고르기 → 장볼 목록 → 산 것 기록
   ============================================================ */

/* ============================================================
   ⑤-2 장보기 — 예산 카드 (장볼 목록 아래): 예상 장보기 금액과 이번 달 남는 예산
   ============================================================ */
function budgetCard() {
  const ct = cartTotal(),
    mb = monthBudget(),
    sp = spentMonth(),
    left = mb - sp - ct,
    over = left < 0,
    unk = cart().some(x => !+x.price);
  const pct = n => (mb ? Math.min(100, Math.max(0, (n / mb) * 100)) : 0);
  return `<section class="bcard"><div class="row" style="align-items:flex-end"><div><span class="m">예상 장보기 금액${unk ? ` <span class="tag">가격 확인된 품목 기준</span>` : ""}</span><div class="bnum">${won(ct)}</div></div>
<div class="bside"><span>${ymLabel(NOW_YM)} 장보기 예산 ${mb ? won(mb) : "없음"}</span></div></div>
${
  mb
    ? `<div class="bmeter"><i class="sp" style="width:${pct(sp)}%"></i><i class="ct ${over ? "over" : ""}" style="width:${pct(ct)}%"></i></div>
<div class="legend"><span><i class="sp"></i>이미 쓴 돈 ${won(sp)}</span><span><i class="ct"></i>이번 장보기 ${won(ct)}</span></div>
${over ? `<p class="overmsg">다 사면 ${ymLabel(NOW_YM)} 예산을 ${won(-left)} 넘어요. 빼도 되는 재료가 있는지 살펴봐요.</p>` : `<p class="m cheer">다 사도 ${ymLabel(NOW_YM)} 예산이 ${won(left)} 남아요</p>`}`
    : `<p class="m cheer">월 예산을 정하면 남는 금액도 보여드려요</p>`
}</section>`;
}

/* ① 메뉴 정하기 — 장 보러 가기 전: 먹고 싶은 메뉴 입력 → AI가 필요한 식재료만 리스트업 */
// 메뉴 정하기 화면 안의 단계: wish(먹고 싶은 메뉴) → combo(메뉴 조합) → list(장볼 목록)
function pickView() {
  const pl = plan(),
    dr = draft();
  let v = S.pview;
  if (v === "combo" && !dr) v = null;
  if (v === "list" && !pl) v = null;
  return v || (dr && (!pl || dr.at > pl.at) ? "combo" : pl ? "list" : "wish");
}
// 이번 장보기 끼니 수 (장보기마다 따로) · 냉장고에서 이번에 쓸 재료
const tripMeals = () => Math.min(21, Math.max(1, +S.tm || trip()?.meals || P().meals || 5));
const pickedNow = () => {
  const have = new Set(stock().map(x => coreName(x.name)));
  return (S.picked || []).filter(n => have.has(n));
};
function setTm(d) {
  S.tm = Math.min(21, Math.max(1, tripMeals() + d));
  keep();
}
function togglePick(n) {
  const a = S.picked || [];
  S.picked = a.includes(n) ? a.filter(x => x !== n) : [...a, n];
  keep();
}
function pickPage() {
  const pl = plan(),
    dr = draft(),
    p = DB.profile,
    N = tripMeals(),
    v = pickView();
  if (v === "combo") return comboPage(dr);
  if (v === "wish") {
    const s = stock(),
      room = Math.max(0, leftMonth()),
      pk = pickedNow();
    return page(
      `<h2 class="lead">이번 장보기로<br>몇 끼를 해 먹을까요?</h2>
<div class="tmrow"><button class="tmb" onclick="setTm(-1)" ${N <= 1 ? "disabled" : ""} aria-label="한 끼 줄이기">−</button><div class="tmv"><b>${N}</b>끼</div><button class="tmb" onclick="setTm(1)" ${N >= 21 ? "disabled" : ""} aria-label="한 끼 늘리기">${ic("plus")}</button></div>
${
  s.length
    ? `<p class="sec" style="margin-bottom:2px">${ic("fridge")} 냉장고에서 이번에 쓸 재료</p><p class="m" style="margin:0 2px 10px;font-size:13px">안 골라도 돼요. 고르면 꼭 넣어서 짜요.</p>
<div class="chips">${s
        .slice(0, 12)
        .map(x => {
          const n = coreName(x.name),
            on = pk.includes(n);
          return `<span class="chip ${on ? "on" : ""}" onclick="togglePick('${q(n)}')">${on ? ic("check") : ""}${ingIc(n)} ${esc(n)}</span>`;
        })
        .join("")}</div>
${pk.length > 1 ? `<p class="m" style="margin:8px 2px 0">고른 ${pk.length}가지를 함께 쓰는 메뉴부터 보여드려요.</p>` : ""}`
    : ""
}
<p class="sec">${ic("bulb")} 먹고 싶은 메뉴</p>
<textarea id="wish" class="field wish" rows="2" maxlength="200" oninput="typeWish(this)" placeholder="예) 김치찌개, 김치찌개와 파스타" aria-label="먹고 싶은 메뉴">${esc(S.wish)}</textarea>
${S.planNote ? `<p class="wisherr">${S.planNote}</p>` : ""}
<div class="chips" style="margin-top:10px"><span class="chip nowish ${S.noWish ? "on" : ""}" onclick="setNoWish()">${ic("check")} 딱히 없어요</span></div>
${pl || dr ? `<button class="link" onclick="S.planEdit=false;S.pview='${dr && (!pl || dr.at > pl.at) ? "combo" : "list"}';render()">${dr && (!pl || dr.at > pl.at) ? "받은 메뉴 조합 보기" : "지난번에 받은 목록 보기"}</button>` : ""}`,
      S.work === "plan"
        ? `<button class="btn" disabled><span class="spin"></span>${progSpan("plan")}</button>`
        : `<button class="btn" onclick="makeCombos()">${N}끼 메뉴 조합 받기</button>`
    );
  }
  if (!pl.seen) {
    pl.seen = true;
    save();
  } // 3단계(장볼 목록)를 봤다고 표시 → 4단계가 열려요
  const c = cart(),
    ct = cartTotal(),
    prs = planRecs(),
    wishT = prs.filter(r => r.wish).map(r => r.title);
  // 재료 한 줄: [살 것] 체크(체크하면 가격이 쌓이고, 풀면 0원) · [미보유/보유중] (보유중이면 0원 + 냉장고에 넣어요)
  const row = x => {
    const have = !!x.have,
      on = !have && inCart(x.key);
    return `<div class="li prow ${have ? "have" : ""}"><div class="em">${ingIc(x.name)}</div>
<div class="tx"><b>${esc(x.name)}</b><span class="m">${esc([x.spec, x.unit].filter(Boolean).join(" · "))}</span><span class="m" style="display:block;font-size:12px;line-height:1.5">${dateTxt(x.pr)}</span></div>
<div class="pcol"><div class="pr ${on ? "" : "zero"}">${won(on ? x.price : 0)}</div>
<div class="pbtns"><button class="buy ${on ? "on" : ""}" ${have ? "disabled" : ""} onclick="toggleCart('${q(x.key)}')" role="checkbox" aria-checked="${on}" aria-label="${esc(x.name)} 살 것"><span class="cb">${on ? ic("check") : ""}</span>살 것</button>
<button class="own ${have ? "on" : ""}" onclick="toggleHave('${q(x.key)}')" aria-pressed="${have}" aria-label="${esc(x.name)} ${have ? "보유중" : "미보유"}">${have ? "보유중" : "미보유"}</button></div></div></div>`;
  };
  page(
    `<h2 class="lead">필요한 재료를 골랐어요</h2>
<p class="meta">${ic("pin")} ${esc(placeOf(p))} 조사 가격 · 조사일은 재료마다 달라요</p>
${pl.notes.map(n => `<div class="note warn">${esc(n)}</div>`).join("")}
${pl.check.ok && pl.check.avoid ? `<p class="tip okline">${ic("check")} 못 먹는 재료(${esc(pl.check.avoid)})가 없는지 한 번 더 확인했어요</p>` : ""}
<p class="sec">${ic("basket")} 장볼 재료 ${pl.items.length}개</p>
${pl.items.length ? `<div class="list">${pl.items.map(row).join("")}</div>` : pl.fridge.length ? `<div class="note">냉장고 재료만으로 충분해요. 이번엔 장 안 봐도 돼요.</div>` : `<div class="note warn">장볼 재료를 만들지 못했어요. 메뉴 조합을 다시 받아 주세요.</div>`}
<div style="margin-top:16px">${budgetCard()}</div>
${pl.fridge.length ? `<p class="sec">${ic("fridge")} 냉장고에서 꺼내 쓰는 재료</p><p class="fridgeuse">${esc(pl.fridge.map(f => f.name).join(", "))}</p>` : ""}`,
    pl.ready
      ? `<button class="btn" onclick="setHtab('shop')">${ic("basket")} 체크리스트로 돌아가기</button>`
      : c.length
        ? `<button class="btn" onclick="confirmList()">장볼 목록 확정 <span class="btn-sub">${c.length}개 · ${won(ct)}</span>${ic("right")}</button>`
        : `<button class="btn" onclick="commitCart(0);setHtab('shop')">이번 장보기 마치기</button>`
  );
}

// 메뉴 조합 3안 — 하나 고르면 그 조합으로 장볼 목록을 만들어요 (가격·남는 재료는 장볼 목록에서 실제 데이터로 보여줘요)
function comboPage(dr) {
  const pl = plan(),
    sel = S.comboSel ?? (pl && pl.draftAt === dr.at ? dr.sel : null);
  page(
    `${S.planNote ? `<div class="note warn">${S.planNote}</div>` : ""}
${dr.wish ? `<div class="wishecho">“${esc(dr.wish)}”</div>` : ""}
${dr.combos
  .map((c, i) => {
    const on = sel === i;
    return `<button class="combo ${on ? "on" : ""}" onclick="S.comboSel=${i};render()" aria-pressed="${on}">
<div class="ctop"><b>${i + 1}안 · ${esc(c.label)}</b><span class="cck">${on ? ic("check") : ""}</span></div>${c.desc ? `<p class="m cdesc">${esc(c.desc)}</p>` : ""}
<div class="cmenus">${c.recipes.map(r => `<span class="cm ${r.wish ? "w" : ""}">${esc(r.title)}${r.meals > 1 ? ` <em>×${r.meals}끼</em>` : ""}</span>`).join("")}</div>
</button>`;
  })
  .join("")}`,
    S.work === "plan"
      ? `<button class="btn" disabled><span class="spin"></span>${progSpan("plan")}</button>`
      : `<div class="footrow"><button class="btn ghost" onclick="S.wish=draft().wish;makeCombos()">${ic("refresh")} 다른 조합</button><button class="btn" ${sel == null ? "disabled" : ""} onclick="confirmCombo()">${sel == null ? "조합을 골라주세요" : `${sel + 1}안으로 장보기`}</button></div>`
  );
}

/* ② 산 것 기록 — 장 보고 와서: 추천 재료는 산 걸로 보고, 추가로 산 것만 입력(얼마나 샀는지도) */
// 추가로 산 것 (바텀시트)
function manualSheet() {
  const cat = catOf(S.mcat);
  return `<div class="modal-bg" onclick="if(event.target===this){S.sheet=null;render()}"><div class="modal"><div class="grab"></div>
<h1 style="margin-top:0">추가로 산 게<br>있나요?</h1><p class="sub">종류, 이름, 얼마나 샀는지, 가격을 적어주세요.</p>
<div class="addform">
 <label class="fl">품목 종류<select id="mCat" class="field" onchange="setCat(this.value)">${CATS.map(([n, e]) => `<option value="${n}" ${n === S.mcat ? "selected" : ""}>${e} ${n}</option>`).join("")}</select></label>
 <label class="fl">무엇을 샀나요?<input id="mName" class="field" placeholder="${cat[2].length ? `예: ${cat[2].slice(0, 2).join(", ")}` : "산 것을 적어주세요"}" oninput="$('#mErr')?.remove()" onkeydown="if(event.key==='Enter')$('#mPrice').focus()"></label>
 <div class="fl">얼마나 샀나요?<div class="seg qseg" style="margin:8px 0 0">${QTY.map(([k, t]) => `<button type="button" data-k="${k}" class="${S.mqty === k ? "on" : ""}" onclick="setQty('${k}')">${t}</button>`).join("")}</div></div>
 <label class="fl">얼마였나요?<span class="won"><input id="mPrice" class="field" inputmode="numeric" placeholder="0" onkeydown="if(event.key==='Enter')addManual()"><em>원</em></span></label>
</div>
<button class="btn" style="margin-top:20px" onclick="addManual()">산 것에 추가하기</button>
<button class="link" onclick="S.sheet=null;render()">닫기</button></div></div>`;
}
function recordPage() {
  const c = cart(),
    tot = c.reduce((a, x) => a + (+x.price || 0), 0),
    done = S.recorded && !c.length && !trip();
  const rec = c.filter(x => x.key.startsWith("p:")),
    extra = c.filter(x => !x.key.startsWith("p:"));
  const row = x => `<div class="li" style="cursor:default"><div class="em">${ingIc(x.name)}</div>
<div class="tx"><b>${esc(x.name)}</b><span class="m">${x.qty ? `${qtyLabel(x.qty)} 샀어요` : esc(x.unit || "")}</span></div>
<input class="priceIn" inputmode="numeric" value="${+x.price ? (+x.price).toLocaleString() : ""}" placeholder="가격" onchange="setPrice('${q(x.key)}',this.value)" aria-label="${esc(x.name)} 산 가격">
<button class="x" onclick="removeCart('${q(x.key)}')" aria-label="${esc(x.name)} 안 샀어요">${ic("x")}</button></div>`;
  page(
    done
      ? `<div class="card donecard"><b>${ic("check")} 장보기를 마쳤어요</b><p class="m">${S.recorded > 0 ? `산 재료 ${S.recorded}개가 냉장고에 들어갔어요. ` : ""}결제액 ${won(S.paidJust || 0)}을 ${ymLabel(NOW_YM)} 장보기 예산에 반영했어요. 남은 예산은 ${won(leftMonth())}이에요.</p>
<button class="btn" onclick="goTab('recipe','make')">오늘 뭐 해먹지? ${ic("right")}</button><button class="link" onclick="goTab('pantry')">냉장고 보기</button></div>`
      : `<h2 class="lead">장 보고 오셨군요!<br>추천 재료는 산 걸로 기록할게요</h2><p class="meta">안 산 건 ✕로 빼고, 가격이 달랐다면 고쳐주세요.</p>
${
  rec.length
    ? `<p class="sec">${ic("check")} 추천받은 재료 ${rec.length}개</p><div class="list">${rec.map(row).join("")}</div>`
    : `<div class="card"><p class="m" style="margin:0 0 12px">'메뉴 정하기'에서 받은 재료가 여기에 산 걸로 나와요. 목록 없이 장 봤다면 아래에서 바로 적어주세요.</p><button class="btn" onclick="goTab('pick')">${ic("pot")} 메뉴 정하기로 가기</button></div>`
}
<p class="sec">${ic("plus")} 추가로 산 것${extra.length ? ` ${extra.length}개` : ""}</p>
${extra.length ? `<div class="list">${extra.map(row).join("")}</div>` : `<p class="m" style="margin:0 0 4px">추천 말고 더 산 게 있으면 넣어주세요. 얼마나 샀는지도 같이 적으면 냉장고에 남은 양으로 들어가요.</p>`}
<button class="btn ghost extra" style="margin-top:12px" onclick="S.sheet='manual';S.mqty='mid';render()">${ic("plus")} 추가로 산 게 있어요</button>`,
    c.length
      ? `<button class="btn two" onclick="openPay('trip')">기록 완료하고 결제액 적기<small>${c.length}개가 냉장고에 들어가요 · 예상 ${won(tot)}</small></button>`
      : null
  );
}
// 결제액 시트 — trip: 장보기 마칠 때 / new: 직접 기록 / edit: 내역 고치기·지우기
function openPay(mode, id) {
  const x = id && (DB.trips || []).find(t => t.id === id);
  S.pay = {
    mode,
    id: id || null,
    amount:
      mode === "trip"
        ? cart()
            .filter(y => y.bought !== false)
            .reduce((a, y) => a + (+y.price || 0), 0)
        : x
          ? x.paid
          : "",
    date: ymd(new Date(x ? x.paidAt || x.at : Date.now())),
    memo: x?.memo || "",
  };
  S.sheet = "pay";
  render();
}
function paySheet() {
  const y = S.pay,
    trip1 = y.mode === "trip",
    x = y.id && (DB.trips || []).find(t => t.id === y.id);
  return `<div class="modal-bg" onclick="if(event.target===this){S.sheet=null;render()}"><div class="modal"><div class="grab"></div>
<h1 style="margin-top:0">${trip1 ? "실제로 얼마<br>결제했나요?" : y.mode === "edit" ? "결제 기록 고치기" : "장 본 금액<br>직접 기록하기"}</h1>
<p class="sub">${trip1 ? `영수증 금액을 적어 주세요. 체크한 재료 가격을 더해서 미리 넣어 뒀어요.` : "월 장보기 예산에서 이 금액만큼 빠져요."}</p>
<label class="fl">결제액<span class="won"><input id="payIn" class="field" inputmode="numeric" value="${y.amount !== "" ? (+y.amount).toLocaleString() : ""}" placeholder="0"><em>원</em></span></label>
${
  trip1
    ? ""
    : `<label class="fl" style="margin-top:14px">날짜<input id="payDate" type="date" class="field" value="${y.date}" max="${todayKey()}"></label>
${!x || x.manual ? `<label class="fl" style="margin-top:14px">메모 (선택)<input id="payMemo" class="field" maxlength="30" value="${esc(y.memo)}" placeholder="예: 동네 시장" oninput="$('#payErr')?.remove()"></label>` : ""}`
}
<button class="btn" style="margin-top:20px" onclick="savePay()">${trip1 ? "결제액 기록하고 장보기 마치기" : "저장하기"}</button>
${y.mode === "edit" ? `<button class="link" style="color:var(--r)" onclick="delPay('${y.id}')">이 결제 기록 지우기</button>` : ""}
<button class="link" onclick="S.sheet=null;render()">닫기</button></div></div>`;
}
function savePay() {
  const y = S.pay,
    v = Math.max(0, +String($("#payIn").value).replace(/[^0-9]/g, "") || 0);
  if (y.mode === "trip") {
    commitCart(v);
    scrollTo(0, 0);
    return;
  }
  const d = $("#payDate")?.value || todayKey(),
    at = new Date(d + "T12:00:00").getTime(),
    memo = ($("#payMemo")?.value || "").trim().slice(0, 30);
  if (memo && banHit(memo)) {
    const el = $("#payMemo");
    let e = $("#payErr");
    if (!e) {
      e = document.createElement("p");
      e.id = "payErr";
      e.className = "inerr";
      e.setAttribute("role", "alert");
      el.closest("label").after(e);
    }
    e.textContent = "메모에 쓸 수 없는 말이 있어요. 장 본 곳처럼 짧게 적어 주세요.";
    el.focus();
    el.select();
    return;
  } // 욕설·정치·성적인 말·연락처는 저장하지 않아요
  if (y.mode === "edit") {
    const x = (DB.trips || []).find(t => t.id === y.id);
    if (x) {
      x.paid = v;
      x.paidAt = at;
      if (x.manual) x.memo = memo;
    }
  } else {
    if (!v) {
      toast("금액을 적어주세요");
      return;
    }
    DB.trips = [...(DB.trips || []), { id: uid(), manual: true, at, paidAt: at, paid: v, memo }];
  }
  S.sheet = null;
  save();
  toast("결제 기록을 저장했어요");
  keep();
}
function delPay(id) {
  DB.trips = (DB.trips || []).filter(t => t.id !== id);
  S.sheet = null;
  save();
  toast("결제 기록을 지웠어요");
  keep();
}
function dropTripSheet() {
  const t = trip();
  return `<div class="modal-bg" onclick="if(event.target===this){S.sheet=null;render()}"><div class="modal" role="alertdialog"><div class="grab"></div>
<h1 style="margin-top:0">진행 중인 장보기를<br>그만두고 새로 시작할까요?</h1><p class="sub">${t ? t.meals : ""}끼 장보기에서 받은 메뉴 조합과 장볼 목록이 지워져요. 이미 만든 레시피는 '오늘 뭐 해먹지?'에 남아요.</p>
<button class="btn" onclick="dropTrip();startTrip()">새로 시작하기</button>
<button class="link" onclick="S.sheet=null;render()">취소</button></div></div>`;
}
