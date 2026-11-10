// 실사용 테스트 숫자 뽑기 — Firestore의 users/* 기록을 읽어 "모두 합친 숫자"만 출력해요.
// 사람별 숫자·이메일·UID는 출력하지 않아요.
//
// 쓰는 법 (팀 컴퓨터에서):
//   1) Firebase 콘솔 → 프로젝트 설정 → 서비스 계정 → "새 비공개 키 생성"
//      받은 파일을 scripts/service-account.json 으로 저장 (.gitignore 되어 있어 깃허브에 안 올라가요. 절대 공유 금지)
//   2) npm install
//   3) node scripts/test-report.mjs --since 2026-11-11 --exclude 팀원1@gmail.com,팀원2@gmail.com
//      --since   : 이 날짜(포함)부터의 기록만 셈 (테스트 시작일)
//      --until   : 이 날짜(포함)까지 (선택)
//      --exclude : 집계에서 뺄 계정 이메일(팀원·시험용 계정), 쉼표로 구분
//   결과는 화면에 나오고 scripts/test-report-<날짜>.json 으로도 저장돼요(합친 숫자만).
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { SignJWT, importPKCS8 } from "jose";

const DAY = 86400000;
const ymd = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);
const median = a => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

// dbs: 사용자별 DB 객체 배열 (앱이 users/{uid}.db 에 저장하는 것)
export function summarize(dbs, { since = "0000-00-00", until = "9999-99-99" } = {}) {
  const inRange = d => d >= since && d <= until;
  const out = { 계정: dbs.length, 온보딩완료: 0, 장본사람: 0, 방문: {}, 재료: {}, 예산: {}, 메뉴: {}, AI조합: {} };
  const dayCounts = [], wk2 = [], weekRows = [];
  let items = 0, used = 0, tossed = 0, cooked = 0, plans = 0;
  const combo = { first: 0, pass1: 0, retry: 0, pass2: 0, err: 0, why: {} };
  for (const db of dbs) {
    if (!db || !db.onboarded) continue;
    out.온보딩완료++;
    const days = [...new Set((db.stats?.days || []).filter(inRange))].sort();
    if (days.length) {
      dayCounts.push(days.length);
      const first = new Date(days[0]).getTime();
      wk2.push(days.some(d => new Date(d).getTime() - first >= 7 * DAY));
    }
    const buys = (db.purchases || []).filter(x => inRange(ymd(x.at)));
    if (buys.length) out.장본사람++;
    const food = buys.filter(x => x.kind !== "seas" && x.fate !== "rebought");
    items += food.length; used += food.filter(x => x.fate === "used").length; tossed += food.filter(x => x.fate === "tossed").length;
    const byWeek = {};
    buys.forEach(x => { byWeek[x.week] = (byWeek[x.week] || 0) + (+x.price || 0); });
    for (const [k, spent] of Object.entries(byWeek)) { const b = db.weeks?.[k]?.budget; if (b > 0) weekRows.push(spent <= b); }
    cooked += (db.recipes || []).filter(r => r.cooked && inRange(ymd(r.cookedAt || r.at || 0))).length;
    if (db.plan && inRange(ymd(db.plan.at || 0))) plans++;
    const c = db.stats?.combo || {};
    for (const k of ["first", "pass1", "retry", "pass2", "err"]) combo[k] += c[k] || 0;
    for (const [w, n] of Object.entries(c.why || {})) combo.why[w] = (combo.why[w] || 0) + n;
  }
  out.방문 = { 방문기록있는사람: dayCounts.length, 앱연날수_중앙값: median(dayCounts), 일주일뒤에도연사람: wk2.filter(Boolean).length, 일주일뒤재방문률_퍼센트: pct(wk2.filter(Boolean).length, wk2.length) };
  out.재료 = { 산재료수_조미료제외: items, 다씀: used, 버림: tossed, 남음: items - used - tossed, 다쓴비율_퍼센트: pct(used, items), 버린비율_퍼센트: pct(tossed, items) };
  out.예산 = { 장본주수: weekRows.length, 예산안에서장본주: weekRows.filter(Boolean).length, 예산지킨비율_퍼센트: pct(weekRows.filter(Boolean).length, weekRows.length) };
  out.메뉴 = { 장볼목록확정한사람: plans, 해먹은메뉴수: cooked };
  out.AI조합 = { 첫요청수: combo.first, 첫요청통과: combo.pass1, 첫요청통과율_퍼센트: pct(combo.pass1, combo.first), 다시요청수: combo.retry, 다시요청통과: combo.pass2,
    연결형식오류: combo.err, 실패종류: Object.fromEntries(Object.entries(combo.why).sort((a, b) => b[1] - a[1])) };
  return out;
}

