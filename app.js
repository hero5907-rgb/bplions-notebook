
let modalCtx = { list: [], index: -1 };


const CFG = window.APP_CONFIG || {};
const API_URL = String(CFG.apiUrl || "").trim();

const LS_KEY = "bplions_auth_v1";

const el = (id) => document.getElementById(id);

const screens = {
  boot: el("screenBoot"),
  login: el("screenLogin"),
  home: el("screenHome"),
  members: el("screenMembers"),
  announcements: el("screenAnnouncements"),
  text: el("screenText"),
  events: el("screenEvents"),   // ✅ 추가
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

// 🔴 [추가] 종료 확인창 열림 여부
let exitOpen = false;

function normalizePhone(p) {
  return String(p || "").replace(/[^0-9]/g, "");
}

function toast(msg, opts) {
  ...
}

// ===== 종료 확인창 제어 =====
function openExitConfirm() {
  const m = el("exitModal");
  if (!m) return;
  exitOpen = true;
  m.hidden = false;
}

function closeExitConfirm() {
  const m = el("exitModal");
  if (!m) return;
  exitOpen = false;
  m.hidden = true;
}






function showScreen(name) {
  Object.entries(screens).forEach(([k, node]) => {
    if (!node) return;
    node.hidden = (k !== name);
  });

  const isLoggedIn = !!state.me;

  if (name === "boot" || name === "login") {
    if (btnLogout) btnLogout.hidden = true;
    if (btnBack) btnBack.hidden = true;
    return;
  }

  if (btnLogout) btnLogout.hidden = !isLoggedIn;
  if (btnBack) btnBack.hidden = (state.navStack.length <= 1 || name === "home");

  // ✅ 핵심
  if (name === "home") {
    history.pushState({ app: true }, "", location.href);
  }
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

  // ✅ 관리자 버튼 잔상 제거(무조건 숨김)
  const tileAdmin = el("tileAdmin");
  if (tileAdmin) {
    tileAdmin.hidden = true;
    tileAdmin.onclick = null;
  }

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

// ✅ 기수/대수 표기 통일 (없으면 빈값)
function formatTerm(term, generation) {
  const t = String(term ?? "").trim();
  if (t) return t;

  const gRaw = String(generation ?? "").trim();
  if (!gRaw) return "";

  // 이미 "54대", "54기" 같은 형태면 그대로
  if (/[대기회]/.test(gRaw)) return gRaw;

  // 숫자면 "대" 붙이기
  const n = parseInt(gRaw, 10);
  if (!Number.isNaN(n)) return `${n}대`;

  return gRaw;
}



function setBrand(settings) {
  const cfg = window.APP_CONFIG || {};

  const district = (settings?.district || cfg.district || "국제라이온스협회 356-E지구");
  const clubName = (settings?.clubName || cfg.clubName || "북포항라이온스클럽");

  if (el("districtText2")) el("districtText2").textContent = district;

  if (el("genClubText")) {
    const term = formatTerm(settings?.term, settings?.generation || CFG.generation);
    el("genClubText").textContent = term ? `${term} ${clubName}` : clubName;
  }

  if (el("districtText")) el("districtText").textContent = district;
  if (el("clubNameText")) el("clubNameText").textContent = clubName;
  if (el("coverTitle")) el("coverTitle").textContent = clubName;
  if (el("coverSub")) el("coverSub").textContent = district;
  if (el("districtHomeText")) el("districtHomeText").textContent = district;

  const slogan = String(settings?.slogan ?? cfg.slogan ?? "").trim();
  if (el("sloganText")) el("sloganText").textContent = slogan ? `“${slogan}”` : "";

  const club = (settings?.clubName ?? cfg.clubName ?? clubName);
  const term = formatTerm(settings?.term, settings?.generation ?? cfg.generation ?? "");
  if (el("generationText")) el("generationText").textContent = term ? `${term} ${club}` : club;

  const addr = (settings?.address ?? settings?.hallAddress ?? cfg.address ?? cfg.hallAddress ?? "");
  if (el("hallAddress")) el("hallAddress").textContent = addr ? `📍 ${addr}` : "";

  const phone = (settings?.phone ?? settings?.hallPhone ?? cfg.phone ?? cfg.hallPhone ?? "");
  if (el("hallPhone")) el("hallPhone").textContent = phone ? `☎ ${phone}` : "";

  const cr = (settings?.copyright ?? cfg.copyright ?? "");
  if (el("copyrightText")) el("copyrightText").textContent = cr;

  const s = el("clubLogoSmall");
  if (s) {
    const logoUrl = (settings?.logoUrl || cfg.logoUrl || "./logo.png").trim();
    s.src = logoUrl;
    s.style.visibility = "visible";
  }

  if (el("bootTitle")) el("bootTitle").textContent = clubName;
  if (el("bootSub")) el("bootSub").textContent = "회원수첩";

  if (el("loginTitleMain")) el("loginTitleMain").textContent = clubName;
  if (el("loginTitleSub")) el("loginTitleSub").textContent = "회원수첩";

  if (el("docTitle")) el("docTitle").textContent = `${clubName} 수첩`;
}



function openAdminPage() {
  // 지금 입력한 phone/code를 저장해둔 값으로 링크 생성
  const phone = state._authPhone || "";
  const code  = state._authCode || "";
  if (!phone || !code) { toast("다시 로그인 후 시도"); return; }

  const url = `${API_URL}?page=admin&phone=${encodeURIComponent(phone)}&code=${encodeURIComponent(code)}`;
  window.open(url, "_blank"); // 새 탭
}


function esc(s) {
  return String(s ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function renderBylawsView() {
  const body = el("textBody");
  if (!body) return;

  const text = String(state.settings?.bylaws || "").trim(); // F2 텍스트

  // URL 키가 혹시 다르게 들어와도 대응
  const url = String(
    state.settings?.bylawsUrl ||
    state.settings?.bylawsURL ||
    state.settings?.bylaws_url ||
    ""
  ).trim();
  const safeText = esc(text || "내용 준비중");
  // ✅ 헤더 오른쪽 "원본PDF" 버튼 제어
  const pdfBtn = el("btnBylawsPdf");
  if (pdfBtn) {
    if (url) {
      pdfBtn.href = url;
      pdfBtn.hidden = false;
      pdfBtn.textContent = "원본PDF";
    } else {
      pdfBtn.hidden = true;
    }
  }



    body.innerHTML = `<div style="white-space:pre-wrap;line-height:1.6;">${safeText}</div>`;

}

// ✅ 회원여부 필터: isMember === false 인 사람은 회원명부/인원수에서 제외
function onlyRealMembers(arr){
  const list = Array.isArray(arr) ? arr : [];
  return list.filter(m => {
    // 서버에서 isMember를 안 내려주면(구버전) 기존처럼 "회원" 취급
    if (m && typeof m.isMember === "boolean") return m.isMember === true;
    return true;
  });
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

 for (let i = 0; i < list.length; i++) {
  const m = list[i];
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      ${m.photoUrl ? `<img class="avatar" src="${esc(m.photoUrl)}" alt="사진">` : `<div class="avatar"></div>`}
      <div class="row-main">
        <div class="row-title">${esc(m.name)} ${m.position ? `<span class="badge">${esc(m.position)}</span>` : ""}</div>
        <div class="row-sub">${esc([m.workplace, m.group, m.phone].filter(Boolean).join(" / "))}</div>
        <div class="actions">
          <a class="a-btn primary" href="tel:${esc(m.phone)}">📞 통화</a>
          <a class="a-btn" href="sms:${esc(m.phone)}">💬 문자</a>
        
        </div>
      </div>`;
    
    row.addEventListener("click", () => openProfileAt(list, i));
    row.querySelector(".actions")?.addEventListener("click", (e) => e.stopPropagation());
 


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

   row.addEventListener("click", () => openAnnModal(a));

    wrap.appendChild(row);
  }
}

function isAnnNew(a){
  if (!a) return false;
  if (a.isNew === true) return true; // 서버에서 내려준 값 우선

  // 혹시 isNew가 없으면 newUntil로 계산(보험)
  const v = a.newUntil;
  if (!v) return false;
  const t = new Date(v).getTime();
  return t && Date.now() < t;
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
        <div class="row-title">
  ${esc(a.title || "")}
  ${isAnnNew(a) ? `<span class="badge-new">NEW</span>` : ""}

</div>

        <div class="row-sub">${esc(a.date || "")} ${a.author ? " · " + esc(a.author) : ""}</div>
      </div>`;
    wrap.appendChild(row);
  }
}

async function handleLogin() {
  const rawPhone = el("inputPhone")?.value || "";
  const rawCode  = el("inputCode")?.value || "";

  const phone = normalizePhone(rawPhone);
  const code  = String(rawCode).trim();
  const keep  = !!el("keepLogin")?.checked;

  // ✅ phone/code 만든 다음에 저장 (관리자페이지 링크용)
  state._authPhone = phone;
  state._authCode  = code;

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

  const btn = el("btnLogin");
if (btn) { btn.disabled = true; btn.textContent = "확인중..."; }

try {

  if (!API_URL) {
    throw new Error("CONFIG_API_URL_EMPTY (config.js의 apiUrl을 확인하세요)");
  }

  const json = await apiJsonp({ action: "data", phone, code });


    if (!json || json.ok !== true) {
      const msg = json?.error ? String(json.error) : "LOGIN_FAILED";
      throw new Error(msg);
    }

    state.me = json.me;
    state.settings = json.settings;
   state.members = onlyRealMembers(json.members || []).map((m) => ({ ...m, phone: normalizePhone(m.phone) }));

    state.announcements = json.announcements || [];

    // ✅ 관리자 버튼: 로그인 성공 시에만 표시/숨김 결정
    const tileAdmin = el("tileAdmin");
    if (tileAdmin) {
      tileAdmin.hidden = !(state.me && state.me.isAdmin === true);
      tileAdmin.onclick = openAdminPage;
    }

    setBrand(state.settings);

    // 정렬
    state.members.sort((a, b) =>
      (Number(a.sortOrder ?? 9999) - Number(b.sortOrder ?? 9999)) ||
      (a.name || "").localeCompare(b.name || "", "ko")
    );

    renderLatest();
    renderAnnouncements();


if (keep) localStorage.setItem(LS_KEY, JSON.stringify({ phone, code }));
else localStorage.removeItem(LS_KEY);

// ✅ 로그인 성공 → 홈 화면으로 이동 (이 줄들이 빠져 있었음)
state.navStack = ["home"];
showScreen("home");
window.scrollTo(0, 0);



  } catch (e) {
  console.error("LOGIN_ERROR:", e);

  // ✅ 자동로그인(BOOT) 중 실패하면 로그인 화면으로 복귀
  state.navStack = ["login"];
  showScreen("login");
  window.scrollTo(0, 0);

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

      // ✅ 텍스트 화면 들어갈 때마다 기본은 숨김 (회칙에서만 renderBylawsView가 켬)
      const pdfBtn = el("btnBylawsPdf");
      if (pdfBtn) pdfBtn.hidden = true;

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
        // pdfBtn은 위에서 이미 hidden=true 처리됨

      } else if (target === "bylaws") {
  pushNav("text");
  if (el("textTitle")) el("textTitle").textContent = "회칙";
  renderBylawsView();
} 
else if (target === "events") {
  pushNav("events");
  loadEvents();
}
else if (target === "song") {
  openImgModal("./lions_song.jpg");
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
      const hay = [m.name, m.position, m.workplace, m.group, m.phone].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
    renderMembers(filtered);
  });
}

// ===== Pull-to-refresh 방지 (특히 iOS Safari/PWA) =====
let __ptrStartY = 0;

document.addEventListener("touchstart", (e) => {
  if (e.touches.length !== 1) return;
  __ptrStartY = e.touches[0].clientY;
}, { passive: true });

document.addEventListener("touchmove", (e) => {
  if (e.touches.length !== 1) return;
  const y = e.touches[0].clientY;
  const scroller = document.scrollingElement || document.documentElement;
  const top = scroller.scrollTop || 0;

  // 화면 최상단에서 아래로 당길 때만 새로고침 제스처 차단
  if (top <= 0 && y > __ptrStartY) {
    e.preventDefault();
  }
}, { passive: false });


(function init() {
  setBrand(null);   // ✅ 로그인 전에도 config 값으로 로고/클럽명/지구명 세팅
  bindNav();
  bindSearch();
 


  el("btnLogin")?.addEventListener("click", handleLogin);
  ["inputPhone", "inputCode"].forEach((id) => {
    el(id)?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  });


  // 2) 저장된 값이 있으면 입력칸 채우고 자동 로그인
  const savedStr = localStorage.getItem(LS_KEY);
  if (savedStr) {
    try {
      const { phone, code } = JSON.parse(savedStr);

      if (el("inputPhone")) el("inputPhone").value = phone || "";
      if (el("inputCode")) el("inputCode").value = code || "";
      if (el("keepLogin")) el("keepLogin").checked = true;

      if (phone && code) {
  state.navStack = ["boot"];
  showScreen("boot");
  setTimeout(() => handleLogin(), 50);
  return;
}

    } catch (e) {
      localStorage.removeItem(LS_KEY);
    }
  }

  state.navStack = ["login"];
  showScreen("login");

  el("btnExitCancel")?.addEventListener("click", closeExitConfirm);
  el("btnExitOk")?.addEventListener("click", () => {
    window.close();
  });
})();



// ===== PWA Service Worker 등록 + 업데이트 토스트 =====
function showUpdateToast(onRefresh) {
  const t = el("toast");
  if (!t) return;

  // 기존 toast()는 textContent를 쓰니까, 업데이트 토스트는 HTML로 별도 구성
  t.innerHTML = `
    <div style="display:flex;align-items:center;gap:10px;">
      <div style="font-weight:900;">새 버전이 있어요</div>
      <button id="btnSwRefresh"
        style="border:none;border-radius:12px;padding:8px 12px;font-weight:900;cursor:pointer;">
        새로고침
      </button>
    </div>
  `;
  t.hidden = false;

  const b = document.getElementById("btnSwRefresh");
  if (b) {
    b.onclick = () => {
      // 버튼 누르면 “대기중(waiting) SW → 즉시 활성화” 요청
      try { onRefresh?.(); } catch {}
      b.disabled = true;
      b.textContent = "적용중...";
    };
  }
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", async () => {
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");

      // ✅ 즉시 업데이트 체크
      reg.update();

      const askRefresh = () => {
        const w = reg.waiting || reg.installing;
        if (w) w.postMessage({ type: "SKIP_WAITING" });
      };

      // ✅ 이미 waiting 상태면 바로 토스트(컨트롤러 유무 상관없음)
      if (reg.waiting) showUpdateToast(askRefresh);

      // ✅ 설치가 끝나 waiting이 되면 토스트
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          if (nw.state === "installed") {
            // installed 후 waiting이 잡히는 타이밍이 있어서 한 번 더 체크
            setTimeout(() => {
              if (reg.waiting) showUpdateToast(askRefresh);
            }, 50);
          }
        });
      });

      // ✅ 짧은 시간 동안 waiting 폴링(모바일에서 이벤트 놓치는 케이스 방지)
      let tries = 0;
      const iv = setInterval(() => {
        tries++;
        if (reg.waiting) {
          showUpdateToast(askRefresh);
          clearInterval(iv);
        }
        if (tries >= 20) clearInterval(iv); // 10초
      }, 500);

      // ✅ 새 SW가 활성화되면 자동 새로고침
      let refreshing = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (refreshing) return;
        refreshing = true;
        // 업데이트가 실제 적용됐으니 잠금 해제
        toast._lock = false;
        location.reload();
      });

    } catch (e) {
      console.error("SW_REGISTER_FAILED:", e);
    }
  });
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


