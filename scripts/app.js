console.log('Script loaded');

let isGrid = false;
const content = document.getElementById('content');
const toggle = document.getElementById('toggleView');
const modeBtn = document.getElementById('toggleMode');
const yearText = document.getElementById('yearText');

let expandedCard = null;
let projectsData = [];
let currentMediaOverlay = null;

// Birth date for timeline calculation
const BIRTH_DATE = new Date('1989-09-07');
const CURRENT_DATE = new Date();

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
    content.innerHTML = `<div class="error-message">
      <p>Error loading projects: ${error.message}</p>
      <p>Make sure your Google Sheet is set up and the GitHub Action has run successfully.</p>
    </div>`;
  }
}

function calculateTimelinePosition(projectDate) {
  const projectTime = new Date(projectDate);
  const totalLifespan = CURRENT_DATE - BIRTH_DATE;
  const projectAge = CURRENT_DATE - projectTime;
  const positionPercent = (projectAge / totalLifespan) * 100;
  return Math.max(0, Math.min(100, positionPercent));
}

function renderProjects(data) {
  content.innerHTML = '';
  
  if (!data || data.length === 0) {
    content.innerHTML = '<div class="error-message"><p>No projects found. Add data to your Google Sheet and run the GitHub Action!</p></div>';
    return;
  }
  
  console.log('Rendering', data.length, 'projects');
  
  if (isGrid) {
    renderGridView(data);
  } else {
    renderTimelineView(data);
  }
}

function renderTimelineView(data) {
  content.className = 'timeline-container';
  
  // Create timeline
  const timeline = document.createElement('div');
  timeline.className = 'timeline';
  
  // Sort by date (oldest first for timeline)
  const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));
  
  sortedData.forEach((proj, index) => {
    const timelinePosition = calculateTimelinePosition(proj.date);
    
    // Create project marker
    const marker = document.createElement('div');
    marker.className = 'timeline-marker';
    marker.style.top = `${timelinePosition}%`;
    
    // Create project card
    const card = document.createElement('div');
    card.className = 'project-card';
    card.style.top = `${timelinePosition}%`;
    
    // Compact one-line display
    const projectYear = new Date(proj.date).getFullYear();
    card.innerHTML = `
      <div class="project-compact">
        [${proj.type}] ${proj.title}, ${projectYear}
        ${proj.status ? `<span class="status-indicator">${proj.status}</span>` : ''}
      </div>
    `;
    
    // Create expanded content container
    const expandedContent = document.createElement('div');
    expandedContent.className = 'expanded-content';
    expandedContent.innerHTML = createExpandedContent(proj);
    card.appendChild(expandedContent);
    
    // Click to expand
    card.addEventListener('click', (e) => {
      // Don't expand if clicking on media, links, or close button
      if (e.target.closest('.media-item, .external-link, .close-btn')) {
        return;
      }
      e.stopPropagation(); // Prevent event bubbling
      toggleExpanded(card);
    });
    
    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.className = 'close-btn';
    closeBtn.innerHTML = '×';
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleExpanded(card, false);
    });
    card.appendChild(closeBtn);
    
    timeline.appendChild(marker);
    content.appendChild(card);
  });
  
  content.appendChild(timeline);
  
  // Update year label on scroll
  updateYearLabel();
}

