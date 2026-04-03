/* ==========================================================================
   WAREHOUSE.JS – VERSIONE CON BACKEND
   ========================================================================== */

const API_BASE = "https://favollapp.onrender.com";

/* =========================
   BUFFON ANIMATION
========================= */
function spawnBuffon(x, y) {
  const img = document.createElement("img");
  img.src = "./assets/buffon.png";
  img.classList.add("buffon");
  img.style.left = (x - 25) + "px";
  img.style.top  = (y - 25) + "px";

  document.body.appendChild(img);
  setTimeout(() => img.remove(), 1000);
}

/* =========================
   ELEMENTI DOM
========================= */
const usernameInput = document.getElementById("username");
const items = document.querySelectorAll(".warehouse-item");

/* =========================
   LOAD INIZIALE DAL BACKEND
========================= */
async function loadWarehouse() {
  const res = await fetch(`${API_BASE}/warehouse`);
  const data = await res.json();

  items.forEach(item => {
    const itemName = item.dataset.item;
    const peopleDiv = item.querySelector(".people");

    const backendItem = data.find(i => i.name === itemName);

    if (backendItem) {
      renderPeople(peopleDiv, backendItem.users, itemName);
    } else {
      peopleDiv.innerHTML = "";
    }
  });
}

/* =========================
   RENDER
========================= */
function renderPeople(container, users, itemName) {
  container.innerHTML = "";

  users.forEach(({ name, qty }) => {

    const tag = document.createElement("div");
    tag.classList.add("person-tag");

    const label = document.createElement("span");
    label.classList.add("person-name");
    label.innerText = `${name} (${qty})`;

    // ▲
    const plus = document.createElement("button");
    plus.innerText = "▲";
    plus.classList.add("qty-btn");
    plus.onclick = async () => {
      await updateQty(name, itemName, 1);
    };

    // ▼
    const minus = document.createElement("button");
    minus.innerText = "▼";
    minus.classList.add("qty-btn");
    if (qty === 1) minus.disabled = true;

    minus.onclick = async () => {
      await updateQty(name, itemName, -1);
    };

    // ✕
    const remove = document.createElement("button");
    remove.innerText = "✕";
    remove.classList.add("remove-btn");
    remove.onclick = async () => {
      await removeUser(name, itemName);
    };

    tag.appendChild(label);
    tag.appendChild(plus);
    tag.appendChild(minus);
    tag.appendChild(remove);

    container.appendChild(tag);
  });
}

/* =========================
   API CALLS
========================= */
async function updateQty(user, item, delta) {
  await fetch(`${API_BASE}/warehouse/update`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ user, item, delta })
  });

  await loadWarehouse();
}

async function removeUser(user, item) {
  await fetch(`${API_BASE}/warehouse/remove`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ user, item })
  });

  await loadWarehouse();
}

/* =========================
   EVENTI UI
========================= */
items.forEach(item => {

  const button = item.querySelector(".take-btn");
  const itemName = item.querySelector("span").innerText;

  button.addEventListener("click", async () => {

    const user = usernameInput.value.trim();

    if (!user) {
      alert("Inserisci il tuo nome");
      return;
    }

    // animazione
    const rect = button.getBoundingClientRect();
    spawnBuffon(rect.left + rect.width / 2, rect.top);

    // chiamata backend
    await updateQty(user, itemName, 1);
  });

});

/* =========================
   INIT
========================= */
loadWarehouse();