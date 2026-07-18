# routers_ai_recipe.py — endpoint /ai/recipe: genera ingredienti via gEMINI LLM

import json
import requests

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from schemas import RecipeRequest
from helpers import get_user_count, require_gemini_key, GEMINI_URL, GEMINI_MODEL

router = APIRouter()


@router.post("/ai/recipe")
def generate_recipe(req: RecipeRequest, db: Session = Depends(get_db)):
    """
    Riceve un prompt (nome piatto + contesto opzionale) e restituisce
    un JSON con la lista degli ingredienti calibrata sul numero di persone.
    """
    GEMINI_API_KEY = require_gemini_key()
    people = get_user_count(db)

    system_prompt = f"""Sei un parser di ricette per un'app di gruppo in vacanza. Ricevi il nome di un piatto (più eventuale contesto) e restituisci SOLO gli ingredienti in JSON.

FORMATO (nessun testo, markdown o commento fuori dal JSON):
{{"ingredients": [{{"name": "string", "quantity": number, "unit": "g|ml|pz"}}]}}

REGOLE
- Porzioni: {people} persone, quantità medio-abbondanti (pasta 120 g/persona; carne ~200 g/persona; verdure e resto in proporzione).
- Se il testo dell'utente indica quantità, numero di persone o varianti, quelle hanno la precedenza su queste regole.
- Includi solo ingredienti realmente necessari al piatto e unisci i duplicati in un'unica voce.
- Nomi in italiano e specifici: indica il taglio di carne, il tipo di pomodoro (passata/pelati/polpa/freschi), il formato di pasta, ecc. ("onion" → "cipolla").
- unit: "g" per solidi, "ml" per liquidi, "pz" per interi non pesabili (uova, spicchi d'aglio…). Quantità come numeri sensati e arrotondati, mai zero o negativi.
- Condimenti base (sale, pepe, olio) solo se rilevanti per il piatto.
- Piatto sconosciuto o ambiguo: fai comunque la stima più plausibile e restituisci un JSON valido, mai una spiegazione.
- Se la richiesta non riguarda un piatto/cibo, restituisci {{"ingredients": []}}."""

    try:
        response = requests.post(
            GEMINI_URL,
            headers={
                "Authorization": f"Bearer {GEMINI_API_KEY}",
                "Content-Type": "application/json"
            },
            json={
                "model": GEMINI_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user",   "content": req.prompt}
                ],
                "temperature": 0.3,
                # Forza output JSON a livello di modello; il parsing robusto sotto resta come fallback
                "response_format": {"type": "json_object"}
            }
        )

        data    = response.json()
        content = data["choices"][0]["message"]["content"]

        # Parsing robusto: gestisce testo sporco attorno al JSON
        try:
            parsed = json.loads(content)
        except json.JSONDecodeError:
            start  = content.find("{")
            end    = content.rfind("}") + 1
            parsed = json.loads(content[start:end])

        return parsed

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
