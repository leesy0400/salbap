/* ============================================================
   레시피 화면 — 오늘 뭐 해먹지?, 저장한 레시피, 레시피 상세, 남은 양
   ============================================================ */

/* ============================================================
   ⑤-4 레시피 — [추천받기] [저장한 레시피]
   ============================================================ */
// 레시피 카드 — 카드 자체는 누르는 곳이 아니고, [레시피 보기] / [해먹었어요] 버튼 두 개로 나눠요
const rcard = r => `<div class="rc rcx">${thumb(r)}
<div style="flex:1;min-width:0"><div class="rctop"><b>${esc(r.title)}</b><button class="heart" onclick="toggleScrap('${r.id}')" aria-label="${isScrap(r.id) ? "즐겨찾기에서 빼기" : "즐겨찾기"}">${ic("heart", isScrap(r.id) ? "fill" : "")}</button></div>
<div class="meta">${r.time_min ? `<span>${ic("clock")} ${esc(r.time_min)}분</span>` : ""}${r.level ? `<span>${esc(r.level)}</span>` : ""}${r.meals > 1 ? `<span class="tag g">${r.meals}끼분</span>` : ""}${DB.recipes.some(x => x.cooked && x.title === r.title) ? `<span class="tag g">해먹음</span>` : ""}</div>
<div class="rcbtns"><button class="rcb ghost" onclick="openRecipe('${r.id}')">레시피 보기</button><button class="rcb" onclick="startCook('${r.id}')">해먹었어요</button></div></div></div>`;
function recipePage() {
  const v = S.rview,
    s = stock();
  let body;
  if (v === "make") {
    const res = S.results.map(findR).filter(Boolean),
      ms = S.menus || [];
    const seasTxt = Object.entries(DB.seas)
      .filter(([, x]) => x !== "out")
      .map(([k]) => k)
      .join(", ");
    const pr = planRecs();
    body = `${S.note ? `<div class="note warn">${S.note}</div>` : ""}
${pr.length ? `<p class="sec" style="margin-top:6px">${ic("basket")} 이번 장보기로 고른 메뉴 · ${planMeals()}끼</p>${pr.map(rcard).join("")}<p class="sec">냉장고 재료로 다른 메뉴</p>` : ""}
${
  !s.length
    ? `<div class="card"><p class="m" style="margin:0 0 12px">냉장고가 비어 있어요. 장 본 걸 기록하면 그 재료로 만들 수 있는 메뉴를 보여드려요.</p><button class="btn" onclick="goTab('record')">${ic("basket")} 산 것 기록하기</button></div>`
    : `${ms.length && S.menuSig !== fridgeSig() ? `<div class="note warn">냉장고 재료가 바뀌었어요. <span style="text-decoration:underline;cursor:pointer;font-weight:700" onclick="suggestMenus()">바뀐 재료로 다시 보기</span></div>` : ""}
${
  S.work === "menus"
    ? `<div class="card workcard"><span class="spin dark"></span>${progSpan("menus")}</div>`
    : ms.length
      ? ms
          .map(
            (
              m,
              i
            ) => `<button class="rc ${S.work === "recipe:" + i ? "making" : ""}" ${S.work ? "disabled" : ""} onclick="makeRecipe(${i})">${thumb(m)}
<div style="flex:1"><b>${esc(m.title)}</b><div class="meta" style="margin:6px 0 0">${S.work === "recipe:" + i ? `<span class="making-t"><span class="spin dark"></span>${progSpan("recipe")}</span>` : `${m.time_min ? `<span>${ic("clock")} ${esc(m.time_min)}분</span>` : ""}`}</div></div>
<span style="color:var(--pri);flex:none">${ic("right")}</span></button>`
          )
          .join("")
      : S.note
        ? ""
        : pr.length && !S.menus
          ? `<p class="m" style="margin:0">아래 '다른 메뉴 보기'로 지금 냉장고 재료로 만들 수 있는 메뉴를 더 찾아볼 수 있어요.</p>`
          : `<div class="note">지금 재료로 만들 수 있는 메뉴를 찾지 못했어요. 아래 버튼으로 다시 찾아보세요.</div>`
}
${
  DB.seasSet
    ? `<p class="m" style="margin-top:14px">조미료: ${esc(seasTxt || "없음")} · <span style="text-decoration:underline;cursor:pointer" onclick="openSeas('recipe')">고치기</span></p>`
    : `<div class="note warn" style="margin-top:12px">${emo("🧂")} 지금은 기본 조미료(${DEFAULT_SEASONINGS.join("·")})가 있다고 생각하고 골랐어요. 있는 조미료를 알려주시면 더 딱 맞게 골라드릴게요. <span style="text-decoration:underline;cursor:pointer;font-weight:700" onclick="openSeas('recipe')">알려주기</span></div>`
}
<p class="sec">먹고 싶은 메뉴가 있나요?</p>
<div class="addrow wantrow"><input id="want" class="field" maxlength="20" value="${esc(S.want || "")}" oninput="S.want=this.value" placeholder="예: 김치찌개" onkeydown="if(event.key==='Enter')askWant()"><button class="chip on" ${S.work ? "disabled" : ""} onclick="askWant()">${S.work === "want" ? `<span class="spin dark"></span>` : "만들 수 있나 보기"}</button></div>${inErr("want")}
${S.wantRes ? `<div class="note ${S.wantRes.ok ? "" : "warn"}">${S.wantRes.msg}</div>` : ""}`
}
${res.length ? `<p class="sec">최근에 본 레시피</p>${res.map(rcard).join("")}` : ""}`;
  } else
    body = DB.scraps.length
      ? DB.scraps.map(rcard).join("")
      : `<div class="card"><p class="m" style="margin:0">아직 저장한 레시피가 없어요. 레시피에서 하트를 눌러 보세요.</p></div>`;
  page(
    `<h2 class="lead">${v === "make" ? "지금 냉장고 재료로<br>이런 걸 만들 수 있어요" : "저장한 레시피"}</h2><div class="seg"><button class="${v === "make" ? "on" : ""}" onclick="S.rview='make';needMenus()?suggestMenus():render()">만들 수 있는 메뉴</button><button class="${v === "scrap" ? "on" : ""}" onclick="S.rview='scrap';render()">저장한 레시피 ${DB.scraps.length || ""}</button></div>
${body}`,
    v === "make" && s.length
      ? `<button class="btn" ${S.work ? "disabled" : ""} onclick="suggestMenus()">${S.work === "menus" ? `<span class="spin"></span>${progSpan("menus")}` : `${ic("refresh")} 다른 메뉴 보기`}</button>`
      : null
  );
}

