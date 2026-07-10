// index.js — home page: calcola i giorni alla partenza e anima il countdown

const VACANZA = new Date('2026-08-12');

document.addEventListener('DOMContentLoaded', () => {
  const numEl = document.getElementById('countdown-days');
  const labelEl = document.getElementById('countdown-label');
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const oggi = new Date();
  oggi.setHours(0, 0, 0, 0);
  const diff = Math.ceil((VACANZA - oggi) / (1000 * 60 * 60 * 24));

  if (diff === 0) {
    numEl.textContent = '🦀';
    labelEl.innerHTML = 'Si parte<br />oggi!';
    return;
  }

  if (diff < 0) return; // vacanza già iniziata/passata: lascia il placeholder statico

  // Conta da 0 al valore reale con un breve easing, per dare peso al numero
  if (reduceMotion) {
    numEl.textContent = diff;
    return;
  }

  const duration = 900;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min(1, (now - start) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    numEl.textContent = Math.round(eased * diff);
    if (progress < 1) requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
});
