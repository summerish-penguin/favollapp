// cast.js — genera il roster della pagina "Cast"

const col1 = document.getElementById('cast-col-1');
const col2 = document.getElementById('cast-col-2');

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

// Svuota le due colonne e ridistribuisce i membri alternandoli (pari/dispari)
// per bilanciarne l'altezza indipendentemente dal numero di persone
function renderUsers(users) {
  col1.innerHTML = '';
  col2.innerHTML = '';

  users.forEach((user, i) => {
    const target = i % 2 === 0 ? col1 : col2;
    target.appendChild(createMemberCard(user));
  });
}

// Ricava una tinta HSL deterministica dal nome: stessa persona, stesso colore ad ogni apertura
function hueFromName(str) {
  if (!str) return 210;

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }

  return Math.abs(hash) % 360;
}

// Costruisce il DOM di un membro: avatar colorato, nome, ruolo
function createMemberCard(user) {
  const card = document.createElement('div');
  card.classList.add('member');
  card.style.setProperty('--hue', hueFromName(user.name));

  const avatar = document.createElement('div');
  avatar.classList.add('avatar');
  avatar.innerText = user.icon || getInitials(user.name);

  const info = document.createElement('div');
  info.classList.add('info');

  const name = document.createElement('div');
  name.classList.add('name');
  name.innerText = user.name;

  const role = document.createElement('div');
  role.classList.add('role');
  role.innerText = user.desc || 'Nessuna informazione';

  info.append(name, role);
  card.append(avatar, info);

  return card;
}

// Estrae le iniziali da un nome, usate come avatar quando manca l'icona
function getInitials(name) {
  if (!name || typeof name !== 'string') return '';

  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}