function renderGridView(data) {
  content.className = 'grid-container';
  
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
      // Switch to timeline view and expand this project
      isGrid = false;
      renderProjects(projectsData);
      // Find and expand the clicked project
      setTimeout(() => {
        const timelineCard = Array.from(document.querySelectorAll('.project-card'))
          .find(c => c.textContent.includes(proj.title));
        if (timelineCard) toggleExpanded(timelineCard, true);
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
  `;
  
  // Create scrollable content area
  html += '<div class="expanded-scroll">';
  
  // Description (always show first if available)
  if (proj.description) {
    html += `<div class="content-section">
      <h4>Description</h4>
      <p>${proj.description}</p>
    </div>`;
  }
  
  // Story section
  if (proj.story) {
    html += `<div class="content-section">
      <h4>Story</h4>
      <p>${proj.story}</p>
    </div>`;
  }
  
  // Media section - only show if we have media
  const mediaItems = [];
  if (proj.image_urls && proj.image_urls.length > 0) {
    proj.image_urls.forEach(url => {
      if (url.trim()) mediaItems.push({type: 'image', url: url.trim()});
    });
  }
  if (proj.audio_urls && proj.audio_urls.length > 0) {
    proj.audio_urls.forEach(url => {
      if (url.trim()) mediaItems.push({type: 'audio', url: url.trim()});
    });
  }
  if (proj.video_urls && proj.video_urls.length > 0) {
    proj.video_urls.forEach(url => {
      if (url.trim()) {
        const cleanUrl = url.trim();
        // Check if it's a YouTube URL and convert to embed format
        if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) {
          mediaItems.push({type: 'youtube', url: convertToYouTubeEmbed(cleanUrl)});
        } else {
          mediaItems.push({type: 'video', url: cleanUrl});
        }
      }
    });
  }
  
  if (mediaItems.length > 0) {
    html += '<div class="content-section"><h4>Media</h4><div class="media-grid">';
    mediaItems.forEach((item, i) => {
      html += `<div class="media-item" onclick="openMediaOverlay('${item.type}', '${item.url}', ${i})">`;
      if (item.type === 'image') {
        html += `<img src="${item.url}" alt="Project media" loading="lazy">`;
      } else if (item.type === 'youtube') {
        const videoId = extractYouTubeId(item.url);
        html += `<img src="https://img.youtube.com/vi/${videoId}/mqdefault.jpg" alt="YouTube video thumbnail" loading="lazy"><div class="play-button">▶</div>`;
      } else if (item.type === 'video') {
        html += `<video src="${item.url}" preload="metadata" muted></video><div class="play-button">▶</div>`;
      } else if (item.type === 'audio') {
        html += `<div class="audio-preview">🎵</div><div class="play-button">▶</div>`;
      }
      html += '</div>';
    });
    html += '</div></div>';
  }
  
  // Links section - only show if we have both names and URLs
  if (proj.external_link_names && proj.external_link_urls) {
    const names = Array.isArray(proj.external_link_names) ? proj.external_link_names : [proj.external_link_names];
    const urls = Array.isArray(proj.external_link_urls) ? proj.external_link_urls : [proj.external_link_urls];
    
    if (names.length > 0 && urls.length > 0) {
      html += '<div class="content-section"><h4>Links</h4><div class="links-grid">';
      for (let i = 0; i < Math.min(names.length, urls.length); i++) {
        if (names[i] && names[i].trim() && urls[i] && urls[i].trim()) {
          html += `<a href="${urls[i].trim()}" target="_blank" class="external-link">${names[i].trim()}</a>`;
        }
      }
      html += '</div></div>';
    }
  }
  
  // HTML Embed section
  if (proj.embedded_html && proj.embedded_html.trim()) {
    html += `<div class="content-section">
      <h4>Embed</h4>
      <div class="embed-container">${proj.embedded_html}</div>
    </div>`;
  }
  
  // Medium section
  if (proj.medium && proj.medium.trim()) {
    html += `<div class="content-section">
      <h4>Medium</h4>
      <p>${proj.medium}</p>
    </div>`;
  }
  
  // Tags section
  if (proj.tags && proj.tags.length > 0) {
    const validTags = proj.tags.filter(tag => tag && tag.trim());
    if (validTags.length > 0) {
      html += `<div class="content-section">
        <h4>Tags</h4>
        <div class="tags-container">
          ${validTags.map(tag => `<span class="tag">${tag.trim()}</span>`).join('')}
        </div>
      </div>`;
    }
  }
  
  html += '</div>'; // Close expanded-scroll
  
  return html;
}

function toggleExpanded(card, forceState = null) {
  const isExpanded = forceState !== null ? forceState : !card.classList.contains('expanded');
  
  // Close other expanded cards
  document.querySelectorAll('.project-card.expanded').forEach(c => {
    if (c !== card) c.classList.remove('expanded');
  });
  
  if (isExpanded) {
    card.classList.add('expanded');
    expandedCard = card;
    
    // Add click-outside-to-close listener
    setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
    }, 100);
    
    // Smooth scroll to center the expanded card
    setTimeout(() => {
      card.scrollIntoView({behavior: 'smooth', block: 'center'});
    }, 300);
  } else {
    card.classList.remove('expanded');
    expandedCard = null;
    document.removeEventListener('click', handleClickOutside);
  }
}

// Handle click outside to close expanded card
function handleClickOutside(e) {
  if (expandedCard && !expandedCard.contains(e.target)) {
    // On mobile, only close if clicking on the background, not other UI elements
    if (window.innerWidth <= 768) {
      const isClickOnBackground = e.target === document.body || 
                                  e.target === content || 
                                  e.target.classList.contains('timeline-container');
      if (isClickOnBackground) {
        toggleExpanded(expandedCard, false);
      }
    } else {
      toggleExpanded(expandedCard, false);
    }
  }
}

// YouTube helper functions
function convertToYouTubeEmbed(url) {
  const videoId = extractYouTubeId(url);
  return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
}

function extractYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Media overlay functions
function openMediaOverlay(type, url, index) {
  closeMediaOverlay();
  
  const overlay = document.createElement('div');
  overlay.className = 'media-overlay';
  
  let content = '';
  if (type === 'image') {
    content = `<img src="${url}" alt="Media">`;
  } else if (type === 'youtube') {
    const videoId = extractYouTubeId(url);
    content = `<iframe width="800" height="450" src="https://www.youtube.com/embed/${videoId}?autoplay=1" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
  } else if (type === 'video') {
    content = `<video src="${url}" controls autoplay></video>`;
  } else if (type === 'audio') {
    content = `<audio src="${url}" controls autoplay></audio>`;
  }
  
  overlay.innerHTML = `
    <div class="media-overlay-content">
      ${content}
      <button class="media-close" onclick="closeMediaOverlay()">×</button>
      ${type !== 'youtube' ? '<button class="fullscreen-btn" onclick="toggleFullscreen()">⛶</button>' : ''}
    </div>
  `;
  
  document.body.appendChild(overlay);
  currentMediaOverlay = overlay;
  
  // Close on background click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeMediaOverlay();
  });
  
  // Close on Escape key
  document.addEventListener('keydown', handleMediaKeydown);
}

