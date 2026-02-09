
//===========================
// 🔒 모바일 줌 완전 차단 (전역 - 최종 안정버전)
// ===============================
(function blockZoom(){

  // 두손가락 확대 차단
  document.addEventListener("touchmove", e => {

    // ⭐ 로그인 화면은 허용
    if (e.target.closest("#screenLogin")) return;

    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive:false });

  // 더블탭 확대 차단
  let lastTouchEnd = 0;

  document.addEventListener("touchend", e => {

    // ⭐ 로그인 화면은 허용
    if (e.target.closest("#screenLogin")) return;

    const now = Date.now();

    if (now - lastTouchEnd <= 300) {
      e.preventDefault();
    }

    lastTouchEnd = now;

  }, false);

})();

  





// 🎧 의전 오디오 컨트롤 (전역 1개만 사용)
let ceremonyAudio = null;
let ceremonyBtn = null;

function playCeremony(src, btn){

  // 카드 안 아이콘만 찾기
  const icon = btn.querySelector(".ceremony-icon");
  if (!icon) return;

  // 다른거 재생중이면 정지
  if (ceremonyAudio){
    ceremonyAudio.pause();
    ceremonyAudio.currentTime = 0;
    if (ceremonyBtn){
      const oldIcon = ceremonyBtn.querySelector(".ceremony-icon");
      if (oldIcon) oldIcon.textContent = ceremonyBtn.dataset.icon || "▶";
    }
  }

  // 같은 버튼 다시 누르면 정지
  if (ceremonyBtn === btn){
    ceremonyAudio = null;
    ceremonyBtn = null;
    return;
  }

  // ⭐ 원래 아이콘 저장
  btn.dataset.icon = icon.textContent;

  ceremonyAudio = new Audio(src);
  ceremonyBtn = btn;

  icon.textContent = "⏹";

  ceremonyAudio.play();

  ceremonyAudio.onended = ()=>{
    icon.textContent = btn.dataset.icon || "▶";
    ceremonyAudio = null;
    ceremonyBtn = null;
  };
}

function stopCeremony(){
  if (ceremonyAudio){
    ceremonyAudio.pause();
    ceremonyAudio.currentTime = 0;
  }

  if (ceremonyBtn){
    // ⭐ 버튼 전체 글자 바꾸지 말고 아이콘만 복구
    const oldIcon = ceremonyBtn.querySelector(".ceremony-icon");
    if (oldIcon) oldIcon.textContent = ceremonyBtn.dataset.icon || "▶";
  }

  ceremonyAudio = null;
  ceremonyBtn = null;
}

let modalCtx = { list: [], index: -1 };

let swipeCount = Number(localStorage.getItem("memberSwipeCount") || 0);

// 🍎 iOS 감지 (아이폰/아이패드)
const IS_IOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);


let homeBackTimer = null;

function getAuthSafe(){
  // 1) state에 있으면 그걸 우선
  let phone = normalizePhone(state?._authPhone || state?.me?.phone || "");
  let code  = String(state?._authCode || "").trim();

  // 2) 없으면 localStorage(로그인유지)에서 꺼내기
  if ((!phone || !code)) {
    try {
      const savedStr = localStorage.getItem(LS_KEY);
      if (savedStr) {
        const saved = JSON.parse(savedStr);
        phone = phone || normalizePhone(saved?.phone || "");
        code  = code  || String(saved?.code || "").trim();
      }
    } catch {}
  }

  return { phone, code };
}

function api(action, params = {}, cb){
  const { phone, code } = getAuthSafe();

  apiJsonp({ action, phone, code, ...params })
    .then(cb)
    .catch(e=>{
      console.error(e);
      toast("서버 통신 오류");
    });
}

function setAdminButton(isAdmin) {
  const btnAdmin = document.getElementById("btnAdmin");
  if (!btnAdmin) return;

  if (isAdmin === true) {
    btnAdmin.style.display = "flex";   // 보이기
    btnAdmin.onclick = openAdminPage;  // 클릭 연결
  } else {
    btnAdmin.style.display = "none";   // 숨기기
    btnAdmin.onclick = null;           // 클릭 제거
  }
}




