// 화면 코드 파일 구조 검사 — index.html이 부르는 파일이 다 있고, 문법이 맞고,
// 같은 이름을 두 파일에서 또 만들지 않았는지 봐요. (브라우저 없이 빠르게 도는 검사)
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import vm from "node:vm";

const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8");
const scripts = [...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);
const styles = [...html.matchAll(/<link rel="stylesheet" href="(css\/[^"]+)">/g)].map(m => m[1]);

test("index.html이 부르는 파일이 모두 있어요", () => {
  assert.ok(scripts.length > 20, "스크립트 목록을 못 읽었어요");
  for (const f of [...scripts, ...styles]) assert.ok(existsSync(new URL(f, root)), `${f} 없음`);
});

test("불러오는 순서: 데이터 → core → logic → screens → app.js(맨 끝)", () => {
  const rank = f => (f.startsWith("data/") ? 0 : f.startsWith("js/core/") ? 1 : f.startsWith("js/logic/") ? 2 : f.startsWith("js/screens/") ? 3 : 4);
  const ranks = scripts.map(rank);
  assert.deepEqual(ranks, [...ranks].sort((a, b) => a - b));
  assert.equal(scripts[0], "data/prices.js");
  assert.equal(scripts.at(-1), "js/app.js");
});

test("모든 스크립트 문법이 맞고, 같은 이름을 두 번 만들지 않아요", () => {
  const seen = new Map();
  for (const f of scripts) {
    const code = readFileSync(new URL(f, root), "utf8");
    assert.doesNotThrow(() => new vm.Script(code, { filename: f }), `${f} 문법 오류`);
    // 줄 맨 앞의 const/let/function 이름만 봐요 (전역 이름)
    for (const m of code.matchAll(/^(?:const|let|var|function|async function)\s+([A-Za-z_$][\w$]*)/gm)) {
      assert.ok(!seen.has(m[1]), `'${m[1]}' 이름이 ${seen.get(m[1])}와 ${f}에 둘 다 있어요`);
      seen.set(m[1], f);
    }
  }
});

test("가격 데이터는 data/prices.js 에 JSON 그대로 들어 있어요", () => {
  const code = readFileSync(new URL("data/prices.js", root), "utf8");
  const m = code.match(/window\.SHOP_DB = (\{.*\});\s*$/s);
  assert.ok(m, "window.SHOP_DB = {...}; 모양이 아니에요");
  const db = JSON.parse(m[1]);
  assert.ok(Object.keys(db.stores).length >= 25, "구 목록이 비었어요");
  assert.ok(Object.keys(db.prices).length > 100, "가게별 가격이 비었어요");
});

test("API 키가 화면 코드에 들어 있지 않아요", () => {
  for (const f of ["index.html", ...scripts.filter(f => f !== "data/prices.js")]) {
    const code = readFileSync(new URL(f, root), "utf8");
    assert.doesNotMatch(code, /sk-ant-[A-Za-z0-9_-]{10,}/, `${f}에 Claude 키 모양 글자가 있어요`);
    // Firebase 웹 설정(AIza…)은 원래 공개용이라 괜찮아요. 서버 키 이름에 값을 넣었는지만 봐요.
    assert.doesNotMatch(code, /(ANTHROPIC|GEMINI)_API_KEY\s*[:=]\s*["'][^"']+["']/, `${f}에 서버 키 값이 있어요`);
  }
});
