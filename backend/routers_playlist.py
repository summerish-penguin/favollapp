# routers_playlist.py — endpoint /playlist (brani proposti, voti, classifica) e
# /playlist/search (autocomplete via Spotify). La sincronizzazione sulla playlist
# Spotify vera e propria è una fase successiva: qui si costruisce solo la classifica.

import requests
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from db import get_db
from models import Track, TrackVote, User
from schemas import AddTrackRequest, VoteRequest
from helpers import get_spotify_app_token, SPOTIFY_SEARCH_URL
from security import get_current_user

router = APIRouter()


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
