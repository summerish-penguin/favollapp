function spawnBuffon(x, y) {

  const img = document.createElement("img");
  img.src = "assets/buffon.png";
  img.classList.add("buffon");

  img.style.left = (x - 40) + "px"; // centra immagine
  img.style.top = (y - 40) + "px";

  document.body.appendChild(img);

  setTimeout(() => {
    img.remove();
  }, 1000);
}

const usernameInput = document.getElementById("username");
const items = document.querySelectorAll(".item");

items.forEach(item => {

  const button = item.querySelector(".take-btn");
  const peopleDiv = item.querySelector(".people");

  // struttura: { nome: quantità }
  let people = {};

 button.addEventListener("click", (e) => {

  const rect = button.getBoundingClientRect();
  const x = rect.left + rect.width;
  const y = rect.top;

  spawnBuffon(x, y);

    const user = usernameInput.value.trim();

    if (!user) {
      alert("Inserisci il tuo nome");
      return;
    }

    if (people[user]) {
      people[user] += 1;
    } else {
      people[user] = 1;
    }

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

      if (qty === 1) {
        minus.disabled = true;
      }

      minus.onclick = () => {
        if (people[name] > 1) {
          people[name]--;
        }
        renderPeople();
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