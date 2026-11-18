/* ============================================================
   AI 부르기 — /api/llm 호출, 답 형식 검사(**·태그 걸러내기), 진행 안내 문구
   ============================================================ */

// AI 답 검사 — 화면에 나갈 글자에 **강조**, ## 제목, </태그> 같은 형식 기호가 섞이면 걷어내요.
//   걷어내도 이상한 기호가 남거나 JSON이 깨졌으면 한 번 더 요청하고, 그래도 안 되면 "형식 오류"로 실패시켜요.
//   (화면에는 이상한 글자 대신 "다시 시도해 주세요"만 보여요)
const AI_TAG = /<\/?[a-zA-Z][^>]*>/g,
  AI_MD = /\*{2,}|_{2,}|^\s*#{1,6}\s+|^\s*\*\s+|`+/gm,
  AI_BAD = /[<>*`#]|&[a-z]+;|\\[nt"]/;
function cleanAIText(v) {
  const c = String(v)
    .replace(AI_TAG, "")
    .replace(AI_MD, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
  if (AI_BAD.test(c)) throw new Error("형식 오류");
  return c;
}
function cleanAI(v) {
  if (typeof v === "string") return cleanAIText(v);
  if (Array.isArray(v)) return v.map(cleanAI);
  if (v && typeof v === "object") {
    const o = {};
    for (const k of Object.keys(v)) o[k] = cleanAI(v[k]);
    return o;
  }
  return v;
}
const isFmtErr = e => /형식|JSON|Unexpected|token|position/i.test(e?.message || "");
async function askJSON(sys, usr, model, opts, tries = 2) {
  for (let i = 0; ; i++) {
    try {
      return cleanAI(JSON.parse(await callLLM(sys, usr, model, opts)));
    } catch (e) {
      if (!isFmtErr(e)) throw e;
      if (i + 1 >= tries) throw new Error("형식 오류");
    }
  }
}
// 사용자에게 보여줄 오류 꼬리말 — 영어·기술 오류(JSON, HTTP 등)는 화면에 안 보여요. 통계에는 그대로 남겨요.
const errTail = m =>
  !m || isFmtErr({ message: m }) || /^HTTP|fetch|network/i.test(m) || !/[가-힣]/.test(m)
    ? ""
    : ` (${esc(m)})`;

// callLLM(system, user, model, opts) — opts: {thinking, max_tokens, timeoutMs}
//   응답의 text 블록만 모아요 (thinking을 켜면 생각 블록이 같이 오는데 그건 버려요)
async function callLLM(system, user, model = LLM.model, opts = {}) {
  // 시간 제한은 AbortSignal 대신 Promise.race로 걸어요.
  //   Claude 앱 미리보기에서는 fetch가 postMessage로 전달되는데, AbortSignal은 복사가 안 돼서 오류가 나요.
  let tm;
  const timeout = new Promise((_, rej) => {
    tm = setTimeout(() => rej(new Error("응답이 너무 오래 걸려요")), opts.timeoutMs || LLM.timeoutMs);
  });
  const body = {
    model,
    max_tokens: opts.max_tokens || 4000,
    system,
    messages: [{ role: "user", content: user }],
  };
  if (opts.thinking) body.thinking = opts.thinking;
  const textOf = data =>
    (data.content || [])
      .filter(c => c.type === "text")
      .map(c => c.text)
      .join("")
      .replace(/```json|```/g, "")
      .trim();
  const errOf = async r => {
    let m = "";
    try {
      const j = await r.json();
      m = j?.error?.message || j?.error || "";
    } catch (e) {}
    return new Error(`HTTP ${r.status}${m ? " · " + m : ""}`);
  };
  try {
    // ① 배포 주소: 서버 함수(/api/llm)가 API 키를 붙여서 불러요. 로그인한 사용자만 쓸 수 있어요.
    if (location.protocol.startsWith("http")) {
      const headers = { "content-type": "application/json" };
      if (A.user) {
        try {
          headers.authorization = "Bearer " + (await A.user.getIdToken());
        } catch (e) {}
      }
      let r = null;
      try {
        r = await Promise.race([
          fetch(LLM.proxy, { method: "POST", headers, body: JSON.stringify(body) }),
          timeout,
        ]);
      } catch (e) {
        if (e.message === "응답이 너무 오래 걸려요") throw e;
      } // 서버 함수가 없는 곳이면 ②로
      if (r && !/json/.test(r.headers.get("content-type") || "")) r = null; // JSON이 아니면 서버 함수가 없는 곳
      if (r && r.status === 401) throw new Error("로그인해야 AI 추천을 쓸 수 있어요");
      if (r && r.status !== 404 && r.status !== 405) {
        if (!r.ok) throw await errOf(r);
        return textOf(await Promise.race([r.json(), timeout]));
      }
    }
    // ② 서버 함수가 없는 곳(Claude 앱 미리보기): 키 없이 미리보기 방식으로 한 번 시도
    const r = await Promise.race([
      fetch(LLM.url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...body, model: LLM.previewModel }),
      }),
      timeout,
    ]);
    if (!r.ok) throw await errOf(r);
    return textOf(await Promise.race([r.json(), timeout]));
  } finally {
    clearTimeout(tm);
  }
}
// AI가 일하는 동안 몇 초마다 바뀌는 진행 안내 — 남은 재료와 시장가격이 반영되고 있다는 걸 보여줘요
const PROG = {
  plan: () => [
    "냉장고 재료를 확인하는 중",
    `${placeOf(P())} 시장가격을 비교하는 중`,
    "이번 주 예산에 맞추는 중",
    "남는 재료 없이 끼니를 나누는 중",
    "거의 다 됐어요",
  ],
  menus: () => ["냉장고 재료를 확인하는 중", "오래된 재료부터 쓸 메뉴를 고르는 중", "거의 다 됐어요"],
  recipe: () => ["냉장고 재료를 확인하는 중", "남은 재료로 레시피를 짜는 중", "거의 다 됐어요"],
  steps: () => ["재료와 분량을 맞추는 중", "만드는 순서를 정리하는 중", "거의 다 됐어요"],
  img: () => ["음식 그림을 그리는 중", "거의 다 됐어요"],
};
// AI가 만드는 동안(메뉴·레시피·조리법·그림) 화면 전체를 덮는 로딩 화면
function setProg(k) {
  S.progK = k;
  S.progI = 0;
  document.querySelectorAll(".progtx").forEach(e => (e.textContent = progTxt(k) + "…"));
}
const aiLoad = () =>
  (S.work || S.stepsWork) && S.progK
    ? `<div class="aiload" role="status" aria-live="polite">${brandLoad()}<p><span class="spin dark"></span>${progSpan(S.progK)}</p><small>AI가 만드는 중이라 조금 걸려요. 화면을 닫지 말고 기다려 주세요.</small></div>`
    : "";
let progT = null;
function progTxt(k) {
  const L = PROG[k]();
  return L[Math.min(S.progI || 0, L.length - 1)];
}
function startProg(k) {
  S.progI = 0;
  S.progK = k;
  clearInterval(progT);
  progT = setInterval(() => {
    if (!S.work && !S.stepsWork) {
      clearInterval(progT);
      progT = null;
      return;
    }
    S.progI++;
    document.querySelectorAll(".progtx").forEach(e => (e.textContent = progTxt(S.progK) + "…"));
  }, 3500);
}
const progSpan = k => `<span class="progtx">${progTxt(k)}…</span>`;
// 호출별 설정 — 메뉴 정하기(조합 짜기)만 생각(thinking)을 켜고 길게, 나머지는 생각 끄고 빠르게
// 메뉴 조합: 3안을 한 번에 길게 받지 않고, 안마다 따로 짧게 동시에 요청해요 (생각 끄고, 출력 짧게, 20초 제한)
const LLM_PLAN = { thinking: { type: "disabled" }, max_tokens: 1500, timeoutMs: 20000 };
const LLM_FAST = { thinking: { type: "disabled" } };
