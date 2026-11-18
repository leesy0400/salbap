// POST /api/image {name} — 메뉴 이름으로 AI 음식 이미지를 돌려줘요 ({url} | {url:null})
// · 한 번 그린 메뉴는 Vercel Blob에 저장해 두고 다음부터는 저장된 주소만 줘요 → 같은 메뉴는 두 번 돈이 안 나가요
// · 새로 그리는 건 로그인한 사용자만, 사람당 시간당·전체 하루 장 수를 제한해요
// · 키(GEMINI_API_KEY, BLOB_READ_WRITE_TOKEN)는 Vercel 환경변수에만 있어요. 브라우저엔 이미지 주소만 가요
// · 크레딧이 떨어지거나 오류가 나면 {url:null} → 화면은 이모지를 보여줘요
import { createHash } from "node:crypto";
import { head, put } from "@vercel/blob";
import { verifyUser } from "./llm.js";

export const MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-lite-image";
const PER_USER_PER_HOUR = Number(process.env.IMAGE_PER_USER_PER_HOUR || 20);
const PER_DAY = Number(process.env.IMAGE_PER_DAY || 100);
const MAX_NAME = 30;

// 메뉴 이름 정리 — 글자·숫자·공백만, 30자까지 (프롬프트에 엉뚱한 지시가 섞이지 않게)
export const cleanName = (s) => String(s || "").replace(/[^가-힣a-zA-Z0-9 ]/g, " ").replace(/\s+/g, " ").trim().slice(0, MAX_NAME);
// 저장 이름 — 띄어쓰기만 다른 메뉴("된장 찌개" / "된장찌개")는 같은 그림을 써요
export const keyOf = (name) => `menus/v1/${createHash("sha1").update(cleanName(name).replace(/\s/g, "")).digest("hex").slice(0, 20)}.jpg`;

export const promptOf = (name) =>
  `A single dish of Korean home-cooked ${name} in a simple bowl or plate, centered, seen from a 45-degree angle, ` +
  "isolated on a plain solid warm off-white background (#F3EEE6), no table, no side dishes, no rice, no utensils, no props, " +
  "soft natural light, appetizing realistic food photography, square image, no text, no hands";

// 응답에서 base64 이미지 찾기 — interactions(steps[].content[]) / generateContent(candidates[].content.parts[].inlineData) 둘 다
export function findImage(j) {
  const seen = new Set(), stack = [j];
  while (stack.length) {
    const v = stack.pop();
    if (!v || typeof v !== "object" || seen.has(v)) continue; seen.add(v);
    const mime = v.mime_type || v.mimeType || "";
    if (typeof v.data === "string" && v.data.length > 100 && (/^image\//.test(mime) || v.type === "image")) return { data: v.data, mime: mime || "image/jpeg" };
    for (const x of Object.values(v)) if (x && typeof x === "object") stack.push(x);
  }
  return null;
}

export async function generate(name, key = process.env.GEMINI_API_KEY, fetchImpl = fetch) {
  if (!key) throw new Error("no key");
  const r = await fetchImpl("https://generativelanguage.googleapis.com/v1beta/interactions", {
    method: "POST",
    headers: { "x-goog-api-key": key, "content-type": "application/json" },
    body: JSON.stringify({ model: MODEL, input: promptOf(name),
      response_format: { type: "image", mime_type: "image/jpeg", aspect_ratio: "1:1", image_size: "1K" } }),
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const img = findImage(await r.json());
  if (!img) throw new Error("no image");
  return { bytes: Buffer.from(img.data, "base64"), mime: img.mime };
}

const userHits = new Map();
let day = "", dayCount = 0;
export const resetLimits = () => { userHits.clear(); day = ""; dayCount = 0; };
function allow(uid, now = Date.now()) {
  const d = new Date(now + 9 * 3600_000).toISOString().slice(0, 10);   // 한국 날짜 기준
  if (d !== day) { day = d; dayCount = 0; }
  if (dayCount >= PER_DAY) return false;
  const list = (userHits.get(uid) || []).filter((t) => now - t < 3600_000);
  if (list.length >= PER_USER_PER_HOUR) { userHits.set(uid, list); return false; }
  list.push(now); userHits.set(uid, list); dayCount++;
  return true;
}

const pending = new Map();   // 같은 메뉴를 동시에 여러 번 그리지 않게
export function createHandler({ verify = (t) => verifyUser(t), blobHead = head, blobPut = put, gen = (n) => generate(n) } = {}) {
  return async function handler(req, res) {
    if (req.method !== "POST") return res.status(405).json({ error: "POST만 돼요." });
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const name = cleanName(body.name);
    if (name.length < 2) return res.status(400).json({ error: "메뉴 이름을 확인해 주세요." });
    const path = keyOf(name);
    try {
      try { const h = await blobHead(path); if (h?.url) return res.status(200).json({ url: h.url, cached: true }); } catch { /* 없음 → 새로 그려요 */ }
      const token = String(req.headers?.authorization || "").replace(/^Bearer\s+/i, "");
      const uid = await verify(token);
      if (!uid) return res.status(200).json({ url: null, reason: "login" });
      if (pending.has(path)) return res.status(200).json({ url: await pending.get(path) });
      if (!allow(uid)) return res.status(200).json({ url: null, reason: "limit" });
      const job = (async () => {
        const img = await gen(name);
        const saved = await blobPut(path, img.bytes, { access: "public", contentType: img.mime, addRandomSuffix: false, allowOverwrite: true });
        return saved.url;
      })();
      pending.set(path, job);
      try { return res.status(200).json({ url: await job }); } finally { pending.delete(path); }
    } catch {
      return res.status(200).json({ url: null });   // 크레딧 소진·장애 때도 앱은 이모지로 그대로
    }
  };
}

export default createHandler();