function openProfileAt(list, index) {
  modalCtx.list = list || [];
  modalCtx.index = index ?? -1;

  const m = modalCtx.list[modalCtx.index];
  if (!m) return;

  // ✅ 멤버 데이터 주입
  el("modalPhoto").src = m.photoUrl || "";

  // 이름(굵게) + 직위(지금처럼)
  el("modalName").textContent = m.name || "";
  el("modalPosition").textContent = m.position || "";

    // 직장 / 직함 / 주소 (두 줄로 표시)
  const workplaceRaw = String(m.workplace || "").trim();
  const title = String(m.title || "").trim();
  const address = String(m.address || "").trim();

  const parts = [];
  if (workplaceRaw) parts.push(workplaceRaw);
  if (title) parts.push(title);

  const line1 = parts.join(" ");     // 예: "삼성전자 과장"
  const line2 = address || "";       // 예: "포항시 북구 ..."

  // ✅ 화면 표시 (line1 + line2 줄바꿈)
 // ✅ 주소를 무조건 다음 줄로(HTML 2줄 고정)
const wEl = el("modalWorkplace");
if (wEl) {
  wEl.innerHTML =
    `<div>${esc(line1 || "")}</div>` +
    `<div>${esc(line2 || "")}</div>`;
}

  // ✅ 지도/로드뷰 버튼 연결 (주소가 있을 때만)
  const addr = String(m.address || "").trim();
    const btnMap = el("btnMap");

  if (btnMap) btnMap.hidden = !addr;

  if (addr && btnMap) {
    const q = encodeURIComponent(addr);

    btnMap.onclick = () => {
      window.open(`https://map.naver.com/v5/search/${q}`, "_blank");
    };
  }



  // 폰번호(굵게는 CSS에서 처리)
  el("modalPhone").textContent = m.phone || "";

  el("modalCall").href = `tel:${m.phone || ""}`;
  el("modalSms").href  = `sms:${m.phone || ""}`;

  resetPhotoTransform();
  el("profileModal").hidden = false;
}

