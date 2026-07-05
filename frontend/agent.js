// agent.js — chatbot FavollApp, comunica con POST /ai/agent
// Mantiene la history della conversazione in memoria per il multi-turno

const messagesEl = document.getElementById("agent-chat-messages");
const inputEl    = document.getElementById("agent-input");
const sendBtn    = document.getElementById("agent-send");

/* Cronologia conversazione: [{ role: "user"|"assistant", content: "..." }]
   Viene passata ad ogni richiesta per mantenere il contesto multi-turno. */
const history = [];


// ---- Events ----

sendBtn.onclick = sendMessage;

inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});


// ---- Send: invia il messaggio e aggiorna la history ----

async function sendMessage() {
  const text = inputEl.value.trim();
  if (!text) return;

  addMessage(text, "user");
  inputEl.value = "";

  /* Aggiunge subito alla history prima della risposta */
  history.push({ role: "user", content: text });

  const loadingBubble = addMessage("Sto pensando...", "agent");

  try {
    const res = await fetch(`${API_BASE}/ai/agent`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        message: text,
        history: history.slice(0, -1)  // history senza l'ultimo (già nel message)
      })
    });

    if (!res.ok) throw new Error(`Errore ${res.status}`);

    const data  = await res.json();
    const reply = data.reply;

    /* Aggiunge la risposta alla history */
    history.push({ role: "assistant", content: reply });

    updateBubble(loadingBubble, reply);

  } catch (err) {
    console.error("AGENT ERROR:", err);
    history.pop(); // rimuove il messaggio utente se la richiesta fallisce
    updateBubble(loadingBubble, "Errore durante la richiesta. Riprova.");
  }
}


// ---- Chat UI: render dei messaggi e scroll ----

function addMessage(text, sender = "agent") {
  const row = document.createElement("div");
  row.className = sender === "user" ? "user-row" : "agent-row";

  const bubble = document.createElement("div");
  bubble.className   = sender === "user" ? "user-bubble" : "agent-bubble";
  bubble.textContent = text;

  row.appendChild(bubble);
  messagesEl.appendChild(row);

  if (sender === "user") {
    scrollToMessage(row);   // ← porta il messaggio utente in cima
  } else {
    scrollChat();           // ← per i messaggi agente scrolla normalmente
  }

  return bubble;
}

function scrollToMessage(row) {
  requestAnimationFrame(() => {
    row.scrollIntoView({ behavior: "smooth", block: "start" });
  });
}

function updateBubble(bubble, text) {
  bubble.innerHTML = marked.parse(text);
  scrollChat();
}

function scrollChat() {
  requestAnimationFrame(() => {
    messagesEl.scrollTo({
      top: messagesEl.scrollHeight,
      behavior: "smooth"
    });
  });
}