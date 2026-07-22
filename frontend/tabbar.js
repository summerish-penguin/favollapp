// tabbar.js — dock di navigazione flottante condiviso dalle pagine principali.
// Inietta la barra in fondo alla pagina e marca la voce attiva dall'URL.

(function () {
  var TABS = [
    { href: 'index.html', icon: '🏠', label: 'Home' },
    { href: 'warehouse.html', icon: '🎒', label: 'Zaino' },
    { href: 'menu.html', icon: '🍝', label: 'Spesa' },
    { href: 'map.html', icon: '🗺️', label: 'Mappa' },
    { href: 'agent.html', icon: '🤖', label: 'Agent' },
    { href: 'galleries.html', icon: '📷', label: 'Foto' },
    { href: 'playlist.html', icon: '🎸', label: 'Playlist' },
  ];

  var current = location.pathname.split('/').pop() || 'index.html';

  var nav = document.createElement('nav');
  nav.className = 'dock';
  nav.setAttribute('aria-label', 'Navigazione principale');

  TABS.forEach(function (tab) {
    var a = document.createElement('a');
    a.href = tab.href;
    a.className = 'dock-tab' + (tab.href === current ? ' on' : '');
    if (tab.href === current) a.setAttribute('aria-current', 'page');

    var ico = document.createElement('span');
    ico.className = 'dock-ico';
    ico.textContent = tab.icon;
    ico.setAttribute('aria-hidden', 'true');

    var lbl = document.createElement('span');
    lbl.className = 'dock-lbl';
    lbl.textContent = tab.label;

    a.append(ico, lbl);
    nav.appendChild(a);
  });

  document.body.appendChild(nav);
  document.body.classList.add('has-dock');
})();
