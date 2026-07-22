// Base URL del backend FastAPI.
// PRODUZIONE — RIPRISTINA questa riga prima di committare:
const API_BASE = 'https://favollapp.onrender.com';
//
// SVILUPPO LOCALE: usa lo stesso host da cui è servita la pagina, porta 8000.
// Sul PC diventa http://localhost:8000; da un telefono che apre la pagina via
// IP di rete del PC diventa http://<IP-PC>:8000, così le fetch funzionano anche
// da mobile. Richiede il backend avviato con --host 0.0.0.0 (vedi sotto).
//const API_BASE = `http://${location.hostname}:8000`;
