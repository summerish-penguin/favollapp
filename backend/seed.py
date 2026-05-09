# =============================================================================
# SEED.PY — Dati iniziali e funzione di seeding del database
# =============================================================================

from db import SessionLocal
from models import Item, User


SEED_ITEMS = [
    ("Ombrellone",        6),
    ("Gazebo",            1),
    ("Borsa frigo",       7),
    ("Ghiaccini",        20),
    ("Sedia da spiaggia", 6),
    ("Carte da gioco",    2),
    ("Rete da beach",     1),
    ("Palla da beach",    2),
    ("Bocce spiaggia",    1),
]

SEED_USERS = [
    ("Bea",        "Ministro dei Rapporti con il Parlamento", "🏠"),
    ("Cassi",      "Ministro dei Beni Culturali",             "🎨"),
    ("Ila",        "Presidente del Consiglio dei Ministri",   "👑"),
    ("Marta",      "Ministro degli Esteri",                   "✈️"),
    ("Pril",       "Ministro delle Infrastrutture",           "🧱"),
    ("Bak",        "Ministro della Difesa",                   "🛡️"),
    ("Pippo",      "Ministro dell'Istruzione",                "🧑‍🎓"),
    ("Ciccio",     "Ministro delle Pari Opportunità",         "👴🏾"),
    ("Pisi",       "Ministro della Sovranità Alimentare",     "🌾"),
    ("Ciolo",      "Ministro della Giustizia",                "⚖️"),
    ("Varru",      "Ministro dell'Innovazione",               "🖥️"),
    ("Giolli",     "Ministro dell'Energia",                   "🔋"),
    ("Anna Colli", "Ministro dell'Interno",                   "🚓"),
    ("Ziba",       "Ministro dello Sport",                    "⚽"),
]


def seed():
    """Popola il database con item e utenti di default se non esistono già."""
    db = SessionLocal()
    try:
        for name, target in SEED_ITEMS:
            item = db.query(Item).filter_by(name=name).first()
            if not item:
                db.add(Item(name=name, target=target))
            else:
                item.target = target
        db.commit()

        for name, desc, icon in SEED_USERS:
            user = db.query(User).filter(User.name.ilike(name)).first()
            if not user:
                db.add(User(name=name, desc=desc, icon=icon))
            else:
                user.desc = desc
                user.icon = icon
        db.commit()

    finally:
        db.close()
