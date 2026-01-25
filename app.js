const API_URL = "https://script.google.com/macros/s/AKfycbyV-OzrTQaacZFecMWOubZp3TsXZgcZ41MJDMMDlVgMS61LtqyNPO7--0b19wSiFSBSjg/exec";
const LS_KEY = "bplions_auth_v1";

const el = (id) => document.getElementById(id);

const screens = {
  login: el("screenLogin"),
  home: el("screenHome"),
  members: el("screenMembers"),
  announcements: el("screenAnnouncements"),
  text: el("screenText"),
};

const btnBack = el("btnBack");
const btnLogout = el("btnLogout");

let state = {
  me: null,
  settings: null,
  members: [],
  announcements: [],
  navStack: ["login"],
};

function normalizePhone(p) {
  return String(p || "").replace(/[^0-9]/g, "");
}

function toast(msg) {
  const t = el("toast");
  if (!t) return;
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => (t.hidden = true), 1500);
}

function showScreen(name) {
  Object.entries(screens).forEach(([k, node]) => {
    if (!node) return;
    const isTarget = k === name;
    node.style.display = isTarget ? "" : "none"; // ✅ 겹침 방지
    node.hidden = !isTarget;                     // ✅ hidden도 같이 유지
  });

  const isLoggedIn = !!state.me;
  if (btnLogout) btnLogout.hidden = !isLoggedIn || name === "login";
  if (btnBack) btnBack.hidden = state.navStack.length <= 1 || name === "home" || name === "login";
}

function pushNav(name) {
  state.navStack.push(name);
  showScreen(name);
  window.scrollTo(0, 0);
}

function popNav() {
  if (state.navStack.length > 1) state.navStack.pop();
  showScreen(state.navStack.at(-1));
  window.scrollTo(0, 0);
}

btnBack?.addEventListener("click", () => popNav());
btnLogout?.addEventListener("click", () => {
  localStorage.removeItem(LS_KEY);
  state = { me: null, settings: null, members: [], announcements: [], navStack: ["login"] };
  showScreen("login");
  toast("로그아웃");
});

// ===== API (JSONP: doGet + callback) =====
function apiJsonp(paramsObj) {
  return new Promise((resolve, reject) => {
    const cbName = "__cb_" + Math.random().toString(36).slice(2);
    const params = new URLSearchParams();

    Object.entries(paramsObj || {}).forEach(([k, v]) => {
      params.set(k, String(v ?? ""));
    });

    params.set("callback", cbName);
    params.set("_", String(Date.now()));

    const url = API_URL + "?" + params.toString();

    let done = false;
    const script = document.createElement("script");

    function cleanup() {
      if (script.parentNode) script.parentNode.removeChild(script);
      try { delete window[cbName]; } catch {}
    }

    window[cbName] = (data) => {
      if (done) return;
      done = true;
      cleanup();
      resolve(data);
    };

    script.onerror = () => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("JSONP_LOAD_FAILED"));
    };

    script.src = url;
    document.body.appendChild(script);

    setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("JSONP_TIMEOUT"));
    }, 12000);
  });
}

function setBrand(settings) {
  if (el("districtText")) el("districtText").textContent = settings?.district || "국제라이온스협회 356-E지구";
  if (el("clubNameText")) el("clubNameText").textContent = settings?.clubName || "북포항라이온스클럽";
  if (el("coverTitle")) el("coverTitle").textContent = settings?.clubName || "북포항라이온스클럽";
  if (el("coverSub")) el("coverSub").textContent = settings?.district || "국제라이온스협회 356-E지구";

  // ✅ 너의 index.html에는 clubLogoBig가 원래 없음
  // 상단 로고만 고정 사용(logoUrl 있으면 그걸로, 없으면 ./logo.png)
  const s = el("clubLogoSmall");
  if (!s) return;
  const logoUrl = (settings?.logoUrl || "").trim();
  s.src = logoUrl ? logoUrl : "./logo.png";
  s.style.visibility = "visible";
}

