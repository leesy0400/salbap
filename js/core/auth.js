/* ============================================================
   로그인·서버 저장 — Firebase Auth + Firestore users/{uid}
   ============================================================ */

/* ============================================================
   로그인 · 서버 저장 (Firebase Auth + Firestore)
   · 로그인하면 users/{uid} 문서 하나에 DB 전체를 저장해요 (이 기기에도 그대로 남겨둬요)
   · 로그인할 때 서버에 기록이 있으면 서버 것을 불러오고, 없으면 이 기기 기록을 계정으로 올려요
   · 로그아웃하면 이 기기에 남은 기록을 지워요 (같은 기기를 다른 사람이 써도 안 보이게)
   ============================================================ */
const A = { ready: !FIREBASE_CONFIG, user: null, err: "", syncErr: "", busy: false };
const authOn = () => !!FIREBASE_CONFIG;
function loadScript(src) {
  return new Promise((ok, no) => {
    const t = document.createElement("script");
    t.src = src;
    t.onload = ok;
    t.onerror = () => no(new Error("로그인 모듈을 불러오지 못했어요. 인터넷 연결을 확인해 주세요."));
    document.head.appendChild(t);
  });
}
async function initAuth() {
  if (!authOn()) return;
  try {
    if (!window.firebase)
      for (const m of ["app", "auth", "firestore"])
        await loadScript(`https://www.gstatic.com/firebasejs/${FB_VER}/firebase-${m}-compat.js`);
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    firebase.auth().onAuthStateChanged(async u => {
      A.user = u;
      A.ready = true;
      if (u) {
        await pullRemote();
        markVisit();
        if (S.view === "login") {
          S.view = "app";
          if (!DB.onboarded) S.step = Math.max(1, S.step);
          else S.tab = "home";
        }
      }
      render();
    });
  } catch (e) {
    A.err = e.message;
    A.ready = true;
    render();
  }
}
const userDoc = () => firebase.firestore().collection("users").doc(A.user.uid);
let pushT = null;
function pushRemote() {
  if (!A.user) return;
  clearTimeout(pushT);
  pushT = setTimeout(async () => {
    try {
      await userDoc().set({ db: JSON.stringify(DB), updatedAt: Date.now() });
      A.syncErr = "";
    } catch (e) {
      A.syncErr = "서버에 저장하지 못했어요. 이 기기에는 저장돼 있어요.";
    }
  }, 800);
} // 연달아 저장할 땐 0.8초 모아서 한 번만
async function pullRemote() {
  try {
    const d = await userDoc().get(),
      raw = d.exists && d.data().db,
      lc = DB.consent;
    if (raw) {
      DB = { ...EMPTY(), ...JSON.parse(raw) };
      if (lc && (!DB.consent || (lc.at || 0) > (DB.consent.at || 0))) {
        DB.consent = lc;
        pushRemote();
      }
      /* 방금 한 동의가 더 최신이면 계정에 반영 */ try {
        localStorage.setItem(KEY, JSON.stringify(DB));
      } catch (e) {}
    } else if (DB.onboarded) pushRemote(); // 서버가 비어 있으면 로그인 전 이 기기 기록을 계정으로 옮겨요
    A.syncErr = "";
  } catch (e) {
    A.syncErr = "계정 기록을 불러오지 못했어요. 잠시 후 다시 열어주세요.";
  }
}
// 로그인 오류 → 한국어 안내
function authMsg(e) {
  const m = {
    "auth/invalid-email": "이메일 형식이 맞지 않아요.",
    "auth/user-not-found": "이메일 또는 비밀번호가 맞지 않아요.",
    "auth/wrong-password": "이메일 또는 비밀번호가 맞지 않아요.",
    "auth/invalid-credential": "이메일 또는 비밀번호가 맞지 않아요.",
    "auth/email-already-in-use": "이미 가입된 이메일이에요. 로그인해 주세요.",
    "auth/weak-password": "비밀번호는 6자 이상이어야 해요.",
    "auth/too-many-requests": "시도가 너무 많아요. 잠시 후 다시 해주세요.",
    "auth/popup-closed-by-user": "로그인 창이 닫혔어요.",
    "auth/network-request-failed": "인터넷 연결을 확인해 주세요.",
    "auth/unauthorized-domain": "이 주소는 로그인이 허용되지 않았어요. (Firebase 승인 도메인에 추가 필요)",
    "auth/operation-not-allowed": "이 로그인 방식이 꺼져 있어요. (Firebase 콘솔에서 사용 설정 필요)",
    "auth/requires-recent-login": "보안을 위해 다시 로그인한 뒤 시도해 주세요.",
  };
  return m[e && e.code] || `로그인하지 못했어요. (${esc((e && e.message) || "오류")})`;
}
function openLogin() {
  S.view = "login";
  S.lerr = "";
  S.sheet = null;
  render();
  scrollTo(0, 0);
}
async function loginGoogle() {
  if (A.busy) return;
  A.busy = true;
  S.lerr = "";
  render();
  const pv = new firebase.auth.GoogleAuthProvider();
  try {
    await firebase.auth().signInWithPopup(pv);
  } catch (e) {
    if (
      [
        "auth/popup-blocked",
        "auth/operation-not-supported-in-this-environment",
        "auth/cancelled-popup-request",
      ].includes(e.code)
    ) {
      try {
        await firebase.auth().signInWithRedirect(pv);
        return;
      } catch (e2) {
        S.lerr = authMsg(e2);
      }
    } else S.lerr = authMsg(e);
  }
  A.busy = false;
  render();
}
async function loginEmail() {
  if (A.busy) return;
  const em = ($("#lEmail")?.value || "").trim(),
    pw = $("#lPw")?.value || "";
  S.lemail = em;
  if (!em || !pw) {
    S.lerr = "이메일과 비밀번호를 입력해 주세요.";
    return render();
  }
  A.busy = true;
  S.lerr = "";
  render();
  try {
    if (S.lmode === "signup") await firebase.auth().createUserWithEmailAndPassword(em, pw);
    else await firebase.auth().signInWithEmailAndPassword(em, pw);
  } catch (e) {
    S.lerr = authMsg(e);
  }
  A.busy = false;
  render();
}
async function resetPw() {
  const em = ($("#lEmail")?.value || "").trim();
  if (!em) {
    S.lerr = "비밀번호를 재설정할 이메일을 먼저 입력해 주세요.";
    return render();
  }
  try {
    await firebase.auth().sendPasswordResetEmail(em);
    toast("비밀번호 재설정 메일을 보냈어요");
  } catch (e) {
    S.lerr = authMsg(e);
    render();
  }
}
function skipLogin() {
  S.view = "app";
  if (!DB.onboarded) S.step = Math.max(1, S.step);
  render();
  scrollTo(0, 0);
}
// 로그아웃: 이 기기에 남은 기록도 지워요 (계정에는 그대로 있어요)
async function logout() {
  try {
    await firebase.auth().signOut();
  } catch (e) {}
  clearTimeout(pushT);
  try {
    localStorage.removeItem(KEY);
  } catch (e) {}
  DB = EMPTY();
  Object.assign(S, { step: 0, p: null, view: "app", tab: "home", sheet: null, agree: false });
  render();
  scrollTo(0, 0);
  toast("로그아웃했어요");
}
// 회원 탈퇴: 서버 기록 → 계정 → 이 기기 기록 순서로 지워요
async function deleteAccount() {
  if (!A.user) return;
  A.busy = true;
  render();
  try {
    await userDoc().delete();
    await A.user.delete();
    clearTimeout(pushT);
    try {
      localStorage.removeItem(KEY);
    } catch (e) {}
    DB = EMPTY();
    Object.assign(S, { step: 0, p: null, view: "app", tab: "home", sheet: null, agree: false });
    toast("탈퇴했어요. 모든 기록을 지웠어요");
  } catch (e) {
    S.sheet = null;
    toast(authMsg(e));
  }
  A.busy = false;
  render();
}
