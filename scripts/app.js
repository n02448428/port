// Add this function to handle view indicators
function updateViewIndicator(viewName) {
  // Remove existing indicator
  const existingIndicator = document.querySelector('.view-indicator-fixed');
  if (existingIndicator) existingIndicator.remove();
  
  // Create new indicator
  const viewIndicator = document.createElement('div');
  viewIndicator.className = 'view-indicator-fixed';
  viewIndicator.style.position = 'fixed';
  viewIndicator.style.top = '50px';
  viewIndicator.style.right = '1rem';
  viewIndicator.style.fontSize = '0.75rem';
  viewIndicator.style.fontStyle = 'italic';
  viewIndicator.style.color = 'gray';
  viewIndicator.style.zIndex = '999';
  viewIndicator.style.height = '40px';
  viewIndicator.style.display = 'flex';
  viewIndicator.style.alignItems = 'center';
  viewIndicator.textContent = viewName;
  document.body.appendChild(viewIndicator);
}

console.log('🚀 Script loaded successfully');

let isGrid = false;
let expandedCard = null;
let projectsData = [];
let currentMediaOverlay = null;
let positionOrb = null;
let currentOverlay = null;
let filterTypes = [];
let itemSize = 220;

const content = document.getElementById('content');
const toggle = document.getElementById('toggleView');
const modeBtn = document.getElementById('toggleMode');

// Birth date for timeline calculation (unused but kept for reference)
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

// Function to get current date and time formatted like regular projects
function getCurrentDateTime() {
  const now = new Date();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const day = now.getDate();
  const month = monthNames[now.getMonth()];
  const year = now.getFullYear();
  const hours = now.getHours();
  const minutes = now.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  
  const ordinal = (day) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  
  return `${month} ${day}${ordinal(day)}, ${year} ${displayHours}:${minutes} ${ampm}`;
}