/* 레시피 상세 (바텀시트) */
function recipeSheet() {
  const r = findR(S.openR);
  if (!r) return "";
  const sc = isScrap(r.id),
    done = DB.recipes.some(x => x.cooked && x.title === r.title);
  return `<div class="modal-bg" onclick="if(event.target===this){S.openR=null;render()}"><div class="modal"><div class="grab"></div>
<div style="text-align:center">${thumb(r, "rth")}
<h1 style="margin:14px 0 6px">${esc(r.title)}</h1><div class="meta" style="justify-content:center">${r.time_min ? `<span>${ic("clock")} ${esc(r.time_min)}분</span>` : ""}<span>${ic("user")} ${DB.profile.people}명</span>${r.meals > 1 ? `<span>${r.meals}끼분</span>` : ""}<span class="tag o">${esc(r.level || "")}</span></div>
<span class="chip ${sc ? "on" : ""}" style="margin-top:12px" onclick="toggleScrap('${r.id}')">${ic("heart", sc ? "fill" : "")} ${sc ? "저장했어요" : "저장하기"}</span></div>
<div class="seg" style="margin-top:18px"><button class="${S.rtab === "uses" ? "on" : ""}" onclick="S.rtab='uses';render()">재료</button><button class="${S.rtab === "steps" ? "on" : ""}" onclick="S.rtab='steps';render()">조리법</button></div>
<div class="list">${
    S.rtab === "uses"
      ? (r.uses || [])
          .map(
            u =>
              `<div class="li" style="cursor:default"><div class="em" style="width:10px;height:10px;border-radius:50%;background:var(--sage);margin:0 4px"></div><div class="tx"><b style="font-weight:500">${esc(u)}</b></div></div>`
          )
          .join("")
      : (r.steps || []).length
        ? r.steps.map((s, k) => `<div class="step"><span>${k + 1}</span>${esc(s)}</div>`).join("")
        : S.stepsWork === r.id
          ? `<div class="workcard" style="padding:16px"><span class="spin dark"></span>${progSpan("steps")}</div>`
          : `<div style="padding:14px"><p class="m" style="margin:0 0 10px">${S.stepsErr || "조리법이 아직 없어요."}</p><span class="chip on" onclick="ensureSteps('${r.id}')">조리법 다시 받기</span></div>`
  }</div>
<button class="link" style="margin-top:10px" onclick="S.openR=null;render()">닫기</button></div></div>`;
}

