// Client Supabase per il bucket di foto condivise
const SUPABASE_URL = "https://mmaitmbnqxyhgqxqgemc.supabase.co";
const SUPABASE_KEY = "sb_publishable_EgtesJLpewnm1C2qfE2v3A_5xESFLJA";
const sbInstance = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ==== HOUSE GALLERY (foto statiche fisse, definite in PHOTOS) ====

// Elenco foto della casa — modifica qui per aggiungerne/rimuoverne
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

// Riferimenti DOM e stato dello slideshow
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

let touchStartX = 0;
let touchEndX = 0;
const SWIPE_THRESHOLD = 50; // px minimi per considerarlo swipe

// Crea le slide e i relativi dot indicatori, uno per foto
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

// Naviga alla slide n, con wraparound
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

// Frecce da tastiera
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft")  { goTo(current - 1); if (timer) startAuto(); }
  if (e.key === "ArrowRight") { goTo(current + 1); if (timer) startAuto(); }
});

// Gestisce lo swipe touch orizzontale
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

// Avvia/ferma lo slideshow automatico
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

// Pausa lo slideshow al passaggio del mouse, riparte all'uscita
track.addEventListener("mouseenter", stopAuto);
track.addEventListener("mouseleave", () => startAuto());

startAuto();


// ==== USER GALLERY (foto caricate dagli utenti via Supabase) ====

let USER_PHOTOS = [];
let userCurrent = 0;
let userTimer = null;
let userDelay = 4000;

const userTrack = document.getElementById("user-ss-track");
const userDots = document.getElementById("user-ss-dots");
const userCounter = document.getElementById("user-ss-counter");
const userPlay = document.getElementById("user-ss-play");
const userUpload = document.getElementById("user-upload");
const userSpeedIn = document.querySelector("#user-ss-speed");
const userSpeedOut = document.querySelector("#user-ss-speed-out");

// Spinner globale mostrato durante le operazioni Supabase (upload, delete, load)
const loader = document.getElementById("global-loader");

function showLoader() {
  loader.classList.remove("hidden");
}

function hideLoader() {
  loader.classList.add("hidden");
}

// Avvia/ferma lo slideshow automatico della gallery utenti
userPlay.onclick = () => {
  userTimer ? stopUserAuto() : startUserAuto();
};

if (userSpeedIn) {
  userSpeedIn.oninput = () => {
    userDelay = parseInt(userSpeedIn.value) * 1000;

    if (userSpeedOut) {
      userSpeedOut.textContent = userSpeedIn.value + "s";
    }

    if (userTimer) startUserAuto();
  };
}

// Carica le foto caricate dagli utenti dal bucket Supabase
async function loadFromSupabase() {
  showLoader();

  const { data, error } = await sbInstance
    .storage
    .from("gallery")
    .list("", { limit: 100 });

  if (!error && data) {
    USER_PHOTOS = data.map(file => {
      const { data: urlData } = sbInstance
        .storage
        .from("gallery")
        .getPublicUrl(file.name);

      return { src: urlData.publicUrl };
    });

    rebuildUserGallery();
  }

  hideLoader();
}

loadFromSupabase().then(() => {
  startUserAuto();
});

// Carica su Supabase le foto selezionate dall'utente e le aggiunge alla gallery
userUpload.addEventListener("change", async (e) => {
  showLoader();

  const files = Array.from(e.target.files);

  for (const file of files) {
    const cleanName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, "");
    const fileName = Date.now() + "_" + cleanName;

    const { error } = await sbInstance.storage
      .from("gallery")
      .upload(fileName, file, {
        contentType: file.type,
        upsert: true
      });

    if (error) continue;

    const { data } = sbInstance.storage
      .from("gallery")
      .getPublicUrl(fileName);

    USER_PHOTOS.push({ src: data.publicUrl });
  }

  rebuildUserGallery();
  hideLoader();
});

// Crea una slide + il relativo dot per una foto utente
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

// Naviga alla slide n della gallery utenti, con wraparound
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
  if (userTimer) startUserAuto();
}

function updateUserUI() {
  userCounter.textContent = `${userCurrent + 1} / ${USER_PHOTOS.length}`;
}

// Frecce prev/next della gallery utenti
document.getElementById("user-ss-prev").onclick = () => userGoTo(userCurrent - 1);
document.getElementById("user-ss-next").onclick = () => userGoTo(userCurrent + 1);

// Gestisce lo swipe touch orizzontale sulla gallery utenti
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

// Avvia/ferma lo slideshow automatico della gallery utenti
function startUserAuto() {
  stopUserAuto();
  if (USER_PHOTOS.length <= 1) return;

  userTimer = setInterval(() => {
    userGoTo(userCurrent + 1);
  }, userDelay);

  userPlay.textContent = "⏸ Slideshow";
}

function stopUserAuto() {
  clearInterval(userTimer);
  userTimer = null;
  userPlay.textContent = "▶ Slideshow";
}

// ---- Modal gestione foto: apri/chiudi, lista foto con eliminazione ----

const manageBtn = document.getElementById("user-manage-btn");
const modal = document.getElementById("user-modal");
const closeModal = document.getElementById("user-close-modal");
const listEl = document.getElementById("user-photo-list");

manageBtn.onclick = () => {
  renderPhotoList();
  modal.classList.remove("hidden");
};

closeModal.onclick = () => {
  modal.classList.add("hidden");
};

// Ricostruisce la lista foto del modal (o un messaggio se vuota)
function renderPhotoList() {
  listEl.innerHTML = "";

  // gestione lista vuota
  if (!USER_PHOTOS.length) {
    const emptyMsg = document.createElement("p");
    emptyMsg.textContent = "Non ci sono foto da mostrare.";
    emptyMsg.className = "user-empty-message"; // opzionale per styling
    listEl.appendChild(emptyMsg);
    return;
  }

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

// Elimina una foto da Supabase e ricostruisce slider + lista modal
async function deletePhoto(index) {
  showLoader();

  const url = USER_PHOTOS[index].src;
  const fileName = url.split("/").pop();

  await sbInstance.storage.from("gallery").remove([fileName]);

  USER_PHOTOS.splice(index, 1);
  rebuildUserGallery();
  renderPhotoList();

  hideLoader();
}

// Ricostruisce lo slider utenti da zero a partire da USER_PHOTOS
function rebuildUserGallery() {
  userTrack.querySelectorAll(".ss-slide").forEach(el => el.remove());
  userDots.innerHTML = "";

  // caso nessuna foto
  if (!USER_PHOTOS.length) {
    const slide = document.createElement("div");
    slide.className = "ss-slide active user-empty-slide";

    const msg = document.createElement("p");
    msg.textContent = "Non ci sono foto da mostrare.";
    msg. className = "user-empty-message"
    
    slide.appendChild(msg);

    userTrack.insertBefore(slide, document.getElementById("user-ss-prev"));

    userCounter.textContent = "0 / 0";

    stopUserAuto(); // importante: ferma autoplay
    return;
  }

  // CASO NORMALE
  USER_PHOTOS.forEach((photo, i) => {
    addUserSlide(photo, i);
  });

  userCurrent = Math.min(userCurrent, USER_PHOTOS.length - 1);
  if (userCurrent < 0) userCurrent = 0;

  updateUserUI();
}