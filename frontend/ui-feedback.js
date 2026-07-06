// ui-feedback.js — notifiche toast e dialog di conferma custom, al posto
// degli alert()/confirm() nativi del browser. Incluso in ogni pagina.

let toastTimer = null;

// Mostra un messaggio temporaneo in basso, al posto di alert()
function showToast(message, type = 'error') {
  let toast = document.getElementById('ui-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'ui-toast';
    toast.className = 'ui-toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.dataset.type = type;

  // Forza il replay dell'animazione se un toast precedente è ancora visibile
  toast.classList.remove('show');
  void toast.offsetWidth;
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}

// Mostra un dialog di conferma, al posto di confirm(). Risolve true/false.
function showConfirm(message, { confirmText = 'Conferma', cancelText = 'Annulla' } = {}) {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const card = document.createElement('div');
    card.className = 'modal-card';

    const text = document.createElement('p');
    text.className = 'modal-message';
    text.textContent = message;

    const btnRow = document.createElement('div');
    btnRow.className = 'modal-btn-row';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'modal-cancel-btn';
    cancelBtn.textContent = cancelText;

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'modal-create-btn';
    confirmBtn.textContent = confirmText;

    function close(result) {
      overlay.remove();
      resolve(result);
    }

    cancelBtn.onclick = () => close(false);
    confirmBtn.onclick = () => close(true);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });

    btnRow.append(cancelBtn, confirmBtn);
    card.append(text, btnRow);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    confirmBtn.focus();
  });
}
