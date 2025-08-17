console.log('🚀 Script loaded successfully');

let isGrid = false;
let expandedCard = null;
let projectsData = [];
let currentMediaOverlay = null;
let positionOrb = null;

const content = document.getElementById('content');
const toggle = document.getElementById('toggleView');
const modeBtn = document.getElementById('toggleMode');

// Birth date for timeline calculation
const BIRTH_DATE = new Date('1989-09-07');
const CURRENT_DATE = new Date();

// Create position orb
function createPositionOrb() {
  if (!positionOrb) {
    positionOrb = document.createElement('div');
    positionOrb.className = 'timeline-position-orb';
    document.body.appendChild(positionOrb);
    console.log('✅ Position orb created');
  }
}

// Load projects from JSON file
async function loadProjects() {
  console.log('🔍 Starting to load projects...');
  
  try {
    const response = await fetch('data/projects.json');
    console.log('📡 Response status:', response.status);
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('✅ Data loaded successfully:', data);
    console.log('📊 Number of projects:', data.length);
    
    projectsData = data;
    renderProjects(data);
    
  } catch (error) {
    console.error('❌ Error loading projects:', error);
    content.innerHTML = `<div class="error-message">
      <p>Error loading projects: ${error.message}</p>
      <p>Make sure your Google Sheet is set up and the GitHub Action has run successfully.</p>
    </div>`;
  }
}

function renderProjects(data) {
  if (!data || data.length === 0) {
    content.innerHTML = '<div class="error-message"><p>No projects found. Add data to your Google Sheet and run the GitHub Action!</p></div>';
    return;
  }
  
  if (isGrid) {
    renderGridView(data);
  } else {
    renderTimelineView(data);
  }
}

function renderTimelineView(data) {
  content.className = 'timeline-container';
  content.innerHTML = '';
  
  createPositionOrb();
  
  // Sort by date (newest first)
  const sortedData = [...data].sort((a, b) => new Date(b.date) - new Date(a.date));
  
  let lastYear = null;
  
  sortedData.forEach((proj) => {
    const projectYear = new Date(proj.date).getFullYear();
    
    // Year label
    if (projectYear !== lastYear) {
      const yearLabel = document.createElement('div');
      yearLabel.className = 'year-label';
      yearLabel.innerText = projectYear;
      content.appendChild(yearLabel);
      lastYear = projectYear;
    }
    
    // Timeline item wrapper
    const item = document.createElement('div');
    item.className = 'timeline-item';
    
    // Card
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.projectId = proj.id;
    
    // Compact display
    card.innerHTML = `
      <div class="project-compact">
        [${proj.type}] ${proj.title}, ${projectYear}
        ${proj.status ? `<span class="status-indicator">${proj.status}</span>` : ''}
      </div>
    `;
    
    // Expanded content
    const expandedContent = document.createElement('div');
    expandedContent.className = 'expanded-content';
    expandedContent.innerHTML = createExpandedContent(proj);
    card.appendChild(expandedContent);
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleExpanded(card, marker, false);
    });
    card.appendChild(closeBtn);
    
    // Marker
    const marker = document.createElement('div');
    marker.className = 'timeline-marker';
    marker.dataset.projectId = proj.id;
    
    // Hover
    card.addEventListener('mouseenter', () => {
      marker.classList.add('active');
      snapOrbToMarker(marker);
    });
    card.addEventListener('mouseleave', () => {
      if (!card.classList.contains('expanded')) {
        marker.classList.remove('active');
      }
    });
    
    // Click expand
    card.addEventListener('click', (e) => {
      if (e.target.closest('.media-item, .external-link, .close-btn')) return;
      e.stopPropagation();
      toggleExpanded(card, marker);
    });
    
    // Append
    item.appendChild(card);
    item.appendChild(marker);
    content.appendChild(item);
  });
}

function renderGridView(data) {
  content.className = 'grid-container';
  content.innerHTML = '';
  
  if (positionOrb) positionOrb.style.display = 'none';
  
  data.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  data.forEach(proj => {
    const card = document.createElement('div');
    card.className = 'grid-card';
    card.innerHTML = `
      <div class="grid-card-header">
        <strong>${proj.title}</strong>
        <span>${proj.type}</span>
      </div>
      <div class="grid-card-meta">${proj.date}</div>
    `;
    
    card.addEventListener('click', () => {
      isGrid = false;
      renderProjects(projectsData);
      setTimeout(() => {
        const timelineCard = document.querySelector(`.project-card[data-project-id="${proj.id}"]`);
        const marker = document.querySelector(`.timeline-marker[data-project-id="${proj.id}"]`);
        if (timelineCard && marker) toggleExpanded(timelineCard, marker, true);
      }, 100);
    });
    
    content.appendChild(card);
  });
}

function createExpandedContent(proj) {
  let html = `
    <div class="expanded-header">
      <h2>${proj.title}</h2>
      <div class="project-metadata">
        <span class="project-type">[${proj.type}]</span>
        <span class="project-date">${proj.date}</span>
        ${proj.status ? `<span class="project-status">${proj.status}</span>` : ''}
      </div>
    </div>
    <div class="expanded-scroll">
  `;
  
  if (proj.description) {
    html += `<div class="content-section"><h4>Description</h4><p>${proj.description}</p></div>`;
  }
  if (proj.story) {
    html += `<div class="content-section"><h4>Story</h4><p>${proj.story}</p></div>`;
  }
  
  // Add more fields if available
  if (proj.otherField) { // Placeholder for additional data fields
    html += `<div class="content-section"><h4>Other</h4><p>${proj.otherField}</p></div>`;
  }
  
  html += '</div>';
  return html;
}

function snapOrbToMarker(marker) {
  if (!positionOrb || !marker) return;
  const rect = marker.getBoundingClientRect();
  positionOrb.style.top = `${rect.top + window.scrollY}px`;
  positionOrb.style.left = `${rect.left}px`;
}

function toggleExpanded(card, marker, forceState = null) {
  const isExpanded = forceState !== null ? forceState : !card.classList.contains('expanded');
  
  document.querySelectorAll('.project-card.expanded').forEach(c => {
    if (c !== card) {
      c.classList.remove('expanded');
      const otherMarker = document.querySelector(`.timeline-marker[data-project-id="${c.dataset.projectId}"]`);
      if (otherMarker) otherMarker.classList.remove('active');
    }
  });
  
  if (isExpanded) {
    card.classList.add('expanded');
    marker.classList.add('active');
    expandedCard = card;
    setTimeout(() => document.addEventListener('click', handleClickOutside), 100);
  } else {
    card.classList.remove('expanded');
    marker.classList.remove('active');
    expandedCard = null;
    document.removeEventListener('click', handleClickOutside);
  }
}

function handleClickOutside(e) {
  if (expandedCard && !expandedCard.contains(e.target)) {
    const markerId = expandedCard.dataset.projectId;
    const marker = document.querySelector(`.timeline-marker[data-project-id="${markerId}"]`);
    if (marker) toggleExpanded(expandedCard, marker, false);
  }
}

// Init
loadProjects();

// Toggle View
if (toggle) {
  toggle.addEventListener('click', () => {
    isGrid = !isGrid;
    if (positionOrb) positionOrb.style.display = isGrid ? 'none' : 'block';
    renderProjects(projectsData);
  });
}

// Dark/Light Mode
if (modeBtn) {
  modeBtn.addEventListener('click', () => {
    document.body.classList.toggle('light');
    document.body.classList.toggle('dark');
  });
}