function closeProfile() {
  el("profileModal").hidden = true;
  resetPhotoTransform();
}

function nextMember(dir) {
  if (!modalCtx.list.length) return;

  let n = modalCtx.index + dir;
  if (n < 0) n = 0;
  if (n >= modalCtx.list.length) n = modalCtx.list.length - 1;

  if (n === modalCtx.index) return;
  openProfileAt(modalCtx.list, n);
}

(function bindModalSwipe() {
  const modal = el("profileModal");
  const card = modal?.querySelector(".modal-card");
  if (!card) return;

  let sx = 0, sy = 0, st = 0;

  card.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1) return;
    sx = e.touches[0].clientX;
    sy = e.touches[0].clientY;
    st = Date.now();
  }, { passive: true });

  card.addEventListener("touchend", (e) => {
    const dt = Date.now() - st;
    const ex = e.changedTouches?.[0]?.clientX ?? sx;
    const ey = e.changedTouches?.[0]?.clientY ?? sy;

    const dx = ex - sx;
    const dy = ey - sy;

    // ✅ 좌우 스와이프 판정 (너무 느리거나 세로가 크면 무시)
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 600) {
      if (dx < 0) nextMember(+1); // 왼쪽으로 밀면 다음
      else nextMember(-1);        // 오른쪽으로 밀면 이전
    }
  });
})();


