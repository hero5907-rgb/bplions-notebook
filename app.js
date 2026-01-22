const API_URL = "https://script.google.com/macros/s/AKfycbzxrE56OycproTXHzCKhbx_-B_qdFz_md7rUalCwwXjORSGa515SW85c_Ngy-Hi92baHg/exec";

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

let state = { me:null, settings:null, members:[], announcements:[], navStack:["login"] };

function normalizePhone(p){ return String(p||"").replace(/[^0-9]/g,""); }
function toast(msg){
  const t = el("toast");
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(()=>t.hidden=true, 1500);
}
function showScreen(name){
  Object.entries(screens).forEach(([k,node])=>node.hidden = (k!==name));
  const isLoggedIn = !!state.me;
  btnLogout.hidden = !isLoggedIn || name==="login";
  btnBack.hidden = state.navStack.length<=1 || name==="home" || name==="login";
}
function pushNav(name){ state.navStack.push(name); showScreen(name); }
function popNav(){ if(state.navStack.length>1) state.navStack.pop(); showScreen(state.navStack.at(-1)); }

btnBack.addEventListener("click", ()=>popNav());
btnLogout.addEventListener("click", ()=>{
  localStorage.removeItem(LS_KEY);
  state = { me:null, settings:null, members:[], announcements:[], navStack:["login"] };
  showScreen("login");
  toast("로그아웃");
});

function apiPost(payload) {
  // JSONP로 GAS doGet 호출 (CORS 우회)
  return new Promise((resolve, reject) => {
    const cbName = "__cb_" + Math.random().toString(36).slice(2);
    const params = new URLSearchParams();

    // payload -> querystring
    Object.entries(payload || {}).forEach(([k, v]) => {
      params.set(k, String(v ?? ""));
    });

    // JSONP callback + 캐시방지
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

    // 혹시 응답이 안 오는 경우 타임아웃
    setTimeout(() => {
      if (done) return;
      done = true;
      cleanup();
      reject(new Error("JSONP_TIMEOUT"));
    }, 12000);
  });
}



function setBrand(settings){
  el("districtText").textContent = settings?.district || "국제라이온스협회 356-E지구";
  el("clubNameText").textContent = settings?.clubName || "북포항라이온스클럽";
  el("coverTitle").textContent = settings?.clubName || "북포항라이온스클럽";
  el("coverSub").textContent = settings?.district || "국제라이온스협회 356-E지구";

  const logoUrl = settings?.logoUrl || "";
  const s = el("clubLogoSmall"), b = el("clubLogoBig");
  if(logoUrl){
    s.src = logoUrl; b.src = logoUrl;
    s.style.visibility="visible"; b.style.visibility="visible";
  } else {
    s.style.visibility="hidden"; b.style.visibility="hidden";
  }
}

