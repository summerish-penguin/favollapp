// warehouse.js — gestisce la lista oggetti da portare in vacanza (chi porta cosa)

// La personH corrente arriva dal login (auth.js), non più da un menu a tendina
const currentUser = getCurrentUser();
const isAdmin = !!currentUser?.is_admin;
const myName = currentUser?.name;
const container = document.getElementById('warehouse-container');

// Elenco di tutte le personH: fornisce le emoji delle chip contributori
// e, per l'admin, alimenta il selettore del contributore
let allUsers = [];
// Contributore a nome del quale l'admin aggiunge (scelto dalla barra sopra la lista)
let selectedContributor = myName;

/* Stato locale: { itemName: { users: { userName: qty }, target: N } }
   Viene inizializzato con i DEFAULT_ITEMS e poi sovrascritto dal backend. */
const state = {};

const DEFAULT_ITEMS = [
  'Ombrellone',
  'Gazebo',
  'Borsa frigo',
  'Ghiaccini',
  'Sedia da spiaggia',
  'Carte da gioco',
  'Rete da beach',
  'Palla da beach',
  'Bocce spiaggia',
];

// ---- Init ----

init();

async function init() {
  initEmptyState(DEFAULT_ITEMS);
  await loadAllUsers();
  if (isAdmin) {
    // Mostra la barra solo se abbiamo l'elenco; senza, l'admin aggiunge comunque
    // a sé stesso (selectedContributor resta myName) invece di vedere un menu vuoto.
    if (allUsers.length) renderAdminBar();
    else showToast('Elenco utenti non disponibile: puoi aggiungere solo a te stesso.');
  }
  renderAll();
  loadWarehouse();

  const addBtn = document.getElementById('add-item-btn');
  if (addBtn) addBtn.addEventListener('click', openAddItemModal);
}

// Carica l'elenco delle personH per il selettore admin del contributore
async function loadAllUsers() {
  try {
    const res = await fetch(`${API_BASE}/users`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    allUsers = await res.json();
  } catch (e) {
    console.error('LOAD USERS ERROR:', e);
    allUsers = [];
  }
}

// Barra admin sopra la lista: sceglie una volta il contributore per tutti gli "Aggiungi".
// Vive fuori da #warehouse-container, così renderAll() (che lo svuota) non la cancella.
function renderAdminBar() {
  const bar = document.createElement('div');
  bar.className = 'admin-bar';

  const label = document.createElement('label');
  label.className = 'admin-bar-label';
  label.setAttribute('for', 'admin-contributor');
  label.textContent = 'Aggiungi a nome di';

  const select = document.createElement('select');
  select.id = 'admin-contributor';
  select.className = 'admin-user-select';

  // Nomi disponibili; garantiamo che l'admin stesso sia sempre presente e preselezionato,
  // così il default non finisce per sbaglio sul primo nome della lista.
  const names = allUsers.map((u) => u.name);
  if (myName && !names.includes(myName)) names.unshift(myName);

  names.forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    if (name === myName) opt.selected = true;
    select.appendChild(opt);
  });

  selectedContributor = select.value || myName;
  select.addEventListener('change', () => {
    selectedContributor = select.value;
  });

  bar.append(label, select);
  container.parentNode.insertBefore(bar, container);
}

// ---- Stato iniziale (fallback locale prima della risposta del backend) ----

function initEmptyState(items) {
  items.forEach((name) => {
    if (!state[name]) state[name] = { users: {}, target: 1 };
  });
}

// ---- Caricamento dal backend ----

async function loadWarehouse() {
  try {
    const res = await fetch(`${API_BASE}/warehouse`);
    const data = await res.json();

    data.forEach((item) => {
      if (!state[item.name]) {
        state[item.name] = { users: {}, target: item.target ?? 1 };
      }
      state[item.name].target = item.target ?? 1;
      state[item.name].users = {};
      item.users.forEach((u) => {
        state[item.name].users[u.name] = u.qty;
      });
    });

    renderAll();
  } catch (e) {
    console.error('LOAD ERROR:', e);
  }
}

// ---- Modal: aggiungi oggetto ----

function openAddItemModal() {
  if (document.getElementById('add-item-modal')) return;
  openItemModal({
    titleText:   'Aggiungi un oggetto',
    confirmText: 'Crea',
    nameValue:   '',
    targetValue: '',
    onConfirm:   submitNewItem,
  });
}

