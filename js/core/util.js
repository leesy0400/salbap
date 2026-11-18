/* ============================================================
   공통 도구 — $()·esc()·won()·toast(), 라인 아이콘 ic(), 이모지 emo(), 로고
   ============================================================ */

const $ = s => document.querySelector(s),
  won = n => Math.round(n).toLocaleString() + "원";
const esc = s =>
  String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const q = s => esc(String(s).replace(/\\/g, "\\\\").replace(/'/g, "\\'")); // onclick="fn('여기')" 안에 넣을 글자
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const DAY = 86400000;
function toast(msg) {
  const t = document.createElement("div");
  t.className = "toast";
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 2200);
}
const keep = () => {
  const y = scrollY;
  render();
  scrollTo(0, y);
}; // 스크롤 위치 유지하며 다시 그리기

/* ============================================================
   아이콘 — 기능(메뉴·버튼)은 초록 라인 아이콘(SVG), 음식·재료는 이모지
   ic("이름") = 라인 아이콘, emo("🥚") = 이모지. 크기는 글자 크기를 따라가요.
   ============================================================ */
const ICONS = {
  // 화면·메뉴
  home: "M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z",
  basket:
    "M3.5 9.5h17l-1.6 8.8a1.6 1.6 0 0 1-1.6 1.3H6.7a1.6 1.6 0 0 1-1.6-1.3z M8 9.5l3-5 M16 9.5l-3-5 M9 13v3.5 M12 13v3.5 M15 13v3.5",
  fridge: "M8 3h8a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z M6 10h12 M9 6v2 M9 13v3",
  pot: "M4 11h16v1.5a6.5 6.5 0 0 1-6.5 6.5h-3A6.5 6.5 0 0 1 4 12.5z M2 11h2 M20 11h2 M9.5 8c0-1.5 1-1.5 1-3 M13.5 8c0-1.5 1-1.5 1-3",
  chart: "M3.5 20h17 M6.5 16.5v-5 M10.5 16.5V7 M14.5 16.5v-7 M18.5 16.5V5",
  sliders:
    "M4 7h8.5 M19.5 7H20 M4 17h.5 M11.5 17H20 M16 4.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z M8 14.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z",
  pin: "M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z M12 7.5a2.5 2.5 0 1 1 0 5a2.5 2.5 0 1 1 0-5z",
  map: "M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z M9 4v13.5 M15 6.5V20",
  clock: "M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17z M12 7.5V12l3 2",
  user: "M12 4a3.5 3.5 0 1 1 0 7a3.5 3.5 0 1 1 0-7z M5 20c.8-3.5 3.6-5.5 7-5.5s6.2 2 7 5.5",
  users:
    "M9 5a3 3 0 1 1 0 6a3 3 0 1 1 0-6z M3.5 19c.6-3 2.8-4.8 5.5-4.8s4.9 1.8 5.5 4.8 M16 5.5a2.6 2.6 0 0 1 0 5.2 M17 14.3c2 .4 3.3 2 3.7 4.7",
  calendar: "M5 6h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1z M4 10h16 M8 4v4 M16 4v4",
  wallet:
    "M4 7.5A1.5 1.5 0 0 1 5.5 6H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5.5A1.5 1.5 0 0 1 4 18.5z M4 7.5l11-3V6 M15.5 12h4.5v3.5h-4.5a1.75 1.75 0 0 1 0-3.5z",
  ban: "M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 1 1 0-17z M6 6l12 12",
  heart: "M12 20s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.2a4.3 4.3 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z",
  refresh: "M19.5 12a7.5 7.5 0 1 1-2.2-5.3 M19.5 4.5v4h-4",
  bulb: "M9.5 17.5h5 M10.5 20.5h3 M12 3.5a6 6 0 0 0-3.5 10.9c.4.3.5.7.5 1.1v1h5v-1c0-.4.2-.8.5-1.1A6 6 0 0 0 12 3.5z",
  market:
    "M3 9 5 4h14l2 5 M9.5 4 9 9 M14.5 4l.5 5 M3 9c0 1.7 1.3 2.5 3 2.5S9 10.7 9 9c0 1.7 1.3 2.5 3 2.5S15 10.7 15 9c0 1.7 1.3 2.5 3 2.5S21 10.7 21 9 M5 11.5V20h14v-8.5 M9 20v-4.5h6V20",
  store:
    "M4 9.5 5.5 4h13L20 9.5 M4 9.5a2.7 2.7 0 0 0 5.3 0a2.7 2.7 0 0 0 5.4 0a2.7 2.7 0 0 0 5.3 0 M5.5 12v8h13v-8 M10 20v-5h4v5",
  cart: "M3 4h2.5l2 11h10.5l2-8H6.3 M9 18.2a1.3 1.3 0 1 1 0 2.6a1.3 1.3 0 1 1 0-2.6z M17 18.2a1.3 1.3 0 1 1 0 2.6a1.3 1.3 0 1 1 0-2.6z",
  moneybag:
    "M9 3.5h6l-1.6 3.2h-2.8z M10.6 6.7C6.4 8.6 4.5 12.4 4.5 15.2c0 3.6 3 5.3 7.5 5.3s7.5-1.7 7.5-5.3c0-2.8-1.9-6.6-6.1-8.5 M9.3 12l1.2 4.2 1.5-3.2 1.5 3.2 1.2-4.2 M8.8 14.4h6.4",
  back: "M15 5l-7 7 7 7",
  right: "M9 5l7 7-7 7",
  down: "M5 9l7 7 7-7",
  up: "M5 15l7-7 7 7",
  check: "M5 12.5l4.5 4.5L19 7.5",
  plus: "M12 5v14 M5 12h14",
  x: "M6 6l12 12 M18 6 6 18",
};
const emo = e => `<span class="emo">${e}</span>`;
const ic = (n, cls = "") =>
  `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true"><path d="${ICONS[n] || ""}"/></svg>`;
// 브랜드 로고 — 새싹 두 잎 (크기는 px)
// 브랜드 심볼 — 지붕+밥그릇 (아이콘 칸 없이 그대로 써요)
const mark = (s = 28) => symbol(s);
// 앱 심볼 — 집 지붕(브라운 선) + 밥그릇(세이지 반원)
const symbol = (s = 60) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 64 64" aria-hidden="true"><path d="M15 27 32 14l17 13" fill="none" stroke="var(--brown)" stroke-width="3.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M13 33h38a19 19 0 0 1-38 0z" fill="var(--sage)"/></svg>`;
const leaf = (s = 22) =>
  `<svg width="${s}" height="${s}" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20C4 10 11 4 21 4c-.5 10-7.5 16-18 16z" fill="#7e9870"/><path d="M5 18c4-4 8-7.5 13-11" stroke="#fffefa" stroke-opacity=".6" stroke-width="1.2" fill="none" stroke-linecap="round"/></svg>`;
const logo = (s = 28, f = 26) =>
  `<span class="brandrow">${mark(s)}<span class="word" style="font-size:${f}px">살림밥상</span></span>`;
