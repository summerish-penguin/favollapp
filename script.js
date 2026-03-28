const API = "https://tuo-backend-url/vote";

const list = document.getElementById("destinations");
const submitBtn = document.getElementById("submitBtn");

let draggedItem = null;

let placeholder = document.createElement("li");
placeholder.classList.add("placeholder");

/* =========================
   DESKTOP
========================= */

list.addEventListener("dragstart", (e) => {
  if (e.target.tagName === "LI") {
    draggedItem = e.target;

    placeholder.style.height = draggedItem.offsetHeight + "px";

    draggedItem.classList.add("dragging");

    setTimeout(() => {
      draggedItem.style.display = "none";
    }, 0);
  }
});

list.addEventListener("dragend", () => {

  if (!draggedItem) return;

  draggedItem.classList.remove("dragging");
  draggedItem.style.display = "block";

  if (placeholder.parentNode) {
    placeholder.replaceWith(draggedItem);
  }

  draggedItem = null;
});

list.addEventListener("dragover", (e) => {
  e.preventDefault();

  const afterElement = getDragAfterElement(list, e.clientY);

  if (afterElement == null) {
    list.appendChild(placeholder);
  } else {
    list.insertBefore(placeholder, afterElement);
  }
});


/* =========================
   MOBILE (TOUCH)
========================= */

list.addEventListener("touchstart", (e) => {
  if (e.target.tagName === "LI") {
    draggedItem = e.target;

    placeholder.style.height = draggedItem.offsetHeight + "px";

    draggedItem.classList.add("dragging");
  }
});

list.addEventListener("touchmove", (e) => {
  if (!draggedItem) return;

  e.preventDefault();

  const touch = e.touches[0];
  const afterElement = getDragAfterElement(list, touch.clientY);

  if (afterElement == null) {
    list.appendChild(placeholder);
  } else {
    list.insertBefore(placeholder, afterElement);
  }
});

function finishTouchDrag() {
  if (!draggedItem) return;

  draggedItem.classList.remove("dragging");

  if (placeholder.parentNode) {
    placeholder.replaceWith(draggedItem);
  }

  draggedItem = null;
}

list.addEventListener("touchend", finishTouchDrag);
list.addEventListener("touchcancel", finishTouchDrag);


/* =========================
   HELPER
========================= */

function getDragAfterElement(container, y) {

  const elements = [...container.querySelectorAll("li:not(.dragging):not(.placeholder)")];

  return elements.reduce((closest, child) => {

    const box = child.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;

    if (offset < 0 && offset > closest.offset) {
      return { offset: offset, element: child };
    } else {
      return closest;
    }

  }, { offset: Number.NEGATIVE_INFINITY }).element;
}


/* =========================
   SUBMIT VOTE
========================= */

submitBtn.addEventListener("click", submitVote);

async function submitVote() {

  const userInput = document.getElementById("username");
  const user = userInput.value.trim();

  if (!user) {
    alert("Inserisci il tuo nome");
    return;
  }

  const choices = [...document.querySelectorAll("#destinations li:not(.placeholder)")]
    .map(el => el.innerText);

  submitBtn.disabled = true;
  submitBtn.innerText = "Invio...";

  try {

    const response = await fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, choices })
    });

    if (!response.ok)
      throw new Error();

    submitBtn.innerText = "Voto salvato ✓";

  } catch {

    alert("Errore invio voto");

    submitBtn.disabled = false;
    submitBtn.innerText = "Invia voto";
  }
}


/* =========================
   ENABLE DRAG ATTRIBUTE
========================= */

document.querySelectorAll("#destinations li")
  .forEach(li => li.draggable = true);