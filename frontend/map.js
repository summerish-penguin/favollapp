/* ==========================================================================
   MAP.JS – Logica mappa Leaflet + sidebar categorie
   Dipendenze: Leaflet (caricato in map.html), data/locations.json
   ========================================================================== */

document.addEventListener("DOMContentLoaded", () => {

  /* ------------------------------------------------------------------
     INIZIALIZZAZIONE MAPPA
     Centrata sulla zona di Lloret de Mar / Montbarbat
  ------------------------------------------------------------------ */
  const map = L.map("map").setView([41.74067, 2.77950], 11);

  L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: "&copy; OpenStreetMap &amp; Carto"
  }).addTo(map);


  /* ------------------------------------------------------------------
     ICONE MARKER (emoji come divIcon)
  ------------------------------------------------------------------ */
  function makeIcon(emoji) {
    return L.divIcon({
      className: "",
      html: `<span class="marker-icon">${emoji}</span>`,
      iconSize: [30, 30]
    });
  }

  const markerMap = {
    home:        makeIcon("🏠"),
    supermarket: makeIcon("🛒"),
    beach:       makeIcon("🏖️"),
    gas:         makeIcon("⛽"),
    pharmacy:    makeIcon("💊"),
    atm:         makeIcon("🏧")
  };

  /* Label leggibili per la sidebar categorie */
  const categoryLabels = {
    home:        "🏠 Casa",
    supermarket: "🛒 Supermercati",
    beach:       "🏖️ Spiagge",
    gas:         "⛽ Benzinai",
    pharmacy:    "💊 Farmacie",
    atm:         "🏧 Bancomat"
  };


  /* ------------------------------------------------------------------
     CARICAMENTO DATI E RENDER
  ------------------------------------------------------------------ */
  fetch("./data/locations.json")
    .then(res => {
      if (!res.ok) throw new Error("Errore nel caricamento JSON");
      return res.json();
    })
    .then(data => {
      renderMarkers(data);
      renderSidebar(data);
    })
    .catch(err => console.error("Errore:", err));


  /* ------------------------------------------------------------------
     MARKER SU MAPPA
     - Usa l'icona corrispondente alla categoria
     - Popup con nome, distanza e link Google Maps
     - Il marker "home" si apre automaticamente
  ------------------------------------------------------------------ */
  function renderMarkers(data) {
    data.forEach(loc => {
      const { Lat, Lng, LocationName, LocCategory, MinsAway } = loc;

      const icon    = markerMap[LocCategory] || markerMap.home;
      const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${Lat},${Lng}&travelmode=driving`;
      const mins    = MinsAway ? `${MinsAway} minuti<br>` : "";

      const marker = L.marker([Lat, Lng], { icon })
        .addTo(map)
        .bindPopup(`
          <div>
            <strong>${LocationName}</strong><br>
            ${mins}
            <a href="${mapsUrl}" target="_blank">➢ Google Maps</a>
          </div>
        `);

      if (LocCategory === "home") {
        marker.openPopup();
      }
    });
  }


  /* ------------------------------------------------------------------
     SIDEBAR CATEGORIE (accordion)
     - Raggruppa i luoghi per categoria
     - Click sull'header espande/chiude la lista
     - Click su un luogo centra la mappa su di esso
  ------------------------------------------------------------------ */
  function renderSidebar(data) {
    const container = document.getElementById("categories");

    // Raggruppa per categoria mantenendo l'ordine di inserimento
    const grouped = {};
    data.forEach(loc => {
      if (!grouped[loc.LocCategory]) grouped[loc.LocCategory] = [];
      grouped[loc.LocCategory].push(loc);
    });

    Object.keys(grouped).forEach(category => {
      const wrapper = document.createElement("div");
      wrapper.className = "category";

      // Header accordion
      const header = document.createElement("div");
      header.className = "category-header";
      header.innerHTML = `
        <span>${categoryLabels[category] || category}</span>
        <span>+</span>
      `;
      header.addEventListener("click", () => wrapper.classList.toggle("open"));

      // Contenuto accordion
      const content = document.createElement("div");
      content.className = "category-content";

      grouped[category].forEach(loc => {
        const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${loc.Lat},${loc.Lng}&travelmode=driving`;
        const mins    = loc.MinsAway ? `${loc.MinsAway} min` : "";

        const el = document.createElement("div");
        el.className = "place";
        el.innerHTML = `
          <strong>${loc.LocationName}</strong><br>
          ${mins ? mins + "<br>" : ""}
          <a href="${mapsUrl}" target="_blank">➢ Naviga</a>
        `;

        // Click sul luogo → centra la mappa
        el.addEventListener("click", () => {
          map.setView([loc.Lat, loc.Lng], 14);
        });

        content.appendChild(el);
      });

      wrapper.appendChild(header);
      wrapper.appendChild(content);
      container.appendChild(wrapper);
    });
  }

});
