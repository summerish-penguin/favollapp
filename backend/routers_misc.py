# =============================================================================
# ROUTERS/MISC.PY
# Endpoint: /users, /locations, /health
# =============================================================================

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db import SessionLocal
from models import User, Location

router = APIRouter()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ── GET /users ─────────────────────────────────────────────────────────────

@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    """Restituisce tutti gli utenti ordinati per nome."""
    users = db.query(User).order_by(User.name).all()
    return [{"name": u.name, "desc": u.desc, "icon": u.icon} for u in users]


# ── GET /locations ─────────────────────────────────────────────────────────

@router.get("/locations")
def get_locations(db: Session = Depends(get_db)):
    """Restituisce tutti i punti di interesse per la mappa."""
    locations = db.query(Location).all()
    return [
        {
            "LocationName": loc.name,
            "Lat":          loc.lat,
            "Lng":          loc.lng,
            "LocCategory":  loc.category,
            "MinsAway":     loc.mins_away
        }
        for loc in locations
    ]


# ── GET /health ────────────────────────────────────────────────────────────

@router.get("/health")
def health():
    """Health check per UptimeRobot e sistemi di monitoring."""
    return {"status": "ok"}
