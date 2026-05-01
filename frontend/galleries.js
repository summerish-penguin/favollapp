/* =====================================================================
   CONFIGURAZIONE — modifica qui le tue foto
   ===================================================================== */
const PHOTOS = [
  { src: "assets/casa/piscina.jpg", desc: "Piscina" },
  { src: "assets/casa/piscina2.jpg", desc: "Piscina" },
  { src: "assets/casa/piscina3.jpg", desc: "Piscina" },
  { src: "assets/casa/piscina4.jpg", desc: "Piscina" },
  { src: "assets/casa/piscina5.jpg", desc: "Piscina" },
  { src: "assets/casa/esterni.jpg", desc: "Esterni" },
  { src: "assets/casa/esterni2.jpg", desc: "Esterni" },
  { src: "assets/casa/esterni3.jpg", desc: "Esterni" },
  { src: "assets/casa/esterni4.jpg", desc: "Esterni" },
  { src: "assets/casa/esterni5.jpg", desc: "Esterni" },
  { src: "assets/casa/soggiorno1.jpg", desc: "Soggiorno" },
  { src: "assets/casa/soggiorno2.jpg", desc: "Soggiorno" },
  { src: "assets/casa/cucina1.jpg", desc: "Cucina" },
  { src: "assets/casa/cucina2.jpg", desc: "Cucina" },
  { src: "assets/casa/camera1.jpg", desc: "Stanza" },
  { src: "assets/casa/camera2.jpg", desc: "Stanza" },
  { src: "assets/casa/camera3.jpg", desc: "Stanza" },
  { src: "assets/casa/camera4.jpg", desc: "Stanza" },
  { src: "assets/casa/camera5.jpg", desc: "Stanza" },
  { src: "assets/casa/camera6.jpg", desc: "Stanza" },
  { src: "assets/casa/camera7.jpg", desc: "Stanza" },
  { src: "assets/casa/camera8.jpg", desc: "Stanza" },
  { src: "assets/casa/balcone.jpg", desc: "Balcone" },
  { src: "assets/casa/balcone2.jpg", desc: "Balcone" },
];

/* =====================================================================
   INIT
   ===================================================================== */
const box     = document.getElementById("ss-box");
const track   = document.getElementById("ss-track");
const dotsEl  = document.getElementById("ss-dots");
const counter = document.getElementById("ss-counter");
const playBtn = document.getElementById("ss-play");
const speedIn = document.querySelector("#ss-box #ss-speed");
const speedOut = document.querySelector("#ss-box #ss-speed-out");

let current  = 0;
let delay    = 4000;
let timer    = null;

/* SWIPE VARS */
let touchStartX = 0;
let touchEndX = 0;
const SWIPE_THRESHOLD = 50; // px minimi per considerarlo swipe

/* Crea le slide dinamicamente */
PHOTOS.forEach((photo, i) => {
  const slide = document.createElement("div");
  slide.className = "ss-slide" + (i === 0 ? " active" : "");
  slide.dataset.index = i;

  const img = document.createElement("img");
  img.src = photo.src;
  img.alt = photo.desc || "";

  slide.appendChild(img);

  track.insertBefore(slide, document.getElementById("ss-prev"));

  const dot = document.createElement("button");
  dot.className = "ss-dot" + (i === 0 ? " active" : "");
  dot.setAttribute("aria-label", "Vai alla foto " + (i + 1));
  dot.onclick = () => { goTo(i); if (timer) startAuto(); };
  dotsEl.appendChild(dot);
});

updateCounter();
updateDesc();

/* =====================================================================
   NAVIGAZIONE
   ===================================================================== */
function goTo(n) {
  const slides = track.querySelectorAll(".ss-slide");
  const dots   = dotsEl.querySelectorAll(".ss-dot");

  slides[current].classList.remove("active");
  dots[current].classList.remove("active");

  current = ((n % PHOTOS.length) + PHOTOS.length) % PHOTOS.length;

  slides[current].classList.add("active");
  dots[current].classList.add("active");

  updateCounter();
  updateDesc();
}

function updateCounter() {
  counter.textContent = (current + 1) + " / " + PHOTOS.length;
}

function updateDesc() {
  const el = document.getElementById("ss-desc");
  if (el) el.textContent = PHOTOS[current].desc ?? "";
}

const prevBtn = document.getElementById("ss-prev");
const nextBtn = document.getElementById("ss-next");

prevBtn.onclick = () => {
  goTo(current - 1);
  if (timer) startAuto();
};

nextBtn.onclick = () => {
  goTo(current + 1);
  if (timer) startAuto();
};

/* Tastiera */
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft")  { goTo(current - 1); if (timer) startAuto(); }
  if (e.key === "ArrowRight") { goTo(current + 1); if (timer) startAuto(); }
});

/* =====================================================================
   SWIPE TOUCH
   ===================================================================== */
track.addEventListener("touchstart", (e) => {
  touchStartX = e.changedTouches[0].screenX;
});

track.addEventListener("touchend", (e) => {
  touchEndX = e.changedTouches[0].screenX;
  handleSwipe();
});

function handleSwipe() {
  const diff = touchStartX - touchEndX;

  if (Math.abs(diff) < SWIPE_THRESHOLD) return;

  if (diff > 0) {
    // swipe verso sinistra → prossima slide
    goTo(current + 1);
  } else {
    // swipe verso destra → slide precedente
    goTo(current - 1);
  }

  if (timer) startAuto();
}

