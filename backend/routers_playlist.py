# routers_playlist.py — endpoint /playlist (brani proposti, voti, classifica) e
# /playlist/search (autocomplete via Spotify). La sincronizzazione sulla playlist
# Spotify vera e propria è una fase successiva: qui si costruisce solo la classifica.

import os
import secrets
from urllib.parse import urlencode

import requests
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from db import get_db
from models import Track, TrackVote, User, SpotifyAuth
from schemas import AddTrackRequest, VoteRequest
from helpers import (
    get_spotify_app_token,
    exchange_spotify_code,
    get_spotify_user_token,
    spotify_redirect_uri,
    SPOTIFY_SEARCH_URL,
    SPOTIFY_AUTH_URL,
    SPOTIFY_API,
    SPOTIFY_SCOPES,
)
from security import get_current_user

router = APIRouter()

# Nome della playlist creata sull'account del proprietario
PLAYLIST_NAME = "Favollo 2026 🦀"


def _get_spotify_auth(db: Session) -> SpotifyAuth:
    """Restituisce la riga singleton delle credenziali Spotify, creandola vuota se assente."""
    row = db.query(SpotifyAuth).first()
    if not row:
        row = SpotifyAuth(id=1)
        db.add(row)
        db.commit()
        db.refresh(row)
    return row


@router.get("/playlist/search")
def search_tracks(q: str, db: Session = Depends(get_db)):
    """Autocomplete brani: proxy verso la ricerca Spotify.

    Passa market=IT per evitare il noto problema dei risultati vuoti con i token
    Client Credentials. Restituisce candidati già pronti per POST /playlist.
    """
    q = (q or "").strip()
    if not q:
        return []

    try:
        token = get_spotify_app_token()
        resp = requests.get(
            SPOTIFY_SEARCH_URL,
            headers={"Authorization": f"Bearer {token}"},
            params={"q": q, "type": "track", "market": "IT", "limit": 8},
            timeout=10,
        )
        resp.raise_for_status()
        items = resp.json().get("tracks", {}).get("items", [])
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    results = []
    for t in items:
        images = t.get("album", {}).get("images", [])
        results.append({
            "spotify_uri": t.get("uri"),
            "title":       t.get("name"),
            "artist":      ", ".join(a["name"] for a in t.get("artists", [])),
            "image_url":   images[-1]["url"] if images else "",
        })
    return results


@router.get("/playlist")
def get_playlist(db: Session = Depends(get_db)):
    """Tutti i brani con conteggio like/dislike e voto di ciascun utente.

    Ordinati per gradimento (score = like - dislike) decrescente, poi per data
    di inserimento. Include la mappa dei voti per nome utente così il frontend
    può evidenziare il voto della personH loggata senza una chiamata dedicata.
    """
    tracks = db.query(Track).all()
    users = {u.id: u.name for u in db.query(User).all()}
    result = []

    for tr in tracks:
        votes = db.query(TrackVote).filter_by(track_id=tr.id).all()
        likes = sum(1 for v in votes if v.value > 0)
        dislikes = sum(1 for v in votes if v.value < 0)
        result.append({
            "id":          tr.id,
            "spotify_uri": tr.spotify_uri,
            "title":       tr.title,
            "artist":      tr.artist,
            "image_url":   tr.image_url,
            "added_by":    users.get(tr.added_by),
            "likes":       likes,
            "dislikes":    dislikes,
            "score":       likes - dislikes,
            "votes":       {users.get(v.user_id): v.value for v in votes if users.get(v.user_id)},
        })

    result.sort(key=lambda r: (-r["score"], r["id"]))
    return result