function closeMediaOverlay() {
  if (currentMediaOverlay) {
    document.body.removeChild(currentMediaOverlay);
    currentMediaOverlay = null;
    document.removeEventListener('keydown', handleMediaKeydown);
  }
}

function handleMediaKeydown(e) {
  if (e.key === 'Escape') closeMediaOverlay();
}

function toggleFullscreen() {
  const mediaElement = currentMediaOverlay.querySelector('img, video, audio');
  if (!document.fullscreenElement) {
    mediaElement.requestFullscreen?.() || mediaElement.webkitRequestFullscreen?.();
  } else {
    document.exitFullscreen?.() || document.webkitExitFullscreen?.();
  }
}

function updateYearLabel() {
  const timelineHeight = window.innerHeight;
  const scrollPercent = window.scrollY / (document.body.scrollHeight - window.innerHeight);
  const totalYears = CURRENT_DATE.getFullYear() - BIRTH_DATE.getFullYear();
  const currentYear = CURRENT_DATE.getFullYear() - Math.floor(scrollPercent * totalYears);
  yearText.textContent = Math.max(BIRTH_DATE.getFullYear(), currentYear);
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

// Scroll handler
window.addEventListener('scroll', updateYearLabel);

// Global functions for onclick handlers
window.openMediaOverlay = openMediaOverlay;
window.closeMediaOverlay = closeMediaOverlay;
window.toggleFullscreen = toggleFullscreen;
