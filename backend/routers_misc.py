# routers_misc.py — endpoint /users, /locations, /health

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from db import get_db
from models import User, Location

router = APIRouter()


@router.get("/users")
def get_users(db: Session = Depends(get_db)):
    """Restituisce tutti gli utenti ordinati per nome.

    `claimed` indica se la personH ha già impostato la password (primo accesso fatto).
    """
    users = db.query(User).order_by(User.name).all()
    return [
        {
            "name": u.name,
            "desc": u.desc,
            "icon": u.icon,
            "claimed": u.password_hash is not None,
        }
        for u in users
    ]


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


@router.get("/health")
def health():
    """Health check per UptimeRobot e sistemi di monitoring."""
    return {"status": "ok"}
