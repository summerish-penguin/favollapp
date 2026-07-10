# routers_auth.py — login "rivendica una personH"
# Le personH del gruppo esistono già (vedi seed.py); ognuna imposta la password al primo
# accesso ("claim") e da lì fa login. La protezione è solo lato client: qui verifichiamo
# davvero la password, ma gli altri endpoint restano aperti come da scelta di progetto.

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models import User
from schemas import LoginRequest
from helpers import hash_password, verify_password

router = APIRouter(prefix="/auth")

MIN_PASSWORD_LEN = 4


def _user_payload(user: User) -> dict:
    """Dati pubblici della personH restituiti al frontend (mai l'hash)."""
    return {"name": user.name, "desc": user.desc, "icon": user.icon}


@router.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Login o primo accesso (claim) di una personH.

    - personH senza password → la imposta ora e risponde con claimed=True
    - personH con password → la verifica (401 se errata)
    """
    password = req.password.strip()
    if len(password) < MIN_PASSWORD_LEN:
        raise HTTPException(
            status_code=422,
            detail=f"La password deve avere almeno {MIN_PASSWORD_LEN} caratteri.",
        )

    user = db.query(User).filter(User.name.ilike(req.name.strip())).first()
    if not user:
        raise HTTPException(status_code=404, detail="PersonH non trovata.")

    # Primo accesso: nessuna password ancora impostata → la rivendica
    if not user.password_hash:
        user.password_hash = hash_password(password)
        db.commit()
        return {"ok": True, "claimed": True, "user": _user_payload(user)}

    # Accessi successivi: verifica
    if not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Password errata.")

    return {"ok": True, "claimed": False, "user": _user_payload(user)}
