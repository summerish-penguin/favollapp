/* ==========================================================================
   MENU.JS
   Gestisce la pagina "Il Menù":
   - Invia prompt all'AI e popola la tabella con gli ingredienti ricevuti
   - Salva ogni riga sul backend via POST /shopping
   - Carica le righe già salvate via GET /shopping al caricamento pagina
   - Permette di aggiungere righe manualmente e salvarle col bottone ✓
   ========================================================================== */

const API_BASE = "https://favollapp.onrender.com";

/* Data di oggi in formato leggibile (es. "13/08") */
function todayLabel() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}


/* ==========================================================================
   INIT
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {
  loadShoppingItems();

  document.getElementById("send-prompt-btn").addEventListener("click", handlePrompt);

  /* Invio prompt anche con Ctrl+Enter nella textarea */
  document.getElementById("prompt-textarea").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.ctrlKey) handlePrompt();
  });

  /* Bottone aggiungi riga */
  document.getElementById("add-row").addEventListener("click", addEmptyRow);
});


/* ==========================================================================
   LOADING OVERLAY
   Mostra/nasconde un overlay con spinner mentre aspetta la risposta AI.
   ========================================================================== */

function showLoading() {
  if (document.getElementById("loading-overlay")) return;

  const overlay = document.createElement("div");
  overlay.id = "loading-overlay";
  overlay.innerHTML = `<div class="loading-spinner"></div>`;
  document.body.appendChild(overlay);
}

function hideLoading() {
  const overlay = document.getElementById("loading-overlay");
  if (overlay) overlay.remove();
}


/* ==========================================================================
   PROMPT → AI → TABELLA
   Invia il testo della textarea a POST /ai/recipe,
   poi inserisce gli ingredienti come righe nella tabella e le salva.
   ========================================================================== */

async function handlePrompt() {
  const prompt = document.getElementById("prompt-textarea").value.trim();
  if (!prompt) return;

  showLoading();

  try {
    const res = await fetch(`${API_BASE}/ai/recipe`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ prompt })
    });

    if (!res.ok) throw new Error(`Errore ${res.status}`);

    const data = await res.json();

    if (!data.ingredients || !Array.isArray(data.ingredients)) {
      throw new Error("Risposta AI non valida");
    }

    /* Inserisce ogni ingrediente come riga nella tabella e lo salva */
    for (const ing of data.ingredients) {
      const qty = `${ing.quantity ?? ""} ${ing.unit ?? ""}`.trim();
      appendRow(todayLabel(), ing.name ?? "", qty, true);
      await saveRow(todayLabel(), ing.name ?? "", qty);
    }

  } catch (e) {
    console.error("PROMPT ERROR:", e);
    alert("Errore nella generazione. Riprova.");
  } finally {
    hideLoading();
  }
}


/* ==========================================================================
   TABELLA — APPEND ROW
   Aggiunge una riga alla tbody della tabella.
   Se `locked` è true, la riga viene resa non editabile (già salvata).
   ========================================================================== */

function appendRow(day, ingredient, qty, locked = false) {
  const tbody = document.querySelector("#sketch-table tbody");
  const tr    = document.createElement("tr");

  if (locked) tr.style.opacity = "0.6";

  const cells = [
    { cls: "time-col",       val: day },
    { cls: "ingredient-col", val: ingredient },
    { cls: "qty-col",        val: qty }
  ];

  cells.forEach(({ cls, val }) => {
    const td = document.createElement("td");
    td.className       = cls;
    td.contentEditable = locked ? "false" : "true";
    td.innerText       = val;
    tr.appendChild(td);
  });

  /* Bottone checkout */
  const checkoutTd  = document.createElement("td");
  checkoutTd.className = "checkout-col";
  const btn = document.createElement("button");
  btn.className   = "checkout-btn";
  btn.textContent = "✓";
  if (locked) {
    btn.disabled    = true;
    btn.style.color = "#0f6e56";
  } else {
    btn.onclick = () => checkoutRow(btn);
  }
  checkoutTd.appendChild(btn);
  tr.appendChild(checkoutTd);

  tbody.appendChild(tr);
}

/* Aggiunge una riga vuota editabile (bottone "+ aggiungi riga") */
function addEmptyRow() {
  appendRow("", "", "", false);
}


/* ==========================================================================
   CHECKOUT ROW
   Legge i valori della riga, li salva sul backend,
   poi blocca la riga in sola lettura con feedback visivo.
   ========================================================================== */

async function checkoutRow(btn) {
  const row   = btn.closest("tr");
  const cells = row.querySelectorAll("td[contenteditable]");

  const day        = cells[0]?.innerText.trim() || todayLabel();
  const ingredient = cells[1]?.innerText.trim();
  const qty        = cells[2]?.innerText.trim() || "";

  /* Ingrediente obbligatorio */
  if (!ingredient) {
    row.style.outline = "1.5px solid #e53e3e";
    setTimeout(() => row.style.outline = "", 2000);
    return;
  }

  const ok = await saveRow(day, ingredient, qty);

  if (ok) {
    /* Blocca la riga e mostra feedback verde */
    btn.disabled    = true;
    btn.style.color = "#0f6e56";
    row.querySelectorAll("td[contenteditable]")
       .forEach(td => td.contentEditable = "false");
    row.style.opacity = "0.6";
    row.style.outline = "";
  }
}


/* ==========================================================================
   API — SAVE ROW
   Invia una riga a POST /shopping.
   Restituisce true se ok, false in caso di errore.
   ========================================================================== */

async function saveRow(day, ingredient, qty) {
  try {
    const res  = await fetch(`${API_BASE}/shopping`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ day, ingredient, qty })
    });
    const data = await res.json();
    return !!data.ok;
  } catch (e) {
    console.error("SAVE ROW ERROR:", e);
    alert("Errore di rete nel salvataggio. Riprova.");
    return false;
  }
}


/* ==========================================================================
   API — LOAD SHOPPING ITEMS
   Carica le righe già salvate da GET /shopping e le aggiunge in fondo
   alla tabella come righe bloccate (già checkoutate).
   ========================================================================== */

async function loadShoppingItems() {
  try {
    const res   = await fetch(`${API_BASE}/shopping`);
    const items = await res.json();

    items.forEach(item => {
      appendRow(item.day ?? "", item.ingredient ?? "", item.qty ?? "", true);
    });

  } catch (e) {
    console.error("LOAD SHOPPING ERROR:", e);
  }
}