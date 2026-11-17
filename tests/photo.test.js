import test from "node:test";
import assert from "node:assert/strict";
import { bestMatch, kindOf, toHttps, createHandler, resetCache } from "../api/photo.js";

const rows = [
  { name: "제육볶음", url: "https://img/1.png" },
  { name: "돼지고기 김치찌개", url: "https://img/2.png" },
  { name: "닭고기 간장조림", url: "https://img/3.png" },
  { name: "소고기 무국", url: "https://img/4.png" },
  { name: "새우 두부 계란찜", url: "https://img/5.png" },
  { name: "차돌박이 된장찌개", url: "https://img/6.png" },
];

test("이름이 같거나 포함되면 그 사진", () => {
  assert.equal(bestMatch("닭고기 간장조림", rows).url, "https://img/3.png");
  assert.equal(bestMatch("매콤 제육볶음", rows).url, "https://img/1.png");
});

test("요리 종류가 다르면 사진을 안 줘요 (볶음 ↔ 찌개)", () => {
  assert.equal(bestMatch("돼지고기 양파볶음", rows)?.url ?? null, null);
  assert.equal(bestMatch("소고기 대파볶음", rows), null);
});

test("요리 이름이 같고 재료가 겹칠 때만 비슷한 요리 사진", () => {
  assert.equal(bestMatch("차돌 된장찌개", rows).url, "https://img/6.png");
  assert.equal(bestMatch("고등어 된장찌개", rows), null);       // 재료가 안 겹치면 안 줘요
  assert.equal(bestMatch("돼지고기 된장찌개", rows), null);     // 김치찌개 사진을 주면 안 돼요
});

test("요리 종류·https 바꾸기", () => {
  assert.equal(kindOf("김치볶음밥"), "볶음밥");
  assert.equal(kindOf("미역국"), "국");
  assert.equal(toHttps("http://www.foodsafetykorea.go.kr/a.png"), "https://www.foodsafetykorea.go.kr/a.png");
});

const res = () => ({ code: 0, body: null, headers: {}, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; }, setHeader(k, v) { this.headers[k] = v; } });
const fake = (calls) => async (url) => {
  calls.push(url);
  return { ok: true, json: async () => ({ COOKRCP01: { total_count: "2", RESULT: { CODE: "INFO-000" },
    row: [{ RCP_NM: "제육볶음", ATT_FILE_NO_MAIN: "http://www.foodsafetykorea.go.kr/1.png" }, { RCP_NM: "미역국", ATT_FILE_NO_MAIN: "" }] } }) };
};

test("서버 함수: 키는 서버에서만 쓰고, 응답엔 사진 주소만", async () => {
  process.env.FOODSAFETY_API_KEY = "secret-key-123"; resetCache();
  const calls = [], h = createHandler(fake(calls));
  let r = res(); await h({ method: "GET", query: { q: "제육볶음" } }, r);
  assert.equal(r.code, 200);
  assert.equal(r.body.url, "https://www.foodsafetykorea.go.kr/1.png");
  assert.ok(!JSON.stringify(r.body).includes("secret-key-123"));
  r = res(); await h({ method: "GET", query: { q: "닭가슴살 샐러드" } }, r);
  assert.equal(r.body.url, null);
  assert.equal(calls.length, 1);                 // 목록은 한 번만 받아요
});

test("서버 함수: 키가 없거나 API가 안 되면 오류 대신 사진 없음", async () => {
  delete process.env.FOODSAFETY_API_KEY; resetCache();
  let r = res(); await createHandler(fake([]))({ method: "GET", query: { q: "제육볶음" } }, r);
  assert.deepEqual(r.body, { url: null });
  process.env.FOODSAFETY_API_KEY = "k"; resetCache();
  r = res(); await createHandler(async () => { throw new Error("down"); })({ method: "GET", query: { q: "제육볶음" } }, r);
  assert.deepEqual(r.body, { url: null });
  r = res(); await createHandler(fake([]))({ method: "GET", query: { q: "" } }, r);
  assert.equal(r.code, 400);
});
