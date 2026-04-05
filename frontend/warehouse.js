/* ==========================================================================
   WAREHOUSE.JS
   Gestisce la lista oggetti da portare in vacanza.
   Comunica con il backend FastAPI su API_BASE.
   ========================================================================== */

const API_BASE = "https://favollapp.onrender.com";

const usernameInput = document.getElementById("username");
const container     = document.getElementById("warehouse-container");

/* Stato locale: { itemName: { users: { userName: qty }, target: N } }
   Viene inizializzato con i DEFAULT_ITEMS e poi sovrascritto dal backend. */
const state = {};

const DEFAULT_ITEMS = [
  "Ombrellone",
  "Gazebo",
  "Borsa frigo",
  "Ghiaccini",
  "Sedia da spiaggia",
  "Carte da gioco",
  "Rete da beach",
  "Palla da beach",
  "Bocce"
];


/* ==========================================================================
   INIT
   ========================================================================== */

init();

async function init() {
  await loadUsersDropdown();   // popola il <select> con gli utenti dal backend
  initEmptyState(DEFAULT_ITEMS);
  renderAll();
  loadWarehouse();             // sovrascrive lo stato con i dati reali del backend
  loadUsers();                 // popola eventuale datalist di autocompletamento

  // Bottone "aggiungi oggetto": apre il modal
  const addBtn = document.getElementById("add-item-btn");
  if (addBtn) addBtn.addEventListener("click", openAddItemModal);
}


/* ==========================================================================
   STATO INIZIALE (fallback locale)
   Popola lo state con gli item di default prima che arrivi la risposta backend,
   così la pagina non appare vuota durante il caricamento.
   ========================================================================== */

function initEmptyState(items) {
  items.forEach(name => {
    if (!state[name]) state[name] = { users: {}, target: 1 };
  });
}


/* ==========================================================================
   CARICAMENTO DAL BACKEND
   ========================================================================== */

/* Carica la lista completa degli item con contributi e target. */
async function loadWarehouse() {
  try {
    const res  = await fetch(`${API_BASE}/warehouse`);
    const data = await res.json();

    data.forEach(item => {
      if (!state[item.name]) {
        state[item.name] = { users: {}, target: item.target ?? 1 };
      }
      state[item.name].target = item.target ?? 1;
      state[item.name].users  = {};
      item.users.forEach(u => {
        state[item.name].users[u.name] = u.qty;
      });
    });

    renderAll();

  } catch (e) {
    console.error("LOAD ERROR:", e);
  }
}

/* Carica gli utenti e popola il datalist di autocompletamento (se presente). */
async function loadUsers() {
  try {
    const res   = await fetch(`${API_BASE}/users`);
    const users = await res.json();
    populateUserInput(users);
  } catch (e) {
    console.error("USERS LOAD ERROR:", e);
  }
}

function populateUserInput(users) {
  const datalist = document.getElementById("users-list");
  if (!datalist) return;
  datalist.innerHTML = "";
  users.forEach(u => {
    const option = document.createElement("option");
    option.value = u.name;
    datalist.appendChild(option);
  });
}

/* Popola il <select id="username"> con gli utenti registrati sul backend. */
async function loadUsersDropdown() {
  const select = document.getElementById("username");
  try {
    const res   = await fetch(`${API_BASE}/users`);
    const users = await res.json();
    users.forEach(u => {
      const option       = document.createElement("option");
      option.value       = u.name;
      option.textContent = u.name;
      select.appendChild(option);
    });
  } catch (e) {
    console.error("LOAD USERS DROPDOWN ERROR:", e);
  }
}


/* ==========================================================================
   MODAL — AGGIUNGI OGGETTO
   Crea un overlay con un form per specificare nome e target del nuovo item.
   Al submit chiama POST /items sul backend e aggiorna lo stato locale.
   ========================================================================== */

