/* ==========================================================================
   MENU.JS
   ========================================================================== */

const API_BASE = "https://favollapp.onrender.com";

function todayLabel() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}


/* ==========================================================================
   INIT
   ========================================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  await loadShoppingItems();  // prima le righe da backend
  addEmptyRow();              // poi la riga vuota in fondo

  document.getElementById("send-prompt-btn").addEventListener("click", handlePrompt);

  document.getElementById("prompt-textarea").addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.ctrlKey) handlePrompt();
  });

  document.getElementById("add-row").addEventListener("click", addEmptyRow);
});


/* ==========================================================================
   LOADING OVERLAY
   ========================================================================== */

function showLoading() {
  if (document.getElementById("loading-overlay")) return;
  const overlay = document.createElement("div");
  overlay.id = "loading-overlay";
  overlay.innerHTML = `<div class="loading-spinner"></div>`;
  document.body.appendChild(overlay);
}

function hideLoading() {
  const el = document.getElementById("loading-overlay");
  if (el) el.remove();
}


/* ==========================================================================
   PROMPT AI → TABELLA
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

    /* Inserisce le righe AI prima della riga vuota in fondo */
    for (const ing of data.ingredients) {
      const qty = `${ing.quantity ?? ""} ${ing.unit ?? ""}`.trim();
      const id  = await saveRow(todayLabel(), ing.name ?? "", qty);
      if (id) insertSavedRowBeforeEmpty(id, todayLabel(), ing.name ?? "", qty);
    }

  } catch (e) {
    console.error("PROMPT ERROR:", e);
    alert("Errore nella generazione. Riprova.");
  } finally {
    hideLoading();
  }
}


/* ==========================================================================
   TABELLA — RIGA VUOTA
   Ha gli stessi controlli delle righe salvate (+ al posto di checkbox+🧹).
   Quando si salva, viene sostituita dalla riga salvata e ne viene
   aggiunta una nuova vuota in fondo.
   ========================================================================== */

function addEmptyRow() {
  const tbody = document.querySelector("#sketch-tbody");
  const tr    = document.createElement("tr");
  tr.classList.add("empty-row");

  const dayTd = document.createElement("td");
  dayTd.className       = "time-col";
  dayTd.contentEditable = "true";
  dayTd.setAttribute("placeholder", todayLabel());

  const ingTd = document.createElement("td");
  ingTd.className       = "ingredient-col";
  ingTd.contentEditable = "true";

  const qtyTd = document.createElement("td");
  qtyTd.className       = "qty-col";
  qtyTd.contentEditable = "true";

  const actionTd = document.createElement("td");
  actionTd.className = "checkout-col";

  const addBtn = document.createElement("button");
  addBtn.className   = "add-row-inline-btn";
  addBtn.textContent = "+";

  addBtn.onclick = async () => {
    const day        = dayTd.innerText.trim() || todayLabel();
    const ingredient = ingTd.innerText.trim();
    const qty        = qtyTd.innerText.trim();

    if (!ingredient) {
      ingTd.style.outline = "1.5px solid #e53e3e";
      setTimeout(() => ingTd.style.outline = "", 2000);
      return;
    }

    const id = await saveRow(day, ingredient, qty);
    if (id) {
      tbody.replaceChild(buildSavedRow(id, day, ingredient, qty), tr);
      addEmptyRow();  // nuova riga vuota sempre in fondo
    }
  };

  actionTd.appendChild(addBtn);
  tr.append(dayTd, ingTd, qtyTd, actionTd);
  tbody.appendChild(tr);
  ingTd.focus();
}


/* ==========================================================================
   TABELLA — RIGA SALVATA
   ========================================================================== */

function buildSavedRow(id, day, ingredient, qty, bought = false) {
  const tr = document.createElement("tr");
  tr.dataset.id = id;
  if (bought) tr.classList.add("bought");

  const dayTd = document.createElement("td");
  dayTd.className = "time-col";
  dayTd.innerText = day;

  const ingTd = document.createElement("td");
  ingTd.className = "ingredient-col";
  ingTd.innerText = ingredient;

  const qtyTd = document.createElement("td");
  qtyTd.className = "qty-col";
  qtyTd.innerText = qty;

  const actionTd = document.createElement("td");
  actionTd.className = "checkout-col";

  /* Checkbox "comprato" → strikethrough */
  const checkbox = document.createElement("input");
  checkbox.type    = "checkbox";
  checkbox.checked = bought;
  checkbox.classList.add("bought-checkbox");
  checkbox.onchange = () => tr.classList.toggle("bought", checkbox.checked);

  /* Bottone elimina */
  const delBtn = document.createElement("button");
  delBtn.className   = "delete-row-btn";
  delBtn.textContent = "🧹";
  delBtn.title       = "Elimina";
  delBtn.onclick     = async () => {
    const ok = await deleteRow(id);
    if (ok) tr.remove();
  };

  actionTd.append(checkbox, delBtn);
  tr.append(dayTd, ingTd, qtyTd, actionTd);
  return tr;
}

/* Inserisce una riga salvata prima della riga vuota in fondo. */
function insertSavedRowBeforeEmpty(id, day, ingredient, qty) {
  const tbody    = document.querySelector("#sketch-tbody");
  const emptyRow = tbody.querySelector(".empty-row");
  const savedTr  = buildSavedRow(id, day, ingredient, qty);

  if (emptyRow) {
    tbody.insertBefore(savedTr, emptyRow);
  } else {
    tbody.appendChild(savedTr);
  }
}

/* Aggiunge una riga salvata in fondo (usata al caricamento da backend). */
function appendSavedRow(id, day, ingredient, qty, bought = false) {
  const tbody = document.querySelector("#sketch-tbody");
  tbody.appendChild(buildSavedRow(id, day, ingredient, qty, bought));
}


/* ==========================================================================
   API
   ========================================================================== */

async function saveRow(day, ingredient, qty) {
  try {
    const res  = await fetch(`${API_BASE}/shopping`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ day, ingredient, qty })
    });
    const data = await res.json();
    return data.ok ? data.id : null;
  } catch (e) {
    console.error("SAVE ROW ERROR:", e);
    alert("Errore di rete nel salvataggio. Riprova.");
    return null;
  }
}

async function deleteRow(id) {
  try {
    const res  = await fetch(`${API_BASE}/shopping/${id}`, { method: "DELETE" });
    const data = await res.json();
    return !!data.ok;
  } catch (e) {
    console.error("DELETE ROW ERROR:", e);
    alert("Errore di rete nell'eliminazione. Riprova.");
    return false;
  }
}

async function loadShoppingItems() {
  try {
    const res   = await fetch(`${API_BASE}/shopping`);
    const items = await res.json();
    items.forEach(item => {
      appendSavedRow(item.id, item.day ?? "", item.ingredient ?? "", item.qty ?? "");
    });
  } catch (e) {
    console.error("LOAD SHOPPING ERROR:", e);
  }
}