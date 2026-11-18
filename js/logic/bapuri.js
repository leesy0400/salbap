/* ============================================================
   밥풀이 — 기분 5단계, 기분별 장면(SCENE), 누르면 반응, 장보기 연속 목표
   ============================================================ */

// 밥풀이 기분 — 마지막으로 해 먹은 날부터 며칠 지났는지(날짜 기준)로 5단계
const homeTimes = () =>
  [
    ...cookedList().map(r => r.cookedAt || r.at || 0),
    ...mealList()
      .filter(m => m.type === "home")
      .map(m => m.at || 0),
  ]
    .filter(Boolean)
    .sort((a, b) => a - b);
const dayStart = t => {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
};
function moodOf() {
  const ts = homeTimes();
  if (!ts.length) return "calm";
  const d = Math.round((dayStart(Date.now()) - dayStart(ts[ts.length - 1])) / DAY);
  return d < 1 ? "happy" : d <= 2 ? "calm" : d <= 4 ? "hungry" : d < 7 ? "sad" : "faint";
}
// 기분마다 장면 — 밥풀이(몸)·소품·효과를 따로 놓고 따로 움직여요. 300×220 무대 위 좌표(px)
//   [이름, 왼쪽, 위, 너비, 클래스]  · 이름은 img/bap/이름.webp
const SCENE = {
  happy: {
    pose: ["pose-happy", 65, 46, 170],
    say: "맛있었어!",
    burst: ["heart-l", "heart-m", "heart-s"],
    fx: [
      ["spoon-lines", 48, 52, 26, "blink"],
      ["heart-l", 214, 36, 34, "floatup d0"],
      ["heart-m", 10, 74, 26, "floatup d1"],
      ["heart-s", 232, 96, 20, "floatup d2"],
      ["spark-t", 148, 4, 18, "twinkle d0"],
      ["spark-r", 256, 56, 16, "twinkle d1"],
      ["spark-l", 30, 30, 15, "twinkle d2"],
      ["spark-b", 40, 128, 13, "twinkle d3"],
    ],
  },
  calm: {
    pose: ["pose-calm", 162, 64, 118],
    say: "오늘 뭐 해먹지?",
    burst: ["note"],
    fx: [
      ["fridge", 6, 104, 142, ""],
      ["note", 268, 30, 24, "floatup d1"],
    ],
    think: true,
  },
  hungry: {
    pose: ["pose-hungry", 90, 56, 124],
    say: "배고파…",
    burst: [],
    fx: [
      ["shake-1", 62, 96, 20, "flick d0"],
      ["shake-2", 214, 78, 36, "flick d1"],
      ["growl", 196, 124, 50, "growl"],
      ["sweat", 204, 48, 16, "drip"],
    ],
  },
  sad: {
    pose: ["pose-sad", 34, 72, 188],
    say: "밥 해 줘…",
    burst: ["rain-l"],
    fx: [
      ["cloud-l", 36, 0, 74, "drift"],
      ["cloud-r", 170, 10, 66, "drift d1"],
      ["rain-l", 56, 46, 18, "fall d0"],
      ["rain-r", 194, 52, 16, "fall d1"],
      ["rain-l", 120, 40, 14, "fall d2"],
      ["bowl-over", 230, 158, 60, ""],
    ],
  },
  faint: {
    pose: ["pose-faint", 70, 58, 158],
    say: "…밥…",
    burst: [],
    fx: [
      ["stone", 8, 182, 66, ""],
      ["droop", 210, 40, 30, "sag"],
      ["ghost", 128, 0, 54, "soul"],
    ],
  },
};
const THINK = ["food-rice", "food-veg", "food-jorim", "food-egg"];
const bapL = (n, x, y, w, c = "") =>
  `<img class="L ${c}" src="img/bap/${n}.webp" style="left:${x}px;top:${y}px;width:${w}px" alt="" draggable="false">`;
