# security.py — autenticazione con token JWT per gli endpoint di scrittura.
# Il login (routers_auth) emette un token firmato; qui lo verifichiamo e ricaviamo
# la personH autenticata, così le regole del Bagaglio sono applicate lato server e
# non dipendono più dalla fiducia nel client.

import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, Header, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models import User

# Segreto di firma: in produzione impostare JWT_SECRET (env) per sessioni stabili;
# senza, ne generiamo uno effimero (i token decadono a ogni riavvio → si rifà il login).
JWT_SECRET = os.getenv("JWT_SECRET") or secrets.token_hex(32)
JWT_ALGO = "HS256"
TOKEN_TTL = timedelta(days=30)


def create_access_token(user: User) -> str:
    """Emette un JWT firmato con nome e ruolo della personH."""
    payload = {
        "sub": user.name,
        "is_admin": bool(user.is_admin),
        "exp": datetime.now(timezone.utc) + TOKEN_TTL,
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGO)


def get_current_user(
    authorization: str = Header(None),
    db: Session = Depends(get_db),
) -> User:
    """Dependency: verifica il token Bearer e restituisce la personH dal DB.

    Rileggiamo l'utente dal DB (non ci fidiamo del claim `is_admin` nel token),
    così un cambio di ruolo ha effetto immediato.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Autenticazione richiesta.")

    token = authorization[len("Bearer "):]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGO])
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Sessione non valida. Rifai il login.")

    name = payload.get("sub")
    user = db.query(User).filter(User.name.ilike(name)).first() if name else None
    if not user:
        raise HTTPException(status_code=401, detail="Utente non trovato. Rifai il login.")
    return user