// Function to create Present Moment entry
function createPresentMoment() {
  return {
    id: 'present-moment',
    title: 'Present Moment',
    type: 'now',
    status: 'ongoing',
    date: getCurrentDateTime(),
    isPresentMoment: true
  };
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

function getUniqueTypes() {
  const types = new Set();
  projectsData.forEach(proj => {
    if (proj.type) types.add(proj.type);
  });
  return Array.from(types);
}

function formatDate(dateStr) {
  if (!dateStr || isNaN(new Date(dateStr).getTime())) return 'Undated';
  const date = new Date(dateStr);
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const day = date.getDate();
  const month = monthNames[date.getMonth()];
  const year = date.getFullYear();
  const ordinal = (day) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };
  return `${month} ${day}${ordinal(day)}, ${year}`;
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
  
  // Add view indicator for timeline
  updateViewIndicator('Timeline');
  
  // Create Present Moment entry at the TOP (timeline ends at present)
  const presentMoment = createPresentMoment();
  
  // Separate dated and undated projects
  const datedProjects = data.filter(proj => proj.date && !isNaN(new Date(proj.date).getTime()));
  const undatedProjects = data.filter(proj => !proj.date || isNaN(new Date(proj.date).getTime()));
  
  // Sort dated projects by date (newest first)
  const sortedData = datedProjects.sort((a, b) => new Date(b.date) - new Date(a.date));
  
  // Order: Present Moment FIRST, then sorted projects, then undated
  const finalData = [presentMoment, ...sortedData, ...undatedProjects];
  
  let lastYear = null;
  let isFirstItem = true;
  
  finalData.forEach((proj) => {
    // Skip year labels for present moment
    if (!proj.isPresentMoment) {
      const projectYear = proj.date ? new Date(proj.date).getFullYear() : 'Undated';
      
      // Year label
      if (projectYear !== lastYear && projectYear !== 'Undated') {
        const yearLabel = document.createElement('div');
        yearLabel.className = 'year-label';
        yearLabel.innerText = projectYear;
        content.appendChild(yearLabel);
        lastYear = projectYear;
      } else if (projectYear === 'Undated' && lastYear !== 'Undated') {
        const undatedLabel = document.createElement('div');
        undatedLabel.className = 'year-label';
        undatedLabel.innerText = 'Undated';
        content.appendChild(undatedLabel);
        lastYear = 'Undated';
      }
    }
    
    // Timeline item wrapper
    const item = document.createElement('div');
    item.className = 'timeline-item';
    
    // Card
    const card = document.createElement('div');
    card.className = proj.isPresentMoment ? 'project-card present-moment' : 'project-card';
    card.dataset.projectId = proj.id;
    
    // Format for all projects (including present moment) - same layout
    if (proj.isPresentMoment) {
      card.innerHTML = `
        <div class="project-compact">
          <span class="project-type">[${proj.type}]</span>
          <span class="project-title">${proj.title}</span>,
          <span class="project-date" id="live-time">${proj.date}</span>
        </div>
      `;
    } else {
      card.innerHTML = `
        <div class="project-compact">
          <span class="project-type">[${proj.type}]</span>
          <span class="project-title">${proj.title}</span>,
          <span class="project-date">${formatDate(proj.date)}</span>
        </div>
      `;
      
      // Expanded content (only for regular projects)
      const expandedContent = document.createElement('div');
      expandedContent.className = 'expanded-content';
      expandedContent.innerHTML = createExpandedContent(proj);
      card.appendChild(expandedContent);
      
      // Close button (only for expandable projects)
      const closeBtn = document.createElement('button');
      closeBtn.className = 'close-btn';
      closeBtn.innerHTML = '×';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleExpanded(card, marker, false);
      });
      card.appendChild(closeBtn);
    }
    
    // Marker
    const marker = document.createElement('div');
    marker.className = proj.isPresentMoment ? 'timeline-marker present-moment' : 'timeline-marker';
    marker.dataset.projectId = proj.id;
    
    // Position the orb on Present Moment initially, but allow it to move
    if (proj.isPresentMoment && isFirstItem) {
      setTimeout(() => {
        snapOrbToMarker(marker);
      }, 100);
      isFirstItem = false;
    }
    
    // Hover for ALL projects (including present moment)
    card.addEventListener('mouseenter', () => {
      // Remove active from all other markers first
      document.querySelectorAll('.timeline-marker.active').forEach(m => m.classList.remove('active'));
      marker.classList.add('active');
      snapOrbToMarker(marker);
    });
    
    card.addEventListener('mouseleave', () => {
      if (!card.classList.contains('expanded')) {
        marker.classList.remove('active');
      }
    });
    
    // Click expand and media handling (only for regular projects)
    if (!proj.isPresentMoment) {
      card.addEventListener('click', (e) => {
        const mediaItem = e.target.closest('.media-item');
        if (mediaItem) {
          e.stopPropagation();
          openMediaOverlay(mediaItem.dataset.url, mediaItem.dataset.type);
          return;
        }
        
        if (e.target.closest('.external-link, .close-btn')) return;
        e.stopPropagation();
        toggleExpanded(card, marker);
      });
      
      // Ensure expanded content is clickable
      const expandedContent = card.querySelector('.expanded-content');
      if (expandedContent) {
        expandedContent.addEventListener('click', (e) => {
          const link = e.target.closest('.external-link');
          if (link) {
            e.stopPropagation();
            window.open(link.href, '_blank');
          }
        });
      }
    }
    
    // Append
    item.appendChild(card);
    item.appendChild(marker);
    content.appendChild(item);
  });
  
  // Setup dynamic timeline height after all items are rendered
  setupTimelineHeight();
}