function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function downloadVCard(m) {
  const vcf = `BEGIN:VCARD
VERSION:3.0
FN:${m.name || ""}
TEL;TYPE=CELL:${m.phone || ""}
ORG:${state.settings?.clubName || "북포항라이온스클럽"}
END:VCARD`;
  const blob = new Blob([vcf], { type: "text/vcard;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${m.name || "contact"}.vcf`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderMembers(list) {
  const pill = el("memberCountPill");
  if (pill) pill.textContent = `${list.length}명`;

  const wrap = el("memberList");
  if (!wrap) return;

  wrap.innerHTML = "";
  if (!list.length) {
    wrap.innerHTML = `<div class="row-sub">검색 결과가 없습니다.</div>`;
    return;
  }

  for (const m of list) {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      ${m.photoUrl ? `<img class="avatar" src="${esc(m.photoUrl)}" alt="사진">` : `<div class="avatar"></div>`}
      <div class="row-main">
        <div class="row-title">${esc(m.name)} ${m.position ? `<span class="badge">${esc(m.position)}</span>` : ""}</div>
        <div class="row-sub">${esc([m.group, m.phone].filter(Boolean).join(" / "))}</div>
        <div class="actions">
          <a class="a-btn primary" href="tel:${esc(m.phone)}">📞 통화</a>
          <a class="a-btn" href="sms:${esc(m.phone)}">💬 문자</a>
          <button class="a-btn" data-vcard="1">📇 저장</button>
        </div>
      </div>`;
    row.querySelector('[data-vcard="1"]')?.addEventListener("click", () => downloadVCard(m));
    wrap.appendChild(row);
  }
}

function renderAnnouncements() {
  const wrap = el("annList");
  if (!wrap) return;

  wrap.innerHTML = "";
  const items = state.announcements || [];
  if (!items.length) {
    wrap.innerHTML = `<div class="row-sub">등록된 공지사항이 없습니다.</div>`;
    return;
  }

  for (const a of items) {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="row-main">
        <div class="row-title">${esc(a.title || "")}</div>
        <div class="row-sub">${esc(a.date || "")} ${a.author ? " · " + esc(a.author) : ""}</div>
        <div class="row-sub" style="white-space:normal;margin-top:8px;">${esc(a.body || "")}</div>
      </div>`;
    wrap.appendChild(row);
  }
}

function renderLatest() {
  const wrap = el("latestAnnouncements");
  if (!wrap) return;

  wrap.innerHTML = "";
  const items = (state.announcements || []).slice(0, 3);
  if (!items.length) {
    wrap.innerHTML = `<div class="row-sub">등록된 공지사항이 없습니다.</div>`;
    return;
  }

  for (const a of items) {
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="row-main">
        <div class="row-title">${esc(a.title || "")}</div>
        <div class="row-sub">${esc(a.date || "")} ${a.author ? " · " + esc(a.author) : ""}</div>
      </div>`;
    wrap.appendChild(row);
  }
}

async function handleLogin() {
  const rawPhone = el("inputPhone")?.value || "";
  const rawCode = el("inputCode")?.value || "";

  const phone = normalizePhone(rawPhone);
  const code = String(rawCode).trim();
  const keep = !!el("keepLogin")?.checked;

  const err = el("loginError");
  if (err) err.hidden = true;

  if (!phone) {
    if (err) { err.hidden = false; err.textContent = "휴대폰번호를 입력하세요(숫자만)"; }
    return;
  }

  if (!code) {
    if (err) { err.hidden = false; err.textContent = "접속코드를 입력하세요"; }
    return;
  }

if (keep) localStorage.setItem(LS_KEY, JSON.stringify({ phone, code }));
else localStorage.removeItem(LS_KEY);

toast("저장됨: " + (localStorage.getItem(LS_KEY) ? "YES" : "NO"));

  const btn = el("btnLogin");
  if (btn) { btn.disabled = true; btn.textContent = "확인중..."; }

  try {
    const json = await apiJsonp({ action: "data", phone, code });

    if (!json || json.ok !== true) {
      const msg = json?.error ? String(json.error) : "LOGIN_FAILED";
      throw new Error(msg);
    }

    state.me = json.me;
    state.settings = json.settings;
    state.members = (json.members || []).map((m) => ({ ...m, phone: normalizePhone(m.phone) }));
    state.announcements = json.announcements || [];

    setBrand(state.settings);
    state.members.sort((a, b) => (a.name || "").localeCompare(b.name || "", "ko"));

    renderLatest();
    renderAnnouncements();

    if (keep) localStorage.setItem(LS_KEY, JSON.stringify({ phone, code }));
    else localStorage.removeItem(LS_KEY);

    state.navStack = ["home"];
    showScreen("home");
    window.scrollTo(0, 0);

    toast("접속 완료");
  } catch (e) {
    console.error("LOGIN_ERROR:", e);
    if (err) {
      err.hidden = false;
      err.textContent = `승인되지 않았거나 정보가 틀렸습니다. (${e?.message || e})`;
    }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = "로그인"; }
  }
}

function bindNav() {
  document.querySelectorAll("[data-nav]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.getAttribute("data-nav");
      if (target === "members") {
        pushNav("members");
        if (el("memberSearch")) el("memberSearch").value = "";
        renderMembers(state.members);
      } else if (target === "announcements") {
        pushNav("announcements");
        renderAnnouncements();
      } else if (target === "purpose") {
        pushNav("text");
        if (el("textTitle")) el("textTitle").textContent = "클럽 목적";
        if (el("textBody")) el("textBody").textContent = state.settings?.purpose || "내용 준비중";
      } else if (target === "bylaws") {
        pushNav("text");
        if (el("textTitle")) el("textTitle").textContent = "회칙";
        if (el("textBody")) el("textBody").textContent = state.settings?.bylaws || "내용 준비중";
      }
    });
  });
}

function bindSearch() {
  const input = el("memberSearch");
  if (!input) return;

  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    if (!q) { renderMembers(state.members); return; }
    const filtered = state.members.filter((m) => {
      const hay = [m.name, m.position, m.group, m.phone].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
    renderMembers(filtered);
  });
}

(function init() {
  bindNav();
  bindSearch();

  el("btnLogin")?.addEventListener("click", handleLogin);
  ["inputPhone", "inputCode"].forEach((id) => {
    el(id)?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  });

  // 1) 기본은 로그인 화면
  state.navStack = ["login"];
  showScreen("login");

  // 2) 저장된 값이 있으면 입력칸 채우고 자동 로그인
  const savedStr = localStorage.getItem(LS_KEY);
  if (savedStr) {
    try {
      const { phone, code } = JSON.parse(savedStr);

      if (el("inputPhone")) el("inputPhone").value = phone || "";
      if (el("inputCode")) el("inputCode").value = code || "";
      if (el("keepLogin")) el("keepLogin").checked = true;

      if (phone && code) {
        setTimeout(() => handleLogin(), 200);
      }
    } catch (e) {
      localStorage.removeItem(LS_KEY);
    }
  }
})();


// ===== PWA Service Worker 등록 =====
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
}

// ===== PWA Install buttons =====
let deferredPrompt = null;

const btnA = el("btnInstallAndroid");
const btnI = el("btnInstallIOS");
const hint = el("installHint");

function isStandalone() {
  return window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true; // iOS
}

function showHint(html) {
  if (!hint) return;
  hint.innerHTML = html;
  hint.hidden = false;
}

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (btnA) {
    btnA.disabled = false;
    btnA.style.opacity = "1";
  }
});

window.addEventListener("appinstalled", () => {
  deferredPrompt = null;
  if (btnA) btnA.style.display = "none";
  if (btnI) btnI.style.display = "none";
  if (hint) hint.hidden = true;
});

if (btnA) {
  btnA.disabled = true;
  btnA.style.opacity = "0.6";
}

if (isStandalone()) {
  if (btnA) btnA.style.display = "none";
  if (btnI) btnI.style.display = "none";
  if (hint) hint.hidden = true;
}

btnA?.addEventListener("click", async () => {
  if (!deferredPrompt) {
    showHint("설치가 아직 준비되지 않았어요. 잠깐 뒤 다시 눌러주세요.");
    return;
  }
  deferredPrompt.prompt();
  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;

  if (choice?.outcome !== "accepted") {
    showHint("설치를 취소했어요. 필요하면 다시 눌러 설치할 수 있어요.");
  }
});

btnI?.addEventListener("click", () => {
  showHint(`
    <b>아이폰 설치 방법(사파리)</b><br/>
    1) 사파리로 이 페이지 열기<br/>
    2) 아래 <b>공유(⬆️)</b> 버튼 누르기<br/>
    3) <b>홈 화면에 추가</b> 선택<br/>
    4) 추가 → 홈화면 아이콘으로 실행
  `);
});