function openAddItemModal() {
  /* Evita duplicati se il modal è già aperto */
  if (document.getElementById("add-item-modal")) return;

  /* --- Overlay scuro --- */
  const overlay = document.createElement("div");
  overlay.id = "add-item-modal";
  overlay.classList.add("modal-overlay");

  /* Chiude il modal cliccando fuori */
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal(overlay);
  });

  /* --- Card del modal --- */
  const modal = document.createElement("div");
  modal.classList.add("modal-card");

  const title = document.createElement("h2");
  title.classList.add("modal-title");
  title.textContent = "Aggiungi un oggetto";

  const nameInput = document.createElement("input");
  nameInput.type        = "text";
  nameInput.placeholder = "Nome oggetto";
  nameInput.classList.add("modal-input");

  const targetInput = document.createElement("input");
  targetInput.type        = "number";
  targetInput.min         = "1";
  targetInput.value       = "";
  targetInput.placeholder = "Quantità target";
  targetInput.classList.add("modal-input");

  /* Messaggio di errore (nascosto di default) */
  const errorMsg = document.createElement("span");
  errorMsg.classList.add("modal-error");
  errorMsg.style.display = "none";

  /* Riga bottoni Annulla / Crea */
  const btnRow = document.createElement("div");
  btnRow.classList.add("modal-btn-row");

  const cancelBtn = document.createElement("button");
  cancelBtn.textContent = "Annulla";
  cancelBtn.classList.add("modal-cancel-btn");
  cancelBtn.onclick = () => closeModal(overlay);

  const createBtn = document.createElement("button");
  createBtn.textContent = "Crea";
  createBtn.classList.add("modal-create-btn");
  createBtn.onclick = () => submitNewItem(nameInput, targetInput, errorMsg, overlay);

  /* Invio con tasto Enter sull'input nome */
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") submitNewItem(nameInput, targetInput, errorMsg, overlay);
  });

  btnRow.append(cancelBtn, createBtn);
  modal.append(title, nameInput, targetInput, errorMsg, btnRow);
  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  nameInput.focus();
}

function closeModal(overlay) {
  overlay.remove();
}

/* Valida i campi e invia la richiesta di creazione al backend. */
async function submitNewItem(nameInput, targetInput, errorMsg, overlay) {
  const name   = nameInput.value.trim();
  const target = parseInt(targetInput.value, 10);

  if (!name) {
    showModalError(errorMsg, "Inserisci il nome dell'oggetto.");
    return;
  }
  if (!target || target < 1) {
    showModalError(errorMsg, "Il target deve essere almeno 1.");
    return;
  }
  if (state[name]) {
    showModalError(errorMsg, "Questo oggetto esiste già.");
    return;
  }

  errorMsg.style.display = "none";

  try {
    const res = await fetch(`${API_BASE}/items`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ name, target })
    });

    const data = await res.json();

    if (!res.ok || !data.ok) {
      showModalError(errorMsg, data.detail ?? "Errore nella creazione.");
      return;
    }

    /* Aggiunge il nuovo item allo stato locale e aggiorna la UI */
    state[name] = { users: {}, target };
    renderAll();
    closeModal(overlay);

  } catch (e) {
    console.error("CREATE ITEM ERROR:", e);
    showModalError(errorMsg, "Errore di rete. Riprova.");
  }
}

function showModalError(el, message) {
  el.textContent   = message;
  el.style.display = "block";
}


/* ==========================================================================
   HELPERS
   ========================================================================== */

/* Calcola il totale delle unità portate per un item. */
function getTotal(itemName) {
  const users = state[itemName]?.users ?? {};
  return Object.values(users).reduce((sum, qty) => sum + qty, 0);
}

/* Spawna l'immagine di Buffon che vola verso l'alto dal punto cliccato. */
function spawnBuffon(x, y) {
  const img = document.createElement("img");
  img.src   = "./assets/buffon.png";
  img.classList.add("buffon");
  img.style.left = (x - 25) + "px";
  img.style.top  = (y - 25) + "px";
  document.body.appendChild(img);
  setTimeout(() => img.remove(), 1000);
}


/* ==========================================================================
   RENDER
   ========================================================================== */

/* Ridisegna l'intera lista warehouse dal contenuto di state. */
function renderAll() {
  container.innerHTML = "";
  Object.entries(state).forEach(([itemName, { users, target }]) => {
    container.appendChild(createItemElement(itemName, users, target));
  });
}

/* Crea il div di un singolo item: riga superiore (nome + label target + bottone)
   e riga inferiore (tag persone). */
function createItemElement(itemName, people, target) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("warehouse-item");

  /* -- Riga superiore -- */
  const topRow = document.createElement("div");
  topRow.classList.add("item-content");

  const title = document.createElement("span");
  title.classList.add("item-name");
  title.innerText = itemName;

  const space = document.createElement("div");
  space.classList.add("space-div");

  /* Label "totale / target" con colore semantico */
  const targetLabel = document.createElement("span");
  const total       = getTotal(itemName);
  targetLabel.classList.add("target-label");

  if (total === 0)         targetLabel.classList.add("target-red");
  else if (total < target) targetLabel.classList.add("target-yellow");
  else                     targetLabel.classList.add("target-green");

  targetLabel.textContent = `${total} / ${target}`;

  /* Bottone "Lo porto io": disabilitato se il target è già raggiunto */
  const btn = document.createElement("button");
  btn.innerText = "Lo porto io";
  btn.classList.add("take-btn");
  btn.disabled  = total >= target;

  btn.onclick = async () => {
    const user = usernameInput.value.trim();
    if (!user) return alert("Seleziona il tuo nome");

    const rect = btn.getBoundingClientRect();
    spawnBuffon(rect.left + rect.width / 2, rect.top);

    await optimisticUpdate(user, itemName, +1);
  };

  /* -- Riga inferiore: tag persone -- */
  const peopleDiv = document.createElement("div");
  peopleDiv.classList.add("people");
  renderPeople(peopleDiv, people, itemName, target);

  /* -- Bottone per eliminare un item -- */
  const deleteBtn = document.createElement("button");
  deleteBtn.textContent = "🗑";
  deleteBtn.classList.add("delete-item-btn");
  deleteBtn.onclick = async () => {
  if (!confirm(`Eliminare "${itemName}" dalla lista?`)) return;
    await deleteItem(itemName);
  };

  topRow.append(title, space, targetLabel, btn, deleteBtn);

  wrapper.append(topRow, peopleDiv);
  return wrapper;

}

