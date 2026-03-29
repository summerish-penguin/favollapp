const API = "https://tuo-backend-url/warehouse";

let currentUser = "";

/* =========================
   INIT
========================= */

document.getElementById("setUserBtn").addEventListener("click", () => {
  const input = document.getElementById("username");
  const name = input.value.trim();

  if (!name) {
    alert("Inserisci il tuo nome");
    return;
  }

  currentUser = name;
  document.getElementById("userDisplay").innerText = "Utente: " + currentUser;

  loadItems();
});


/* =========================
   FETCH + RENDER
========================= */

async function loadItems() {
  try {
    const res = await fetch(API);
    const data = await res.json();
    renderList(data);
  } catch {
    alert("Errore caricamento dati");
  }
}


function renderList(items) {

  const list = document.getElementById("items-list");
  list.innerHTML = "";

  items.forEach(item => {

    const li = document.createElement("li");

    const title = document.createElement("div");
    title.innerText = item.name;

    const usersDiv = document.createElement("div");

    item.users.forEach(u => {
      usersDiv.appendChild(createUserTag(item.name, u));
    });

    const button = document.createElement("button");
    button.innerText = "Lo porto io";

    button.addEventListener("click", (e) => {

      if (!currentUser) {
        alert("Inserisci prima il nome");
        return;
      }

      // animazione Buffon
      const rect = button.getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top;
      spawnBuffon(x, y);

      updateQuantity(item.name, +1);
    });

    li.appendChild(title);
    li.appendChild(usersDiv);
    li.appendChild(button);

    list.appendChild(li);
  });
}


/* =========================
   USER TAG (quantità)
========================= */

function createUserTag(itemName, userObj) {

  const wrapper = document.createElement("div");
  wrapper.classList.add("user-tag");

  const label = document.createElement("span");
  label.innerText = `${userObj.name} (${userObj.qty})`;

  // solo per utente corrente → controlli
  if (userObj.name === currentUser) {

    const up = document.createElement("button");
    up.innerText = "⬆";
    up.onclick = () => updateQuantity(itemName, +1);

    const down = document.createElement("button");
    down.innerText = "⬇";
    down.disabled = userObj.qty <= 1;
    down.onclick = () => updateQuantity(itemName, -1);

    const remove = document.createElement("button");
    remove.innerText = "✖";
    remove.onclick = () => removeUser(itemName);

    wrapper.appendChild(up);
    wrapper.appendChild(down);
    wrapper.appendChild(remove);
  }

  wrapper.appendChild(label);

  return wrapper;
}


/* =========================
   API CALLS
========================= */

async function updateQuantity(item, delta) {

  try {
    await fetch(API + "/update", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user: currentUser,
        item,
        delta
      })
    });

    loadItems();

  } catch {
    alert("Errore aggiornamento");
  }
}


async function removeUser(item) {

  try {
    await fetch(API + "/remove", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        user: currentUser,
        item
      })
    });

    loadItems();

  } catch {
    alert("Errore rimozione");
  }
}


/* =========================
   BUFFON ANIMATION
========================= */

function spawnBuffon(x, y) {

  const img = document.createElement("img");
  img.src = "./assets/buffon.png";
  img.classList.add("buffon");

  img.style.left = (x - 40) + "px";
  img.style.top = (y - 40) + "px";

  document.body.appendChild(img);

  setTimeout(() => {
    img.remove();
  }, 1000);
}