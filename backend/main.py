# =============================================================================
# MAIN.PY — Entry point FastAPI
#
# Struttura del progetto:
#   main.py                  ← questo file
#   schemas.py               ← Pydantic models
#   helpers.py               ← funzioni db condivise
#   seed.py                  ← dati iniziali
#   
#   routers_warehouse.py           ← /warehouse, /items
#   routers_shopping.py            ← /shopping
#   routers_ai_recipe.py                  ← /ai/recipe
#   routers_misc.py                ← /users, /locations, /health
# =============================================================================

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

from seed import seed

load_dotenv()

app = FastAPI()


# =============================================================================
# CORS
# =============================================================================

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


# =============================================================================
# MIDDLEWARE — logging automatico delle richieste
# Salva ip, user-agent, path e metodo per ogni chiamata (escluso /health).
# =============================================================================

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


# =============================================================================
# DB — crea le tabelle se non esistono
# =============================================================================

Base.metadata.create_all(bind=engine)


# =============================================================================
# ROUTER REGISTRATION
# =============================================================================

app.include_router(warehouse_router)
app.include_router(shopping_router)
app.include_router(ai_router_receipe)
app.include_router(misc_router)
app.include_router(ai_agent_router)


# =============================================================================
# STARTUP
# =============================================================================

@app.on_event("startup")
def startup():
    seed()
