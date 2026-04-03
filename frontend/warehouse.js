const API_BASE = "https://favollapp.onrender.com";

const usernameInput = document.getElementById("username");
const warehouseContainer = document.getElementById("warehouse-container"); // div principale dove metti tutti gli items

function spawnBuffon(x, y) {
  const img = document.createElement("img");
  img.src = "./assets/buffon.png";
  img.classList.add("buffon");
  img.style.left = (x - 25) + "px";
  img.style.top  = (y - 25) + "px";
  document.body.appendChild(img);
  setTimeout(() => img.remove(), 1000);
}

// =========================
// RENDER COMPLETO
// =========================
function renderWarehouse(data) {
  warehouseContainer.innerHTML = ""; // reset

  data.forEach(item => {
    const itemDiv = document.createElement("div");
    itemDiv.classList.add("warehouse-item");
    itemDiv.dataset.item = item.name;

    // --- NUOVO CONTAINER FLEX PER TITOLO + BOTTONE ---
    const contentDiv = document.createElement("div");
    contentDiv.classList.add("item-content");

    const title = document.createElement("span");
    title.classList.add("item-name");
    title.innerText = item.name;

    const takeBtn = document.createElement("button");
    takeBtn.classList.add("take-btn");
    takeBtn.innerText = "Lo porto io!";
    takeBtn.onclick = async () => {
      const user = usernameInput.value.trim();
      if (!user) return alert("Inserisci il tuo nome");

      const rect = takeBtn.getBoundingClientRect();
      spawnBuffon(rect.left + rect.width / 2, rect.top);

      await updateQty(user, item.name, 1);
    };

    contentDiv.appendChild(title);
    contentDiv.appendChild(takeBtn);
    itemDiv.appendChild(contentDiv);
    // --- FINE MODIFICA ---

    const peopleDiv = document.createElement("div");
    peopleDiv.classList.add("people");
    renderPeople(peopleDiv, item.users, item.name);
    itemDiv.appendChild(peopleDiv);

    warehouseContainer.appendChild(itemDiv);
  });
}

function renderPeople(container, users, itemName) {
  container.innerHTML = "";

  users.forEach(({ name, qty }) => {
    const tag = document.createElement("div");
    tag.classList.add("person-tag");

    const label = document.createElement("span");
    label.classList.add("person-name");
    label.innerText = `${name} (${qty})`;

    const plus = document.createElement("button");
    plus.innerText = "▲";
    plus.classList.add("qty-btn");
    plus.onclick = async () => updateQty(name, itemName, 1);

    const minus = document.createElement("button");
    minus.innerText = "▼";
    minus.classList.add("qty-btn");
    minus.disabled = qty === 1;
    minus.onclick = async () => updateQty(name, itemName, -1);

    const remove = document.createElement("button");
    remove.innerText = "✕";
    remove.classList.add("remove-btn");
    remove.onclick = async () => removeUser(name, itemName);

    tag.appendChild(label);
    tag.appendChild(plus);
    tag.appendChild(minus);
    tag.appendChild(remove);

    container.appendChild(tag);
  });
}

// =========================
// API
// =========================
async function loadWarehouse() {
  const res = await fetch(`${API_BASE}/warehouse`);
  const data = await res.json();
  renderWarehouse(data);
}

async function updateQty(user, item, delta) {
  const res = await fetch(`${API_BASE}/warehouse/update`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, item, delta })
  });
  const updated = await res.json();
  renderWarehouse(updated);
}

async function removeUser(user, item) {
  const res = await fetch(`${API_BASE}/warehouse/remove`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user, item })
  });
  const updated = await res.json();
  renderWarehouse(updated);
}

// =========================
// INIT
// =========================
loadWarehouse();