// ---- Modal: modifica oggetto (stessa struttura del modal di creazione, campi pre-compilati) ----

function openEditItemModal(oldName, oldTarget) {
  if (document.getElementById('add-item-modal')) return;
  openItemModal({
    titleText:   'Modifica oggetto',
    confirmText: 'Salva',
    nameValue:   oldName,
    targetValue: String(oldTarget),
    onConfirm:   (nameInput, targetInput, errorMsg, overlay) =>
      submitEditItem(oldName, nameInput, targetInput, errorMsg, overlay),
  });
}

// ---- Modal: costruttore generico, usato sia da openAddItemModal che da openEditItemModal ----

function openItemModal({ titleText, confirmText, nameValue, targetValue, onConfirm }) {
  const overlay = document.createElement('div');
  overlay.id = 'add-item-modal';
  overlay.classList.add('modal-overlay');
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeModal(overlay);
  });

  const modal = document.createElement('div');
  modal.classList.add('modal-card');

  const title = document.createElement('h2');
  title.classList.add('modal-title');
  title.textContent = titleText;

  const nameInput = document.createElement('input');
  nameInput.type        = 'text';
  nameInput.placeholder = 'Nome oggetto';
  nameInput.value       = nameValue;
  nameInput.classList.add('modal-input');

  const targetInput = document.createElement('input');
  targetInput.type        = 'number';
  targetInput.min         = '1';
  targetInput.value       = targetValue;
  targetInput.placeholder = 'Quantità target';
  targetInput.classList.add('modal-input');

  const errorMsg = document.createElement('span');
  errorMsg.classList.add('modal-error');
  errorMsg.style.display = 'none';

  const btnRow = document.createElement('div');
  btnRow.classList.add('modal-btn-row');

  const cancelBtn = document.createElement('button');
  cancelBtn.textContent = 'Annulla';
  cancelBtn.classList.add('modal-cancel-btn');
  cancelBtn.onclick = () => closeModal(overlay);

  const confirmBtn = document.createElement('button');
  confirmBtn.textContent = confirmText;
  confirmBtn.classList.add('modal-create-btn');
  confirmBtn.onclick = () => onConfirm(nameInput, targetInput, errorMsg, overlay);

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') onConfirm(nameInput, targetInput, errorMsg, overlay);
  });

  btnRow.append(cancelBtn, confirmBtn);
  modal.append(title, nameInput, targetInput, errorMsg, btnRow);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  nameInput.focus();
  /* posiziona il cursore in fondo al testo pre-compilato */
  nameInput.setSelectionRange(nameInput.value.length, nameInput.value.length);
}

function closeModal(overlay) {
  overlay.remove();
}

/* Validazione e invio per la CREAZIONE */
async function submitNewItem(nameInput, targetInput, errorMsg, overlay) {
  const name   = nameInput.value.trim();
  const target = parseInt(targetInput.value, 10);

  if (!name) { showModalError(errorMsg, "Inserisci il nome dell'oggetto."); return; }
  if (!target || target < 1) { showModalError(errorMsg, 'Il target deve essere almeno 1.'); return; }
  if (state[name]) { showModalError(errorMsg, 'Questo oggetto esiste già.'); return; }

  errorMsg.style.display = 'none';

  try {
    const res  = await fetch(`${API_BASE}/items`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({ name, target }),
    });
    if (res.status === 401) return sessionExpired();
    const data = await res.json();

    if (!res.ok || !data.ok) { showModalError(errorMsg, data.detail ?? 'Errore nella creazione.'); return; }

    state[name] = { users: {}, target };
    renderAll();
    closeModal(overlay);
  } catch (e) {
    console.error('CREATE ITEM ERROR:', e);
    showModalError(errorMsg, 'Errore di rete. Riprova.');
  }
}