/* Popola il div .people con i tag di ogni portatore (nome, ▲, ▼, ✕). */
function renderPeople(container, people, itemName, target) {
  container.innerHTML = "";
  const total = getTotal(itemName);

  Object.entries(people).forEach(([name, qty]) => {
    const tag = document.createElement("div");
    tag.classList.add("person-tag");

    const label = document.createElement("span");
    label.classList.add("person-name");
    label.innerText = `${name} (${qty})`;

    /* ▲ disabilitato se il target globale è già raggiunto */
    const plus = document.createElement("button");
    plus.innerText = "▲";
    plus.classList.add("qty-btn");
    plus.disabled  = total >= target;
    plus.onclick   = async () => await optimisticUpdate(name, itemName, +1);

    /* ▼ disabilitato se la quantità è già 1 */
    const minus = document.createElement("button");
    minus.innerText = "▼";
    minus.classList.add("qty-btn");
    minus.disabled  = qty === 1;
    minus.onclick   = async () => await optimisticUpdate(name, itemName, -1);

    const remove = document.createElement("button");
    remove.innerText = "✕";
    remove.classList.add("remove-btn");
    remove.onclick   = async () => await optimisticRemove(name, itemName);

    tag.append(label, plus, minus, remove);
    container.appendChild(tag);
  });
}


/* ==========================================================================
   OPTIMISTIC UPDATE
   Aggiorna lo stato locale immediatamente per dare feedback istantaneo,
   poi sincronizza col backend. In caso di errore ripristina lo stato precedente.
   ========================================================================== */

async function optimisticUpdate(user, item, delta) {
  const target = state[item]?.target ?? 1;

  /* Blocco client-side: non superare il target */
  if (delta > 0 && getTotal(item) >= target) return;

  /* Snapshot per eventuale rollback */
  const prev = JSON.parse(JSON.stringify(state));

  if (!state[item]) state[item] = { users: {}, target };
  state[item].users[user] = (state[item].users[user] || 0) + delta;
  if (state[item].users[user] <= 0) delete state[item].users[user];

  renderAll();

  try {
    const res  = await fetch(`${API_BASE}/warehouse/update`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ user, item, delta })
    });
    const data = await res.json();

    if (!data.ok) alert("Errore backend: " + data.reason);

    /* Aggiorna il target nel caso sia cambiato lato server */
    if (state[item]) state[item].target = data.target ?? state[item].target;

  } catch (e) {
    console.error("UPDATE ERROR:", e);
    Object.assign(state, prev);  // rollback
    renderAll();
    alert("Errore di rete. Riprova.");
  }
}


/* ==========================================================================
   REMOVE
   ========================================================================== */

async function optimisticRemove(user, item) {
  const prev = JSON.parse(JSON.stringify(state));

  /* Aggiornamento ottimistico */
  if (state[item]?.users[user] !== undefined) delete state[item].users[user];
  renderAll();

  try {
    await fetch(`${API_BASE}/warehouse/remove`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ user, item })
    });
  } catch (e) {
    console.error("REMOVE ERROR:", e);
    Object.assign(state, prev);  // rollback
    renderAll();
  }
}


/* Rimuove item */
async function deleteItem(itemName) {
  const prev = JSON.parse(JSON.stringify(state));
  delete state[itemName];
  renderAll();

  try {
    const res = await fetch(`${API_BASE}/items/${encodeURIComponent(itemName)}`, {
      method: "DELETE"
    });
    const data = await res.json();
    if (!data.ok) throw new Error(data.detail);
  } catch (e) {
    console.error("DELETE ITEM ERROR:", e);
    Object.assign(state, prev); // rollback
    renderAll();
    alert("Errore eliminazione. Riprova.");
  }
}