/* ==========================================================================
   CAST.JS – USER CARDS
   ========================================================================== */

const API_BASE = "https://favollapp.onrender.com";

const container = document.getElementById("cast-container");

init();

async function init() {
  await loadUsers();
}

/* ========================= */

async function loadUsers() {
  try {
    const res = await fetch(`${API_BASE}/users`);
    const users = await res.json();

    renderUsers(users);

  } catch (e) {
    console.error("LOAD USERS ERROR:", e);
  }
}

/* ========================= */

function renderUsers(users) {
  container.innerHTML = "";

  users.forEach(user => {
    container.appendChild(createUserCard(user));
  });
}

/* ========================= */

function createUserCard(user) {
  const card = document.createElement("div");
  card.classList.add("user-card");

  // HEADER
  const header = document.createElement("div");
  header.classList.add("user-header");

  // Avatar placeholder (future-proof)
  const avatar = document.createElement("div");
  avatar.classList.add("user-avatar");
  avatar.innerText = getInitials(user);

  // Nome
  const name = document.createElement("div");
  name.classList.add("user-name");
  name.innerText = user;

  header.append(avatar, name);

  // BODY (placeholder per future info)
  const body = document.createElement("div");
  body.classList.add("user-body");

  const placeholder = document.createElement("div");
  placeholder.classList.add("user-placeholder");
  placeholder.innerText = "Nessuna informazione";

  body.appendChild(placeholder);

  // FOOTER (espandibile in futuro)
  const footer = document.createElement("div");
  footer.classList.add("user-footer");

  // composizione card
  card.append(header, body, footer);

  return card;
}

/* ========================= */

function getInitials(name) {
  return name
    .split(" ")
    .map(n => n[0])
    .join("")
    .toUpperCase();
}