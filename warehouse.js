/* =========================
   BUFFON ANIMATION
========================= */

function spawnBuffon(x, y) {
  const img = document.createElement("img");
  img.src = "./assets/buffon.png";
  img.classList.add("buffon");

  img.style.left = (x - 25) + "px";
  img.style.top = (y - 25) + "px";

  document.body.appendChild(img);

  setTimeout(() => img.remove(), 1000);
}


/* =========================
   LOGICA WAREHOUSE
========================= */

const usernameInput = document.getElementById("username");
const items = document.querySelectorAll(".warehouse-item");

items.forEach(item => {

  const button = item.querySelector(".take-btn");
  const peopleDiv = item.querySelector(".people");
  const itemName = item.querySelector("span").innerText;

  let people = {};

  button.addEventListener("click", () => {

    const user = usernameInput.value.trim();

    if (!user) {
      alert("Inserisci il tuo nome");
      return;
    }

    // animazione
    const rect = button.getBoundingClientRect();
    spawnBuffon(rect.left + rect.width / 2, rect.top);

    // update quantità
    people[user] = (people[user] || 0) + 1;

    renderPeople();
  });


  function renderPeople() {

    peopleDiv.innerHTML = "";

    Object.entries(people).forEach(([name, qty]) => {

      const tag = document.createElement("div");
      tag.classList.add("person-tag");

      const label = document.createElement("span");
      label.classList.add("person-name");
      label.innerText = `${name} (${qty})`;

      // ➕
      const plus = document.createElement("button");
      plus.innerText = "▲";
      plus.classList.add("qty-btn");

      plus.onclick = () => {
        people[name]++;
        renderPeople();
      };

      // ➖
      const minus = document.createElement("button");
      minus.innerText = "▼";
      minus.classList.add("qty-btn");

      if (qty === 1) minus.disabled = true;

      minus.onclick = () => {
        if (people[name] > 1) {
          people[name]--;
          renderPeople();
        }
      };

      // ❌
      const remove = document.createElement("button");
      remove.innerText = "✕";
      remove.classList.add("remove-btn");

      remove.onclick = () => {
        delete people[name];
        renderPeople();
      };

      tag.appendChild(label);
      tag.appendChild(plus);
      tag.appendChild(minus);
      tag.appendChild(remove);

      peopleDiv.appendChild(tag);
    });
  }

});