function renderGridView(data) {
  content.className = 'grid-container';
  content.innerHTML = '';
  
  if (positionOrb) positionOrb.style.display = 'none';
  
  // Filter and slider controls
  const controls = document.createElement('div');
  controls.className = 'grid-controls';
  
  // Left side controls
  const leftControls = document.createElement('div');
  leftControls.style.display = 'flex';
  leftControls.style.alignItems = 'center';
  leftControls.style.gap = '1rem';
  
  // Custom checkbox dropdown instead of select
  const filterContainer = document.createElement('div');
  filterContainer.className = 'filter-dropdown';
  
  const filterButton = document.createElement('button');
  filterButton.className = 'filter-select';
  filterButton.textContent = 'All Types';
  filterButton.style.background = 'var(--bg)';
  filterButton.style.border = '1px solid var(--fg)';
  filterButton.style.color = 'var(--fg)';
  filterButton.style.padding = '4px 8px';
  filterButton.style.cursor = 'pointer';
  
  const dropdownMenu = document.createElement('div');
  dropdownMenu.className = 'checkbox-dropdown';
  
  // Add "All" option
  const allItem = document.createElement('div');
  allItem.className = 'checkbox-item';
  const allCheckbox = document.createElement('input');
  allCheckbox.type = 'checkbox';
  allCheckbox.checked = filterTypes.length === 0;
  allCheckbox.addEventListener('change', () => {
    if (allCheckbox.checked) {
      filterTypes = [];
      // Uncheck all other checkboxes
      dropdownMenu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (cb !== allCheckbox) cb.checked = false;
      });
    } else {
      // If unchecking "All", don't do anything special
    }
    updateFilterButton();
    renderGridView(projectsData);
  });
  allItem.appendChild(allCheckbox);
  allItem.appendChild(document.createTextNode('All'));
  dropdownMenu.appendChild(allItem);
  
  // Add type options
  const uniqueTypes = getUniqueTypes();
  uniqueTypes.forEach(type => {
    const item = document.createElement('div');
    item.className = 'checkbox-item';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = filterTypes.includes(type);
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        if (!filterTypes.includes(type)) filterTypes.push(type);
        allCheckbox.checked = false;
      } else {
        const index = filterTypes.indexOf(type);
        if (index > -1) filterTypes.splice(index, 1);
        if (filterTypes.length === 0) allCheckbox.checked = true;
      }
      updateFilterButton();
      renderGridView(projectsData);
    });
    item.appendChild(checkbox);
    item.appendChild(document.createTextNode(type));
    dropdownMenu.appendChild(item);
  });
  
  function updateFilterButton() {
    if (filterTypes.length === 0) {
      filterButton.textContent = 'All Types';
    } else if (filterTypes.length === 1) {
      filterButton.textContent = filterTypes[0];
    } else {
      filterButton.textContent = `${filterTypes.length} selected`;
    }
  }
  
  filterButton.addEventListener('click', () => {
    dropdownMenu.classList.toggle('open');
  });
  
  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!filterContainer.contains(e.target)) {
      dropdownMenu.classList.remove('open');
    }
  });
  
  filterContainer.appendChild(filterButton);
  filterContainer.appendChild(dropdownMenu);
  leftControls.appendChild(filterContainer);
  
  // Size slider
  const sizeSlider = document.createElement('input');
  sizeSlider.type = 'range';
  sizeSlider.min = '80';
  sizeSlider.max = '400';
  sizeSlider.value = itemSize;
  sizeSlider.addEventListener('input', (e) => {
    itemSize = parseInt(e.target.value);
    document.documentElement.style.setProperty('--grid-item-size', `${itemSize}px`);
  });
  const sliderLabel = document.createElement('label');
  sliderLabel.innerText = 'Size:';
  sliderLabel.appendChild(sizeSlider);
  leftControls.appendChild(sliderLabel);
  
  controls.appendChild(leftControls);
  
  // View indicator on the right
  updateViewIndicator('Vault');
  
  content.appendChild(controls);
  
  // Rest of the grid rendering code...
  const datedProjects = data.filter(proj => proj.date && !isNaN(new Date(proj.date).getTime()));
  const undatedProjects = data.filter(proj => !proj.date || isNaN(new Date(proj.date).getTime()));
  
  const sortedData = datedProjects.sort((a, b) => new Date(b.date) - new Date(a.date));
  const filteredData = [...sortedData, ...undatedProjects.sort((a, b) => a.title.localeCompare(b.title))]
    .filter(proj => filterTypes.length === 0 || filterTypes.includes(proj.type));
  
  filteredData.forEach(proj => {
    const card = document.createElement('div');
    card.className = 'grid-card';
    
    const firstMedia = proj.media && proj.media.length > 0 ? proj.media[0] : null;
    const isImage = firstMedia && getMediaType(firstMedia) === 'image';
    card.innerHTML = `
      <div class="grid-image" style="${isImage ? `background-image: url('${firstMedia}');` : 'background-color: gray;'}"></div>
      <div class="grid-title">
        <span class="project-type">[${proj.type}]</span>
        <span class="project-title">${proj.title}</span>,
        <span class="project-date">${formatDate(proj.date)}</span>
      </div>
    `;
    
    card.addEventListener('click', () => {
      openGridOverlay(proj);
    });
    
    content.appendChild(card);
  });
}

