import { test } from "node:test";
import assert from "node:assert/strict";
import { summarize } from "../scripts/test-report.mjs";

const at = s => new Date(s + "T12:00:00").getTime();
const u1 = { onboarded: true,
  stats: { days: ["2026-11-11", "2026-11-12", "2026-11-19"], combo: { first: 3, pass1: 2, retry: 1, pass2: 1, why: { "끼니 수": 1 } } },
  purchases: [
    { at: at("2026-11-11"), week: "2026-11-09", price: 3000, kind: "item", fate: "used" },
    { at: at("2026-11-11"), week: "2026-11-09", price: 2000, kind: "item", fate: "tossed" },
    { at: at("2026-11-11"), week: "2026-11-09", price: 1000, kind: "seas" },
    { at: at("2026-11-18"), week: "2026-11-16", price: 9000, kind: "item" } ],
  weeks: { "2026-11-09": { budget: 10000 }, "2026-11-16": { budget: 5000 } },
  recipes: [{ cooked: true, cookedAt: at("2026-11-12") }, { cooked: false }],
  plan: { at: at("2026-11-11") } };
const u2 = { onboarded: true, stats: { days: ["2026-11-11"], combo: { first: 3, pass1: 3, err: 0 } }, purchases: [], weeks: {}, recipes: [] };
const old = { onboarded: true, stats: { days: ["2026-10-01"] }, purchases: [{ at: at("2026-10-01"), week: "2026-09-29", price: 1, kind: "item", fate: "used" }] };

test("모두 합친 숫자만 계산", () => {
  const r = summarize([u1, u2, old, { onboarded: false }, null], { since: "2026-11-11" });
  assert.equal(r.계정, 5);
  assert.equal(r.온보딩완료, 3);
  assert.equal(r.장본사람, 1);
  assert.deepEqual(r.방문, { 방문기록있는사람: 2, 앱연날수_중앙값: 2, 다른날다시연사람: 1, 재방문률_퍼센트: 50, 사흘이상연사람: 1 });
  assert.equal(r.재료.산재료수_조미료제외, 3);
  assert.equal(r.재료.다쓴비율_퍼센트, 33.3);
  assert.equal(r.예산.장본주수, 2);
  assert.equal(r.예산.예산지킨비율_퍼센트, 50);
  assert.equal(r.메뉴.해먹은메뉴수, 1);
  assert.equal(r.AI조합.첫요청통과율_퍼센트, 83.3);
  assert.deepEqual(r.AI조합.실패종류, { "끼니 수": 1 });
});
