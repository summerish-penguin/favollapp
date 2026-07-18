# routers_ai_agent.py — endpoint POST /ai/agent: chatbot con memoria di conversazione
# Riceve message (str) + history (lista di {"role", "content"}), restituisce reply (str)

from datetime import date

import requests

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models import Location, Item, User
from schemas import AgentRequest
from helpers import require_gemini_key, GEMINI_URL, GEMINI_MODEL

router = APIRouter()


def build_system_prompt(locations: list, items: list, users: list) -> str:
    """
    Costruisce il system prompt iniettando i dati dinamici dal db
    (luoghi vicini, distanze, oggetti in comune, utenti) e il contesto fisso della vacanza.
    """

    # Formatta i luoghi per categoria
    grouped = {}
    for loc in locations:
        cat = loc.category or "altro"
        grouped.setdefault(cat, []).append(loc)

    CATEGORY_LABELS = {
        "home":           "🏠 Casa",
        "supermarket":    "🛒 Supermercati",
        "beach":          "🏖️ Spiagge",
        "gas":            "⛽ Benzinai",
        "pharmacy":       "💊 Farmacie",
        "atm":            "🏧 Bancomat",
        "park_barcelona": "🅿️ Parcheggi Barcellona",
    }

    # I blocchi contengono solo le liste indentate: i titoli stanno nel template sotto
    locations_block = ""
    for cat, locs in grouped.items():
        label = CATEGORY_LABELS.get(cat, cat)
        locations_block += f"\n{label}:\n"
        for l in locs:
            mins = f" ({l.mins_away} min in auto)" if l.mins_away else ""
            locations_block += f"  - {l.name}{mins}\n"

    warehouse_block = ""
    for i in items:
        warehouse_block += f"  - {i.name}\n"

    users_block = ""
    for u in users:
        desc = f" — {u.desc}" if hasattr(u, "desc") and u.desc else ""
        users_block += f"  - {u.name}{desc}\n"

    people = len(users)
    oggi = date.today().strftime("%d/%m/%Y")

    return f"""Sei FavollAgent, l'assistente AI di FavollApp, l'app con cui un gruppo di amici organizza una vacanza insieme.

CONTESTO VACANZA
- Destinazione: Montbarbat, Catalogna (Spagna), entroterra della Costa Brava
- Periodo: 12–20 agosto 2026
- Gruppo: {people} persone
- Oggi è {oggi}

COSA TI CHIEDONO
Domande pratiche e spontanee sulla vacanza: cosa fare oggi o in un certo giorno, quale spiaggia scegliere (affollamento, fondale, servizi, distanza), cosa vedere nei dintorni (borghi, mercati, escursioni), dove mangiare o fare la spesa, logistica (supermercati, orari, distanze, parcheggi, benzinai), alternative in caso di pioggia.

KNOWLEDGE BASE (usa questi dati, non inventarne altri)
- LUOGHI VICINI ALLA CASA:
{locations_block}
- OGGETTI IN COMUNE GIÀ PORTATI:
{warehouse_block}
- PERSONE DEL GRUPPO:
{users_block}

REGOLE DI RISPOSTA
- Rispondi SOLO a ciò che ti è stato chiesto: niente programmi, itinerari o consigli extra non richiesti.
- Breve di default: massimo ~120 parole / 8 righe. Vai più lungo solo se l'utente chiede esplicitamente dettagli.
- Quando proponi alternative, massimo 3 opzioni.
- MAI attribuire attività, compiti, preferenze o decisioni alle persone del gruppo. Le descrizioni tipo "Ministro di..." sono soprannomi scherzosi, non incarichi reali: non costruirci sopra.
- Usa nomi e minuti della knowledge base; ciò che non sai (orari, prezzi, meteo, luoghi non in lista) dillo apertamente, senza inventare.
- Italiano semplice e amichevole: siamo amici in vacanza, non turisti formali. Markdown (grassetto, elenchi) solo quando aiuta.
- Al massimo una domanda breve di chiusura, solo se utile.

ESEMPI di risposte ideali (imita stile e lunghezza, non copiarle alla lettera):

Domanda: Qual è il supermercato più vicino a casa?
Risposta: Il più vicino è il **Bonpreu**, a 11 min in auto. A 12 min (verso Lloret) hai anche **Lidl** e **Carrefour Market**, comodi per la spesa grossa.

Domanda: Che spiaggia ci consigli per domani?
Risposta: Dipende da cosa cercate:
- **Platja de Fenals** (21 min) — comoda, sabbia e servizi, meno caotica di Lloret centro.
- **Cala Boadella** (22 min) — piccola e tranquilla, ideale per stare in pace.
- **Cala Canyelles** (25 min) — caletta con acqua limpida.
Ad agosto conviene arrivare entro le 10 per trovare posto.

Domanda: Cosa possiamo fare oggi?
Risposta: Un paio di idee:
- Mattina in spiaggia a **Fenals** o **Cala Boadella** (~20 min).
- Pomeriggio a Lloret per un gelato e due passi sul lungomare.
Se preferite il relax, casa e spesa al **Bonpreu** per la cena. Che mood avete?

Domanda: A che ora chiude la farmacia di Vidreres?
Risposta: Gli orari precisi non li ho. Se vi serve sul sicuro, la **Farmacia 24H di Lloret de Mar** (14 min) è sempre aperta; altrimenti controllate su Maps l'orario della Farmàcia Massuet.

Domanda: Cosa dovrebbe fare Ziba oggi?
Risposta: Non decido io per Ziba 😄 Se cercate idee per tutti: spiaggia a **Fenals** o un giro a Lloret. Chiedetelo a lui!"""


@router.post("/ai/agent")
def agent_chat(req: AgentRequest, db: Session = Depends(get_db)):
    """
    Chatbot conversazionale con memoria della sessione.
    Il frontend passa l'intera history ad ogni messaggio.
    """
    GEMINI_API_KEY = require_gemini_key()

    # Carica i luoghi, gli oggetti in comune e gli utenti dal db per il system prompt
    locations = db.query(Location).all()
    items = db.query(Item).all()
    users = db.query(User).all()
    system_prompt = build_system_prompt(locations, items, users)

    # Costruisce i messaggi: system + history + nuovo messaggio
    messages = [{"role": "system", "content": system_prompt}]
    messages += [{"role": m.role, "content": m.content} for m in req.history]
    messages.append({"role": "user", "content": req.message})

    try:
        response = requests.post(
            GEMINI_URL,
            headers={
                "Authorization": f"Bearer {GEMINI_API_KEY}",
                "Content-Type":  "application/json"
            },
            json={
                "model":       GEMINI_MODEL,
                "messages":    messages,
                "temperature": 0.4,    # un po' più creativo rispetto al parser ricette
                "max_tokens":  2048,   # margine ampio: la brevità la impone il system prompt
                # Disattiva il thinking di Gemini 2.5: per Q&A semplici non serve e
                # bruciava il budget di max_tokens col ragionamento interno (risposte troncate)
                "extra_body":  {"google": {"thinking_config": {"thinking_budget": 0}}}
            }
        )

        data  = response.json()
        reply = data["choices"][0]["message"]["content"]
        return {"reply": reply}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))