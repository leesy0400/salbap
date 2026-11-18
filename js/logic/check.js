/* ============================================================
   입력 검사 — 식재료·조미료 이름인지, 메모 금칙어(banHit), 건강·안전 요청(safetyHit)
   단어 목록은 data/words.js · data/filters.js 에 있어요
   ============================================================ */

function banHit(t) {
  const s = String(t || "").toLowerCase(),
    n = s.replace(/[\s.·,_\-~!@#$%^&*()+=?/|"'`:;<>[\]{}0-9]/g, "");
  if (/(https?:|www\.|\.com|\.kr|\.net)/.test(s) || /01[016789][-\s.]?\d{3,4}[-\s.]?\d{4}/.test(s))
    return "연락처나 링크";
  return BAN_WORDS.find(w => n.includes(w)) || null;
}
const safetyHit = t => {
  const x = String(t || "").replace(/\s/g, "");
  const r = SAFETY_RULES.find(r => r.w.some(w => x.includes(w.replace(/\s/g, ""))));
  return r ? r.m : null;
};

const normWord = t =>
  String(t || "")
    .replace(/\s+/g, "")
    .toLowerCase();
function looksLike(v, dict) {
  const t = normWord(v);
  if (!t || t.length > 14) return false;
  if (/[ㄱ-ㅎㅏ-ㅣ]/.test(t)) return false; // ㅋㅋ, ㅎㅎ 같은 자음·모음만
  if (!/^[가-힣a-z()·\-]+$/.test(t)) return false; // 숫자·특수문자
  if (/(.)\1\1/.test(t)) return false; // 같은 글자 3번 반복
  const ws = dict.map(normWord),
    core = t.replace(
      /^(국산|국내산|수입산|수입|냉동|냉장|생|다진|깐|통|말린|건|유기농|무농약|햇|손질|볶은|구운)+/,
      ""
    );
  if (ws.includes(t) || ws.includes(core)) return true; // 예: 국산콩, 생강 → 앞의 꾸밈말을 떼고 한 글자 재료(콩·무·파)도 찾아요
  return ws.some(w => w.length >= 2 && t.includes(w) && t.length - w.length <= 4);
} // 예: 다진마늘, 국산콩, 냉동새우
const ITEM_WORDS = () => [...WORD_FOOD, ...ITEMS.flatMap(i => [i.name, ...i.alias])];
const isFoodWord = v => looksLike(v, ITEM_WORDS());
const isSeasWord = v => looksLike(v, [...WORD_SEAS, ...SEASONINGS]);
// 못 먹는 재료: 재료·조미료·알레르기 성분 이름이면 통과
const isAvoidWord = v =>
  looksLike(v, [...ITEM_WORDS(), ...WORD_SEAS, ...ALLERGENS.flatMap(a => [a[0], ...a[1]])]);
const inErr = k => (S.inErr && S.inErr.k === k ? `<p class="inerr" role="alert">${S.inErr.m}</p>` : "");
function setInErr(k, m) {
  S.inErr = m ? { k, m } : null;
}
