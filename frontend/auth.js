// auth.js — stato di sessione lato client per il login "rivendica una personH".
// Incluso in ogni pagina protetta. Il gating vero (redirect se non loggato) è fatto
// dallo script inline nel <head> di ogni pagina, per evitare il flash di contenuto;
// qui gestiamo lettura/scrittura dell'utente e il badge "Sei … / Esci" nell'header.
//
// La protezione è solo lato client: identifica chi sei per la UI, non è una barriera
// di sicurezza (il backend resta aperto). Vedi routers_auth.py.

const AUTH_KEY = 'favollapp-user';
const TOKEN_KEY = 'favollapp-token';

// Utente loggato ({ name, desc, icon, is_admin }) o null
function getCurrentUser() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

// Token JWT usato per autenticare le richieste di scrittura verso il backend
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Header Authorization da unire alle fetch di scrittura ({} se non loggato)
function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Salva utente + token al login
function setSession(user, token) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  if (token) localStorage.setItem(TOKEN_KEY, token);
}

function logout() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(TOKEN_KEY);
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

  // Trigger (icona): un tap mostra/nasconde il bottone "Esci"
  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'user-badge-trigger';
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-label', `Utente: ${user.name}`);

  // Icona utente (SVG in assets, colorata via CSS mask così segue il tema)
  const icon = document.createElement('span');
  icon.className = 'user-badge-icon';
  icon.setAttribute('aria-hidden', 'true');

  trigger.append(icon);

  // Popover che si apre sotto la pill, sovrapposto alla pagina
  const menu = document.createElement('div');
  menu.className = 'user-menu';
  menu.setAttribute('role', 'menu');

  const logoutBtn = document.createElement('button');
  logoutBtn.className = 'user-logout';
  logoutBtn.type = 'button';
  logoutBtn.textContent = '🚪 Esci';
  logoutBtn.title = 'Esci';
  logoutBtn.setAttribute('role', 'menuitem');
  logoutBtn.addEventListener('click', logout);
  menu.append(logoutBtn);

  // Tap sulla pill: apre o chiude il popover
  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    const open = badge.classList.toggle('open');
    trigger.setAttribute('aria-expanded', String(open));
  });

  // Tap fuori dal badge: richiude
  document.addEventListener('click', (e) => {
    if (!badge.contains(e.target)) {
      badge.classList.remove('open');
      trigger.setAttribute('aria-expanded', 'false');
    }
  });

  badge.append(trigger, menu);
  header.appendChild(badge);
}

document.addEventListener('DOMContentLoaded', renderUserBadge);
