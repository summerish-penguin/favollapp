/* ==========================================================================
   WAREHOUSE.JS – DEBUG BACKEND UPDATE
   ========================================================================== */

const API_BASE = "https://favollapp.onrender.com";

const usernameInput = document.getElementById("username");
const container = document.getElementById("warehouse-container");

const state = {};

const DEFAULT_ITEMS = [
  "Ombrellone",
  "Gazebo",
  "Borsa frigo",
  "Ghiaccini",
  "Sedia da spiaggia",
  "Carte da gioco",
  "Crema solare",
  "Rete da beach",
  "Palla da beach",
  "Bocce"
];

init();

async function init() {
  initEmptyState(DEFAULT_ITEMS);
  renderAll();
  loadWarehouse();
}

function initEmptyState(items) {
  items.forEach(name => {
    if (!state[name]) state[name] = { users: {}, target: 1 };
  });
}

async function loadWarehouse() {
  try {
    const res = await fetch(`${API_BASE}/warehouse`);
    const data = await res.json();

    data.forEach(item => {
      if (!state[item.name]) {
        state[item.name] = { users: {}, target: item.target ?? 1 };
      }

      state[item.name].target = item.target ?? 1;
      state[item.name].users = {};

      item.users.forEach(u => {
        state[item.name].users[u.name] = u.qty;
      });
    });

    renderAll();

  } catch (e) {
    console.error("LOAD ERROR:", e);
  }
}

/* ========================= */

function getTotal(itemName) {
  const users = state[itemName]?.users ?? {};
  return Object.values(users).reduce((sum, qty) => sum + qty, 0);
}

/* ========================= */

function spawnBuffon(x, y) {
  const img = document.createElement("img");
  img.src = "./assets/buffon.png";
  img.classList.add("buffon");
  img.style.left = (x - 25) + "px";
  img.style.top  = (y - 25) + "px";
  document.body.appendChild(img);
  setTimeout(() => img.remove(), 1000);
}

/* ========================= */

function renderAll() {
  container.innerHTML = "";
  Object.entries(state).forEach(([itemName, { users, target }]) => {
    container.appendChild(createItemElement(itemName, users, target));
  });
}

/* ========================= */

function createItemElement(itemName, people, target) {
  const wrapper = document.createElement("div");
  wrapper.classList.add("warehouse-item");

  const topRow = document.createElement("div");
  topRow.classList.add("item-content");

  const title = document.createElement("span");
  title.classList.add("item-name");
  title.innerText = itemName;

  const targetLabel = document.createElement("span");
  const total = getTotal(itemName);
  targetLabel.classList.add("target-label");

  if (total === 0) {
    targetLabel.classList.add("target-red");
  } else if (total > 0 && total < target) {
    targetLabel.classList.add("target-yellow");
  } else if (total >= target) {
    targetLabel.classList.add("target-green");
  }

  targetLabel.textContent = `${total} / ${target}`;

  const btn = document.createElement("button");
  btn.innerText = "Lo porto io";
  btn.classList.add("take-btn");
  btn.disabled = total >= target;

  btn.onclick = async () => {
    const user = usernameInput.value.trim();
    if (!user) return alert("Inserisci il tuo nome");

    const rect = btn.getBoundingClientRect();
    spawnBuffon(rect.left + rect.width / 2, rect.top);

    await optimisticUpdate(user, itemName, +1);
  };

  topRow.append(title, targetLabel, btn);

  const peopleDiv = document.createElement("div");
  peopleDiv.classList.add("people");
  renderPeople(peopleDiv, people, itemName, target);

  wrapper.append(topRow, peopleDiv);
  return wrapper;
}

/* ========================= */

function renderPeople(container, people, itemName, target) {
  container.innerHTML = "";

  const total = getTotal(itemName);

  Object.entries(people).forEach(([name, qty]) => {
    const tag = document.createElement("div");
    tag.classList.add("person-tag");

    const label = document.createElement("span");
    label.classList.add("person-name");
    label.innerText = `${name} (${qty})`;

    const plus = document.createElement("button");
    plus.innerText = "▲";
    plus.classList.add("qty-btn");
    plus.disabled = total >= target;
    plus.onclick = async () => await optimisticUpdate(name, itemName, +1);

    const minus = document.createElement("button");
    minus.innerText = "▼";
    minus.classList.add("qty-btn");
    minus.disabled = qty === 1;
    minus.onclick = async () => await optimisticUpdate(name, itemName, -1);

    const remove = document.createElement("button");
    remove.innerText = "✕";
    remove.classList.add("remove-btn");
    remove.onclick = async () => await optimisticRemove(name, itemName);

    tag.append(label, plus, minus, remove);
    container.appendChild(tag);
  });
}

/* ========================= */

async function optimisticUpdate(user, item, delta) {
  console.log("UPDATE START", { user, item, delta });

  if (!state[item]) state[item] = { users: {}, target: 1 };

  state[item].users[user] = (state[item].users[user] || 0) + delta;
  if (state[item].users[user] <= 0) delete state[item].users[user];

  renderAll();

  try {
    const res = await fetch(`${API_BASE}/warehouse/update`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, item, delta })
    });

    console.log("RESPONSE STATUS:", res.status);

    const data = await res.json();
    console.log("RESPONSE DATA:", data);

    if (!data.ok) {
      alert("Errore backend: " + data.reason);
    }

    if (state[item]) {
      state[item].target = data.target ?? state[item].target;
    }

  } catch (e) {
    console.error("UPDATE ERROR:", e);
    alert("Errore chiamata backend");
  }
}

/* ========================= */

async function optimisticRemove(user, item) {
  try {
    await fetch(`${API_BASE}/warehouse/remove`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, item })
    });

    if (state[item] && state[item].users[user] !== undefined) {
      delete state[item].users[user];
    }

    renderAll();

  } catch (e) {
    console.error("REMOVE ERROR:", e);
  }
}