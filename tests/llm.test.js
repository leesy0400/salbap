import test from "node:test";
import assert from "node:assert/strict";
import { generateKeyPair, exportJWK, SignJWT, createLocalJWKSet } from "jose";
import { createHandler, sanitize } from "../api/llm.js";

process.env.FIREBASE_PROJECT_ID = "salim-test";
process.env.ANTHROPIC_API_KEY = "sk-ant-secret";

const { publicKey, privateKey } = await generateKeyPair("RS256");
const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256" };
const handler = createHandler(createLocalJWKSet({ keys: [jwk] }));
const sign = (aud = "salim-test") => new SignJWT({}).setProtectedHeader({ alg: "RS256", kid: "k1" })
  .setIssuer(`https://securetoken.google.com/${aud}`).setAudience(aud).setSubject("user-1")
  .setIssuedAt().setExpirationTime("1h").sign(privateKey);
const res = () => ({ code: 0, body: null, status(c) { this.code = c; return this; }, json(b) { this.body = b; return this; } });
const body = { model: "claude-haiku-5-5", max_tokens: 99999, system: "s", messages: [{ role: "user", content: "u" }], thinking: { type: "disabled" } };

test("토큰 없음 / 다른 프로젝트 토큰 → 401", async () => {
  let r = res(); await handler({ method: "POST", headers: {}, body }, r); assert.equal(r.code, 401);
  r = res(); await handler({ method: "POST", headers: { authorization: "Bearer " + await sign("other") }, body }, r); assert.equal(r.code, 401);
});

test("허용 안 된 모델·형식은 400", () => {
  assert.ok(sanitize({ ...body, model: "claude-opus-5-5" }).error);
  assert.ok(sanitize({ ...body, messages: [{ role: "assistant", content: "x" }] }).error);
  assert.ok(sanitize({ ...body, system: "x".repeat(40000) }).error);
  assert.equal(sanitize(body).body.max_tokens, 4000);
});

test("정상 요청: 서버가 키를 붙이고, 응답에 키가 없음", async () => {
  let sent;
  global.fetch = async (url, opt) => { sent = opt; return { ok: true, json: async () => ({ content: [{ type: "text", text: "{}" }], usage: {} }) }; };
  const r = res();
  await handler({ method: "POST", headers: { authorization: "Bearer " + await sign() }, body }, r);
  assert.equal(r.code, 200);
  assert.equal(sent.headers["x-api-key"], "sk-ant-secret");
  assert.equal(JSON.parse(sent.body).max_tokens, 4000);
  assert.deepEqual(r.body, { content: [{ type: "text", text: "{}" }] });
});
