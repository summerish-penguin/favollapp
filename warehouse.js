/* ==========================================================================
   WAREHOUSE.JS – Logica "Il bagaglio del Favollo"
   Permette a ogni utente di dichiararsi portatore di un oggetto,
   con gestione delle quantità (+/–) e rimozione.
   ========================================================================== */


/* ------------------------------------------------------------------
   ANIMAZIONE BUFFON
   Spawna un'immagine di Buffon che vola verso l'alto dal punto cliccato.
------------------------------------------------------------------ */
function spawnBuffon(x, y) {
  const img = document.createElement("img");
  img.src = "./assets/buffon.png";
  img.classList.add("buffon");
  img.style.left = (x - 25) + "px";
  img.style.top  = (y - 25) + "px";

  document.body.appendChild(img);
  setTimeout(() => img.remove(), 1000);
}


/* ------------------------------------------------------------------
   LOGICA WAREHOUSE
   Ogni .warehouse-item ha:
   - un bottone "Lo porto io!" → aggiunge l'utente con quantità 1
   - un .people div → mostra i tag persona con controlli +/–/✕
------------------------------------------------------------------ */
const usernameInput = document.getElementById("username");
const items = document.querySelectorAll(".warehouse-item");

items.forEach(item => {

  const button   = item.querySelector(".take-btn");
  const peopleDiv = item.querySelector(".people");

  // Stato locale dell'item: { [nomeUtente]: quantità }
  let people = {};

  /* -- Aggiungi portatore -- */
  button.addEventListener("click", () => {
    const user = usernameInput.value.trim();

    if (!user) {
      alert("Inserisci il tuo nome");
      return;
    }

    // Animazione Buffon dal centro del bottone
    const rect = button.getBoundingClientRect();
    spawnBuffon(rect.left + rect.width / 2, rect.top);

    // Incrementa la quantità per questo utente
    people[user] = (people[user] || 0) + 1;

    renderPeople();
  });


  /* -- Render lista portatori -- */
  function renderPeople() {
    peopleDiv.innerHTML = "";

    Object.entries(people).forEach(([name, qty]) => {

      const tag = document.createElement("div");
      tag.classList.add("person-tag");

      // Nome + quantità
      const label = document.createElement("span");
      label.classList.add("person-name");
      label.innerText = `${name} (${qty})`;

      // Bottone ▲ aumenta quantità
      const plus = document.createElement("button");
      plus.innerText = "▲";
      plus.classList.add("qty-btn");
      plus.onclick = () => {
        people[name]++;
        renderPeople();
      };

      // Bottone ▼ diminuisce quantità (disabilitato a 1)
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

      // Bottone ✕ rimuove il portatore
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