@router.post("/playlist")
def add_track(
    req: AddTrackRequest,
    caller: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Aggiunge un brano alla playlist condivisa. 409 se già presente."""
    if not req.spotify_uri or not req.title.strip():
        raise HTTPException(status_code=422, detail="Brano non valido.")

    existing = db.query(Track).filter_by(spotify_uri=req.spotify_uri).first()
    if existing:
        raise HTTPException(status_code=409, detail="Brano già in playlist.")

    track = Track(
        spotify_uri=req.spotify_uri,
        title=req.title.strip(),
        artist=req.artist.strip(),
        image_url=req.image_url.strip(),
        added_by=caller.id,
    )
    db.add(track)
    db.commit()
    db.refresh(track)
    return {"ok": True, "id": track.id}


@router.post("/playlist/vote")
def vote_track(
    req: VoteRequest,
    caller: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Registra un like/dislike sul brano.

    Un solo voto per (utente, brano): rivotare lo stesso valore lo annulla
    (toggle), votare l'opposto lo ribalta.
    """
    if req.value not in (1, -1):
        raise HTTPException(status_code=422, detail="Voto non valido.")

    track = db.get(Track, req.track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Brano non trovato.")

    entry = db.query(TrackVote).filter_by(user_id=caller.id, track_id=track.id).first()
    if not entry:
        db.add(TrackVote(user_id=caller.id, track_id=track.id, value=req.value))
    elif entry.value == req.value:
        db.delete(entry)          # rivoto uguale → annullo
    else:
        entry.value = req.value    # ribalto like/dislike

    db.commit()
    return {"ok": True}


@router.delete("/playlist/{track_id}")
def delete_track(
    track_id: int,
    caller: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Elimina un brano e i suoi voti. Solo chi l'ha aggiunto o un admin."""
    track = db.get(Track, track_id)
    if not track:
        raise HTTPException(status_code=404, detail="Brano non trovato.")
    if not caller.is_admin and track.added_by != caller.id:
        raise HTTPException(status_code=403, detail="Puoi eliminare solo i brani che hai aggiunto.")

    db.query(TrackVote).filter_by(track_id=track.id).delete()
    db.delete(track)
    db.commit()
    return {"ok": True}


# ---- Sincronizzazione su Spotify (proprietario) ----

# Firma dell'ultimo insieme di brani effettivamente spinto su Spotify. Condivisa tra
# lo scheduler di auto-sync (main.py) e lo status endpoint, per dire alla UI se la
# playlist è allineata ai voti attuali ("aggiornata") o se manca un push ("in aggiornamento").
_synced_sig = {"value": None}


def winning_signature(db: Session) -> tuple:
    return tuple(winning_uris(db))


def mark_synced(sig: tuple) -> None:
    _synced_sig["value"] = sig


def get_synced_sig():
    return _synced_sig["value"]


def is_synced(db: Session, connected: bool) -> bool:
    """True se ciò che è su Spotify corrisponde ai brani vincenti attuali (o se non c'è nulla da sincronizzare)."""
    if not connected:
        return True
    return _synced_sig["value"] == winning_signature(db)


@router.get("/playlist/spotify/status")
def spotify_status(db: Session = Depends(get_db)):
    """Stato per il frontend: se Spotify è collegato, dov'è la playlist, e se è allineata ai voti."""
    row = db.query(SpotifyAuth).first()
    connected = bool(row and row.refresh_token)
    return {
        "connected": connected,
        "playlist_url": row.playlist_url if row else None,
        "synced": is_synced(db, connected),
    }


@router.get("/playlist/spotify/login")
def spotify_login():
    """Avvia l'OAuth: reindirizza a Spotify per l'autorizzazione del proprietario.

    Non protetto da JWT perché è una navigazione top-level del browser (niente header):
    completare il flusso richiede comunque le credenziali Spotify del proprietario.
    """
    params = {
        "client_id": os.getenv("SPOTIFY_CLIENT_ID", ""),
        "response_type": "code",
        "redirect_uri": spotify_redirect_uri(),
        "scope": SPOTIFY_SCOPES,
        "state": secrets.token_urlsafe(16),
        # Forza sempre la schermata di consenso, così è possibile cambiare account
        # e ri-concedere nuovi scope invece di essere reindirizzati in automatico.
        "show_dialog": "true",
    }
    return RedirectResponse(f"{SPOTIFY_AUTH_URL}?{urlencode(params)}")


@router.get("/playlist/spotify/callback")
def spotify_callback(code: str = "", error: str = "", db: Session = Depends(get_db)):
    """Callback OAuth: scambia il codice, salva il refresh token e mostra una pagina di conferma."""
    if error or not code:
        return HTMLResponse(
            f"<p>Collegamento annullato o fallito ({error or 'nessun codice'}). Puoi chiudere questa scheda.</p>",
            status_code=400,
        )

    data = exchange_spotify_code(code)
    refresh = data.get("refresh_token")
    if not refresh:
        return HTMLResponse("<p>Spotify non ha restituito un refresh token. Riprova.</p>", status_code=502)

    row = _get_spotify_auth(db)
    row.refresh_token = refresh
    db.commit()

    return HTMLResponse(
        "<p>✅ Spotify collegato! Torna a FavollApp e premi \"Sincronizza\". Puoi chiudere questa scheda.</p>"
    )


def winning_uris(db: Session) -> list[str]:
    """URI Spotify dei brani a saldo positivo (score = like - dislike > 0), ordinati per gradimento."""
    scored = []
    for tr in db.query(Track).all():
        score = sum(v.value for v in db.query(TrackVote).filter_by(track_id=tr.id).all())
        if score > 0 and tr.spotify_uri:
            scored.append((score, tr.id, tr.spotify_uri))
    scored.sort(key=lambda x: (-x[0], x[1]))
    return [uri for _, _, uri in scored]


def sync_playlist_to_spotify(db: Session) -> dict:
    """Crea (se serve) e rimpiazza la playlist Spotify con i brani vincenti.

    Usata sia dall'endpoint manuale sia dallo scheduler di auto-sync. Solleva
    HTTPException se Spotify non è collegato o rifiuta un'operazione.
    """
    row = db.query(SpotifyAuth).first()
    if not row or not row.refresh_token:
        raise HTTPException(status_code=400, detail="Spotify non è ancora collegato.")

    # Access token utente dal refresh token (Spotify può restituirne uno nuovo)
    token_data = get_spotify_user_token(row.refresh_token)
    access = token_data["access_token"]
    if token_data.get("refresh_token"):
        row.refresh_token = token_data["refresh_token"]
    headers = {"Authorization": f"Bearer {access}"}

    uris = winning_uris(db)

    def _spotify_write_error(resp) -> HTTPException:
        """Espone lo stato e il corpo reali dell'errore Spotify, invece di un 502 muto."""
        return HTTPException(status_code=502, detail=f"Spotify ha risposto {resp.status_code}: {resp.text[:200]}")

    # Crea la playlist se non esiste ancora.
    # Endpoint /me/playlists: dopo la migrazione Web API di feb 2026 il vecchio
    # POST /users/{id}/playlists è deprecato e risponde 403 a chiunque.
    if not row.playlist_id:
        created = requests.post(
            f"{SPOTIFY_API}/me/playlists",
            headers=headers,
            json={"name": PLAYLIST_NAME, "public": True,
                  "description": "Playlist del Favollo, votata dal gruppo su FavollApp."},
            timeout=10,
        )
        if created.status_code not in (200, 201):
            raise _spotify_write_error(created)
        pl = created.json()
        row.playlist_id = pl["id"]
        row.playlist_url = pl.get("external_urls", {}).get("spotify")

    # Rimpiazza il contenuto della playlist con i brani vincenti.
    # Endpoint /items (post-migrazione feb 2026); PUT sostituisce tutto l'elenco.
    put = requests.put(
        f"{SPOTIFY_API}/playlists/{row.playlist_id}/items",
        headers=headers,
        json={"uris": uris[:100]},   # Spotify accetta max 100 uri per chiamata
        timeout=10,
    )
    if put.status_code not in (200, 201):
        raise _spotify_write_error(put)

    db.commit()
    return {"count": len(uris), "playlist_url": row.playlist_url}


@router.post("/playlist/sync")
def spotify_sync(
    caller: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Sincronizzazione manuale (solo admin). Lo scheduler la esegue anche da solo."""
    if not caller.is_admin:
        raise HTTPException(status_code=403, detail="Solo un admin può sincronizzare la playlist.")
    result = sync_playlist_to_spotify(db)
    mark_synced(winning_signature(db))
    return {"ok": True, **result}