/* 해먹은 뒤: 얼마나 남았어요? */
function leftSheet() {
  const { rows } = S.left;
  const opts = r =>
    r.k === "p"
      ? [
          ["full", "넉넉"],
          ["mid", "보통"],
          ["low", "조금"],
          ["out", "다 씀"],
        ]
      : [
          ["have", "있음"],
          ["out", "다 씀"],
        ];
  const cls = (r, v) => (r.k === "p" ? v : SV_CLS[v]);
  return `<div class="modal-bg" onclick="if(event.target===this){S.left=null;render()}"><div class="modal"><div class="grab"></div>
<h1 style="margin-top:0">얼마나 남았어요?</h1><p class="sub">이 레시피에 쓴 재료만 모았어요. 남은 양을 골라주세요.</p>
${
  rows.length
    ? rows
        .map(
          (r, i) =>
            `<div class="card"><b style="display:flex;align-items:center;gap:10px"><span class="ibox" style="width:36px;height:36px;border-radius:11px;font-size:20px">${ingIc(r.name)}</span>${esc(r.name)}</b><div class="lvpick">${opts(
              r
            )
              .map(
                ([v, t]) =>
                  `<button class="lv ${cls(r, v)} ${r.lv === v ? "sel" : ""}" onclick="setLeft(${i},'${v}')">${t}</button>`
              )
              .join("")}</div></div>`
        )
        .join("")
    : `<div class="note">냉장고 재료와 겹치는 게 없어서 해먹은 기록만 남길게요.</div>`
}
<button class="btn" style="margin-top:10px" onclick="finishCook()">저장하기</button>
<button class="link" onclick="S.left=null;render()">취소</button></div></div>`;
}

/* 조미료 고르기 (바텀시트) */
function seasSheet() {
  return `<div class="modal-bg" onclick="if(event.target===this){S.sheet=null;render()}"><div class="modal"><div class="grab"></div>
${
  S.seasCtx === "record"
    ? `<h1 style="margin-top:0">조미료도 같이<br>챙겨둘까요?</h1><p class="sub">지금 있는 조미료를 알려주시면<br>딱 맞는 레시피를 추천해 드릴게요.</p>`
    : `<h1 style="margin-top:0">집에 있는 조미료를<br>골라주세요</h1><p class="sub">없는 것만 빼주시면 돼요.</p>`
}
${seasPicker()}
<button class="btn" style="margin-top:18px" onclick="saveSeas()">${S.seasCtx === "recipe" ? "이대로 레시피 받기" : "이대로 저장할게요"}</button>
<button class="link" onclick="S.sheet=null;render()">${S.seasCtx === "record" ? "다음에 할게요" : "닫기"}</button></div></div>`;
}
