
//=========================
// 🔒 모바일 줌 완전 차단 (전역 - 안정버전)
// ===============================
(function blockZoom(){

  // 두 손가락 확대 차단
  document.addEventListener("touchmove", e => {

    if(e.target.closest("#screenLogin")) return;

    if (e.touches && e.touches.length > 1) {
      e.preventDefault();
    }
  }, { passive:false });

  // 더블탭 확대 차단
  let lastTouchEnd = 0;
  document.addEventListener("touchend", e => {

    if(
      e.target.closest("#screenLogin") ||
      e.target.closest(".pw-toggle") ||
      e.target.closest(".input") ||
      e.target.closest(".checkline") ||
      e.target.closest("#btnLogin")
    ) return;

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
  events: el("screenEvents"),
  calendar: el("screenCalendar"),
  lionism: el("screenLionism"),
  ceremony: el("screenCeremony")
};