let photoScale = 1;
let photoTx = 0;
let photoTy = 0;

const ptrs = new Map(); // pointerId -> {x,y}
let pinchStartDist = 0;
let pinchStartScale = 1;
let dragStart = null; // {x,y,tx,ty}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function applyPhotoTransform() {
  const img = el("modalPhoto");
  if (!img) return;
  img.style.transform = `translate(${photoTx}px, ${photoTy}px) scale(${photoScale})`;
}

function resetPhotoTransform() {
  photoScale = 1;
  photoTx = 0;
  photoTy = 0;
  applyPhotoTransform();
}

(function bindPhotoPinch() {
  const img = el("modalPhoto");
  if (!img) return;

  img.addEventListener("pointerdown", (e) => {
    img.setPointerCapture(e.pointerId);
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (ptrs.size === 1) {
      dragStart = { x: e.clientX, y: e.clientY, tx: photoTx, ty: photoTy };
    }

    if (ptrs.size === 2) {
      // 핀치 시작
      const pts = [...ptrs.values()];
      pinchStartDist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      pinchStartScale = photoScale;
      dragStart = null;
    }
  });

  img.addEventListener("pointermove", (e) => {
    if (!ptrs.has(e.pointerId)) return;
    ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (ptrs.size === 2) {
      const pts = [...ptrs.values()];
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      const ratio = dist / (pinchStartDist || dist);

      photoScale = clamp(pinchStartScale * ratio, 1, 3); // 1~3배
      applyPhotoTransform();
      return;
    }

    if (ptrs.size === 1 && dragStart && photoScale > 1) {
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;
      photoTx = dragStart.tx + dx;
      photoTy = dragStart.ty + dy;
      applyPhotoTransform();
    }
  });

  function endPtr(e) {
    ptrs.delete(e.pointerId);
    if (ptrs.size < 2) pinchStartDist = 0;
    if (ptrs.size === 0) dragStart = null;

    // 스케일이 1로 내려가면 위치도 초기화
    if (photoScale <= 1) resetPhotoTransform();
  }

  img.addEventListener("pointerup", endPtr);
  img.addEventListener("pointercancel", endPtr);

  // 더블클릭/더블탭으로 리셋(PC도 편함)
  img.addEventListener("dblclick", () => resetPhotoTransform());
})();


