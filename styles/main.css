console.log('Script loaded');

let isGrid = false;
const content = document.getElementById('content');
const toggle = document.getElementById('toggleView');
const modeBtn = document.getElementById('toggleMode');
const yearText = document.getElementById('yearText');

let expandedCard = null;
let projectsData = [];

// Load projects from JSON file
async function loadProjects() {
  try {
    console.log('Attempting to load projects...');
    const response = await fetch('data/projects.json');
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Loaded projects:', data);
    projectsData = data;
    renderProjects(projectsData);
  } catch (error) {
    console.error('Error loading projects:', error);
    // Show error message on page
    content.innerHTML = `<div style="text-align: center; opacity: 0.7; padding: 2rem;">
      <p>Error loading projects: ${error.message}</p>
      <p>Make sure your Google Sheet is set up and the GitHub Action has run successfully.</p>
    </div>`;
  }
}

function renderProjects(data) {
  content.innerHTML = '';
  content.className = isGrid ? 'grid' : '';
  
  if (!data || data.length === 0) {
    content.innerHTML = '<div style="text-align: center; opacity: 0.7; padding: 2rem;"><p>No projects found.</p><p>Add data to your Google Sheet and run the GitHub Action!</p></div>';
    return;
  }
  
  console.log('Rendering', data.length, 'projects');
  
  // Sort by date (newest first)
  data.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  data.forEach(proj => {
    console.log('Rendering project:', proj.title);
    
    const card = document.createElement('div');
    card.className = 'card';
    
    // Basic project info
    let cardHTML = `<div class="project-header">
      <strong>${proj.title}</strong>
      <span class="project-meta">${proj.date} [${proj.type}]</span>
    </div>`;
    
    // Add status if present
    if (proj.status) {
      cardHTML += `<div class="project-status">${proj.status}</div>`;
    }
    
    // Add tags if present
    if (proj.tags && proj.tags.length > 0) {
      cardHTML += `<div class="project-tags">${proj.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`;
    }
    
    card.innerHTML = cardHTML;
    
    // Mini modules container (hidden initially)
    const miniContainer = document.createElement('div');
    miniContainer.className = 'miniContainer';
    
    // Handle mini modules (created by the Python script for compatibility)
    if (proj.mini && proj.mini.length > 0) {
      proj.mini.forEach(m => {
        const mini = document.createElement('div');
        mini.className = 'mini';
        
        if (m.media_type === 'image' && m.src) {
          mini.innerHTML = `<img src="${m.src}" style="width:100%; border-radius: 4px;" alt="Project image" onload="console.log('Image loaded:', '${m.src}')" onerror="console.log('Image failed:', '${m.src}')">`;
        }
        else if (m.media_type === 'audio' && m.src) {
          mini.innerHTML = `<audio src="${m.src}" controls preload="none" style="width:100%;"></audio>`;
        }
        else if (m.media_type === 'video' && m.src) {
          mini.innerHTML = `<video src="${m.src}" controls preload="none" style="width:100%; border-radius: 4px;"></video>`;
        }
        else if (m.media_type === 'text' && m.content) {
          mini.innerHTML = `<div class="text-content">${m.content}</div>`;
        }
        else if (m.media_type === 'embed' && m.content) {
          mini.innerHTML = `<div class="embed-content">${m.content}</div>`;
        }
        
        miniContainer.appendChild(mini);
      });
    }
    
    // Add story section if present
    if (proj.story) {
      const storyMini = document.createElement('div');
      storyMini.className = 'mini story-section';
      storyMini.innerHTML = `<div class="story-content">
        <h4>Story</h4>
        <p>${proj.story}</p>
      </div>`;
      miniContainer.appendChild(storyMini);
    }
    
    // Add external links if present
    if (proj.external_link_names && proj.external_link_urls) {
      const linksMini = document.createElement('div');
      linksMini.className = 'mini links-section';
      let linksHTML = '<div class="external-links"><h4>Links</h4>';
      
      const names = Array.isArray(proj.external_link_names) ? proj.external_link_names : [proj.external_link_names];
      const urls = Array.isArray(proj.external_link_urls) ? proj.external_link_urls : [proj.external_link_urls];
      
      for (let i = 0; i < Math.min(names.length, urls.length); i++) {
        linksHTML += `<a href="${urls[i]}" target="_blank" class="external-link">${names[i]}</a>`;
      }
      linksHTML += '</div>';
      
      linksMini.innerHTML = linksHTML;
      miniContainer.appendChild(linksMini);
    }
    
    // Add medium info if present
    if (proj.medium) {
      const mediumMini = document.createElement('div');
      mediumMini.className = 'mini medium-section';
      mediumMini.innerHTML = `<div class="medium-content">
        <h4>Medium</h4>
        <p>${proj.medium}</p>
      </div>`;
      miniContainer.appendChild(mediumMini);
    }
    
    card.appendChild(miniContainer);
    
    // Expand/Collapse functionality
    card.addEventListener('click', (e) => {
      // Don't expand if clicking on links or media controls
      if (e.target.tagName === 'A' || e.target.tagName === 'AUDIO' || e.target.tagName === 'VIDEO') {
        return;
      }
      
      if (expandedCard && expandedCard !== card) {
        expandedCard.classList.remove('expanded');
      }
      const isExpanded = card.classList.toggle('expanded');
      expandedCard = isExpanded ? card : null;
    });
    
    // Close button
    const closeBtn = document.createElement('span');
    closeBtn.className = 'closeBtn';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      card.classList.remove('expanded');
      expandedCard = null;
    });
    card.appendChild(closeBtn);
    
    content.appendChild(card);
  });
}

// Initialize
loadProjects();

// Toggle View
toggle.addEventListener('click', () => {
  isGrid = !isGrid;
  renderProjects(projectsData);
});

// Dark/Light mode
modeBtn.addEventListener('click', () => {
  document.body.classList.toggle('light');
  document.body.classList.toggle('dark');
});

// Year Label - updates on scroll
window.addEventListener('scroll', () => {
  const modules = document.querySelectorAll('.card');
  for (const mod of modules) {
    const rect = mod.getBoundingClientRect();
    if (rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2) {
      // Try to extract year from the project data
      const projectTitle = mod.querySelector('strong')?.textContent;
      const project = projectsData.find(p => p.title === projectTitle);
      if (project && project.date) {
        const year = new Date(project.date).getFullYear();
        yearText.innerText = year;
        break;
      }
    }
  }
});
