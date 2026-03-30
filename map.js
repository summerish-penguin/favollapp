fetch('./data/locations.json')
  .then(res => res.json())
  .then(data => {

    const container = document.getElementById('categories');

    // GROUP BY categoria
    const grouped = {};

    data.forEach(loc => {
      if (!grouped[loc.LocCategory]) {
        grouped[loc.LocCategory] = [];
      }
      grouped[loc.LocCategory].push(loc);
    });

    // LABEL categorie (più leggibili)
    const categoryLabels = {
      home: "🏠 Casa",
      supermarket: "🛒 Supermercati",
      beach: "🏖️ Spiagge",
      gas: "⛽ Benzinai",
      pharmacy: "⚕️ Farmacie",
      atm: "🏧 Bancomat"
    };

    // RENDER
    Object.keys(grouped).forEach(category => {

      const wrapper = document.createElement('div');
      wrapper.className = 'category';

      const header = document.createElement('div');
      header.className = 'category-header';
      header.innerHTML = `
        <span>${categoryLabels[category] || category}</span>
        <span>+</span>
      `;

      const content = document.createElement('div');
      content.className = 'category-content';

      grouped[category].forEach(loc => {
        const link = `https://www.google.com/maps/dir/?api=1&destination=${loc.Lat},${loc.Lng}&travelmode=driving`;

        const mins = loc.MinsAway ? `${loc.MinsAway} min` : '';

        const el = document.createElement('div');
        el.className = 'place';
        el.innerHTML = `
          <strong>${loc.LocationName}</strong><br>
          ${mins}<br>
          <a href="${link}" target="_blank">➢ Naviga</a>
        `;

        content.appendChild(el);
      });

      // toggle expand
      header.addEventListener('click', () => {
        wrapper.classList.toggle('open');
      });

      wrapper.appendChild(header);
      wrapper.appendChild(content);
      container.appendChild(wrapper);
    });

  });

  el.addEventListener('click', () => {
  map.setView([loc.Lat, loc.Lng], 14);
});