/* Validazione e invio per la MODIFICA */
async function submitEditItem(oldName, nameInput, targetInput, errorMsg, overlay) {
  const newName  = nameInput.value.trim();
  const newTarget = parseInt(targetInput.value, 10);

  if (!newName) { showModalError(errorMsg, "Inserisci il nome dell'oggetto."); return; }
  if (!newTarget || newTarget < 1) { showModalError(errorMsg, 'Il target deve essere almeno 1.'); return; }
  if (newName !== oldName && state[newName]) { showModalError(errorMsg, 'Questo nome esiste già.'); return; }

  errorMsg.style.display = 'none';

  try {
    const res  = await fetch(`${API_BASE}/items/${encodeURIComponent(oldName)}`, {
      method:  'PUT',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({ name: newName, target: newTarget }),
    });
    if (res.status === 401) return sessionExpired();
    const data = await res.json();

    if (!res.ok || !data.ok) { showModalError(errorMsg, data.detail ?? 'Errore nella modifica.'); return; }

    /* Aggiorna lo stato locale: rinomina la chiave se il nome è cambiato */
    const oldData = state[oldName];
    delete state[oldName];
    state[newName] = { ...oldData, target: newTarget };

    renderAll();
    closeModal(overlay);
  } catch (e) {
    console.error('EDIT ITEM ERROR:', e);
    showModalError(errorMsg, 'Errore di rete. Riprova.');
  }
}

function showModalError(el, message) {
  el.textContent = message;
  el.style.display = 'block';
}

// ---- Helpers ----

function getTotal(itemName) {
  const users = state[itemName]?.users ?? {};
  return Object.values(users).reduce((sum, qty) => sum + qty, 0);
}

// Emoji della personH (dal cast); fallback generico se non censita
function iconFor(name) {
  const u = allUsers.find((x) => x.name === name);
  return u?.icon || '😎';
}

function spawnBuffon(x, y) {
  const img = document.createElement('img');
  img.src = './assets/buffon.png';
  img.classList.add('buffon');
  img.style.left = x - 25 + 'px';
  img.style.top  = y - 25 + 'px';
  document.body.appendChild(img);
  setTimeout(() => img.remove(), 1000);
}

// ---- Render ----

function renderAll() {
  container.innerHTML = '';
  Object.entries(state).forEach(([itemName, { users, target }]) => {
    container.appendChild(createItemElement(itemName, users, target));
  });
  renderSummary();
}

// Riepilogo in testa alla lista: unità coperte (col tetto del target per
// item, così gli extra non gonfiano il totale) su unità richieste.
function renderSummary() {
  const el = document.getElementById('warehouse-summary');
  if (!el) return;

  const entries = Object.entries(state);
  if (!entries.length) {
    el.hidden = true;
    return;
  }

  let units = 0;
  let targetSum = 0;
  let scoperti = 0;

  entries.forEach(([name, { target }]) => {
    const tot = getTotal(name);
    units += Math.min(tot, target);
    targetSum += target;
    if (tot < target) scoperti++;
  });

  const pct = targetSum ? Math.round((units / targetSum) * 100) : 0;
  const fillClass = units === 0 ? 'hot' : units < targetSum ? 'warn' : 'ok';

  el.innerHTML = '';

  const row = document.createElement('div');
  row.classList.add('wh-summary-row');

  const big = document.createElement('span');
  big.classList.add('wh-summary-big');
  big.textContent = units;
  const small = document.createElement('small');
  small.textContent = ` / ${targetSum} unità coperte`;
  big.appendChild(small);

  const note = document.createElement('span');
  note.classList.add('wh-summary-note', scoperti === 0 ? 'ok' : 'warn');
  note.textContent =
    scoperti === 0 ? 'Tutto coperto ✓'
    : scoperti === 1 ? '1 da coprire'
    : `${scoperti} da coprire`;

  row.append(big, note);

  const meter = document.createElement('div');
  meter.classList.add('meter');
  const fill = document.createElement('span');
  fill.classList.add('meter-fill', fillClass);
  fill.style.width = `${Math.max(pct, 3)}%`;
  meter.appendChild(fill);

  el.append(row, meter);
  el.hidden = false;
}

