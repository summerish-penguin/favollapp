const list = document.getElementById("destinations");

if (list) {

  const API = "https://tuo-backend-url/vote";
  const submitBtn = document.getElementById("submitBtn");

  let draggedItem = null;
  let placeholder = document.createElement("li");
  placeholder.classList.add("placeholder");

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

  function getDragAfterElement(container, y) {
    const elements = [...container.querySelectorAll("li:not(.dragging):not(.placeholder)")];

    return elements.reduce((closest, child) => {
      const box = child.getBoundingClientRect();
      const offset = y - box.top - box.height / 2;

      if (offset < 0 && offset > closest.offset) {
        return { offset, element: child };
      } else {
        return closest;
      }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  }

  submitBtn?.addEventListener("click", async () => {

    const user = document.getElementById("username").value.trim();

    if (!user) {
      alert("Inserisci il tuo nome");
      return;
    }

    const choices = [...document.querySelectorAll("#destinations li:not(.placeholder)")]
      .map(el => el.innerText);

    try {
      await fetch(API, {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ user, choices })
      });

      submitBtn.innerText = "Voto salvato ✓";

    } catch {
      alert("Errore invio voto");
    }
  });

  document.querySelectorAll("#destinations li")
    .forEach(li => li.draggable = true);
}