let isGrid = false;

const content = document.getElementById('content');
const toggle = document.getElementById('toggleView');

fetch('port/data/projects.json')
  .then(res => res.json())
  .then(data => renderProjects(data));

toggle.addEventListener('click', () => {
  isGrid = !isGrid;
  fetch('data/projects.json')
    .then(res => res.json())
    .then(data => renderProjects(data));
});

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
      window.open(proj.links[0], '_blank');
    });
    content.appendChild(card);
  });
}

