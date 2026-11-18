/* ============================================================
   냉장고 화면 — 재료 목록, 조미료 회전판
   ============================================================ */

/* ============================================================
   ⑤-3 냉장고 — 탭하면 남은 양이 바뀌어요
   ============================================================ */
// 구매날짜 (예: 구매날짜: 26년 11월 18일)
const inDate = t => {
  const d = new Date(t || Date.now());
  return `구매날짜: ${String(d.getFullYear()).slice(2)}년 ${d.getMonth() + 1}월 ${d.getDate()}일`;
};
function pantryPage() {
  const s = stock(),
    own = Object.keys(DB.seas),
    sl = own.filter(n => DB.seas[n] !== "out");
  page(`<h1 style="margin-top:18px">우리집 냉장고</h1><p class="sub" style="margin-top:4px">장 본 재료가 여기로 자동으로 모여요.</p>
${s.length ? `<button class="btn ghost" style="margin:2px 0 14px" onclick="goTab('recipe','make')">${ic("pot")} 이 재료로 뭐 해먹지?</button>` : ""}
<section class="fridge" aria-label="냉장고 안 재료"><div class="fr-top"><i class="fr-handle"></i><span>재료 ${s.length}개</span></div><div class="fr-in">
${
  s.length
    ? `<div class="shelves">${s
        .map(x => {
          const d = daysAgo(x.addedAt);
          return `<div class="li" style="cursor:default"><div class="em">${ingIc(x.name)}</div>
<div class="tx"><b>${esc(x.name)}</b><span class="m ${d >= 5 ? "up" : ""}">${inDate(x.addedAt)}</span></div>
<button class="lv ${x.level}" onclick="cycleLv('${x.id}')">${LV[x.level]}</button><button class="used" onclick="useUp('${x.id}')">다 씀</button><button class="used toss" onclick="tossOut('${x.id}')">버림</button></div>`;
        })
        .join("")}</div>`
    : `<div class="fr-empty"><b>냉장고가 비어 있어요</b><p>장 본 것을 기록하면 자동으로 채워지고,<br>원래 있던 재료는 아래에서 넣을 수 있어요.</p></div>`
}
</div></section>
<div class="card addrow"><input id="pIn" class="field" placeholder="원래 있던 재료 추가 (예: 김치)" onkeydown="if(event.key==='Enter')addPantry()"><span class="chip on" onclick="addPantry()">추가</span></div>${inErr("pantry")}

<div class="row" style="margin:26px 0 6px"><h3>양념·조미료</h3>${own.length ? `<span class="m" style="cursor:pointer;text-decoration:underline" onclick="openSeas('pantry')">고치기</span>` : ""}</div>
${
  own.length
    ? sl.length
      ? `<div class="seasturn"><button class="seasnav l" onclick="moveSeas(-1)" aria-label="왼쪽 조미료">${ic("back")}</button><button class="seasnav r" onclick="moveSeas(1)" aria-label="오른쪽 조미료">${ic("right")}</button><div class="seasl" onscroll="turnSeas(this)">${sl
          .map(
            n => `<div class="sj"><span class="sjar">${ingIc(n)}</span><b>${esc(n)}</b>
<button class="used" onclick="seasOut('${q(n)}')">다 씀</button></div>`
          )
          .join("")}</div></div>`
      : `<p class="m" style="margin:4px 2px">남은 조미료가 없어요. 다 쓴 조미료는 장보기에 떠요.</p>`
    : `<div class="card"><p class="m" style="margin:0 0 10px">조미료를 아직 안 골랐어요. 레시피 받을 때 물어볼게요.</p><span class="chip on" onclick="openSeas('pantry')">지금 고르기</span></div>`
}

`);
}