window.addEventListener("keydown", (e) => {
  if (el("profileModal")?.hidden === false) {
    if (e.key === "ArrowLeft") nextMember(-1);
    if (e.key === "ArrowRight") nextMember(+1);
    if (e.key === "Escape") closeProfile();
  }
});






function openImgModal(src){
  const m = el("imgModal");
  const img = el("imgModalPhoto");
  if (!m || !img) return;
  img.src = src;
  m.hidden = false;
}

function closeImgModal(){
  const m = el("imgModal");
  if (m) m.hidden = true;
}


function openAnnModal(a){
  const m = el("annModal");
  if (!m) return;
  el("annModalTitle").textContent = a?.title || "";
  el("annModalMeta").textContent = [a?.date, a?.author].filter(Boolean).join(" · ");
  el("annModalBody").textContent = a?.body || "";
  m.hidden = false;
}

function closeAnnModal(){
  const m = el("annModal");
  if (m) m.hidden = true;
}



async function loadEvents(yyyymm){
  const now = new Date();
  const ym = (yyyymm || `${now.getFullYear()}${String(now.getMonth()+1).padStart(2,"0")}`)
    .replace(/[^0-9]/g,"")
    .slice(0,6);

  try{
    const json = await apiJsonp({
      action: "events",
      phone: state.me.phone,
      code: state._authCode,   // ✅ 핵심 수정
      yyyymm: ym
    });

    const list = json?.events || [];

    const box = el("eventsList");
    if(!list.length){
      box.innerHTML = "<div class='small'>등록된 일정이 없습니다.</div>";
      return;
    }

    let html = "";
    for(const e of list){
      html += `
        <div class="card">
          <b>${e.date || ""} ${e.startTime || ""}</b>
          <div>${e.title || ""}</div>
          ${e.place ? `<div class="small">📍 ${e.place}</div>` : ""}
          ${e.desc ? `<div class="small">${e.desc}</div>` : ""}
        </div>
      `;
    }

    box.innerHTML = html;

  }catch(e){
    console.error(e);
    el("eventsList").innerHTML = "일정 불러오기 실패";
  }
}