/* =====================================================================
   AUTOPLAY
   ===================================================================== */
function startAuto() {
  clearInterval(timer);
  timer = setInterval(() => goTo(current + 1), delay);
  playBtn.textContent = "⏸ Slideshow";
}

function stopAuto() {
  clearInterval(timer);
  timer = null;
  playBtn.textContent = "▶ Slideshow";
}

playBtn.onclick = () => { timer ? stopAuto() : startAuto(); };

speedIn.oninput = () => {
  delay = parseInt(speedIn.value) * 1000;
  speedOut.textContent = speedIn.value + "s";
  if (timer) startAuto();
};

/* Hover */
track.addEventListener("mouseenter", stopAuto);
track.addEventListener("mouseleave", () => startAuto());

startAuto();


/* =====================================================================
   USER GALLERY (solo frontend)
   ===================================================================== */

let USER_PHOTOS = [];
let userCurrent = 0;
let userTimer = null;

const userTrack = document.getElementById("user-ss-track");
const userDots = document.getElementById("user-ss-dots");
const userCounter = document.getElementById("user-ss-counter");
const userPlay = document.getElementById("user-ss-play");
const userUpload = document.getElementById("user-upload");

/* LOAD da localStorage */
const saved = localStorage.getItem("user_photos");
if (saved) {
  USER_PHOTOS = JSON.parse(saved);
  USER_PHOTOS.forEach(addUserSlide);
  updateUserUI();
}

/* UPLOAD */
userUpload.addEventListener("change", (e) => {
  const files = Array.from(e.target.files);

  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (ev) => {
      const photo = { src: ev.target.result, desc: "Caricata" };
      USER_PHOTOS.push(photo);
      addUserSlide(photo, USER_PHOTOS.length - 1);
      localStorage.setItem("user_photos", JSON.stringify(USER_PHOTOS));
      updateUserUI();
    };
    reader.readAsDataURL(file);
  });
});

/* CREA SLIDE */
function addUserSlide(photo, i = 0) {
  const slide = document.createElement("div");
  slide.className = "ss-slide" + (i === 0 ? " active" : "");

  const img = document.createElement("img");
  img.src = photo.src;

  slide.appendChild(img);
  userTrack.insertBefore(slide, document.getElementById("user-ss-prev"));

  const dot = document.createElement("button");
  dot.className = "ss-dot" + (i === 0 ? " active" : "");
  dot.onclick = () => userGoTo(i);

  userDots.appendChild(dot);
}

/* NAV */
function userGoTo(n) {
  const slides = userTrack.querySelectorAll(".ss-slide");
  const dots = userDots.querySelectorAll(".ss-dot");

  if (!slides.length) return;

  slides[userCurrent]?.classList.remove("active");
  dots[userCurrent]?.classList.remove("active");

  userCurrent = ((n % slides.length) + slides.length) % slides.length;

  slides[userCurrent].classList.add("active");
  dots[userCurrent].classList.add("active");

  updateUserUI();
}

function updateUserUI() {
  userCounter.textContent = `${userCurrent + 1} / ${USER_PHOTOS.length}`;
}

/* BOTTONI */
document.getElementById("user-ss-prev").onclick = () => userGoTo(userCurrent - 1);
document.getElementById("user-ss-next").onclick = () => userGoTo(userCurrent + 1);

/* SWIPE */
let uStartX = 0;

userTrack.addEventListener("touchstart", e => {
  uStartX = e.changedTouches[0].screenX;
});

userTrack.addEventListener("touchend", e => {
  let diff = uStartX - e.changedTouches[0].screenX;

  if (Math.abs(diff) < 50) return;

  if (diff > 0) userGoTo(userCurrent + 1);
  else userGoTo(userCurrent - 1);
});

/* =====================================================================
   MODAL GESTIONE FOTO
   ===================================================================== */

const manageBtn = document.getElementById("user-manage-btn");
const modal = document.getElementById("user-modal");
const closeModal = document.getElementById("user-close-modal");
const listEl = document.getElementById("user-photo-list");

/* APRI */
manageBtn.onclick = () => {
  renderPhotoList();
  modal.classList.remove("hidden");
};

/* CHIUDI */
closeModal.onclick = () => {
  modal.classList.add("hidden");
};

/* RENDER LISTA */
function renderPhotoList() {
  listEl.innerHTML = "";

  USER_PHOTOS.forEach((photo, index) => {
    const row = document.createElement("div");
    row.className = "user-photo-item";

    const img = document.createElement("img");
    img.src = photo.src;

    const btn = document.createElement("button");
    btn.textContent = "Elimina";
    btn.onclick = () => deletePhoto(index);

    row.appendChild(img);
    row.appendChild(btn);

    listEl.appendChild(row);
  });
}

/* DELETE */
function deletePhoto(index) {
  USER_PHOTOS.splice(index, 1);

  localStorage.setItem("user_photos", JSON.stringify(USER_PHOTOS));

  rebuildUserGallery();
  renderPhotoList();
}

/* RICOSTRUISCE SLIDER */
function rebuildUserGallery() {
  userTrack.querySelectorAll(".ss-slide").forEach(el => el.remove());
  userDots.innerHTML = "";

  USER_PHOTOS.forEach((photo, i) => {
    addUserSlide(photo, i);
  });

  userCurrent = Math.min(userCurrent, USER_PHOTOS.length - 1);
  if (userCurrent < 0) userCurrent = 0;
  updateUserUI();
}