// ── Firestore에서 읽기 (서비스 계정 키로 Google 토큰을 받아 REST로 읽어요) ──
async function token(sa) {
  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({ scope: "https://www.googleapis.com/auth/cloud-platform" })
    .setProtectedHeader({ alg: "RS256", kid: sa.private_key_id }).setIssuer(sa.client_email).setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now).setExpirationTime(now + 3600).sign(await importPKCS8(sa.private_key, "RS256"));
  const r = await fetch("https://oauth2.googleapis.com/token", { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }) });
  if (!r.ok) throw new Error(`토큰 발급 실패 ${r.status}: ${await r.text()}`);
  return (await r.json()).access_token;
}
async function excludedUids(project, tk, emails) {
  if (!emails.length) return new Set();
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/projects/${project}/accounts:lookup`, { method: "POST",
    headers: { authorization: `Bearer ${tk}`, "content-type": "application/json" }, body: JSON.stringify({ email: emails }) });
  if (!r.ok) throw new Error(`계정 조회 실패 ${r.status}: ${await r.text()}`);
  const users = (await r.json()).users || [];
  if (users.length < emails.length) console.warn(`주의: 뺄 계정 ${emails.length}개 중 ${users.length}개만 찾았어요. 이메일을 확인해 주세요.`);
  return new Set(users.map(u => u.localId));
}
async function readUsers(project, tk) {
  const docs = []; let page = "";
  do {
    const u = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents/users?pageSize=300${page ? `&pageToken=${page}` : ""}`;
    const r = await fetch(u, { headers: { authorization: `Bearer ${tk}` } });
    if (!r.ok) throw new Error(`Firestore 읽기 실패 ${r.status}: ${await r.text()}`);
    const j = await r.json();
    for (const d of j.documents || []) docs.push({ uid: d.name.split("/").pop(), raw: d.fields?.db?.stringValue });
    page = j.nextPageToken || "";
  } while (page);
  return docs;
}

async function main() {
  const arg = k => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : undefined; };
  const sa = JSON.parse(await readFile(new URL("./service-account.json", import.meta.url), "utf8"));
  const tk = await token(sa);
  const skip = await excludedUids(sa.project_id, tk, (arg("exclude") || "").split(",").map(s => s.trim()).filter(Boolean));
  const docs = (await readUsers(sa.project_id, tk)).filter(d => !skip.has(d.uid));
  const dbs = docs.map(d => { try { return JSON.parse(d.raw || "null"); } catch { return null; } });
  const rep = { 만든날: new Date().toISOString(), 기간: { since: arg("since") || "처음부터", until: arg("until") || "지금까지" }, 뺀계정수: skip.size,
    ...summarize(dbs, { since: arg("since"), until: arg("until") }) };
  console.log(JSON.stringify(rep, null, 2));
  const f = new URL(`./test-report-${ymd(Date.now())}.json`, import.meta.url);
  await writeFile(f, JSON.stringify(rep, null, 2));
  console.log(`\n저장했어요: ${fileURLToPath(f)}`);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch(e => { console.error(e.message); process.exit(1); });
