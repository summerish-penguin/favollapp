// login.js — logica della pagina di accesso "rivendica una personH".
// Popola il menu con le personH (GET /users), invia le credenziali a POST /auth/login,
// salva l'utente loggato (auth.js) e reindirizza alla home.

const form = document.getElementById('login-form');
const userSelect = document.getElementById('login-user');
const passwordInput = document.getElementById('login-password');
const submitBtn = document.getElementById('login-submit');
const togglePasswordBtn = document.getElementById('toggle-password');

// Occhio: mostra/nasconde la password (di default nascosta)
togglePasswordBtn.addEventListener('click', () => {
  const show = passwordInput.type === 'password';
  passwordInput.type = show ? 'text' : 'password';
  togglePasswordBtn.classList.toggle('revealed', show);
  togglePasswordBtn.setAttribute('aria-pressed', String(show));
  togglePasswordBtn.setAttribute('aria-label', show ? 'Nascondi password' : 'Mostra password');
  passwordInput.focus();
});

// Popola il menu a tendina con le personH del gruppo
async function loadUsers() {
  try {
    const res = await fetch(`${API_BASE}/users`);
    const users = await res.json();
    users.forEach((u) => {
      const option = document.createElement('option');
      option.value = u.name;
      option.textContent = `${u.name}`;
      userSelect.appendChild(option);
    });
  } catch (e) {
    console.error('LOGIN USERS LOAD ERROR:', e);
    showToast('Impossibile caricare la lista. Riprova.');
  }
}

async function submitLogin(event) {
  event.preventDefault();

  const name = userSelect.value;
  const password = passwordInput.value.trim();

  if (!name) return showToast('Seleziona il tuo nome.');
  if (password.length < 4) return showToast('La password deve avere almeno 4 caratteri.');

  submitBtn.disabled = true;

  try {
    const res = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, password }),
    });
    const data = await res.json();

    if (!res.ok || !data.ok) {
      showToast(data.detail ?? 'Accesso non riuscito.');
      submitBtn.disabled = false;
      return;
    }

    setCurrentUser(data.user);
    if (data.claimed) showToast('BenvenutH! Password impostata.', 'success');
    window.location.replace('index.html');
  } catch (e) {
    console.error('LOGIN ERROR:', e);
    showToast('Errore di rete. Riprova.');
    submitBtn.disabled = false;
  }
}

form.addEventListener('submit', submitLogin);
loadUsers();
