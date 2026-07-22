# main.py — entry point FastAPI: crea l'app, monta CORS/logging/router, esegue il seed all'avvio

import threading
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from db import engine, SessionLocal
from models import Base, AccessLog, SpotifyAuth

# Router
from routers_warehouse import router as warehouse_router
from routers_shopping   import router as shopping_router
from routers_ai_recipe         import router as ai_router_receipe
from routers_misc       import router as misc_router
from routers_ai_agent import router as ai_agent_router
from routers_auth      import router as auth_router
from routers_playlist  import (
    router as playlist_router,
    sync_playlist_to_spotify,
    winning_signature,
    get_synced_sig,
    mark_synced,
)

from seed import seed

load_dotenv()

app = FastAPI()


# Abilita le chiamate dal frontend statico (GitHub Pages + sviluppo locale)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "https://summerish-penguin.github.io",
        "*"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Logga ip, user-agent, path e metodo di ogni richiesta (esclude /health)
EXCLUDED_PATHS = ["/health"]

@app.middleware("http")
async def log_requests(request: Request, call_next):
    response = await call_next(request)

    if request.url.path in EXCLUDED_PATHS:
        return response

    try:
        db = SessionLocal()
        log = AccessLog(
            ip         = request.headers.get("x-forwarded-for", request.client.host),
            user_agent = request.headers.get("user-agent"),
            path       = request.url.path,
            method     = request.method
        )
        db.add(log)
        db.commit()
    except Exception as e:
        print("LOG ERROR:", e)
    finally:
        db.close()

    return response


# Crea le tabelle nel database se non esistono già
Base.metadata.create_all(bind=engine)

# Monta i router di ogni area funzionale
app.include_router(warehouse_router)
app.include_router(shopping_router)
app.include_router(ai_router_receipe)
app.include_router(misc_router)
app.include_router(ai_agent_router)
app.include_router(auth_router)
app.include_router(playlist_router)


# Scheduler di auto-sync: ogni 10s risincronizza la playlist Spotify, ma solo
# quando l'insieme dei brani vincenti è cambiato (per non martellare l'API).
# NB: con più worker uvicorn partirebbe un loop per worker; in questo deploy è single-worker.
AUTOSYNC_INTERVAL = 10


def _autosync_loop():
    while True:
        time.sleep(AUTOSYNC_INTERVAL)
        db = SessionLocal()
        try:
            row = db.query(SpotifyAuth).first()
            if not row or not row.refresh_token:
                continue  # Spotify non collegato: niente da fare
            sig = winning_signature(db)
            if sig == get_synced_sig():
                continue  # già allineato: nessun push necessario
            # Non creare una playlist vuota finché non c'è almeno un brano vincente
            if sig or row.playlist_id:
                sync_playlist_to_spotify(db)   # se solleva, non marchiamo: si ritenta al prossimo giro
            mark_synced(sig)                    # allineato: la UI mostrerà "Playlist aggiornata"
        except Exception as e:
            print("AUTOSYNC ERROR:", e)
        finally:
            db.close()


# Popola item e utenti di default all'avvio dell'app
@app.on_event("startup")
def startup():
    seed()
    threading.Thread(target=_autosync_loop, daemon=True).start()