function loadUpcomingEvents(){
  google.script.run
    .withSuccessHandler((list)=>{
      const wrap = document.getElementById("eventListMain");
      if (!wrap) return;

      const arr = Array.isArray(list) ? list : [];
      if (!arr.length){
        wrap.textContent = "예정된 일정이 없습니다.";
        return;
      }

      wrap.innerHTML = arr.map(e=>{
        return `
          <div style="padding:6px 0;border-bottom:1px solid #eee;">
            <b>${e.title}</b><br/>
            <span style="color:#64748b;font-size:.9rem;">
              ${e.date} ${e.startTime || ""} ${e.place || ""}
            </span>
          </div>
        `;
      }).join("");
    })
    .getUpcomingEvents();
}

// ===== 안드로이드 뒤로가기 : 종료 확인창 방식 =====
(function () {

  history.pushState({ app: true }, "", location.href);

  window.addEventListener("popstate", () => {

    // [3] 종료 확인창 떠 있으면 → 닫기
    if (exitOpen) {
      closeExitConfirm();
      history.pushState({ app: true }, "", location.href);
      return;
    }

    const current = state.navStack[state.navStack.length - 1];

    // [1] 메인화면이 아니면 → 이전 화면
    if (current !== "home") {
      popNav();
      history.pushState({ app: true }, "", location.href);
      return;
    }

    // [2] 메인화면이면 → 종료 확인창
    openExitConfirm();
    history.pushState({ app: true }, "", location.href);
  });

})();




