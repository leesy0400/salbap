import test from "node:test";
import assert from "node:assert/strict";
import { createHandler, cleanName, keyOf, findImage, generate, promptOf, resetLimits } from "../api/image.js";

const res = () => ({ code: 0, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });
const req = (name, auth = "Bearer ok") => ({ method: "POST", headers: { authorization: auth }, body: { name } });
const store = () => { const m = new Map(); return {
  m, head: async (p) => { if (!m.has(p)) throw new Error("not found"); return { url: m.get(p) }; },
  put: async (p) => { const u = "https://blob.example/" + p; m.set(p, u); return { url: u }; } }; };
const verify = async (t) => (t === "ok" ? "user-1" : null);

test("메뉴 이름 정리와 저장 이름", () => {
  assert.equal(cleanName("된장찌개!! <script>"), "된장찌개 script");
  assert.equal(keyOf("된장 찌개"), keyOf("된장찌개"));
  assert.notEqual(keyOf("된장찌개"), keyOf("김치찌개"));
  assert.ok(promptOf("된장찌개").includes("plain solid warm off-white background"));
});

test("응답에서 이미지 찾기 (두 가지 형식)", () => {
  const b64 = "A".repeat(200);
  assert.equal(findImage({ steps: [{ type: "model_output", content: [{ type: "image", mime_type: "image/jpeg", data: b64 }] }] }).data, b64);
  assert.equal(findImage({ candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: b64 } }] } }] }).mime, "image/png");
  assert.equal(findImage({ steps: [{ content: [{ type: "text", text: "no" }] }] }), null);
});

test("처음엔 그려서 저장, 다음엔 저장된 주소 (다시 안 그림)", async () => {
  resetLimits(); const s = store(); let calls = 0;
  const h = createHandler({ verify, blobHead: s.head, blobPut: s.put, gen: async () => { calls++; return { bytes: Buffer.from("x"), mime: "image/jpeg" }; } });
  let r = res(); await h(req("된장찌개"), r);
  assert.match(r.body.url, /^https:\/\/blob\.example\/menus\/v1\//);
  r = res(); await h(req("된장 찌개", ""), r);          // 로그인 없어도 저장된 건 줘요
  assert.ok(r.body.cached); assert.equal(calls, 1);
});

test("로그인 안 하면 새로 안 그리고, 실패하면 오류 대신 url:null", async () => {
  resetLimits(); const s = store();
  let r = res(); await createHandler({ verify, blobHead: s.head, blobPut: s.put, gen: async () => { throw new Error("x"); } })(req("계란말이", ""), r);
  assert.deepEqual(r.body, { url: null, reason: "login" });
  r = res(); await createHandler({ verify, blobHead: s.head, blobPut: s.put, gen: async () => { throw new Error("credit"); } })(req("계란말이"), r);
  assert.deepEqual(r.body, { url: null });
  r = res(); await createHandler({ verify })(req("가"), r);
  assert.equal(r.code, 400);
});

test("사람당 시간당 20장까지만 새로 그려요", async () => {
  resetLimits(); const s = store();
  const h = createHandler({ verify, blobHead: s.head, blobPut: s.put, gen: async () => ({ bytes: Buffer.from("x"), mime: "image/jpeg" }) });
  for (let i = 0; i < 20; i++) { const r = res(); await h(req("메뉴" + i), r); assert.ok(r.body.url); }
  const r = res(); await h(req("메뉴스물하나"), r);
  assert.equal(r.body.reason, "limit");
});

test("generate: 키는 헤더로만 보내고 interactions 응답을 읽어요", async () => {
  let sent;
  const fake = async (url, opt) => { sent = { url, opt }; return { ok: true, json: async () => ({ steps: [{ content: [{ type: "image", mime_type: "image/jpeg", data: "B".repeat(200) }] }] }) }; };
  const img = await generate("된장찌개", "secret-key", fake);
  assert.equal(img.mime, "image/jpeg");
  assert.equal(sent.opt.headers["x-goog-api-key"], "secret-key");
  assert.ok(!sent.url.includes("secret-key"));
  assert.equal(JSON.parse(sent.opt.body).model, "gemini-3.1-flash-lite-image");
});
