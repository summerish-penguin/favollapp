// playlist.js — playlist condivisa del gruppo: proponi brani (ricerca Spotify),
// vota like/dislike, guarda la classifica ordinata per gradimento.

const currentUser = getCurrentUser();
const isAdmin = !!currentUser?.is_admin;
const myName = currentUser?.name;

const container = document.getElementById('playlist-container');
const searchInput = document.getElementById('pl-search-input');
const suggestionsBox = document.getElementById('pl-suggestions');
const syncBar = document.getElementById('pl-sync-bar');
const openBar = document.getElementById('pl-open');

// Intervallo di polling: allineato ai 10s dello scheduler di auto-sync lato backend
const POLL_MS = 10000;

// Ultimo stato noto della classifica (dal backend), per ridisegnare dopo un voto
let tracks = [];
let searchTimer = null;

// ---- Init ----

init();

function init() {
  loadPlaylist();

  // Stato Spotify: il bottone "Apri su Spotify" è per tutti, i controlli di
  // collegamento/sincronizzazione solo per gli admin. Ricontrolla al ritorno
  // sulla scheda (es. dopo aver collegato Spotify o sincronizzato in un'altra tab).
  loadSyncStatus();
  window.addEventListener('focus', loadSyncStatus);

  // Polling: mantiene classifica e stato allineati tra utenti diversi in concorrenza.
  // In pausa quando la scheda non è visibile, per non sprecare richieste.
  setInterval(() => {
    if (document.hidden) return;
    loadPlaylist();
    loadSyncStatus();
  }, POLL_MS);

  searchInput.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = searchInput.value.trim();
    if (!q) {
      hideSuggestions();
      return;
    }
    // Debounce: evita una chiamata a Spotify a ogni tasto
    searchTimer = setTimeout(() => runSearch(q), 300);
  });

  // Chiudi i suggerimenti cliccando fuori dalla barra di ricerca
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.pl-search')) hideSuggestions();
  });
}

// ---- Ricerca / suggerimenti ----

