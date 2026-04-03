/* ==========================================================================
   WAREHOUSE.JS – FULL DYNAMIC VERSION
   ========================================================================== */

const API_BASE = "https://favollapp.onrender.com";

const usernameInput = document.getElementById("username");
const container = document.getElementById("warehouse-container");

// stato: { itemName: { user: qty } }
const state = {};

// fallback seed (usato se backend vuoto o lento)
const DEFAULT_ITEMS = [
  "Ombrellone",
  "Borsa frigo",
  "Ghiaccini",
  "Sedia da spiaggia",
  "Carte da gioco",
  "Crema solare",
  "Rete da beach",
  "Palla da beach",
  "Bocce"
];

/* =========================
   INIT
========================= */
init();

async function init() {
  initEmptyState(DEFAULT_ITEMS);
  renderAll();
  loadWarehouse();
}

/* =========================
   INIT STATE
========================= */
function initEmptyState(items) {
  items.forEach(name => {
    if (!state[name]) state[name] = {};
  });
}

/* =========================
   LOAD BACKEND
========================= */
async function loadWarehouse() {
  try {
    const res = await fetch(`${API_BASE}/warehouse`);
    if (!res.ok) throw new Error();

    const data = await res.json();

    // reset completo
    Object.keys(state).forEach(k => delete state[k]);

    data.forEach(item => {
      state[item.name] = {};

      item.users.forEach(u => {
        state[item.name][u.name] = u.qty;
      });
    });

    renderAll();

  } catch (e) {
    console.warn("fallback locale");
  }
}

/* =========================
   RENDER
========================= */
function renderAll() {
  container.innerHTML = "";

  Object.entries(state).forEach(([itemName, people]) => {
    const itemEl = createItemElement(itemName, people);
    container.appendChild(itemEl);
  });
}

function createItemElement(itemName, people) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("warehouse-item");

  // --- CONTAINER FLEX PER TITOLO + BOTTONE ---
  const topRow = document.createElement("div");
  topRow.style.display = "flex";
  topRow.style.justifyContent = "space-between";
  topRow.style.alignItems = "center";

  const title = document.createElement("h3");
  title.innerText = itemName;

  const btn = document.createElement("button");
  btn.innerText = "Lo porto io";
  btn.classList.add("take-btn");
  btn.onclick = () => {
    const user = usernameInput.value.trim();
    if (!user) return alert("Inserisci il tuo nome");
    optimisticUpdate(user, itemName, +1);
  };

  topRow.append(title, btn);  // titolo a sinistra, bottone a destra

  const peopleDiv = document.createElement("div");
  peopleDiv.classList.add("people");
  renderPeople(peopleDiv, people, itemName);

  wrapper.append(topRow, peopleDiv);  // appendiamo la riga superiore e poi le persone

  return wrapper;
}

function renderPeople(container, people, itemName) {
  container.innerHTML = "";

  Object.entries(people).forEach(([name, qty]) => {

    const tag = document.createElement("div");
    tag.classList.add("person-tag");

    const label = document.createElement("span");
    label.innerText = `${name} (${qty})`;

    const plus = document.createElement("button");
    plus.innerText = "▲";
    plus.classList.add("qty-btn");
    plus.onclick = () => optimisticUpdate(name, itemName, +1);

    const minus = document.createElement("button");
    minus.innerText = "▼";
    minus.classList.add("qty-btn");
    if (qty === 1) minus.disabled = true;
    minus.onclick = () => optimisticUpdate(name, itemName, -1);

    const remove = document.createElement("button");
    remove.innerText = "✕";
    remove.classList.add("remove-btn");
    remove.onclick = () => optimisticRemove(name, itemName);

    tag.append(label, plus, minus, remove);
    container.appendChild(tag);
  });
}

/* =========================
   OPTIMISTIC UPDATE
========================= */
async function optimisticUpdate(user, item, delta) {
  const prev = JSON.parse(JSON.stringify(state));

  if (!state[item]) state[item] = {};
  state[item][user] = (state[item][user] || 0) + delta;

  if (state[item][user] <= 0) {
    delete state[item][user];
  }

  renderAll();

  try {
    await fetch(`${API_BASE}/warehouse/update`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ user, item, delta })
    });

  } catch (e) {
    Object.assign(state, prev);
    renderAll();
  }
}

/* =========================
   REMOVE
========================= */
async function optimisticRemove(user, item) {
  const prev = JSON.parse(JSON.stringify(state));

  delete state[item][user];

  renderAll();

  try {
    await fetch(`${API_BASE}/warehouse/remove`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ user, item })
    });

  } catch (e) {
    Object.assign(state, prev);
    renderAll();
  }
}