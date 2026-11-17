// GET /api/photo?q=메뉴명 — 메뉴 이름과 비슷한 요리의 예시 사진 주소를 돌려줘요
// · 사진 출처: 식품의약품안전처 식품안전나라 "조리식품의 레시피 DB"(COOKRCP01) 공공 API
// · 인증키는 Vercel 환경변수 FOODSAFETY_API_KEY에만 있어요. 브라우저에는 사진 주소만 내려가요.
// · 레시피 목록(약 1,100개)은 함수가 처음 뜰 때 한 번 받아 메모리에 두고, 요청마다 API를 부르지 않아요.
// · 비슷한 요리가 없으면 {url:null} → 화면은 지금처럼 이모지를 보여줘요. 엉뚱한 사진보다 이모지가 나아요.

const API = "openapi.foodsafetykorea.go.kr/api";
const PAGE = 1000;                 // 이 API는 한 번에 최대 1,000개
const MAX_Q = 40;
const DAY = 86400;

// 요리 종류 — 메뉴 이름 끝말이 같아야 같은 요리로 봐요 (볶음밥을 볶음보다 먼저 확인)
const KINDS = ["볶음밥", "덮밥", "비빔밥", "주먹밥", "김밥", "죽", "볶음", "조림", "찌개", "전골", "탕", "국",
  "찜", "구이", "튀김", "전", "무침", "나물", "샐러드", "파스타", "스파게티", "카레", "국수", "면", "수프", "스튜",
  "말이", "부침", "장아찌", "김치", "쌈", "라면", "떡볶이", "피자", "샌드위치", "토스트", "오믈렛", "스테이크"];

export const norm = (s) => String(s || "").replace(/\(.*?\)|\[.*?\]/g, "").replace(/[^가-힣a-zA-Z0-9]/g, "");
export const kindOf = (s) => { const n = norm(s); return KINDS.find((k) => n.endsWith(k)) || KINDS.find((k) => n.includes(k)) || ""; };
const grams = (s) => { const n = norm(s), g = new Set(); for (let i = 0; i < n.length - 1; i++) g.add(n.slice(i, i + 2)); return g; };
export function dice(a, b) {
  const A = grams(a), B = grams(b); if (!A.size || !B.size) return 0;
  let hit = 0; for (const x of A) if (B.has(x)) hit++;
  return (2 * hit) / (A.size + B.size);
}

// 가장 비슷한 요리 하나 — 엉뚱한 사진보다 이모지가 나으니 아주 보수적으로 골라요
//   ① 이름이 같거나 한쪽이 다른 쪽을 품을 때 (예: "매콤 제육볶음" ↔ "제육볶음")
//   ② 마지막 단어(요리 이름)가 똑같고, 앞의 재료 글자가 충분히 겹칠 때 (예: "차돌 된장찌개" ↔ "차돌박이 된장찌개")
//      → "돼지고기 된장찌개"에 "김치찌개" 사진, "고등어 된장찌개"에 "두부 된장찌개" 사진은 안 줘요
const words = (s) => String(s || "").replace(/\(.*?\)|\[.*?\]/g, "").trim().split(/\s+/).map(norm).filter(Boolean);
export function bestMatch(q, rows) {
  const nq = norm(q), wq = words(q);
  if (nq.length < 2) return null;
  let best = null, bestScore = 0;
  for (const r of rows) {
    const nr = norm(r.name); if (!nr || !r.url) continue;
    let score;
    if (nr === nq) score = 2;
    else if (nr.length >= 3 && (nq.includes(nr) || nr.includes(nq))) score = 1.5;
    else {
      const wr = words(r.name);
      if (wq.length < 2 || wr.length < 2 || wq.at(-1) !== wr.at(-1)) continue;
      score = dice(wq.slice(0, -1).join(""), wr.slice(0, -1).join(""));
      if (score < 0.4) continue;
    }
    if (score > bestScore) { best = r; bestScore = score; }
  }
  return best;
}

export const toHttps = (u) => String(u || "").trim().replace(/^http:\/\//i, "https://");

async function fetchPage(key, start, fetchImpl) {
  const path = `${API}/${encodeURIComponent(key)}/COOKRCP01/json/${start}/${start + PAGE - 1}`;
  let lastErr;
  for (const proto of ["https", "http"]) {          // https가 안 되는 날이 있어서 http로 한 번 더
    try {
      const r = await fetchImpl(`${proto}://${path}`);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const j = await r.json(), d = j?.COOKRCP01;
      if (!d || (d.RESULT?.CODE && d.RESULT.CODE !== "INFO-000")) throw new Error(d?.RESULT?.MSG || "응답 형식이 달라요");
      return { total: Number(d.total_count) || 0, rows: (d.row || []).map((x) => ({ name: x.RCP_NM, url: toHttps(x.ATT_FILE_NO_MAIN) })) };
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

let cache = null;                                     // 함수 인스턴스가 살아 있는 동안 재사용
export async function loadRecipes(key = process.env.FOODSAFETY_API_KEY, fetchImpl = fetch) {
  if (!key) throw new Error("사진 API 키가 설정되지 않았어요.");
  if (!cache) {
    cache = (async () => {
      const first = await fetchPage(key, 1, fetchImpl);
      let rows = first.rows;
      for (let s = PAGE + 1; s <= first.total && s <= 5 * PAGE; s += PAGE) rows = rows.concat((await fetchPage(key, s, fetchImpl)).rows);
      return rows.filter((r) => r.name && /^https:\/\//.test(r.url));
    })().catch((e) => { cache = null; throw e; });  // 실패하면 다음 요청 때 다시 받아요
  }
  return cache;
}
export const resetCache = () => { cache = null; };

export function createHandler(fetchImpl = fetch) {
  return async function handler(req, res) {
    if (req.method !== "GET") return res.status(405).json({ error: "GET만 돼요." });
    const q = String(req.query?.q || "").trim();
    if (!q || q.length > MAX_Q) return res.status(400).json({ error: "메뉴 이름을 확인해 주세요." });
    try {
      const m = bestMatch(q, await loadRecipes(process.env.FOODSAFETY_API_KEY, fetchImpl));
      res.setHeader("Cache-Control", `public, s-maxage=${7 * DAY}, max-age=${DAY}`);   // 같은 메뉴는 Vercel이 저장해 둔 답을 써요
      return res.status(200).json(m ? { url: m.url, name: m.name, source: "식품안전나라" } : { url: null });
    } catch {
      return res.status(200).json({ url: null });     // 사진은 없어도 앱은 그대로 써야 하니 오류 대신 '사진 없음'
    }
  };
}

export default createHandler();
