# =============================================================================
# HELPERS.PY — Funzioni di utilità condivise tra i router
# =============================================================================

from sqlalchemy.orm import Session
from models import User, Item


def get_or_create_user(db: Session, name: str) -> User:
    """Restituisce l'utente con il nome dato, creandolo se non esiste."""
    user = db.query(User).filter_by(name=name).first()
    if not user:
        user = User(name=name)
        db.add(user)
        db.commit()
        db.refresh(user)
    return user


def get_or_create_item(db: Session, name: str) -> Item:
    """Restituisce l'item con il nome dato, creandolo se non esiste."""
    item = db.query(Item).filter_by(name=name).first()
    if not item:
        item = Item(name=name, target=1)
        db.add(item)
        db.commit()
        db.refresh(item)
    return item


def get_user_count(db: Session) -> int:
    """Restituisce il numero totale di utenti registrati."""
    return db.query(User).count()
