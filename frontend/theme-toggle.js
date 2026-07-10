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

document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;

  applyTheme(document.documentElement.getAttribute('data-theme') || 'light');

  btn.addEventListener('click', () => {
    const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
});
