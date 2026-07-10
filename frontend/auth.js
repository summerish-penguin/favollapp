// auth.js — stato di sessione lato client per il login "rivendica una personH".
// Incluso in ogni pagina protetta. Il gating vero (redirect se non loggato) è fatto
// dallo script inline nel <head> di ogni pagina, per evitare il flash di contenuto;
// qui gestiamo lettura/scrittura dell'utente e il badge "Sei … / Esci" nell'header.
//
// La protezione è solo lato client: identifica chi sei per la UI, non è una barriera
// di sicurezza (il backend resta aperto). Vedi routers_auth.py.

const AUTH_KEY = 'favollapp-user';

// Utente loggato ({ name, desc, icon }) o null
function getCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function setCurrentUser(user) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  window.location.replace('login.html');
}

// Inietta nell'header il badge con la personH loggata e il bottone "Esci".
// Non tocca l'HTML statico delle pagine: si aggancia al blocco .header condiviso.
function renderUserBadge() {
  const user = getCurrentUser();
  const header = document.querySelector('.header');
  if (!user || !header || document.getElementById('user-badge')) return;

  const badge = document.createElement('div');
  badge.id = 'user-badge';
  badge.className = 'user-badge';

  const icon = document.createElement('span');
  icon.className = 'user-badge-icon';
  icon.textContent = user.icon || '🦀';

  const name = document.createElement('span');
  name.className = 'user-badge-name';
  name.textContent = user.name;

  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'user-logout';
  logoutBtn.type = 'button';
  logoutBtn.textContent = 'Esci';
  logoutBtn.title = 'Esci';
  logoutBtn.addEventListener('click', logout);

  badge.append(icon, name, logoutBtn);
  header.appendChild(badge);
}

document.addEventListener('DOMContentLoaded', renderUserBadge);