function createItemElement(itemName, people, target) {
  const wrapper = document.createElement('div');
  wrapper.classList.add('warehouse-item');

  const topRow = document.createElement('div');
  topRow.classList.add('item-content');

  const titleDiv = document.createElement('div');
  titleDiv.classList.add('item-name-div');

  const title = document.createElement('span');
  title.classList.add('item-name');
  title.innerText = itemName;

  const targetLabel = document.createElement('span');
  const total = getTotal(itemName);
  targetLabel.classList.add('target-label');

  if (total === 0)         targetLabel.classList.add('target-red');
  else if (total < target) targetLabel.classList.add('target-yellow');
  else                     targetLabel.classList.add('target-green');

  targetLabel.textContent = `${total} / ${target}`;

  /*Div padre dei bottoni modifica ed elimina*/
  const actionsDiv = document.createElement('div');
  actionsDiv.classList.add('actions-div');

  /* Bottone modifica */
  const editBtn = document.createElement('button');
  editBtn.textContent = '✎';
  editBtn.classList.add('edit-item-btn');
  editBtn.title = 'Modifica';
  editBtn.onclick = () => openEditItemModal(itemName, target);

  /* Bottone elimina: bloccato se altri hanno contribuito (l'admin può sempre) */
  const others = Object.keys(people).filter((n) => n !== myName);
  const canDelete = isAdmin || others.length === 0;

  const deleteBtn = document.createElement('button');
  deleteBtn.textContent = '🗑';
  deleteBtn.classList.add('delete-item-btn');
  deleteBtn.disabled = !canDelete;
  deleteBtn.title = canDelete
    ? 'Elimina'
    : 'Non puoi eliminarlo: altri hanno già contribuito';
  deleteBtn.onclick = async () => {
    if (!canDelete) return;
    if (!(await showConfirm(`Eliminare "${itemName}" dalla lista?`))) return;
    await deleteItem(itemName);
  };

  /* Barra semaforo di copertura sotto il titolo */
  const meter = document.createElement('div');
  meter.classList.add('meter');
  const fill = document.createElement('span');
  fill.classList.add(
    'meter-fill',
    total === 0 ? 'hot' : total < target ? 'warn' : 'ok',
  );
  const pct = target ? Math.min(100, Math.round((total / target) * 100)) : 0;
  fill.style.width = `${Math.max(pct, 3)}%`;
  meter.appendChild(fill);

  const peopleDiv = document.createElement('div');
  peopleDiv.classList.add('people');
  renderPeople(peopleDiv, people, itemName, target);

  /* Coda della fila contributori: stato ("nessuno" / "completo") o azione.
     Il pulsante di aggiunta (admin: al contributore scelto in alto, gli
     altri: a sé stessi) compare solo finché il target non è raggiunto. */
  if (Object.keys(people).length === 0) {
    const nobody = document.createElement('span');
    nobody.classList.add('nobody-note');
    nobody.textContent = 'Nessuno ha contribuito';
    peopleDiv.appendChild(nobody);
  }
  if (total >= target) {
    const done = document.createElement('span');
    done.classList.add('done-note');
    done.textContent = '✓ Completo';
    peopleDiv.appendChild(done);
  } else {
    peopleDiv.appendChild(createAddButton(itemName, total, target));
  }

  titleDiv.append(title);
  actionsDiv.append(editBtn, deleteBtn);
  topRow.append(titleDiv, targetLabel, actionsDiv);
  wrapper.append(topRow, meter, peopleDiv);
  return wrapper;
}

// Pulsante di aggiunta: l'admin aggiunge al contributore scelto in alto, gli altri a sé
function createAddButton(itemName, total, target) {
  const btn = document.createElement('button');
  btn.innerText = isAdmin ? 'Aggiungi' : 'Lo porto io';
  btn.classList.add('take-btn');
  btn.disabled = total >= target;

  btn.onclick = async () => {
    const user = isAdmin ? selectedContributor : myName;
    if (!user) {
      return showToast(isAdmin ? 'Seleziona un contributore' : 'Sessione scaduta: rifai il login');
    }
    if (total >= target) return;
    const rect = btn.getBoundingClientRect();
    spawnBuffon(rect.left + rect.width / 2, rect.top);
    await optimisticUpdate(user, itemName, +1);
  };
  return btn;
}

