// index.js — home page: countdown animato, badge di stato vivi sulle tile
// e strip del cast. I dati arrivano dal backend con degrado grazioso:
// se una fetch fallisce (es. Render addormentato) resta il testo statico.

const VACANZA = new Date('2026-08-12');

document.addEventListener('DOMContentLoaded', () => {
  const numEl = document.getElementById('countdown-days');
  const labelEl = document.getElementById('countdown-label');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const diff = Math.ceil((VACANZA - oggi) / (1000 * 60 * 60 * 24) - 1);

  if (diff === 0) {
    numEl.textContent = '🦀';
    labelEl.innerHTML = 'Si parte<br />oggi!';
    return;
  }

  if (diff < 0) return; // vacanza già iniziata/passata: lascia il placeholder statico

  // Conta da 0 al valore reale con un breve easing, per dare peso al numero
  if (reduceMotion) {
    numEl.textContent = diff;
    return;
  }

  const duration = 900;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    numEl.textContent = Math.round(eased * diff);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
});

// ---- Badge di stato sulle tile "Da fare adesso" ----

document.addEventListener('DOMContentLoaded', () => {
  loadTileStatuses();
  loadCastStrip();
});

// Sostituisce il sottotitolo statico della tile con uno stato colorato
function setTileStatus(id, text, kind) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.classList.remove('ok', 'warn', 'hot', 'info');
  el.classList.add(kind);
}

async function loadTileStatuses() {
  // Zaino: quanti oggetti non hanno ancora raggiunto il target
  try {
    const res = await fetch(`${API_BASE}/warehouse`);
    if (res.ok) {
      const items = await res.json();
      const scoperti = items.filter((i) => (i.total ?? 0) < (i.target ?? 1)).length;
      if (scoperti === 0) setTileStatus('status-zaino', 'Tutto coperto ✓', 'ok');
      else if (scoperti === 1) setTileStatus('status-zaino', '1 da coprire', 'warn');
      else setTileStatus('status-zaino', `${scoperti} da coprire`, 'warn');
    }
  } catch (e) {
    console.error('STATUS ZAINO ERROR:', e);
  }

  // Spesa: quante righe in lista
  try {
    const res = await fetch(`${API_BASE}/shopping`);
    if (res.ok) {
      const rows = await res.json();
      if (rows.length === 0) setTileStatus('status-spesa', 'Lista vuota ✓', 'ok');
      else if (rows.length === 1) setTileStatus('status-spesa', '1 da comprare', 'info');
      else setTileStatus('status-spesa', `${rows.length} da comprare`, 'info');
    }
  } catch (e) {
    console.error('STATUS SPESA ERROR:', e);
  }

  // Mappa: quanti luoghi salvati
  try {
    const res = await fetch(`${API_BASE}/locations`);
    if (res.ok) {
      const locs = await res.json();
      if (locs.length > 0) setTileStatus('status-mappa', `${locs.length} luoghi`, 'info');
    }
  } catch (e) {
    console.error('STATUS MAPPA ERROR:', e);
  }
}

// ---- Strip del cast: avatar-emoji da /users ----

async function loadCastStrip() {
  try {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) return;
    const users = await res.json();
    if (!Array.isArray(users) || users.length === 0) return;

    const row = document.getElementById('cast-row');
    const label = document.getElementById('cast-label');
    if (!row) return;

    row.innerHTML = '';
    users.forEach((u) => {
      const chip = document.createElement('div');
      chip.className = 'cast-chip';

      const face = document.createElement('span');
      face.className = 'face';
      face.textContent = u.icon || '😎';

      const name = document.createElement('span');
      name.className = 'cast-name';
      name.textContent = u.name;

      chip.append(face, name);
      row.appendChild(chip);
    });

    if (label) label.textContent = `Il cast della vacanza · ${users.length}`;
  } catch (e) {
    console.error('CAST STRIP ERROR:', e);
  }
}