function isAnyModalOpen(){
  return (
    el("profileModal")?.hidden === false ||
    el("annModal")?.hidden === false ||
    el("imgModal")?.hidden === false
  );
}


function closeAnyModal(){
  if (el("profileModal")?.hidden === false) closeProfile();
  if (el("annModal")?.hidden === false) closeAnnModal();
  if (el("imgModal")?.hidden === false) closeImgModal();

}





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
  calendar: el("screenCalendar"), // 🔥 이 줄 추가
lionism: el("screenLionism"),
  ceremony: el("screenCeremony"),

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









function toast(msg, opts = {}) {
  const t = el("toast");
  if (!t) return;

  // 강제 표시 옵션
  if (opts.force) {
    toast._lock = false;
  }

  if (toast._lock) return;
  toast._lock = true;

  t.textContent = msg;
  t.hidden = false;

  const dur = Number(opts.duration || 2000);

  setTimeout(() => {
    t.hidden = true;
    toast._lock = false;
  }, dur);
}





function showScreen(name) {
 
stopCeremony();   // 🔥 화면 이동시 무조건 정지
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

  // ✅ home에 들어오면 종료 대기 상태 초기화
  if (name === "home" && homeBackTimer) {
    clearTimeout(homeBackTimer);
    homeBackTimer = null;
  }



}

function pushNav(name) {
  state.navStack.push(name);
  showScreen(name);
  history.pushState({ app: true }, "", location.href);
  window.scrollTo(0, 0);
}


function popNav() {
  if (state.navStack.length > 1) state.navStack.pop();
  showScreen(state.navStack.at(-1));
  window.scrollTo(0, 0);
}

