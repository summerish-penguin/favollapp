// theme-toggle.js — gestisce il pulsante di switch tema chiaro/scuro, presente in ogni pagina
// Il tema iniziale è già impostato dallo script inline nel <head> (evita il flash al caricamento);
// qui colleghiamo solo il click del pulsante e salviamo la preferenza per le visite successive.

const THEME_KEY = 'favollapp-theme';

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);

  // Notifica chi deve reagire al tema oltre al CSS (es. i tile della mappa)
  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));

  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  btn.setAttribute('aria-pressed', String(theme === 'dark'));
  btn.setAttribute('aria-label', theme === 'dark' ? 'Passa a modalità chiara' : 'Passa a modalità scura');
}

// Velo per il "tuffo scuro" durante il cambio tema: iniettato una volta, così nessun
// HTML va toccato. Lo stile e l'animazione sono in style.css (#theme-veil).
function ensureThemeVeil() {
  let veil = document.getElementById('theme-veil');
  if (!veil) {
    veil = document.createElement('div');
    veil.id = 'theme-veil';
    document.body.appendChild(veil);
  }
  return veil;
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  const veil = ensureThemeVeil();
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  applyTheme(document.documentElement.getAttribute('data-theme') || 'light');

  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);

    // Senza animazioni: cambio secco
    if (reduceMotion) {
      applyTheme(next);
      return;
    }

    // Tuffo scuro: il tema (e lo scambio dell'immagine di sfondo) avviene vicino al picco buio
    veil.classList.remove('switching');
    void veil.offsetWidth; // forza il replay dell'animazione
    veil.classList.add('switching');
    setTimeout(() => applyTheme(next), 180);
    setTimeout(() => veil.classList.remove('switching'), 520);
  });
});
