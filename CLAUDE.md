# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

FavollApp is a group web app for organizing the "Favollo" friends' summer trip (Montbarbat, Catalonia — 13–20 Aug 2026). It has two independently deployed halves:

- **`backend/`** — FastAPI + SQLAlchemy + PostgreSQL REST API, deployed on Render at `https://favollapp.onrender.com`.
- **`frontend/`** — static vanilla JS/HTML/CSS (no framework, no build step), deployed on GitHub Pages. The GitHub Actions workflow (`.github/workflows/static.yml`) uploads the **entire repo** on push to `main`; the root `index.html` just redirects to `frontend/index.html`.

The two are only coupled through `frontend/config.js`, which hardcodes `API_BASE` (the Render backend URL). The frontend calls the backend cross-origin; the backend's CORS allowlist in `main.py` must include any new frontend origin.

Domain language, code comments, and UI text are all in **Italian** — match that when editing.

## Running locally

Backend (from `backend/`):
```bash
pip install -r requirements.txt
uvicorn main:app --reload        # serves on http://127.0.0.1:8000
```
Requires a `.env` (gitignored) in `backend/` with:
- `DATABASE_URL` — Postgres URL (required; app raises on startup without it). A `postgres://` prefix is auto-rewritten to `postgresql://`.
- `GEMINI_API_KEY` — for the AI endpoints (`/ai/*`); missing key returns HTTP 500 only when those routes are hit.
- `SPOTIFY_CLIENT_ID` / `SPOTIFY_CLIENT_SECRET` — for the playlist search autocomplete (`GET /playlist/search`), which proxies Spotify's search via the Client Credentials flow; missing creds return HTTP 500 only when that route is hit. A Spotify app in "development mode" is enough (no user OAuth in this phase).

Tables are auto-created (`Base.metadata.create_all`) and `seed()` runs on startup to populate default items and users — there are **no migrations** (no Alembic). Schema changes to `models.py` require manual DB handling.

Frontend: serve the repo root over HTTP so relative paths and the redirect work, e.g. `python -m http.server 8000` then open `http://localhost:8000/` (that origin is already in the CORS allowlist). To point the frontend at a local backend, temporarily change `API_BASE` in `frontend/config.js`.

There is **no test suite, linter, or type checker** configured. `.prettierrc` (2-space, single quotes, semicolons) is the only formatting convention for JS.

## Backend architecture

- `main.py` — app entry point: CORS, an HTTP middleware that logs every request (except `/health`) to the `access_logs` table, mounts routers, runs seed on startup, and starts a background auto-sync thread (`_autosync_loop`, every 10s) that re-pushes the winning tracks to Spotify whenever the set changes (calls `sync_playlist_to_spotify` from `routers_playlist`). Single-worker assumption — one loop per worker process.
- `db.py` — engine + `SessionLocal`; `get_db()` is the FastAPI dependency used by every route.
- `models.py` — SQLAlchemy models: `User`, `Item`, `Contribution` (a user's committed quantity of an item), `ShoppingItem`, `Location` (map POIs), `AccessLog`, `Track`/`TrackVote` (shared playlist + like/dislike votes).
- `schemas.py` — Pydantic request models.
- `helpers.py` — shared `get_or_create_*` helpers and the **Gemini LLM config** (`GEMIN_URL`, `GEMINI_MODEL`, `require_gemini_key()`). Both AI routers share this; change the model here.
- `seed.py` — default items/users seeded on every startup.

Routers are split by functional area and each exposes `router`, all mounted in `main.py`:
- `routers_warehouse.py` — `/warehouse`, `/items` (shared-items "who brings what" tracker).
- `routers_shopping.py` — `/shopping` CRUD (shopping list).
- `routers_ai_recipe.py` — `POST /ai/recipe`: Gemini call that parses a dish name into a JSON ingredient list scaled to the current user count; robustly extracts JSON from dirty LLM output.
- `routers_ai_agent.py` — `POST /ai/agent`: conversational chatbot. Builds a system prompt by injecting live DB data (locations, items, users) plus fixed trip context; frontend passes the full `history` each call (no server-side session).
- `routers_playlist.py` — `/playlist` (add/list/delete tracks + `/playlist/vote` like/dislike, ranked by score) and `/playlist/search` (autocomplete proxied to Spotify search via `get_spotify_app_token()` in `helpers.py`). Spotify sync: `/playlist/spotify/login` + `/callback` run the owner's one-time OAuth (Authorization Code Flow) and store the refresh token in the `spotify_auth` singleton row; `POST /playlist/sync` (admin-only) creates/replaces a Spotify playlist on the owner's account with tracks whose score > 0. `/playlist/spotify/status` reports whether Spotify is connected. Needs `SPOTIFY_REDIRECT_URI` env (must exactly match a Redirect URI registered in the Spotify dashboard).
- `routers_misc.py` — `/users`, `/locations`, `/health`.

## Frontend architecture

One `.html` + matching `.js` per page (e.g. `warehouse.html` / `warehouse.js`); no shared bundler. Every page includes the shared modules:
- `config.js` — `API_BASE`.
- `theme-toggle.js` — light/dark theme, persisted in `localStorage`. The initial theme is set by an inline `<head>` script on each page to avoid flash-of-wrong-theme; this module only wires the toggle button.
- `ui-feedback.js` — custom `showToast()` and confirm dialogs replacing native `alert()`/`confirm()`. Use these, not the browser natives.

`style.css` is a single shared stylesheet (~2000 lines) for all pages. Navigation is plain `<a href="*.html">` links.

Pages: `index` (home), `warehouse`, `menu`/`shopping`, `map` (Leaflet POIs from `/locations`), `playlist` (shared song ranking with Spotify search), `agent` (AI chat), `galleries`/`cast` (photos/people), assets under `frontend/assets/`.
