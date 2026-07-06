// menu.js — lista della spesa: tabella editabile + generazione ingredienti via AI

// ---- Costanti e helper di formattazione ----

function todayLabel() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// ---- Init: carica la lista e registra tutti gli event listener ----

document.addEventListener('DOMContentLoaded', async () => {
  await loadShoppingItems();
  addEmptyRow();

  document
    .getElementById('send-prompt-btn')
    .addEventListener('click', handlePrompt);

  const textarea = document.getElementById('prompt-textarea');
  const submitBtn = document.getElementById('send-prompt-btn');

  // Ctrl+Enter invia il prompt AI
  textarea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) handlePrompt();
  });

  // Enter (senza shift) equivale a cliccare il bottone di invio
  textarea.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      submitBtn.click();
    }
  });

  // Svuota l'intera lista della spesa, previa conferma
  document.getElementById('clear-note').addEventListener('click', async () => {
    if (!(await showConfirm('Sei sicuro di voler svuotare tutta la lista?'))) return;

    try {
      const res = await fetch(`${API_BASE}/shopping`, { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        document.querySelector('#sketch-tbody').innerHTML = '';
        addEmptyRow();
      }
    } catch (e) {
      console.error('CLEAR ERROR:', e);
      showToast('Errore di rete. Riprova.');
    }
  });
});

// ---- Overlay di caricamento durante le chiamate AI ----

function showLoading() {
  if (document.getElementById('loading-overlay')) return;
  const overlay = document.createElement('div');
  overlay.id = 'loading-overlay';
  overlay.innerHTML = `<div class="loading-spinner"></div>`;
  document.body.appendChild(overlay);
}

function hideLoading() {
  const el = document.getElementById('loading-overlay');
  if (el) el.remove();
}

// ---- Prompt AI: genera ingredienti e li inserisce in tabella ----

async function handlePrompt() {
  const textarea = document.getElementById('prompt-textarea');
  const prompt = textarea.value.trim();
  if (!prompt) return;

  showLoading();

  try {
    const res = await fetch(`${API_BASE}/ai/recipe`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt }),
    });

    if (!res.ok) throw new Error(`Errore ${res.status}`);
    const data = await res.json();

    if (!data.ingredients || !Array.isArray(data.ingredients)) {
      throw new Error('Risposta AI non valida');
    }

    for (const ing of data.ingredients) {
      const qty = `${ing.quantity ?? ''} ${ing.unit ?? ''}`.trim();
      const id = await saveRow(todayLabel(), ing.name ?? '', qty);
      if (id) insertSavedRowBeforeEmpty(id, todayLabel(), ing.name ?? '', qty);
    }
  } catch (e) {
    console.error('PROMPT ERROR:', e);
    showToast('Errore nella generazione. Riprova.');
  } finally {
    hideLoading();
  }

  textarea.value = '';
}

// ---- Costruzione righe della tabella (vuota / salvata) ----

// Riga vuota, editabile, con bottone + per salvarla
function addEmptyRow() {
  const tbody = document.querySelector('#sketch-tbody');
  const tr = document.createElement('tr');
  tr.classList.add('empty-row');

  const dayTd = document.createElement('td');
  dayTd.className = 'time-col';
  dayTd.contentEditable = 'true';

  const ingTd = document.createElement('td');
  ingTd.className = 'ingredient-col';
  ingTd.contentEditable = 'true';

  const qtyTd = document.createElement('td');
  qtyTd.className = 'qty-col';
  qtyTd.contentEditable = 'true';

  const actionTd = document.createElement('td');
  actionTd.className = 'checkout-col-td';

  const wrapper = document.createElement('div');
  wrapper.className = 'action-wrapper';

  const addBtn = document.createElement('button');
  addBtn.className = 'add-row-inline-btn';
  addBtn.textContent = '➕';

  addBtn.onclick = async () => {
    const day = dayTd.innerText.trim() || todayLabel();
    const ingredient = ingTd.innerText.trim();
    const qty = qtyTd.innerText.trim();

    if (!ingredient) {
      ingTd.style.outline = '1.5px solid #e53e3e';
      setTimeout(() => (ingTd.style.outline = ''), 2000);
      return;
    }

    const id = await saveRow(day, ingredient, qty);
    if (id) {
      tbody.replaceChild(buildSavedRow(id, day, ingredient, qty), tr);
      addEmptyRow();
    }
  };

  wrapper.appendChild(addBtn);
  actionTd.appendChild(wrapper);
  tr.append(dayTd, ingTd, qtyTd, actionTd);
  tbody.appendChild(tr);
}