function esc(s){
  return String(s??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

function downloadVCard(m){
  const vcf = `BEGIN:VCARD
VERSION:3.0
FN:${m.name||""}
TEL;TYPE=CELL:${m.phone||""}
ORG:${state.settings?.clubName || "북포항라이온스클럽"}
END:VCARD`;
  const blob = new Blob([vcf], {type:"text/vcard;charset=utf-8"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${m.name||"contact"}.vcf`;
  a.click();
  URL.revokeObjectURL(url);
}

function renderMembers(list){
  el("memberCountPill").textContent = `${list.length}명`;
  const wrap = el("memberList");
  wrap.innerHTML = "";
  if(!list.length){
    wrap.innerHTML = `<div class="row-sub">검색 결과가 없습니다.</div>`;
    return;
  }
  for(const m of list){
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      ${m.photoUrl ? `<img class="avatar" src="${esc(m.photoUrl)}" alt="사진">` : `<div class="avatar"></div>`}
      <div class="row-main">
        <div class="row-title">${esc(m.name)} ${m.position?`<span class="badge">${esc(m.position)}</span>`:""}</div>
        <div class="row-sub">${esc([m.group, m.phone].filter(Boolean).join(" / "))}</div>
        <div class="actions">
          <a class="a-btn primary" href="tel:${esc(m.phone)}">📞 통화</a>
          <a class="a-btn" href="sms:${esc(m.phone)}">💬 문자</a>
          <button class="a-btn" data-vcard="1">📇 저장</button>
        </div>
      </div>`;
    row.querySelector('[data-vcard="1"]').addEventListener("click", ()=>downloadVCard(m));
    wrap.appendChild(row);
  }
}

function renderAnnouncements(){
  const wrap = el("annList");
  wrap.innerHTML = "";
  const items = state.announcements || [];
  if(!items.length){
    wrap.innerHTML = `<div class="row-sub">등록된 공지사항이 없습니다.</div>`;
    return;
  }
  for(const a of items){
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="row-main">
        <div class="row-title">${esc(a.title||"")}</div>
        <div class="row-sub">${esc(a.date||"")} ${a.author?(" · "+esc(a.author)):""}</div>
        <div class="row-sub" style="white-space:normal;margin-top:8px;">${esc(a.body||"")}</div>
      </div>`;
    wrap.appendChild(row);
  }
}

function renderLatest(){
  const wrap = el("latestAnnouncements");
  wrap.innerHTML = "";
  const items = (state.announcements||[]).slice(0,3);
  if(!items.length){
    wrap.innerHTML = `<div class="row-sub">등록된 공지사항이 없습니다.</div>`;
    return;
  }
  for(const a of items){
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="row-main">
        <div class="row-title">${esc(a.title||"")}</div>
        <div class="row-sub">${esc(a.date||"")} ${a.author?(" · "+esc(a.author)):""}</div>
      </div>`;
    wrap.appendChild(row);
  }
}

async function handleLogin(){
  const phone = normalizePhone(el("inputPhone").value);
  const code  = String(el("inputCode").value||"").trim();
  console.log("LOGIN_INPUT", { phone, code, rawPhone: el("inputPhone").value, rawCode: el("inputCode").value });
  toast(`폰:${phone} 코드:${code}`);


  const keep  = el("keepLogin").checked;

  const err = el("loginError");
  err.hidden = true;

  if(!phone){ err.hidden=false; err.textContent="휴대폰번호를 입력하세요(숫자만)"; return; }
  if(!code){  err.hidden=false; err.textContent="접속코드를 입력하세요"; return; }

  el("btnLogin").disabled = true;
  el("btnLogin").textContent = "확인중...";

  try {
    const json = await apiPost({ action:"data", phone, code });
    if(!json.ok) throw new Error(json.error || "LOGIN_FAILED");

    state.me = json.me;
    state.settings = json.settings;
    state.members = (json.members||[]).map(m => ({...m, phone: normalizePhone(m.phone)}));
    state.announcements = json.announcements || [];

    setBrand(state.settings);
    state.members.sort((a,b)=>(a.name||"").localeCompare(b.name||"","ko"));
    renderLatest();
    renderAnnouncements();

    if(keep) localStorage.setItem(LS_KEY, JSON.stringify({ phone, code }));
    else localStorage.removeItem(LS_KEY);

    state.navStack = ["home"];
    showScreen("home");
    toast("접속완료");

  } catch(e) {
    err.hidden = false;
    err.textContent = "승인되지 않았거나 정보가 틀렸습니다.";
  } finally {
    el("btnLogin").disabled = false;
    el("btnLogin").textContent = "로그인";
  }
}

function bindNav(){
  document.querySelectorAll("[data-nav]").forEach(btn=>{
    btn.addEventListener("click", ()=>{
      const target = btn.getAttribute("data-nav");
      if(target==="members"){
        pushNav("members");
        el("memberSearch").value="";
        renderMembers(state.members);
      } else if(target==="announcements"){
        pushNav("announcements");
        renderAnnouncements();
      } else if(target==="purpose"){
        pushNav("text");
        el("textTitle").textContent="클럽 목적";
        el("textBody").textContent= state.settings?.purpose || "내용 준비중";
      } else if(target==="bylaws"){
        pushNav("text");
        el("textTitle").textContent="회칙";
        el("textBody").textContent= state.settings?.bylaws || "내용 준비중";
      }
    });
  });
}

function bindSearch(){
  el("memberSearch").addEventListener("input", ()=>{
    const q = el("memberSearch").value.trim().toLowerCase();
    if(!q){ renderMembers(state.members); return; }
    const filtered = state.members.filter(m=>{
      const hay = [m.name,m.position,m.group,m.phone].filter(Boolean).join(" ").toLowerCase();
      return hay.includes(q);
    });
    renderMembers(filtered);
  });
}

(function init(){
  bindNav();
  bindSearch();
  el("btnLogin").addEventListener("click", handleLogin);
  ["inputPhone","inputCode"].forEach(id=>{
    el(id).addEventListener("keydown", e=>{ if(e.key==="Enter") handleLogin(); });
  });

  const saved = localStorage.getItem(LS_KEY);
  if(saved){
    try{
      const {phone, code} = JSON.parse(saved);
      el("inputPhone").value = phone;
      el("inputCode").value = code;
      el("keepLogin").checked = true;
    }catch{}
  }
  showScreen("login");
})();
