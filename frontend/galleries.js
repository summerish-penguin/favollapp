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
const speedIn = document.getElementById("ss-speed");
const speedOut = document.getElementById("ss-speed-out");

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
  img.alt = photo.alt;

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
  const slides = document.querySelectorAll(".ss-slide");
  const dots   = document.querySelectorAll(".ss-dot");

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

document.getElementById("ss-prev").onclick = () => {
  goTo(current - 1);
  if (timer) startAuto();
};

document.getElementById("ss-next").onclick = () => {
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