// Riga salvata, editabile, con checkbox comprato + bottone elimina.
// Le celle sono contenteditable; ogni modifica trigghera un PUT /shopping/{id}
// con debounce da 600ms per non spammare il backend ad ogni tasto.
function buildSavedRow(id, day, ingredient, qty, bought = false) {
  const tr = document.createElement('tr');
  tr.dataset.id = id;
  if (bought) tr.classList.add('bought');

  const dayTd = document.createElement('td');
  dayTd.className = 'time-col';
  dayTd.contentEditable = 'true';
  dayTd.innerText = day;

  const ingTd = document.createElement('td');
  ingTd.className = 'ingredient-col';
  ingTd.contentEditable = 'true';
  ingTd.innerText = ingredient;

  const qtyTd = document.createElement('td');
  qtyTd.className = 'qty-col';
  qtyTd.contentEditable = 'true';
  qtyTd.innerText = qty;

  /* Debounce: invia la modifica al backend dopo 600ms di inattività */
  let debounceTimer = null;
  const onEdit = () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      updateRow(
        id,
        dayTd.innerText.trim(),
        ingTd.innerText.trim(),
        qtyTd.innerText.trim(),
      );
    }, 600);
  };

  dayTd.addEventListener('input', onEdit);
  ingTd.addEventListener('input', onEdit);
  qtyTd.addEventListener('input', onEdit);

  const actionTd = document.createElement('td');
  actionTd.className = 'checkout-col-td';

  const wrapper = document.createElement('div');
  wrapper.className = 'action-wrapper';

  /* Checkbox "comprato" → strikethrough */
  const checkbox = document.createElement('input');
  checkbox.type = 'checkbox';
  checkbox.checked = bought;
  checkbox.classList.add('bought-checkbox');
  checkbox.onchange = () => tr.classList.toggle('bought', checkbox.checked);

  /* Bottone elimina */
  const delBtn = document.createElement('button');
  delBtn.className = 'delete-row-btn';
  delBtn.textContent = '🗑️';
  delBtn.title = 'Elimina';
  delBtn.onclick = async () => {
    const ok = await deleteRow(id);
    if (ok) tr.remove();
  };

  wrapper.append(checkbox, delBtn);
  actionTd.appendChild(wrapper);
  tr.append(dayTd, ingTd, qtyTd, actionTd);
  return tr;
}

// Inserisce una riga salvata prima della riga vuota in fondo
function insertSavedRowBeforeEmpty(id, day, ingredient, qty) {
  const tbody = document.querySelector('#sketch-tbody');
  const emptyRow = tbody.querySelector('.empty-row');
  const savedTr = buildSavedRow(id, day, ingredient, qty);
  if (emptyRow) {
    tbody.insertBefore(savedTr, emptyRow);
  } else {
    tbody.appendChild(savedTr);
  }
}

// Aggiunge una riga salvata in fondo — usata al caricamento da backend
function appendSavedRow(id, day, ingredient, qty, bought = false) {
  const tbody = document.querySelector('#sketch-tbody');
  tbody.appendChild(buildSavedRow(id, day, ingredient, qty, bought));
}

// ---- Chiamate API verso /shopping ----

async function saveRow(day, ingredient, qty) {
  try {
    const res = await fetch(`${API_BASE}/shopping`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day, ingredient, qty }),
    });
    const data = await res.json();
    return data.ok ? data.id : null;
  } catch (e) {
    console.error('SAVE ROW ERROR:', e);
    showToast('Errore di rete nel salvataggio. Riprova.');
    return null;
  }
}

// Aggiorna una riga salvata — chiamata dal debounce onEdit
async function updateRow(id, day, ingredient, qty) {
  try {
    await fetch(`${API_BASE}/shopping/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ day, ingredient, qty }),
    });
  } catch (e) {
    console.error('UPDATE ROW ERROR:', e);
  }
}

async function deleteRow(id) {
  try {
    const res = await fetch(`${API_BASE}/shopping/${id}`, { method: 'DELETE' });
    const data = await res.json();
    return !!data.ok;
  } catch (e) {
    console.error('DELETE ROW ERROR:', e);
    showToast("Errore di rete nell'eliminazione. Riprova.");
    return false;
  }
}

async function loadShoppingItems() {
  try {
    const res = await fetch(`${API_BASE}/shopping`);
    const items = await res.json();
    items.forEach((item) => {
      appendSavedRow(
        item.id,
        item.day ?? '',
        item.ingredient ?? '',
        item.qty ?? '',
      );
    });
  } catch (e) {
    console.error('LOAD SHOPPING ERROR:', e);
  }
}
