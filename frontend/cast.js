// cast.js — genera le card utente della pagina "Cast"

const container = document.getElementById('cast-container');

init();

// Avvia il caricamento degli utenti all'apertura pagina
async function init() {
  await loadUsers();
}

// Recupera la lista utenti dal backend e la passa al render
async function loadUsers() {
  try {
    const res = await fetch(`${API_BASE}/users`);
    const users = await res.json();

    renderUsers(users);
  } catch (e) {
    console.error('LOAD USERS ERROR:', e);
  }
}

// Svuota il container e ricrea una card per ogni utente
function renderUsers(users) {
  container.innerHTML = '';

  users.forEach((user) => {
    container.appendChild(createUserCard(user));
  });
}

// Genera un colore HSL deterministico da una stringa (non ancora usata in UI)
function stringToColor(str) {
  if (!str) return '#ccc';

  let hash = 0;

  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  const h = hash % 360;

  const s = 60;

  const l = 65;

  return `hsl(${h}, ${s}, ${l})`;
}

// Costruisce il DOM della card utente (header, body, footer)
function createUserCard(user) {
  const card = document.createElement('div');
  card.classList.add('user-card');

  // HEADER
  const header = document.createElement('div');
  header.classList.add('user-header');

  // Avatar placeholder (future-proof)
  const avatar = document.createElement('div');
  avatar.classList.add('user-avatar');
  avatar.innerText = user.icon;

  // Nome
  const name = document.createElement('div');
  name.classList.add('user-name');
  name.innerText = user.name;

  header.append(name, avatar);

  // BODY (placeholder per future info)
  const body = document.createElement('div');
  body.classList.add('user-body');

  const placeholder = document.createElement('div');
  placeholder.classList.add('user-placeholder');
  placeholder.innerText = user.desc || 'Nessuna informazione';

  body.append(placeholder);

  // FOOTER (espandibile in futuro)
  const footer = document.createElement('div');
  footer.classList.add('user-footer');

  // composizione card
  card.append(header, body, footer);

  return card;
}

// Estrae le iniziali da un nome (non ancora usata in UI)
function getInitials(name) {
  if (!name || typeof name !== 'string') return '';

  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}