function openGridOverlay(proj) {
  if (currentOverlay) currentOverlay.remove();

  const overlay = document.createElement('div');
  overlay.className = 'grid-overlay';
  
  const overlayCard = document.createElement('div');
  overlayCard.className = 'overlay-card expanded';
  overlayCard.innerHTML = createExpandedContent(proj);
  
  // Close button
  const closeBtn = document.createElement('button');
  closeBtn.className = 'close-btn';
  closeBtn.innerHTML = '×';
  closeBtn.addEventListener('click', () => {
    overlay.remove();
    currentOverlay = null;
  });
  overlayCard.appendChild(closeBtn);
  
  // Media handling
  overlayCard.addEventListener('click', (e) => {
    const mediaItem = e.target.closest('.media-item');
    if (mediaItem) {
      e.stopPropagation();
      openMediaOverlay(mediaItem.dataset.url, mediaItem.dataset.type);
    }
  });
  
  overlay.appendChild(overlayCard);
  document.body.appendChild(overlay);
  currentOverlay = overlay;
  
  // Close on outside click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      currentOverlay = null;
    }
  });
}

function createExpandedContent(proj) {
  let html = `
    <div class="expanded-header">
      <h2>${proj.title}</h2>
      <div class="project-metadata">
        <span class="project-type">[${proj.type}]</span>
        <span class="project-date">${formatDate(proj.date)}</span>
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
  
  // Links - COMPLETELY REWRITTEN to handle all edge cases
  if (proj.links || (proj.external_link_names && proj.external_link_urls)) {
    html += `<div class="content-section"><h4>Links</h4><ul>`;
    let links = [];
    
    if (proj.links && Array.isArray(proj.links)) {
      links = proj.links.map(link => {
        if (typeof link === 'string') {
          const [name, url] = link.includes('|') ? link.split('|') : [link, link];
          return { name: name || url, url: url || '#' };
        }
        return { name: link.name || link.url || 'Link', url: link.url || '#' };
      });
    } else if (proj.external_link_names && proj.external_link_urls) {
      // Parse names
      let names = [];
      if (Array.isArray(proj.external_link_names)) {
        names = proj.external_link_names.map(n => String(n || ''));
      } else if (typeof proj.external_link_names === 'string') {
        names = proj.external_link_names.includes('|') ? 
               proj.external_link_names.split('|') : 
               proj.external_link_names.split(',');
        names = names.map(n => String(n || '').trim());
      }
      
      // Parse URLs - handle both array and string formats, including pipe-separated strings within arrays
      let urls = [];
      if (Array.isArray(proj.external_link_urls)) {
        // Flatten any pipe-separated URLs within array elements
        proj.external_link_urls.forEach(urlItem => {
          if (typeof urlItem === 'string' && urlItem.includes('|')) {
            urls.push(...urlItem.split('|').map(u => u.trim()));
          } else {
            urls.push(String(urlItem || ''));
          }
        });
      } else if (typeof proj.external_link_urls === 'string') {
        urls = proj.external_link_urls.includes('|') ? 
               proj.external_link_urls.split('|') : 
               proj.external_link_urls.split(',');
        urls = urls.map(u => String(u || '').trim());
      }
      
      // Create links by pairing names with URLs
      const maxLength = Math.max(names.length, urls.length);
      for (let i = 0; i < maxLength; i++) {
        const name = names[i] || urls[i] || 'Link';
        const url = urls[i] || '#';
        links.push({ name, url });
      }
    }
    
    links.forEach(link => {
      html += `<li><a href="${link.url}" class="external-link" target="_blank">${link.name}</a></li>`;
    });
    html += `</ul></div>`;
  }
  
  // Media
  if (proj.media) {
    html += `<div class="content-section"><h4>Media</h4><div class="media-gallery">`;
    const mediaItems = Array.isArray(proj.media) ? proj.media : [proj.media];
    mediaItems.forEach(url => {
      const type = getMediaType(url);
      if (type === 'image') {
        html += `<img src="${url}" alt="media" class="media-item" data-type="image" data-url="${url}">`;
      } else if (type === 'video') {
        html += `<div class="video-thumb media-item" data-type="video" data-url="${url}"><span>▶️ Video</span></div>`;
      } else if (type === 'youtube') {
        html += `<div class="youtube-thumb media-item" data-type="youtube" data-url="${url}"><span>▶️ YouTube</span></div>`;
      } else {
        html += `<a href="${url}" class="external-link" target="_blank">${url}</a>`;
      }
    });
    html += `</div></div>`;
  }
  
  // Other fields
  let otherHtml = '';
  Object.entries(proj).forEach(([key, value]) => {
    if (['id', 'title', 'type', 'date', 'status', 'description', 'story', 'links', 'media', 'external_link_names', 'external_link_urls', 'isPresentMoment'].includes(key)) return;
    otherHtml += `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`;
  });
  if (otherHtml) {
    html += `<div class="content-section"><h4>Other Details</h4>${otherHtml}</div>`;
  }
  
  html += '</div>';
  return html;
}

function getMediaType(url) {
  if (typeof url !== 'string') return 'unknown';
  if (url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) return 'image';
  if (url.match(/\.(mp4|webm|ogg)$/i)) return 'video';
  if (url.match(/(youtube\.com|youtu\.be)/i)) return 'youtube';
  return 'unknown';
}

function extractYoutubeId(url) {
  const regExp = /^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

function openMediaOverlay(url, type) {
  if (currentMediaOverlay) currentMediaOverlay.remove();

  const overlay = document.createElement('div');
  overlay.className = 'media-overlay';
  
  let content = '';
  if (type === 'image') {
    content = `<img src="${url}" alt="Media">`;
  } else if (type === 'video') {
    content = `<video src="${url}" controls autoplay loop></video>`;
  } else if (type === 'youtube') {
    const videoId = extractYoutubeId(url);
    if (videoId) {
      content = `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
    } else {
      content = `<p>Invalid YouTube URL</p>`;
    }
  }

  overlay.innerHTML = `
    <div class="overlay-content">
      ${content}
      <button class="fullscreen-btn">⛶ Fullscreen</button>
      <button class="close-overlay">×</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  currentMediaOverlay = overlay;

  const closeBtn = overlay.querySelector('.close-overlay');
  closeBtn.addEventListener('click', () => {
    overlay.remove();
    currentMediaOverlay = null;
  });

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
      currentMediaOverlay = null;
    }
  });

  const fullscreenBtn = overlay.querySelector('.fullscreen-btn');
  const mediaElem = overlay.querySelector('img, video, iframe');
  if (fullscreenBtn && mediaElem) {
    fullscreenBtn.addEventListener('click', () => {
      if (mediaElem.requestFullscreen) {
        mediaElem.requestFullscreen();
      } else if (mediaElem.webkitRequestFullscreen) {
        mediaElem.webkitRequestFullscreen();
      } else if (mediaElem.msRequestFullscreen) {
        mediaElem.msRequestFullscreen();
      }
    });
  }
}

function snapOrbToMarker(marker) {
  if (!positionOrb || !marker) return;
  const rect = marker.getBoundingClientRect();
  positionOrb.style.top = `${rect.top + window.scrollY}px`;
  positionOrb.style.left = `${rect.left}px`;
  positionOrb.style.display = 'block';
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

// Flash effect for buttons
document.querySelectorAll('button').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.add('flash');
    setTimeout(() => btn.classList.remove('flash'), 100);
  });
});

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

// Update present moment time every minute (not every second to avoid performance issues)
setInterval(() => {
  const liveTimeElement = document.getElementById('live-time');
  if (liveTimeElement) {
    liveTimeElement.textContent = getCurrentDateTime();
  }
}, 60000); // Update every minute
