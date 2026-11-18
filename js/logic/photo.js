/* ============================================================
   메뉴 AI 그림 — /api/image 주소 받기·기기에 기억·로딩 표시
   ============================================================ */

// 메뉴 AI 이미지 — /api/image가 메뉴 이름으로 그린 음식 그림 주소를 줘요(한 번 그린 건 서버에 저장). 없으면 이모지 그대로.
//   받은 주소는 이 기기에도 기억해 두고(다음엔 서버에 묻지 않음), 새로 그리는 요청은 한 번에 2개까지만 보내요.
const IMG_KEY = "salim_img_v1";
const PHOTO = (() => {
  try {
    return JSON.parse(localStorage.getItem(IMG_KEY) || "{}") || {};
  } catch (e) {
    return {};
  }
})(); // 메뉴명 → 주소 | null(이번엔 없음) | 0(받는 중)
const savePhotos = () => {
  try {
    localStorage.setItem(
      IMG_KEY,
      JSON.stringify(Object.fromEntries(Object.entries(PHOTO).filter(([, u]) => u)))
    );
  } catch (e) {}
};
let imgBusy = 0;
const imgQueue = [];
const photoOn = () => location.protocol.startsWith("http");
const photoImg = u =>
  `<img src="${esc(u)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="photoFail(this)">`;
// 사진을 못 불러오면 이모지로 돌아가고, 다시 그려도 그 사진은 안 써요
function photoFail(img) {
  const el = img.parentNode,
    t = el.dataset.photo;
  PHOTO[t] = null;
  savePhotos();
  el.classList.remove("ph");
  el.innerHTML = recipeIc({ title: t });
}
// 그림을 받는 중(아직 안 물어봤거나 0)이면 로딩 표시, 못 받았으면(null) 이모지
function thumb(r, cls = "th", style = "") {
  const t = String(r.title || ""),
    u = PHOTO[t],
    wait = !u && photoOn() && t && PHOTO[t] !== null;
  return `<div class="${cls}${u ? " ph" : wait ? " ld" : ""}" data-photo="${esc(t)}"${style ? ` style="${style}"` : ""}>${u ? photoImg(u) : wait ? `<span class="spin dark" aria-label="그림 그리는 중"></span>` : recipeIc(r)}</div>`;
}
function setPhoto(el, u) {
  if (el.classList.contains("ph")) return;
  el.classList.remove("ld");
  el.classList.add("ph");
  el.innerHTML = photoImg(u);
}
function fillPhotos() {
  if (!photoOn()) return;
  document.querySelectorAll("[data-photo]").forEach(el => {
    const t = el.dataset.photo;
    if (!t) return;
    if (PHOTO[t]) return setPhoto(el, PHOTO[t]);
    if (t in PHOTO) return;
    PHOTO[t] = 0;
    imgQueue.push(t);
  });
  pumpImages();
}
function pumpImages() {
  while (imgBusy < 2 && imgQueue.length) {
    const t = imgQueue.shift();
    imgBusy++;
    (async () => {
      const headers = { "content-type": "application/json" };
      if (A.user) {
        try {
          headers.authorization = "Bearer " + (await A.user.getIdToken());
        } catch (e) {}
      }
      const r = await fetch("/api/image", { method: "POST", headers, body: JSON.stringify({ name: t }) });
      return r.ok ? r.json() : { url: null };
    })()
      .then(j => {
        PHOTO[t] = (j && j.url) || null;
        if (PHOTO[t]) savePhotos();
      })
      .catch(() => {
        PHOTO[t] = null;
      })
      .then(() =>
        document.querySelectorAll("[data-photo]").forEach(e => {
          if (e.dataset.photo !== t) return;
          if (PHOTO[t]) setPhoto(e, PHOTO[t]);
          else {
            e.classList.remove("ld");
            e.innerHTML = recipeIc({ title: t });
          }
        })
      )
      .finally(() => {
        imgBusy--;
        pumpImages();
      });
  }
}
// 그림이 다 올 때까지 기다려요 (로딩 화면용). 이미지 파일까지 받아 두고, 너무 오래 걸리면 25초에서 끊고 이모지로 보여줘요
function waitPhotos(titles, ms = 25000) {
  titles = [...new Set(titles.map(String).filter(Boolean))];
  if (!photoOn() || !titles.length) return Promise.resolve();
  titles.forEach(t => {
    if (!(t in PHOTO)) {
      PHOTO[t] = 0;
      imgQueue.push(t);
    }
  });
  pumpImages();
  const end = Date.now() + ms;
  return new Promise(ok => {
    const tick = () => {
      if (titles.every(t => PHOTO[t] !== 0) || Date.now() > end) return ok();
      setTimeout(tick, 300);
    };
    tick();
  }).then(() =>
    Promise.all(
      titles
        .filter(t => PHOTO[t])
        .map(
          t =>
            new Promise(ok => {
              const i = new Image();
              i.referrerPolicy = "no-referrer";
              i.onload = i.onerror = ok;
              i.src = PHOTO[t];
              setTimeout(ok, Math.max(0, end - Date.now()));
            })
        )
    )
  );
}
function recipeIc(r) {
  const tt = titleIc(r.title);
  if (tt) return emo(tt.emoji);
  const it =
    ITEMS.find(i => i.name.length >= 2 && mentions(r, i.name)) || ITEMS.find(i => mentions(r, i.name));
  return emo(it ? it.emoji : "🍲");
}