btnBack?.addEventListener("click", () => popNav());
btnLogout?.addEventListener("click", () => {


setAdminButton(false);

  localStorage.removeItem(LS_KEY);

  // ✅ 관리자 버튼 잔상 제거(무조건 숨김)
  const tileAdmin = el("tileAdmin");
  if (tileAdmin) {
    tileAdmin.hidden = true;
    tileAdmin.onclick = null;
  }


// 🔕 로그인 사용자 이름 숨김
const nameBox = document.getElementById("loginUserName");
if (nameBox) {
  nameBox.hidden = true;
  nameBox.textContent = "";
}


document.body.classList.remove("logged-in"); // ← 이 줄


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

function formatPhone(p){
  const n = String(p||"").replace(/[^0-9]/g,"");
  if(n.length===11) return `${n.slice(0,3)}-${n.slice(3,7)}-${n.slice(7)}`;
  return n;
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
        <div class="row-sub">${esc([m.workplace, m.title, formatPhone(m.phone)].filter(Boolean).join(" / "))}</div>

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

  // 🔔 팝업 API를 미리 시작 (data API와 병렬)
  


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

  const __popupPromise = apiJsonp({
    action:"popupEvents",
    phone,
    code
  });

  const json = await apiJsonp({ action: "data", phone, code });




    if (!json || json.ok !== true) {
      const msg = json?.error ? String(json.error) : "LOGIN_FAILED";
      throw new Error(msg);
    }

 const rawAdmin = json.me?.isAdmin;

const isAdmin =
  rawAdmin === true ||
  rawAdmin === "TRUE" ||
  rawAdmin === "true" ||
  rawAdmin === 1 ||
  rawAdmin === "1";

state.me = {
  ...json.me,
  isAdmin: isAdmin === true
};


setAdminButton(state.me?.isAdmin === true);



// ✅ 로그인 상태 표시 (CSS 제어용)
document.body.classList.add("logged-in");



// 🔔 로그인 사용자 이름 상단 표시
const nameBox = document.getElementById("loginUserName");
const nameText = document.getElementById("loginUserNameText");


// ===============================
// 🔧 Ctrl + 우클릭 → 앱 초기화
// ===============================
nameBox?.addEventListener("contextmenu", (e) => {

  // Ctrl 키 안 눌렸으면 그냥 무시
  if (!e.ctrlKey) return;

  // 기본 우클릭 메뉴 차단
  e.preventDefault();
  e.stopPropagation();

  if (!confirm("앱 캐시를 초기화하시겠습니까?")) return;

  // 🔥 초기화 실행
  localStorage.clear();

  if (window.caches) {
    caches.keys().then(keys => {
      keys.forEach(k => caches.delete(k));
    });
  }

  alert("초기화되었습니다. 다시 로그인하세요.");
  location.reload();
});



if (nameBox && nameText && state.me?.name) {
  nameText.textContent = `${state.me.name} L`;
  nameBox.hidden = false;
}








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

__popupPromise.then(res=>{
  if (!res || res.ok !== true) return;

  const list = res.events || [];
  if (!list.length) return;

  openModal(`
    <div style="text-align:center;margin-bottom:18px;">
      <div style="font-size:24px;">📢</div>
      <div style="font-size:18px;font-weight:700;margin-top:6px;">
        중요 일정 안내
      </div>
    </div>

    ${list.map(e => `
  <div style="margin-bottom:20px;">
    <div style="text-align:center;font-size:14px;color:#64748b;">
      ${e.date || ""}
    </div>

    <div style="
  text-align:center;
  font-size:16px;
  font-weight:600;
  margin-top:4px;
">
  ${e.title || ""}
  ${e.place ? ` / ${e.place}` : ""}
</div>
    <div style="
      margin-top:10px;
      white-space:pre-wrap;
      line-height:1.6;
      text-align:left;
    ">${String(e.desc || "").trim()}</div>
  </div>
`).join("")}
  `);

  const rows = list.map(e => e.row);
  api("markEventsNotified", { rows });
});







// ✅ 여기부터는 handleLogin 정상 흐름
history.pushState({ app: true }, "", location.href);
window.scrollTo(0, 0);




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

  const btn = el("btnAnnRefresh");
  if (btn) btn.onclick = reloadAnnouncements;
}else if (target === "purpose") {
        pushNav("text");
        if (el("textTitle")) el("textTitle").textContent = "클럽의 목적 및 윤리강령";
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

else if (target === "calendar") {
  pushNav("calendar");
  loadCalendar();
}


else if (target === "song") {
  openImgModal("./lions_song.jpg");
}

else if (target === "lionism") {
  window.open("http://www.lions356-e.or.kr/main/", "_blank");
}

else if (target === "ceremony") {
  pushNav("ceremony");
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



// ⬇️⬇️⬇️ 여기부터 붙여넣기 ⬇️⬇️⬇️

(function init() {


setAdminButton(false);




  // 기본 세팅
  setBrand(null);
  bindNav();
  bindSearch();






// 🔄 회원명부 새로고침 버튼
const btnMembersRefresh = el("btnMembersRefresh");
if (btnMembersRefresh) {
  btnMembersRefresh.onclick = reloadMembers;
}



  // 로그인 버튼 / 엔터
  window.addEventListener("DOMContentLoaded", () => {
  el("btnLogin")?.addEventListener("click", handleLogin);
});


el("loginUserName")?.addEventListener("click", ()=>{
  if(!state.me) return;

  const meIndex = state.members.findIndex(
    m => normalizePhone(m.phone) === normalizePhone(state.me.phone)
  );

  if(meIndex >= 0){
    // ⭐ 마이페이지 모드
    openProfileAt(state.members, meIndex, { mode: "me" });
  }
});


// ✅ MY 로그아웃 버튼
el("btnMyLogout")?.addEventListener("click", ()=>{
  btnLogout?.click();
});

// ✅ 개별메시지 (지금은 자리만)
el("btnMyMessages")?.addEventListener("click", ()=>{
  toast("준비중입니다");
});


// 🔐 접속코드 보기/숨기기 (⭐ 여기 추가)
  el("btnTogglePw")?.addEventListener("click", () => {

    const input = el("inputCode");
    if (!input) return;

    if (input.type === "password") {
      input.type = "text";
    } else {
      input.type = "password";
    }

});




  ["inputPhone", "inputCode"].forEach((id) => {
    el(id)?.addEventListener("keydown", (e) => {
      if (e.key === "Enter") handleLogin();
    });
  });

  // 🔧 비상용: 캐시 + SW 제거 후 새로고침
  el("btnHardReload")?.addEventListener("click", async () => {
    try {
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        for (const r of regs) await r.unregister();
      }
      if (window.caches) {
        const keys = await caches.keys();
        for (const k of keys) await caches.delete(k);
      }
    } catch {}
    location.reload();
  });




  // 자동 로그인
  const savedStr = localStorage.getItem(LS_KEY);
  if (savedStr) {
    try {
      const { phone, code } = JSON.parse(savedStr);
      if (el("inputPhone")) el("inputPhone").value = phone || "";
      if (el("inputCode"))  el("inputCode").value  = code  || "";
      if (el("keepLogin"))  el("keepLogin").checked = true;

if (phone && code) {
  state.navStack = ["boot"];
  showScreen("boot");
  setTimeout(() => handleLogin(), 50);
  return;
}

    } catch {
      localStorage.removeItem(LS_KEY);
    }

  }

  // ✅ 여기서 기본 로그인 화면 결정
  state.navStack = ["login"];
  showScreen("login");
history.pushState({ app: true }, "", location.href);




})(); // 🔚 init 끝 (단 1번)







window.addEventListener("popstate", () => {


// 🔔 공용 모달(일정 팝업) 열려 있으면 → 닫기
if (document.getElementById("modal")?.hidden === false) {
  closeModal();
  history.pushState({ app: true }, "", location.href);
  return;
}





  // 1️⃣ 모달 열려 있으면 → 모달 닫기
  if (el("profileModal")?.hidden === false) {
    closeProfile();

    return;
  }

  if (el("annModal")?.hidden === false) {
    closeAnnModal();

    return;
  }

  if (el("imgModal")?.hidden === false) {
    closeImgModal();
  
    return;
  }

// 2️⃣ 메인보다 깊은 화면이면 → 메인으로
if (state.navStack.length > 1) {
  popNav();

  // 🔒 앱 안에 다시 고정 (이 1줄이 핵심)
  history.pushState({ app: true }, "", location.href);

  return;
}


  // 3️⃣ 지금은 메인(home) 화면
  if (!homeBackTimer) {
    toast("뒤로 한번 더 누르면 종료됩니다", {
      duration: 1000,
      force: true
    });

    homeBackTimer = setTimeout(() => {
      homeBackTimer = null;
    }, 1000);


    return;
  }

  // 4️⃣ 1초 안에 다시 누르면 → 종료
  window.close();
});








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



if (isStandalone()) {
  if (btnA) btnA.style.display = "none";
  if (btnI) btnI.style.display = "none";
  if (hint) hint.hidden = true;
}
btnA?.addEventListener("click", async () => {

  const ua = navigator.userAgent;

  // ❌ 크롬이 아닌 환경 (네이버, 카카오, 다음, 기타 인앱)
  if (!/Chrome/i.test(ua) || /KAKAOTALK|NAVER|Daum/i.test(ua)) {
    showHint(`
      ⚠️ 이 브라우저에서는 앱 설치가 불가능합니다.<br><br>
      <b>반드시 Chrome 브라우저에서 설치</b>해 주세요.
    `);
    return;
  }

  // ❌ 크롬이지만 설치 트리거가 안 잡힌 경우
  if (!deferredPrompt) {
    showHint(`
      ⚠️ 설치 환경에 문제가 발생했습니다.<br>
      관리자에게 문의하세요.
    `);
    return;
  }

  // ✅ 정상 크롬 → 설치 진행
  deferredPrompt.prompt();

  const choice = await deferredPrompt.userChoice;
  deferredPrompt = null;

  if (choice?.outcome !== "accepted") {
    showHint("설치를 취소했습니다. 필요하면 다시 설치할 수 있습니다.");
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


function openProfileAt(list, index, opts = {}) {
  const mode = opts.mode || "member"; // "member" | "me"


// 🔥 초기화 이후 swipeCount 다시 읽기
swipeCount = Number(localStorage.getItem("memberSwipeCount") || 0);

  modalCtx.list = list || [];
  modalCtx.index = index ?? -1;

  const m = modalCtx.list[modalCtx.index];
  if (!m) return;





  // ✅ 멤버 데이터 주입
 const imgEl = el("modalPhoto");
const newSrc = m.photoUrl || "";

if(IS_IOS){
  // 🍎 아이폰만 repaint 강제
  imgEl.src = "";
  requestAnimationFrame(()=>{
    imgEl.src = newSrc;
  });
}else{
  // 🤖 안드로이드/PC 기존 빠른 방식 유지
  imgEl.src = newSrc;
}

  // 이름(굵게) + 직위(지금처럼)
el("modalName").textContent = m.name || "";
el("modalPosition").textContent = m.position || "";

const groupEl = el("modalGroup");
const g = String(m.group || "").trim();


// ✅ 값 없으면 뱃지 자체 숨김 (빈 동그라미 방지)
if (!g) {
  groupEl.textContent = "";
  groupEl.classList.remove("group-exec","group-member","group-guest");
  groupEl.hidden = true;   // 🔥 핵심
} else {
  groupEl.hidden = false;
  groupEl.textContent = g;

  groupEl.classList.remove("group-exec","group-member","group-guest");

  // 🔥 그룹 이름 기준 자동 색상
  if (g.includes("집행부")) groupEl.classList.add("group-exec");
  else if (g.includes("회원")) groupEl.classList.add("group-member");
  else groupEl.classList.add("group-guest");
}


// ===== 추가: 영문이름 =====
const engEl = el("modalEngName");
if (engEl) {
  engEl.textContent = m.engName || "";
}

// ===== 추가: 회원번호 / 입회일자 =====
const infoEl = el("modalMemberInfo");
if (infoEl) {
  const rows = [];
  if (m.memberNo) rows.push(`<div>회원번호: ${esc(m.memberNo)}</div>`);
  if (m.joinDate) rows.push(`<div>입회일자: ${esc(m.joinDate)}</div>`);
  infoEl.innerHTML = rows.join("");
}


// ===== 추가: 추천인 =====
const recEl = el("modalRecommender");
if (recEl) {
  if (m.recommender) {
    recEl.textContent = `추천인: ${m.recommender}`;
    recEl.hidden = false;
  } else {
    recEl.hidden = true;
  }
}





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
  // ===== 휴대폰 번호 포맷 (010-xxxx-xxxx) =====
const phoneEl = el("modalPhone");
if (phoneEl) {
  const p = String(m.phone || "").replace(/[^0-9]/g, "");
  if (p.length === 11) {
    phoneEl.textContent =
      `${p.slice(0,3)}-${p.slice(3,7)}-${p.slice(7)}`;
  } else {
    phoneEl.textContent = p;
  }
}


  el("modalCall").href = `tel:${m.phone || ""}`;
  el("modalSms").href  = `sms:${m.phone || ""}`;

  resetPhotoTransform();
el("profileModal").hidden = false;

document.body.classList.add("modal-open");



// ===============================
// ⭐ 마이페이지 / 회원상세 분기
// ===============================
const actions = el("profileModal")?.querySelector(".modal-actions");
const myBar   = el("myActionBar");

if (mode === "me") {

  // 🔹 마이페이지: 스와이프 비활성
  modalCtx.list = [];
  modalCtx.index = -1;

  // 🔹 통화 / 문자 숨김
  if (el("modalCall")) el("modalCall").style.display = "none";
  if (el("modalSms"))  el("modalSms").style.display  = "none";

  // 🔹 회원용 액션 숨김
  if (actions) actions.style.display = "none";

  // 🔹 MY 버튼바 표시
  if (myBar) myBar.hidden = false;

} else {

  // 🔸 회원 상세: 기존 그대로
  if (el("modalCall")) el("modalCall").style.display = "";
  if (el("modalSms"))  el("modalSms").style.display  = "";
  if (actions) actions.style.display = "";
  if (myBar) myBar.hidden = true;
}


// ⭐⭐⭐ 스와이프 힌트 (회원 상세에서만) ⭐⭐⭐
if (mode === "member") {

  const card = el("profileModal")?.querySelector(".modal-card");

  if (card && !localStorage.getItem("memberSwipeHint")) {
    card.classList.remove("swipe-hint");
    setTimeout(()=> card.classList.add("swipe-hint"), 120);
    setTimeout(()=> card.classList.remove("swipe-hint"), 900);

    setTimeout(()=>{
      toast._lock = false;
      toast("좌우로 밀면 다음 회원을 볼 수 있어요", {
        duration: 2500,
        force: true
      });
      localStorage.setItem("memberSwipeHint","1");
    }, 350);
  }
}







}






function closeProfile() {
  el("profileModal").hidden = true;
  resetPhotoTransform();
  document.body.classList.remove("modal-open");
}


// ===============================
// 👋 카드 흔들림 (iOS Safari 완전 해결)
// ===============================
function shakeCard(dir){
  const card = el("profileModal")?.querySelector(".modal-card");
  if (!card) return;

  // 기존 애니메이션 제거
  if (card.getAnimations) {
    card.getAnimations().forEach(a => a.cancel());
  }

  const dx = dir > 0 ? -14 : 14;

  card.animate(
    [
      { transform: "translateX(0px)" },
      { transform: `translateX(${dx}px)` },
      { transform: "translateX(0px)" }
    ],
    {
      duration: 220,
      easing: "ease-out",
      composite: "add"   // 🔥🔥🔥 이게 핵심
    }
  );
}






function nextMember(dir) {
  if (!modalCtx.list.length) return;

  // ===============================
  // 실제 이동 계산
  // ===============================
  let n = modalCtx.index + dir;
  if (n < 0) n = 0;
  if (n >= modalCtx.list.length) n = modalCtx.list.length - 1;

  // 이동 불가면 → 현재 카드만 흔들고 종료
  if (n === modalCtx.index) {
    shakeCard(dir);
    return;
  }

  // 🔥 카드 먼저 교체
  openProfileAt(modalCtx.list, n);

  // 🔥 교체된 카드에 흔들림 적용 (핵심)
  requestAnimationFrame(() => {
    shakeCard(dir);
  });

  swipeCount++;
  localStorage.setItem("memberSwipeCount", swipeCount);
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
      phone: state._authPhone,
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


let calendar = null;
let allEvents = [];
let calendarCache = {};


function loadCalendar(yyyymm){

  if (__calendarReloading) return;
  __calendarReloading = true;

  const base = yyyymm
    ? new Date(yyyymm.slice(0,4), Number(yyyymm.slice(4))-1, 1)
    : new Date();

  // 전월 / 현재월 / 다음월
  const months = [
    new Date(base.getFullYear(), base.getMonth()-1, 1),
    new Date(base.getFullYear(), base.getMonth(),   1),
    new Date(base.getFullYear(), base.getMonth()+1, 1),
  ];

  const keys = months.map(d =>
    `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,"0")}`
  );

  const need = keys.filter(k => !calendarCache[k]);

  // 이미 다 캐시돼 있으면 바로 그림
if (!need.length) {
  allEvents = keys.flatMap(k => calendarCache[k]);
  initCalendar(allEvents);
  __calendarReloading = false;   // 🔥 반드시 풀어준다
  return;
}


  Promise.all(
    need.map(k =>
  new Promise((resolve)=>{
    api("events", { yyyymm: k }, resolve);
  }).then(res => {

    const list = (res?.events || []).map(e => ({
      id: e.id,
      title: e.title,
      start: e.startTime ? `${e.date}T${e.startTime}` : `${e.date}T00:00`,
      end: e.endTime ? `${e.date}T${e.endTime}` : null,
      extendedProps: {
        date: e.date,
        startTime: e.startTime,
        place: e.place,
        desc: e.desc
      }
    }));

    calendarCache[k] = list;
  })
)




  ).then(() => {
    allEvents = keys.flatMap(k => calendarCache[k]);
    initCalendar(allEvents);
    __calendarReloading = false;   // ← 추가
  }).catch(e=>{
    console.error(e);
    toast("달력 일정 불러오기 실패");
    __calendarReloading = false;   // ← 추가
  });
}




function initCalendar(events){
  const el = document.getElementById("calendar");
  if (!el) return;



// 🔄 달력 로딩중 표시
const loading = document.getElementById("calendarLoading");
if (loading) loading.style.display = "block";



if (calendar) {
  calendar.removeAllEvents();
  calendar.addEventSource(events);
  calendar.render();

  // 🔥 추가 (이거 한줄이 핵심)
  const loading = document.getElementById("calendarLoading");
  if (loading) loading.style.display = "none";

  return;
}


  // ✅ 처음 한 번만 생성
  calendar = new FullCalendar.Calendar(el, {
    locale: "ko",
    initialView: "dayGridMonth",
    height: "auto",

    headerToolbar: {
      left: "prev,next",
      center: "title",
      right: ""
    },

    // 날짜 숫자만 표시
    dayCellContent(arg) {
      return { html: String(arg.date.getDate()) };
    },

    // 달력 칸에는 제목만
    eventContent(arg) {
      return {
        html: `<span class="fc-title-only">${arg.event.title}</span>`
      };
    },

    // 날짜 클릭 → 팝업
    dateClick(info){
      openDayEvents(info.dateStr);
    },

    eventClick(info) {
      info.jsEvent.preventDefault();
    },

    // 🔥 달 이동할 때마다 해당 월 일정 다시 불러오기
datesSet(info){
  if (__calendarReloading) return;  // 🔥 중복 방지

  const yyyymm =
    info.start.getFullYear() +
    String(info.start.getMonth() + 1).padStart(2, "0");

  loadCalendar(yyyymm);
},


    events
  });

  calendar.render();

// ✅ 달력 로딩 완료 → 로딩 문구 숨김
if (loading) loading.style.display = "none";



}

function openDayEvents(date){
  const list = allEvents.filter(e =>
    e.extendedProps?.date === date
  );

  if (!list.length){
    openModal(`<h3>${date}</h3><p>일정이 없습니다.</p>`);
    return;
  }

openModal(`
  <!-- 날짜 제목 : 가운데 정렬 -->
  <div style="text-align:center;margin-bottom:12px;">
    <h3 style="margin:0;">📅 ${date}</h3>
  </div>

  ${list.map(e=>`
    <div style="margin-top:14px;padding-bottom:14px;border-bottom:1px solid #eee">

      <!-- 일정 제목 : 가운데 -->
      <div style="
        text-align:center;
        font-weight:600;
        font-size:16px;
      ">
        ${e.title}
      </div>

      <!-- 시간 / 장소 : 가운데 -->
      <div style="
        text-align:center;
        color:#64748b;
        font-size:13px;
        margin-top:4px;
      ">
        ${e.extendedProps?.startTime || ""} ${e.extendedProps?.place || ""}
      </div>

      <!-- 내용 : 왼쪽 정렬 (핵심 수정) -->
      <div style="
        margin-top:8px;
        white-space:pre-wrap;
        line-height:1.6;
        text-align:left;
      ">${String(e.extendedProps?.desc || "").trim()}</div>

    </div>
  `).join("")}
`);

}


function reloadMembers() {
  if (!state._authPhone || !state._authCode) {
    toast("다시 로그인 후 시도");
    return;
  }

  toast("회원명부 업데이트 중...");

  api("data", {}, (json) => {
    if (!json || json.ok !== true) {
      toast("회원명부 불러오기 실패");
      return;
    }

    // ✅ 최신 시트 데이터로 state 갱신
    state.members = onlyRealMembers(json.members || [])
      .map(m => ({ ...m, phone: normalizePhone(m.phone) }));

    // ✅ 정렬 (로그인 때와 동일)
    state.members.sort((a, b) =>
      (Number(a.sortOrder ?? 9999) - Number(b.sortOrder ?? 9999)) ||
      (a.name || "").localeCompare(b.name || "", "ko")
    );

    // ✅ 검색어 초기화
    const input = el("memberSearch");
    if (input) input.value = "";

    // ✅ 다시 렌더
    renderMembers(state.members);

    toast("회원명부 업데이트 완료");
  });
}









function openModal(html){
  const modal = document.getElementById("modal");
  const body  = document.getElementById("modalBody");
  body.innerHTML = html;
  body.scrollTop = 0;   // ✅ 이 줄 추가
  modal.hidden = false;
}

function closeModal(){
  const modal = document.getElementById("modal");
  modal.hidden = true;
}

function confirmAlerts(rows){
  if (!Array.isArray(rows) || !rows.length) {
    console.warn("confirmAlerts: rows empty → skip");
    closeModal();
    return;
  }

  api("markEventsNotified", { rows }, ()=>{
    closeModal();
  });
}


let __calendarReloading = false;



// 📅 달력 새로고침 버튼 (완전 초기화)

el("btnCalendarRefresh")?.addEventListener("click", () => {

// 🔄 달력 새로고침 시작 → 로딩 표시
const loading = document.getElementById("calendarLoading");
if (loading) loading.style.display = "block";

  // 🔥 강제로 락 해제
  __calendarReloading = false;

  // 🔥 캐시 완전 초기화
  calendarCache = {};
  allEvents = [];

  // 🔥 달력 인스턴스 제거
  if (calendar) {
    calendar.destroy();
    calendar = null;
  }

  // 🔥 현재 달 기준 재로딩
  const now = new Date();
  const yyyymm =
    now.getFullYear() +
    String(now.getMonth() + 1).padStart(2, "0");

  loadCalendar(yyyymm);
});


// 🔄 공지사항 다시 불러오기
function reloadAnnouncements(){
  api("data", {}, (json)=>{
    if (!json || json.ok !== true) {
      toast("공지 새로고침 실패");
      return;
    }

    state.announcements = json.announcements || [];
    renderAnnouncements();
    renderLatest(); // 홈 최신공지도 같이 갱신
    toast("공지사항 새로고침 완료");
  });
}




// ===== 이름 5초 롱터치 중앙 애니메이션 (안정화 버전) =====
window.addEventListener("load", () => {

  const box = el("loginUserName");
  const overlay = el("holdOverlay");
  const circle = overlay?.querySelector("circle");

  if(!box || !overlay || !circle) {
    console.log("롱터치 DOM 못찾음");
    return;
  }

  overlay.style.pointerEvents = "none";

  let start = 0;
  let raf = null;
  const HOLD_DELAY = 3000;   // 처음 3초 대기
const HOLD_TIME  = 2000;   // 원형 애니메이션 2초

  function reset(){
  overlay.hidden = true;
  start = 0;   // ⭐ 핵심 (지연 시작 취소)
  cancelAnimationFrame(raf);
}

  function loop(){
    const p = Math.min(1,(Date.now()-start)/HOLD_TIME);

    if(circle && circle.style){
      circle.style.strokeDashoffset = 100 - (100*p);
    }

    if(p>=1){
      reset();

      if(confirm("앱 캐시를 초기화하시겠습니까?")){
        localStorage.clear();
        caches.keys().then(keys=>{
          keys.forEach(k=>caches.delete(k));
        });
        alert("초기화되었습니다. 다시 로그인하세요.");
        location.reload();
      }
      return;
    }

    raf = requestAnimationFrame(loop);
  }

  box.addEventListener("touchstart",()=>{

  start = Date.now();

  // ⭐ 처음엔 아무것도 안보임
  overlay.hidden = true;

  setTimeout(()=>{

    // 아직 손 안뗐으면 애니메이션 시작
    if(!start) return;

    overlay.hidden = false;
    start = Date.now();
    loop();

  }, HOLD_DELAY);

});

  box.addEventListener("touchend",reset);
  box.addEventListener("touchcancel",reset);

});

function isKakaoInApp() {
  return /KAKAOTALK/i.test(navigator.userAgent);
}