function renderPeople(container, people, itemName, target) {
  container.innerHTML = '';
  const total = getTotal(itemName);

  Object.entries(people).forEach(([name, qty]) => {
    const tag = document.createElement('div');
    tag.classList.add('person-tag');
    if (name === myName) tag.classList.add('me');

    const emoji = document.createElement('span');
    emoji.classList.add('person-emoji');
    emoji.setAttribute('aria-hidden', 'true');
    emoji.textContent = iconFor(name);

    const label = document.createElement('span');
    label.classList.add('person-name');
    label.innerText = `${name} ×${qty}`;

    // Ogni utente gestisce solo la propria riga; l'admin gestisce quelle di tutti
    const canManage = isAdmin || name === myName;

    if (!canManage) {
      tag.append(emoji, label);
      container.appendChild(tag);
      return;
    }

    const plus = document.createElement('button');
    plus.innerText = '▲';
    plus.classList.add('qty-btn');
    plus.disabled = total >= target;
    plus.onclick  = async () => await optimisticUpdate(name, itemName, +1);

    const minus = document.createElement('button');
    minus.innerText = '▼';
    minus.classList.add('qty-btn');
    minus.disabled  = qty === 1;
    minus.onclick   = async () => await optimisticUpdate(name, itemName, -1);

    const remove = document.createElement('button');
    remove.innerText = '✕';
    remove.classList.add('remove-btn');
    remove.onclick   = async () => await optimisticRemove(name, itemName);

    tag.append(emoji, label, plus, minus, remove);
    container.appendChild(tag);
  });
}

// ---- Optimistic update: aggiorna subito la UI, poi conferma/rollback col backend ----

async function optimisticUpdate(user, item, delta) {
  const target = state[item]?.target ?? 1;
  if (delta > 0 && getTotal(item) >= target) return;

  const prev = JSON.parse(JSON.stringify(state));

  if (!state[item]) state[item] = { users: {}, target };
  state[item].users[user] = (state[item].users[user] || 0) + delta;
  if (state[item].users[user] <= 0) delete state[item].users[user];

  renderAll();

  try {
    const res  = await fetch(`${API_BASE}/warehouse/update`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({ user, item, delta }),
    });
    if (res.status === 401) { restoreState(prev); return sessionExpired(); }
    const data = await res.json().catch(() => ({}));

    // Su rifiuto del backend (es. 403 regole) ripristiniamo lo stato ottimistico
    if (!res.ok || !data.ok) {
      restoreState(prev);
      showToast(data.detail ?? data.reason ?? 'Operazione non permessa.');
      return;
    }
    if (state[item]) state[item].target = data.target ?? state[item].target;
  } catch (e) {
    console.error('UPDATE ERROR:', e);
    restoreState(prev);
    showToast('Errore di rete. Riprova.');
  }
}

// ---- Remove ----

async function optimisticRemove(user, item) {
  const prev = JSON.parse(JSON.stringify(state));
  if (state[item]?.users[user] !== undefined) delete state[item].users[user];
  renderAll();

  try {
    const res = await fetch(`${API_BASE}/warehouse/remove`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body:    JSON.stringify({ user, item }),
    });
    if (res.status === 401) { restoreState(prev); return sessionExpired(); }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      restoreState(prev);
      showToast(data.detail ?? 'Rimozione non permessa.');
    }
  } catch (e) {
    console.error('REMOVE ERROR:', e);
    restoreState(prev);
  }
}

async function deleteItem(itemName) {
  const prev = JSON.parse(JSON.stringify(state));
  delete state[itemName];
  renderAll();

  try {
    const res  = await fetch(`${API_BASE}/items/${encodeURIComponent(itemName)}`, {
      method:  'DELETE',
      headers: { ...authHeaders() },
    });
    if (res.status === 401) { restoreState(prev); return sessionExpired(); }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) {
      restoreState(prev);
      showToast(data.detail ?? 'Errore eliminazione. Riprova.');
    }
  } catch (e) {
    console.error('DELETE ITEM ERROR:', e);
    restoreState(prev);
    showToast('Errore eliminazione. Riprova.');
  }
}

// Ripristina lo stato da uno snapshot: rimuove anche le chiavi aggiunte
// dopo lo snapshot (Object.assign da solo non le toglierebbe), poi ridisegna.
function restoreState(snapshot) {
  Object.keys(state).forEach((k) => {
    if (!(k in snapshot)) delete state[k];
  });
  Object.assign(state, snapshot);
  renderAll();
}

// Sessione scaduta/non valida (401): avvisa e rimanda al login
function sessionExpired() {
  showToast('Sessione scaduta: rifai il login');
  setTimeout(logout, 1200);
}
