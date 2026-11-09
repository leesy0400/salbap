// POST /api/llm — 브라우저 대신 서버가 API 키를 붙여 Claude를 부르는 함수
// · 로그인한 사용자(Firebase ID 토큰)만 쓸 수 있어요. 키는 Vercel 환경변수에만 있어요.
// · 허용된 모델·토큰 수·입력 길이만 통과시켜서, 남이 이 주소로 키를 마음대로 쓰지 못하게 막아요.
import { createRemoteJWKSet, jwtVerify } from "jose";

const JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com"),
);
const ALLOWED_MODELS = ["claude-haiku-5-5", "claude-sonnet-5-5"];
const MAX_TOKENS = 4000;
const MAX_CHARS = 30000;                       // system + user 글자 수 상한
const PER_USER_PER_HOUR = Number(process.env.LLM_PER_USER_PER_HOUR || 40);
const hits = new Map();                        // 함수 인스턴스별 간이 횟수 제한 (근본 보호는 Anthropic 콘솔 사용 한도)

export async function verifyUser(token, projectId = process.env.FIREBASE_PROJECT_ID, jwks = JWKS) {
  if (!token || !projectId) return null;
  try {
    const { payload } = await jwtVerify(token, jwks, {
      issuer: `https://securetoken.google.com/${projectId}`,
      audience: projectId,
    });
    return payload.sub || null;
  } catch {
    return null;
  }
}

export function rateLimited(uid, now = Date.now()) {
  const list = (hits.get(uid) || []).filter((t) => now - t < 3600_000);
  if (list.length >= PER_USER_PER_HOUR) { hits.set(uid, list); return true; }
  list.push(now); hits.set(uid, list); return false;
}

export function sanitize(body) {
  const { model, max_tokens, system, messages, thinking } = body || {};
  if (!ALLOWED_MODELS.includes(model)) return { error: "허용되지 않은 모델이에요." };
  if (typeof system !== "string" || !Array.isArray(messages) || messages.length !== 1
      || messages[0].role !== "user" || typeof messages[0].content !== "string") return { error: "요청 형식이 맞지 않아요." };
  if (system.length + messages[0].content.length > MAX_CHARS) return { error: "요청이 너무 길어요." };
  const out = { model, max_tokens: Math.min(Number(max_tokens) || MAX_TOKENS, MAX_TOKENS), system,
                messages: [{ role: "user", content: messages[0].content }] };
  if (thinking?.type === "disabled") out.thinking = { type: "disabled" };
  return { body: out };
}

export function createHandler(jwks = JWKS) {
  return async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST만 돼요." });
  const token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  const uid = await verifyUser(token, process.env.FIREBASE_PROJECT_ID, jwks);
  if (!uid) return res.status(401).json({ error: "로그인이 필요해요." });
  if (rateLimited(uid)) return res.status(429).json({ error: "잠시 후 다시 시도해 주세요. (한 시간 사용 횟수 초과)" });

  const { body, error } = sanitize(typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body);
  if (error) return res.status(400).json({ error });

  try {
    const r = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": process.env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await r.json();
    if (!r.ok) {
      console.error("anthropic", r.status, data?.error?.message);
      return res.status(502).json({ error: "AI 응답을 받지 못했어요." });
    }
    return res.status(200).json({ content: data.content });   // 화면에 필요한 부분만 돌려줘요
  } catch (e) {
    console.error(e);
    return res.status(502).json({ error: "AI 서버에 연결하지 못했어요." });
  }
}
}

export default createHandler();