function moodHero(m = moodOf(), cls = "") {
  const sc = SCENE[m] || SCENE.calm,
    [pn, px, py, pw] = sc.pose;
  return `<div class="stage mood-${m} ${cls}" data-m="${m}" onclick="pokeBap(this)" role="img" aria-label="밥풀이 — 누르면 반응해요">
<i class="shadow" style="left:${px + pw * 0.18}px;width:${pw * 0.64}px"></i>
${sc.fx
  .filter(f => !/floatup|twinkle|fall|soul|drip/.test(f[4]))
  .map(f => bapL(...f))
  .join("")}
<div class="chr" style="left:${px}px;top:${py}px;width:${pw}px;scale:.88"><img class="body" src="img/bap/${pn}.webp" alt="" draggable="false"></div>
${sc.fx
  .filter(f => /floatup|twinkle|fall|soul|drip/.test(f[4]))
  .map(f => bapL(...f))
  .join("")}
${sc.think ? `<div class="think">${THINK.map((n, i) => `<img src="img/bap/${n}.webp" style="--k:${i}" alt="" draggable="false">`).join("")}</div>` : ""}
<b class="say" style="left:${px + pw / 2}px;top:${Math.max(0, py - 30)}px">${sc.say}</b></div>`;
}
// 밥풀이를 누르면 — 장면을 새로 꽂아 움직임을 처음부터 다시 틀고, 기분별 반응을 해요. 몇 번 움직이면 다시 누를 때까지 멈춰 있어요
function pokeBap(el) {
  if (!el) return;
  const n = el.cloneNode(true);
  n.classList.remove("poke");
  n.querySelectorAll(".pop").forEach(x => x.remove());
  el.replaceWith(n);
  el = n;
  void el.offsetWidth;
  el.classList.add("poke");
  clearTimeout(el._pk);
  el._pk = setTimeout(() => el.classList.remove("poke"), 1400);
  const sc = SCENE[el.dataset.m] || {},
    c = el.querySelector(".chr");
  if (!c || !sc.burst || !sc.burst.length) return;
  const cx = c.offsetLeft + c.offsetWidth / 2,
    cy = c.offsetTop + c.offsetHeight * 0.12;
  for (let i = 0; i < 5; i++) {
    const im = document.createElement("img");
    im.className = "L pop";
    im.src = `img/bap/${sc.burst[i % sc.burst.length]}.webp`;
    im.alt = "";
    const w = el.dataset.m === "happy" ? 18 + ((i * 7) % 14) : 16;
    im.style.cssText = `left:${cx - w / 2}px;top:${cy}px;width:${w}px;--dx:${(i - 2) * 34}px;--dy:${-50 - (i % 2) * 24}px;animation-delay:${i * 0.06}s`;
    el.appendChild(im);
    setTimeout(() => im.remove(), 1300);
  }
}

// 장보기 목표 — 장보기마다 그 끼니 수만큼, 다음 장보기를 시작하기 전까지 해 먹으면 달성.
//   못 채우고 다음 장보기를 시작하면 연속 기록이 깨져요.
function streakInfo() {
  const ts = pastTrips()
      .slice()
      .reverse()
      .filter(t => +t.meals > 0),
    times = homeTimes(),
    cur = trip();
  let streak = 0,
    open = null;
  ts.forEach((t, i) => {
    const from = t.at || t.paidAt || 0,
      to = i + 1 < ts.length ? ts[i + 1].at || ts[i + 1].paidAt : cur ? cur.at : Infinity;
    const done = times.filter(x => x >= from && x < to).length,
      goal = +t.meals;
    if (to === Infinity) {
      open = { done, goal };
      if (done >= goal) streak++;
      return;
    }
    if (done >= goal) streak++;
    else streak = 0;
  });
  return { streak, open };
}

const bapImg = (k, cls = "") =>
  `<img class="bap ${cls}" src="img/bapuri-${k}.webp" alt="밥풀이" draggable="false">`;