async function runSearch(q) {
  try {
    const res = await fetch(`${API_BASE}/playlist/search?q=${encodeURIComponent(q)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const results = await res.json();
    renderSuggestions(results);
  } catch (e) {
    console.error('SEARCH ERROR:', e);
    hideSuggestions();
  }
}

function renderSuggestions(results) {
  suggestionsBox.innerHTML = '';
  if (!results.length) {
    hideSuggestions();
    return;
  }

  results.forEach((t) => {
    const row = document.createElement('button');
    row.type = 'button';
    row.className = 'pl-suggestion';

    const cover = document.createElement('img');
    cover.className = 'pl-cover pl-cover-sm';
    cover.src = t.image_url || '';
    cover.alt = '';

    const meta = document.createElement('div');
    meta.className = 'pl-suggestion-meta';
    const title = document.createElement('span');
    title.className = 'pl-suggestion-title';
    title.textContent = t.title;
    const artist = document.createElement('span');
    artist.className = 'pl-suggestion-artist';
    artist.textContent = t.artist;
    meta.append(title, artist);

    row.append(cover, meta);
    row.onclick = () => addTrack(t);
    suggestionsBox.appendChild(row);
  });

  suggestionsBox.hidden = false;
}

function hideSuggestions() {
  suggestionsBox.hidden = true;
  suggestionsBox.innerHTML = '';
}

// ---- Aggiunta brano ----

async function addTrack(t) {
  hideSuggestions();
  searchInput.value = '';

  if (tracks.some((x) => x.spotify_uri === t.spotify_uri)) {
    showToast('Questo brano è già in playlist.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/playlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({
        spotify_uri: t.spotify_uri,
        title: t.title,
        artist: t.artist,
        image_url: t.image_url,
      }),
    });
    if (res.status === 401) return sessionExpired();
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      showToast(data.detail ?? 'Errore aggiunta brano.');
      return;
    }
    showToast(`"${t.title}" aggiunto!`, 'success');
    await loadPlaylist();
  } catch (e) {
    console.error('ADD TRACK ERROR:', e);
    showToast('Errore di rete. Riprova.');
  }
}

// ---- Caricamento classifica ----

async function loadPlaylist() {
  try {
    const res = await fetch(`${API_BASE}/playlist`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    tracks = await res.json();
    renderAll();
  } catch (e) {
    console.error('LOAD PLAYLIST ERROR:', e);
  }
}

// ---- Voto ----

async function vote(trackId, value) {
  try {
    const res = await fetch(`${API_BASE}/playlist/vote`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ track_id: trackId, value }),
    });
    if (res.status === 401) return sessionExpired();
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      showToast(data.detail ?? 'Voto non registrato.');
      return;
    }
    await loadPlaylist();
    loadSyncStatus();
  } catch (e) {
    console.error('VOTE ERROR:', e);
    showToast('Errore di rete. Riprova.');
  }
}

// ---- Elimina ----

async function deleteTrack(track) {
  if (!(await showConfirm(`Togliere "${track.title}" dalla playlist?`))) return;

  try {
    const res = await fetch(`${API_BASE}/playlist/${track.id}`, {
      method: 'DELETE',
      headers: { ...authHeaders() },
    });
    if (res.status === 401) return sessionExpired();
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      showToast(data.detail ?? 'Errore eliminazione.');
      return;
    }
    await loadPlaylist();
    loadSyncStatus();
  } catch (e) {
    console.error('DELETE TRACK ERROR:', e);
    showToast('Errore di rete. Riprova.');
  }
}

// ---- Sincronizzazione Spotify (solo admin) ----

async function loadSyncStatus() {
  try {
    const res = await fetch(`${API_BASE}/playlist/spotify/status`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const status = await res.json();
    renderAdminControls(status);
    renderOpenButton(status);
  } catch (e) {
    console.error('SYNC STATUS ERROR:', e);
  }
}

// Barra larga coi controlli di collegamento/sincronizzazione: SOLO admin.
// Per i non-admin resta nascosta (niente div largo).
function renderAdminControls({ connected, synced }) {
  syncBar.innerHTML = '';
  if (!isAdmin) {
    syncBar.hidden = true;
    return;
  }

  if (!connected) {
    const info = document.createElement('span');
    info.className = 'pl-sync-info';
    info.textContent = 'Collega Spotify per generare la playlist dai brani votati.';

    const connectBtn = document.createElement('button');
    connectBtn.className = 'pl-sync-btn';
    connectBtn.textContent = 'Collega Spotify';
    connectBtn.onclick = () => window.open(`${API_BASE}/playlist/spotify/login`, '_blank');

    syncBar.append(info, connectBtn);
  } else {
    // Da collegato la sincronizzazione è automatica: mostriamo solo lo stato.
    // Tick verde se allineato, spinner se un push è in corso/pendente.
    const state = document.createElement('span');
    state.className = 'pl-sync-state';
    if (synced) {
      state.innerHTML = '<span class="pl-tick" aria-hidden="true">✓</span><span>Playlist aggiornata</span>';
    } else {
      state.innerHTML = '<span class="pl-spinner" aria-hidden="true"></span><span>Aggiornamento playlist…</span>';
    }
    syncBar.append(state);
  }
  syncBar.hidden = false;
}

// Bottone "Apri su Spotify" sotto la classifica: per TUTTI quando la playlist esiste
function renderOpenButton({ playlist_url }) {
  openBar.innerHTML = '';
  if (!playlist_url) {
    openBar.hidden = true;
    return;
  }
  const open = document.createElement('a');
  open.className = 'pl-sync-btn open';
  open.href = playlist_url;
  open.target = '_blank';
  open.rel = 'noopener';
  open.textContent = '🎧 Apri su Spotify';
  openBar.appendChild(open);
  openBar.hidden = false;
}

// ---- Render ----

function renderAll() {
  container.innerHTML = '';

  if (!tracks.length) {
    const empty = document.createElement('p');
    empty.className = 'pl-empty';
    empty.textContent = 'Nessun brano ancora. Cerca il primo qui sopra!';
    container.appendChild(empty);
    return;
  }

  tracks.forEach((track, i) => {
    container.appendChild(createTrackElement(track, i + 1));
  });
}

function createTrackElement(track, rank) {
  const myVote = track.votes?.[myName] ?? 0;
  const canDelete = isAdmin || track.added_by === myName;

  const row = document.createElement('div');
  row.className = 'pl-track';

  const rankEl = document.createElement('span');
  rankEl.className = 'pl-rank';
  rankEl.textContent = `#${rank}`;

  const cover = document.createElement('img');
  cover.className = 'pl-cover';
  cover.src = track.image_url || '';
  cover.alt = '';

  const meta = document.createElement('div');
  meta.className = 'pl-track-meta';
  const title = document.createElement('span');
  title.className = 'pl-track-title';
  title.textContent = track.title;
  const artist = document.createElement('span');
  artist.className = 'pl-track-artist';
  artist.textContent = track.artist || '';
  meta.append(title, artist);
  if (track.added_by) {
    const by = document.createElement('span');
    by.className = 'pl-track-by';
    by.textContent = `aggiunto da ${track.added_by}`;
    meta.appendChild(by);
  }

  // Voti: pollice su / giù, con il voto dell'utente evidenziato
  const votes = document.createElement('div');
  votes.className = 'pl-votes';

  const up = document.createElement('button');
  up.className = 'pl-vote-btn up' + (myVote > 0 ? ' on' : '');
  up.title = 'Mi piace';
  up.innerHTML = `👍 <span class="pl-vote-count">${track.likes}</span>`;
  up.onclick = () => vote(track.id, 1);

  const down = document.createElement('button');
  down.className = 'pl-vote-btn down' + (myVote < 0 ? ' on' : '');
  down.title = 'Non mi piace';
  down.innerHTML = `👎 <span class="pl-vote-count">${track.dislikes}</span>`;
  down.onclick = () => vote(track.id, -1);

  votes.append(up, down);

  const actions = document.createElement('div');
  actions.className = 'pl-track-actions';
  actions.appendChild(votes);

  if (canDelete) {
    const del = document.createElement('button');
    del.className = 'pl-delete-btn';
    del.title = 'Togli dalla playlist';
    del.textContent = '🗑';
    del.onclick = () => deleteTrack(track);
    actions.appendChild(del);
  }

  row.append(rankEl, cover, meta, actions);
  return row;
}

// Sessione scaduta/non valida (401): avvisa e rimanda al login
function sessionExpired() {
  showToast('Sessione scaduta: rifai il login');
  setTimeout(logout, 1200);
}
