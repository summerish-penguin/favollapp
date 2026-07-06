// map.js — mappa Leaflet + chip categoria + directory dei luoghi, dati da GET /locations

document.addEventListener('DOMContentLoaded', () => {
  const HOME_VIEW = [41.74067, 2.7795];
  const HOME_ZOOM = 11;

  // Inizializza la mappa centrata sulla zona di Lloret de Mar / Montbarbat
  const map = L.map('map').setView(HOME_VIEW, HOME_ZOOM);

  L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap &amp; Carto',
  }).addTo(map);

  // Ricalcola le dimensioni: Leaflet misura il contenitore all'avvio e non si
  // ridisegna da solo se il layout intorno cambia subito dopo l'inizializzazione
  requestAnimationFrame(() => map.invalidateSize());

  // Crea un'icona marker a partire da un emoji
  function makeIcon(emoji) {
    return L.divIcon({
      className: '',
      html: `<span class="marker-icon">${emoji}</span>`,
      iconSize: [30, 30],
    });
  }

  const markerMap = {
    home: makeIcon('🏠'),
    supermarket: makeIcon('🛒'),
    beach: makeIcon('🏖️'),
    gas: makeIcon('⛽'),
    pharmacy: makeIcon('💊'),
    atm: makeIcon('🏧'),
    park_barcelona: makeIcon('🅿️'),
  };

  // Label leggibili per chip e directory
  const categoryLabels = {
    home: '🏠 Casa',
    supermarket: '🛒 Supermercati',
    beach: '🏖️ Spiagge',
    gas: '⛽ Benzinai',
    pharmacy: '💊 Farmacie',
    atm: '🏧 Bancomat',
    park_barcelona: '🅿️ Parcheggi a Barcellona e stazioni',
  };

  // Tinta fissa per categoria: icona nella directory e coerenza visiva con la mappa
  const categoryHues = {
    home: 207,
    beach: 185,
    supermarket: 28,
    gas: 45,
    pharmacy: 340,
    atm: 265,
    park_barcelona: 150,
  };

  const markerLayers = []; // { category, marker }
  let homeCoords = null;

  // Carica i punti di interesse dal backend e disegna marker, chip e directory
  fetch(`${API_BASE}/locations`)
    .then((res) => {
      if (!res.ok) throw new Error('Errore nel caricamento delle locations dal DB');
      return res.json();
    })
    .then((data) => {
      renderMarkers(data);
      renderChips(data);
      renderDirectory(data);
    })
    .catch((err) => console.error('Errore durante il fetch delle locations:', err));

  // Disegna i marker sulla mappa: icona per categoria, popup con nome/distanza/link Maps, "home" si apre da subito
  function renderMarkers(data) {
    data.forEach((loc) => {
      const { Lat, Lng, LocationName, LocCategory, MinsAway } = loc;

      const icon = markerMap[LocCategory] || markerMap.home;
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${Lat},${Lng}&travelmode=driving`;
      const mins = MinsAway ? `${MinsAway} minuti<br>` : '';

      const marker = L.marker([Lat, Lng], { icon }).addTo(map).bindPopup(`
          <div>
            <strong>${LocationName}</strong><br>
            ${mins}
            <a href="${mapsUrl}" target="_blank">➢ Google Maps</a>
          </div>
        `);

      if (LocCategory === 'home') {
        marker.openPopup();
        homeCoords = [Lat, Lng];
      }

      markerLayers.push({ category: LocCategory, marker });
    });
  }

  // Chip "Tutti" + una per categoria presente, flottanti sul bordo superiore della mappa
  function renderChips(data) {
    const strip = document.getElementById('chip-strip');
    const categories = [...new Set(data.map((loc) => loc.LocCategory))];

    const allChip = document.createElement('span');
    allChip.className = 'map-chip active';
    allChip.textContent = '✨ Tutti';
    allChip.addEventListener('click', () => selectCategory(null, allChip));
    strip.appendChild(allChip);

    categories.forEach((cat) => {
      const chip = document.createElement('span');
      chip.className = 'map-chip';
      chip.textContent = categoryLabels[cat] || cat;
      chip.addEventListener('click', () => selectCategory(cat, chip));
      strip.appendChild(chip);
    });
  }

  // Mostra sulla mappa solo i marker della categoria scelta (null = tutti)
  function selectCategory(category, chipEl) {
    document.querySelectorAll('.map-chip').forEach((c) => c.classList.remove('active'));
    chipEl.classList.add('active');

    markerLayers.forEach(({ category: cat, marker }) => {
      const visible = !category || cat === category;
      if (visible) marker.addTo(map);
      else map.removeLayer(marker);
    });
  }

  // Bottone "centra sulla casa"
  document.getElementById('locate-btn').addEventListener('click', () => {
    map.setView(homeCoords || HOME_VIEW, 14);
  });

  // Directory categorie ad accordion: icona colorata, contatore, luoghi con distanza e link "naviga"
  function renderDirectory(data) {
    const container = document.getElementById('categories');
    container.innerHTML = '';

    // Raggruppa per categoria mantenendo l'ordine di inserimento
    const grouped = {};
    data.forEach((loc) => {
      if (!grouped[loc.LocCategory]) grouped[loc.LocCategory] = [];
      grouped[loc.LocCategory].push(loc);
    });

    Object.keys(grouped).forEach((category, index) => {
      const places = grouped[category];
      const label = categoryLabels[category] || category;
      const [emoji, ...nameParts] = label.split(' ');

      const row = document.createElement('div');
      row.className = 'cat-row' + (index === 0 ? ' open' : '');
      row.style.setProperty('--hue', categoryHues[category] ?? 210);

      const head = document.createElement('div');
      head.className = 'cat-head';
      head.addEventListener('click', () => row.classList.toggle('open'));

      const icon = document.createElement('div');
      icon.className = 'cat-icon';
      icon.textContent = emoji;

      const info = document.createElement('div');
      info.className = 'cat-info';

      const name = document.createElement('div');
      name.className = 'cat-name';
      name.textContent = nameParts.join(' ');

      const count = document.createElement('div');
      count.className = 'cat-count';
      count.textContent = `${places.length} ${places.length === 1 ? 'luogo' : 'luoghi'}`;

      info.append(name, count);

      const chevron = document.createElement('div');
      chevron.className = 'cat-chevron';
      chevron.textContent = '›';

      head.append(icon, info, chevron);

      const placesEl = document.createElement('div');
      placesEl.className = 'cat-places';

      places.forEach((loc) => {
        placesEl.appendChild(createPlaceRow(loc));
      });

      row.append(head, placesEl);
      container.appendChild(row);
    });
  }

  // Riga di un singolo luogo: nome (click per centrare la mappa), distanza, link "naviga"
  function createPlaceRow(loc) {
    const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${loc.Lat},${loc.Lng}&travelmode=driving`;

    const placeRow = document.createElement('div');
    placeRow.className = 'place-row';

    const placeName = document.createElement('div');
    placeName.className = 'place-name';
    placeName.textContent = loc.LocationName;
    placeName.addEventListener('click', () => map.setView([loc.Lat, loc.Lng], 14));

    const dist = document.createElement('span');
    dist.className = 'place-dist';
    dist.textContent = loc.MinsAway ? `${loc.MinsAway} min` : '—';

    const go = document.createElement('a');
    go.className = 'place-go';
    go.href = mapsUrl;
    go.target = '_blank';
    go.rel = 'noopener';
    go.title = 'Naviga con Google Maps';
    go.textContent = '➢';

    placeRow.append(placeName, dist, go);
    return placeRow;
  }
});
