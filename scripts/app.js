let isGrid = false;

const content = document.getElementById('content');
const toggle = document.getElementById('toggleView');

// Fallback data in case fetch fails
const fallbackData = [
  {
    "id": "test-001",
    "title": "Test Project",
    "date": "2025-08-15",
    "category": "Music",
    "media_urls": ["https://via.placeholder.com/300"],
    "description": "Test description",
    "tags": ["test"],
    "links": ["https://example.com"],
    "highlight": true,
    "color_theme": "#00F0FF",
    "view_type": ["Timeline", "Vault"],
    "legacy_priority": 5
  }
];

function fetchAndRender() {
  fetch('./data/projects.json') // relative path works on GH Pages
    .then(res => {
      if (!res.ok) throw new Error('JSON fetch failed');
      return res.json();
    })
    .then(data => renderProjects(data))
    .catch(err => {
      console.warn('Failed to fetch projects.json, using fallback data.', err);
      renderProjects(fallbackData);
    });
}

toggle.addEventListener('click', () => {
  isGrid = !isGrid;
  fetchAndRender();
});

// Initial render
fetchAndRender();

function renderProjects(data) {
  content.innerHTML = '';
  if (isGrid) {
    content.className = 'grid';
  } else {
    content.className = '';
    data.sort((a,b) => new Date(b.date) - new Date(a.date));
  }

  data.forEach(proj => {
    if (!proj.view_type.includes(isGrid ? 'Vault' : 'Timeline')) return;

    const card = document.createElement('div');
    card.className = 'card';
    card.style.borderLeft = proj.highlight ? `4px solid ${proj.color_theme}` : 'none';
    card.innerHTML = `
      <img src="${proj.media_urls[0]}" alt="${proj.title}" style="width:100%; border-radius:4px;">
      <h3>${proj.title}</h3>
      <p>${proj.date}</p>
    `;
    card.addEventListener('click', () => {
      if (proj.links && proj.links[0]) window.open(proj.links[0], '_blank');
    });
    content.appendChild(card);
  });
}
