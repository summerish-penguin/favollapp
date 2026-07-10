# main.py — entry point FastAPI: crea l'app, monta CORS/logging/router, esegue il seed all'avvio

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from db import engine, SessionLocal
from models import Base, AccessLog

# Router
from routers_warehouse import router as warehouse_router
from routers_shopping   import router as shopping_router
from routers_ai_recipe         import router as ai_router_receipe
from routers_misc       import router as misc_router
from routers_ai_agent import router as ai_agent_router
from routers_auth      import router as auth_router

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


# Popola item e utenti di default all'avvio dell'app
@app.on_event("startup")
def startup():
    seed()
