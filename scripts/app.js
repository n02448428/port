// Portfolio Timeline App - Enhanced Version
let isGrid = false, expandedCard = null, projectsData = [], currentOverlay = null, 
    positionOrb = null, filterTypes = [], itemSize = 220, isLoading = false;

const content = document.getElementById('content'),
      toggle = document.getElementById('toggleView'),
      modeBtn = document.getElementById('toggleMode'),
      contactBtn = document.getElementById('contactBtn');

// Utils
const formatDate = dateStr => {
  if (!dateStr || isNaN(new Date(dateStr).getTime())) return 'Undated';
  const date = new Date(dateStr), day = date.getDate(), year = date.getFullYear(),
        months = ['January','February','March','April','May','June','July','August','September','October','November','December'],
        ordinals = day > 3 && day < 21 ? 'th' : ['th','st','nd','rd'][day % 10] || 'th';
  return `${months[date.getMonth()]} ${day}${ordinals}, ${year}`;
};

const getCurrentDateTime = () => {
  const now = new Date(), day = now.getDate(), year = now.getFullYear(),
        months = ['January','February','March','April','May','June','July','August','September','October','November','December'],
        hours = now.getHours(), minutes = now.getMinutes().toString().padStart(2, '0'),
        ampm = hours >= 12 ? 'PM' : 'AM', displayHours = hours % 12 || 12,
        ordinals = day > 3 && day < 21 ? 'th' : ['th','st','nd','rd'][day % 10] || 'th';
  return `${months[now.getMonth()]} ${day}${ordinals}, ${year} ${displayHours}:${minutes} ${ampm}`;
};

const createPresentMoment = () => ({
  id: 'present-moment', title: 'Present Moment', type: 'now', 
  status: 'ongoing', date: getCurrentDateTime(), isPresentMoment: true
});

const updateViewIndicator = viewName => {
  document.querySelector('.view-indicator-fixed')?.remove();
  const indicator = Object.assign(document.createElement('div'), {
    className: 'view-indicator-fixed', textContent: viewName
  });
  Object.assign(indicator.style, {
    position: 'fixed', top: '50px', right: '1rem', fontSize: '0.75rem',
    fontStyle: 'italic', color: 'gray', zIndex: '999', height: '40px',
    display: 'flex', alignItems: 'center'
  });
  document.body.appendChild(indicator);
};

const createPositionOrb = () => {
  positionOrb?.remove();
  positionOrb = Object.assign(document.createElement('div'), {className: 'timeline-position-orb'});
  content.appendChild(positionOrb);
};

const snapOrbToMarker = marker => {
  if (!positionOrb || !marker) return;
  const containerRect = content.getBoundingClientRect(),
        markerRect = marker.getBoundingClientRect(),
        relativeTop = markerRect.top - containerRect.top,
        relativeLeft = markerRect.left - containerRect.left;
  
  Object.assign(positionOrb.style, {
    top: `${relativeTop - (marker.classList.contains('present-moment') ? 6 : 0)}px`,
    left: `${relativeLeft}px`, display: 'block'
  });
};

// Loading states
const showLoadingState = () => {
  content.innerHTML = `
    <div class="loading-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh;">
      <div class="loading-spinner" style="width: 40px; height: 40px; border: 2px solid var(--fg); border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
      <p style="color: var(--fg); opacity: 0.7;">Loading projects...</p>
    </div>
    <style>
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
  `;
};

const showErrorState = (error) => {
  content.innerHTML = `
    <div class="error-container" style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; text-align: center;">
      <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;">⚠</div>
      <h3 style="margin-bottom: 1rem; color: var(--fg);">Unable to load projects</h3>
      <p style="color: var(--fg); opacity: 0.7; max-width: 500px; line-height: 1.5;">${error.message}</p>
      <button onclick="loadProjects()" style="margin-top: 1rem; background: var(--bg); border: 1px solid var(--fg); color: var(--fg); padding: 0.5rem 1rem; cursor: pointer;">Retry</button>
    </div>
  `;
};

// Enhanced data validation and processing
const validateProject = (project) => {
  const validated = {
    ...project,
    id: project.id || Math.random().toString(36).substr(2, 9),
    title: project.title || 'Untitled Project',
    type: project.type || 'misc',
    status: project.status || 'unknown',
    description: project.description || '',
    date: project.date || null,
    tags: Array.isArray(project.tags) ? project.tags : 
          typeof project.tags === 'string' ? project.tags.split(';').map(t => t.trim()) : [],
    medium: project.medium || '',
    skills: project.medium ? project.medium.split(';').map(s => s.trim()).filter(Boolean) : []
  };

  // Process links more robustly
  if (project.external_link_names && project.external_link_urls) {
    validated.processedLinks = processProjectLinks(project);
  }

  return validated;
};

const processProjectLinks = (project) => {
  let names = [], urls = [];
  
  if (Array.isArray(project.external_link_names)) {
    names = project.external_link_names.map(n => String(n || ''));
  } else if (typeof project.external_link_names === 'string') {
    names = project.external_link_names.includes('|') ? 
           project.external_link_names.split('|') : 
           project.external_link_names.split(',');
    names = names.map(n => n.trim());
  }
  
  if (Array.isArray(project.external_link_urls)) {
    project.external_link_urls.forEach(urlItem => {
      if (typeof urlItem === 'string' && urlItem.includes('|')) {
        urls.push(...urlItem.split('|').map(u => u.trim()));
      } else {
        urls.push(String(urlItem || ''));
      }
    });
  } else if (typeof project.external_link_urls === 'string') {
    urls = project.external_link_urls.includes('|') ? 
           project.external_link_urls.split('|') : 
           project.external_link_urls.split(',');
    urls = urls.map(u => u.trim());
  }
  
  const maxLength = Math.max(names.length, urls.length);
  const links = [];
  for (let i = 0; i < maxLength; i++) {
    const url = urls[i] || '#';
    const name = names[i] || url || 'Link';
    if (url && url !== '#') {
      links.push({ name, url: url.startsWith('http') ? url : `https://${url}` });
    }
  }
  
  return links;
};

// Data Loading with error handling
const loadProjects = async () => {
  if (isLoading) return;
  isLoading = true;
  showLoadingState();
  
  try {
    const response = await fetch('data/projects.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    
    const rawData = await response.json();
    if (!Array.isArray(rawData)) throw new Error('Invalid data format: expected array');
    
    projectsData = rawData.map(validateProject).filter(Boolean);
    
    if (projectsData.length === 0) {
      throw new Error('No valid projects found in data source');
    }
    
    renderProjects(projectsData);
  } catch (error) {
    console.error('Failed to load projects:', error);
    showErrorState(error);
  } finally {
    isLoading = false;
  }
};

const getUniqueTypes = () => [...new Set(projectsData.map(p => p.type).filter(Boolean))];

const renderProjects = data => {
  if (!data?.length) {
    showErrorState(new Error('No projects to display'));
    return;
  }
  isGrid ? renderGridView(data) : renderTimelineView(data);
};

// Enhanced search functionality
const createSearchControls = () => {
  const searchContainer = document.createElement('div');
  searchContainer.className = 'search-container';
  searchContainer.style.cssText = `
    position: fixed; top: 50px; left: 1rem; right: 200px; background: var(--bg);
    padding: 0.5rem; z-index: 999; display: flex; align-items: center; gap: 1rem;
  `;
  
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Search projects...';
  searchInput.style.cssText = `
    background: var(--bg); border: 1px solid var(--fg); color: var(--fg);
    padding: 4px 8px; font-size: 0.8rem; flex: 1; max-width: 300px;
  `;
  
  searchInput.addEventListener('input', debounce((e) => {
    const query = e.target.value.toLowerCase();
    const filtered = projectsData.filter(p => 
      p.title.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.type.toLowerCase().includes(query) ||
      p.medium.toLowerCase().includes(query)
    );
    renderProjects(filtered);
  }, 300));
  
  searchContainer.appendChild(searchInput);
  return searchContainer;
};

// Debounce utility
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Timeline View with enhanced performance
const renderTimelineView = data => {
  content.className = 'timeline-container';
  content.innerHTML = '';
  createPositionOrb();
  updateViewIndicator('Timeline');
  
  // Add search controls
  const searchControls = createSearchControls();
  document.body.appendChild(searchControls);
  
  const datedProjects = data.filter(p => p.date && !isNaN(new Date(p.date).getTime()))
                          .sort((a, b) => new Date(b.date) - new Date(a.date)),
        undatedProjects = data.filter(p => !p.date || isNaN(new Date(p.date).getTime())),
        finalData = [createPresentMoment(), ...datedProjects, ...undatedProjects];
  
  let lastYear = null, isFirstItem = true;
  
  // Use document fragment for better performance
  const fragment = document.createDocumentFragment();
  
  finalData.forEach(proj => {
    if (!proj.isPresentMoment) {
      const projectYear = proj.date ? new Date(proj.date).getFullYear() : 'Undated';
      if (projectYear !== lastYear) {
        const yearLabel = Object.assign(document.createElement('div'), {
          className: 'year-label', innerText: projectYear
        });
        fragment.appendChild(yearLabel);
        lastYear = projectYear;
      }
    }
    
    const item = document.createElement('div');
    item.className = 'timeline-item';
    
    const card = Object.assign(document.createElement('div'), {
      className: proj.isPresentMoment ? 'project-card present-moment' : 'project-card'
    });
    card.dataset.projectId = proj.id;
    
    card.innerHTML = `
      <div class="project-compact">
        <span class="project-type">[${proj.type}]</span>
        <span class="project-title">${proj.title}</span>,
        <span class="project-date"${proj.isPresentMoment ? ' id="live-time"' : ''}>${proj.isPresentMoment ? proj.date : formatDate(proj.date)}</span>
      </div>
    `;
    
    if (!proj.isPresentMoment) {
      const expandedContent = Object.assign(document.createElement('div'), {
        className: 'expanded-content', innerHTML: createExpandedContent(proj)
      });
      card.appendChild(expandedContent);
      
      const closeBtn = Object.assign(document.createElement('button'), {
        className: 'close-btn', innerHTML: '×'
      });
      closeBtn.onclick = e => { e.stopPropagation(); toggleExpanded(card, marker, false); };
      card.appendChild(closeBtn);
    }
    
    const marker = Object.assign(document.createElement('div'), {
      className: proj.isPresentMoment ? 'timeline-marker present-moment' : 'timeline-marker'
    });
    marker.dataset.projectId = proj.id;
    
    if (proj.isPresentMoment && isFirstItem) {
      setTimeout(() => snapOrbToMarker(marker), 50);
      isFirstItem = false;
    }
    
    card.onmouseenter = () => {
      document.querySelectorAll('.timeline-marker.active').forEach(m => m.classList.remove('active'));
      marker.classList.add('active');
      snapOrbToMarker(marker);
    };
    
    card.onmouseleave = () => {
      if (!card.classList.contains('expanded')) marker.classList.remove('active');
    };
    
    if (!proj.isPresentMoment) {
      card.onclick = e => {
        const mediaItem = e.target.closest('.media-item');
        if (mediaItem) {
          e.stopPropagation();
          openMediaOverlay(mediaItem.dataset.url, mediaItem.dataset.type);
          return;
        }
        if (e.target.closest('.external-link, .close-btn')) return;
        e.stopPropagation();
        toggleExpanded(card, marker);
      };
    }
    
    item.append(card, marker);
    fragment.appendChild(item);
  });

  content.appendChild(fragment);

  // Dynamically adjust timeline line
  requestAnimationFrame(() => {
    const timelineContainer = document.querySelector('.timeline-container');
    const timelineMarkers = document.querySelectorAll('.timeline-marker');
    if (timelineMarkers.length > 0) {
      const firstMarkerRect = timelineMarkers[0].getBoundingClientRect();
      const lastMarkerRect = timelineMarkers[timelineMarkers.length - 1].getBoundingClientRect();
      const containerRect = timelineContainer.getBoundingClientRect();
      const topOffset = firstMarkerRect.top - containerRect.top;
      const height = lastMarkerRect.bottom - firstMarkerRect.top;
      timelineContainer.style.setProperty('--timeline-top', `${topOffset}px`);
      timelineContainer.style.setProperty('--timeline-height', `${height}px`);
    }
  });
};

// Grid View with enhanced performance
const renderGridView = data => {
  content.className = 'grid-container';
  content.innerHTML = '';
  positionOrb && (positionOrb.style.display = 'none');
  updateViewIndicator('Vault');
  
  // Remove search controls if they exist
  document.querySelector('.search-container')?.remove();
  
  const controls = document.createElement('div');
  controls.className = 'grid-controls';
  
  // Enhanced filter dropdown
  const filterContainer = document.createElement('div');
  filterContainer.className = 'filter-dropdown';
  
  const filterButton = Object.assign(document.createElement('button'), {
    className: 'filter-select', textContent: 'All Types'
  });
  
  const dropdownMenu = document.createElement('div');
  dropdownMenu.className = 'checkbox-dropdown';
  
  const updateFilterButton = () => {
    filterButton.textContent = filterTypes.length === 0 ? 'All Types' :
                              filterTypes.length === 1 ? filterTypes[0] :
                              `${filterTypes.length} selected`;
  };
  
  // Add "All" option
  const allItem = document.createElement('div');
  allItem.className = 'checkbox-item';
  const allCheckbox = Object.assign(document.createElement('input'), {
    type: 'checkbox', checked: filterTypes.length === 0
  });
  allCheckbox.onchange = () => {
    if (allCheckbox.checked) {
      filterTypes = [];
      dropdownMenu.querySelectorAll('input[type="checkbox"]').forEach(cb => {
        if (cb !== allCheckbox) cb.checked = false;
      });
    }
    updateFilterButton();
    renderGridView(projectsData);
  };
  allItem.append(allCheckbox, document.createTextNode('All'));
  dropdownMenu.appendChild(allItem);
  
  // Add type options
  getUniqueTypes().forEach(type => {
    const item = document.createElement('div');
    item.className = 'checkbox-item';
    const checkbox = Object.assign(document.createElement('input'), {
      type: 'checkbox', checked: filterTypes.includes(type)
    });
    checkbox.onchange = () => {
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
    };
    item.append(checkbox, document.createTextNode(type));
    dropdownMenu.appendChild(item);
  });
  
  filterButton.onclick = () => dropdownMenu.classList.toggle('open');
  document.onclick = e => {
    if (!filterContainer.contains(e.target)) dropdownMenu.classList.remove('open');
  };
  
  filterContainer.append(filterButton, dropdownMenu);
  
  // Size slider
  const sliderLabel = document.createElement('label');
  sliderLabel.innerText = 'Size:';
  const sizeSlider = Object.assign(document.createElement('input'), {
    type: 'range', min: '80', max: '400', value: itemSize
  });
  sizeSlider.oninput = debounce(e => {
    itemSize = parseInt(e.target.value);
    document.documentElement.style.setProperty('--grid-item-size', `${itemSize}px`);
  }, 100);
  sliderLabel.appendChild(sizeSlider);
  
  controls.append(filterContainer, sliderLabel);
  content.appendChild(controls);
  
  // Grid items with improved performance
  const datedProjects = data.filter(p => p.date && !isNaN(new Date(p.date).getTime()))
                           .sort((a, b) => new Date(b.date) - new Date(a.date)),
        undatedProjects = data.filter(p => !p.date || isNaN(new Date(p.date).getTime()))
                             .sort((a, b) => a.title.localeCompare(b.title)),
        filteredData = [...datedProjects, ...undatedProjects]
                       .filter(p => filterTypes.length === 0 || filterTypes.includes(p.type));
  
  const fragment = document.createDocumentFragment();
  
  filteredData.forEach(proj => {
    const card = document.createElement('div');
    card.className = 'grid-card';
    const firstMedia = proj.media?.[0];
    const isImage = firstMedia && getMediaType(firstMedia) === 'image';
    
    card.innerHTML = `
      <div class="grid-image" style="${isImage ? `background-image: url('${firstMedia}');` : 'background-color: gray;'}"></div>
      <div class="grid-title">
        <span class="project-type">[${proj.type}]</span>
        <span class="project-title">${proj.title}</span>,
        <span class="project-date">${formatDate(proj.date)}</span>
      </div>
    `;
    
    card.onclick = () => openGridOverlay(proj);
    fragment.appendChild(card);
  });
  
  content.appendChild(fragment);
};

// Enhanced overlay handling
const openGridOverlay = proj => {
  currentOverlay?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'grid-overlay';
  
  const overlayCard = Object.assign(document.createElement('div'), {
    className: 'overlay-card expanded', innerHTML: createExpandedContent(proj)
  });
  
  const closeBtn = Object.assign(document.createElement('button'), {
    className: 'close-btn', innerHTML: '×'
  });
  closeBtn.onclick = () => { overlay.remove(); currentOverlay = null; };
  overlayCard.appendChild(closeBtn);
  
  overlayCard.onclick = e => {
    const mediaItem = e.target.closest('.media-item');
    if (mediaItem) {
      e.stopPropagation();
      openMediaOverlay(mediaItem.dataset.url, mediaItem.dataset.type);
    }
  };
  
  overlay.appendChild(overlayCard);
  document.body.appendChild(overlay);
  currentOverlay = overlay;
  
  overlay.onclick = e => {
    if (e.target === overlay) { overlay.remove(); currentOverlay = null; }
  };
};

const getMediaType = url => {
  if (typeof url !== 'string') return 'unknown';
  if (url.match(/\.(jpeg|jpg|gif|png|webp)$/i)) return 'image';
  if (url.match(/\.(mp4|webm|ogg)$/i)) return 'video';
  if (url.match(/(youtube\.com|youtu\.be)/i)) return 'youtube';
  return 'unknown';
};

const createExpandedContent = proj => {
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
  
  if (proj.description) html += `<div class="content-section"><h4>Description</h4><p>${proj.description}</p></div>`;
  if (proj.story) html += `<div class="content-section"><h4>Story</h4><p>${proj.story}</p></div>`;
  
  // Enhanced links handling
  if (proj.processedLinks && proj.processedLinks.length > 0) {
    html += `<div class="content-section"><h4>Links</h4><ul>`;
    proj.processedLinks.forEach(link => {
      html += `<li><a href="${link.url}" class="external-link" target="_blank" rel="noopener noreferrer">${link.name}</a></li>`;
    });
    html += `</ul></div>`;
  } else if (proj.links || (proj.external_link_names && proj.external_link_urls)) {
    // Fallback to original logic
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
      const processedLinks = processProjectLinks(proj);
      links = processedLinks;
    }
    
    links.forEach(link => {
      html += `<li><a href="${link.url}" class="external-link" target="_blank" rel="noopener noreferrer">${link.name}</a></li>`;
    });
    html += `</ul></div>`;
  }
  
  // Media with lazy loading
  if (proj.media) {
    html += `<div class="content-section"><h4>Media</h4><div class="media-gallery">`;
    const mediaItems = Array.isArray(proj.media) ? proj.media : [proj.media];
    mediaItems.forEach(url => {
      const type = getMediaType(url);
      if (type === 'image') {
        html += `<img src="${url}" alt="Project media" class="media-item" data-type="image" data-url="${url}" loading="lazy">`;
      } else if (type === 'video') {
        html += `<div class="video-thumb media-item" data-type="video" data-url="${url}"><span>▶️ Video</span></div>`;
      } else if (type === 'youtube') {
        html += `<div class="youtube-thumb media-item" data-type="youtube" data-url="${url}"><span>▶️ YouTube</span></div>`;
      } else {
        html += `<a href="${url}" class="external-link" target="_blank" rel="noopener noreferrer">${url}</a>`;
      }
    });
    html += `</div></div>`;
  }
  
  // Skills/Technologies
  if (proj.skills && proj.skills.length > 0) {
    html += `<div class="content-section"><h4>Technologies</h4><p>${proj.skills.join(', ')}</p></div>`;
  }
  
  // Other fields
  let otherHtml = '';
  Object.entries(proj).forEach(([key, value]) => {
    if (!['id', 'title', 'type', 'date', 'status', 'description', 'story', 'links', 'media', 'external_link_names', 'external_link_urls', 'isPresentMoment', 'processedLinks', 'skills', 'medium', 'tags'].includes(key) && value) {
      otherHtml += `<p><strong>${key.charAt(0).toUpperCase() + key.slice(1)}:</strong> ${value}</p>`;
    }
  });
  if (otherHtml) html += `<div class="content-section"><h4>Other Details</h4>${otherHtml}</div>`;
  
  return html + '</div>';
};

const extractYoutubeId = url => {
  const match = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
  return (match && match[2].length === 11) ? match[2] : null;
};

const openMediaOverlay = (url, type) => {
  currentOverlay?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'media-overlay';
  
  let content = '';
  if (type === 'image') content = `<img src="${url}" alt="Media" loading="lazy">`;
  else if (type === 'video') content = `<video src="${url}" controls autoplay loop preload="metadata"></video>`;
  else if (type === 'youtube') {
    const videoId = extractYoutubeId(url);
    content = videoId ? 
      `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen loading="lazy"></iframe>` :
      `<p>Invalid YouTube URL</p>`;
  }

  overlay.innerHTML = `
    <div class="overlay-content">
      ${content}
      <button class="fullscreen-btn">⛶ Fullscreen</button>
      <button class="close-overlay">×</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  currentOverlay = overlay;

  overlay.querySelector('.close-overlay').onclick = () => {
    overlay.remove(); currentOverlay = null;
  };
  overlay.onclick = e => {
    if (e.target === overlay) { overlay.remove(); currentOverlay = null; }
  };

  const fullscreenBtn = overlay.querySelector('.fullscreen-btn'),
        mediaElem = overlay.querySelector('img, video, iframe');
  if (fullscreenBtn && mediaElem) {
    fullscreenBtn.onclick = () => {
      if (mediaElem.requestFullscreen) mediaElem.requestFullscreen();
      else if (mediaElem.webkitRequestFullscreen) mediaElem.webkitRequestFullscreen();
      else if (mediaElem.msRequestFullscreen) mediaElem.msRequestFullscreen();
    };
  }
};

const toggleExpanded = (card, marker, forceState = null) => {
  const isExpanded = forceState !== null ? forceState : !card.classList.contains('expanded');
  
  document.querySelectorAll('.project-card.expanded').forEach(c => {
    if (c !== card) {
      c.classList.remove('expanded');
      const otherMarker = document.querySelector(`.timeline-marker[data-project-id="${c.dataset.projectId}"]`);
      otherMarker?.classList.remove('active');
    }
  });
  
  if (isExpanded) {
    card.classList.add('expanded');
    marker.classList.add('active');
    expandedCard = card;
    snapOrbToMarker(marker);
    setTimeout(() => document.addEventListener('click', handleClickOutside), 100);
  } else {
    card.classList.remove('expanded');
    marker.classList.remove('active');
    expandedCard = null;
    document.removeEventListener('click', handleClickOutside);
  }};

const handleClickOutside = e => {
  if (expandedCard && !expandedCard.contains(e.target)) {
    const marker = document.querySelector(`.timeline-marker[data-project-id="${expandedCard.dataset.projectId}"]`);
    if (marker) toggleExpanded(expandedCard, marker, false);
  }
};

// Enhanced keyboard navigation
const setupKeyboardNavigation = () => {
  document.addEventListener('keydown', (e) => {
    // ESC to close overlays
    if (e.key === 'Escape') {
      if (currentOverlay) {
        currentOverlay.remove();
        currentOverlay = null;
        return;
      }
      if (expandedCard) {
        const marker = document.querySelector(`.timeline-marker[data-project-id="${expandedCard.dataset.projectId}"]`);
        if (marker) toggleExpanded(expandedCard, marker, false);
        return;
      }
    }
    
    // Prevent shortcuts when typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    // View toggle shortcuts
    if (e.key === 'v' || e.key === 'V') {
      toggle?.click();
      return;
    }
    
    // Theme toggle shortcuts
    if (e.key === 't' || e.key === 'T') {
      modeBtn?.click();
      return;
    }
    
    // Contact shortcut
    if (e.key === 'c' || e.key === 'C') {
      contactBtn?.click();
      return;
    }
    
    // Arrow navigation in timeline
    if (!isGrid && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const cards = Array.from(document.querySelectorAll('.project-card:not(.present-moment)'));
      const currentIndex = expandedCard ? cards.indexOf(expandedCard) : -1;
      
      let targetIndex;
      if (e.key === 'ArrowDown') {
        targetIndex = currentIndex < cards.length - 1 ? currentIndex + 1 : 0;
      } else {
        targetIndex = currentIndex > 0 ? currentIndex - 1 : cards.length - 1;
      }
      
      if (cards[targetIndex]) {
        const marker = document.querySelector(`.timeline-marker[data-project-id="${cards[targetIndex].dataset.projectId}"]`);
        if (marker) {
          // Close current expanded card
          if (expandedCard) {
            const currentMarker = document.querySelector(`.timeline-marker[data-project-id="${expandedCard.dataset.projectId}"]`);
            if (currentMarker) toggleExpanded(expandedCard, currentMarker, false);
          }
          // Open new card
          toggleExpanded(cards[targetIndex], marker, true);
          // Scroll into view
          cards[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
    
    // Number shortcuts for quick navigation (1-9)
    if (e.key >= '1' && e.key <= '9' && !isGrid) {
      const index = parseInt(e.key) - 1;
      const cards = Array.from(document.querySelectorAll('.project-card:not(.present-moment)'));
      if (cards[index]) {
        const marker = document.querySelector(`.timeline-marker[data-project-id="${cards[index].dataset.projectId}"]`);
        if (marker) {
          if (expandedCard) {
            const currentMarker = document.querySelector(`.timeline-marker[data-project-id="${expandedCard.dataset.projectId}"]`);
            if (currentMarker) toggleExpanded(expandedCard, currentMarker, false);
          }
          toggleExpanded(cards[index], marker, true);
          cards[index].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  });
};

// Enhanced button interactions with feedback
const setupButtonInteractions = () => {
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', function() {
      this.classList.add('flash');
      setTimeout(() => this.classList.remove('flash'), 100);
    });
  });
};

// Contact button functionality
const setupContactButton = () => {
  if (contactBtn) {
    contactBtn.addEventListener('click', () => {
      window.location.href = 'mailto:dmarkelo89@gmail.com?subject=Portfolio Inquiry&body=Hi Dmitry,%0D%0A%0D%0AI saw your portfolio and wanted to reach out...';
    });
  }
};

// View toggle with enhanced feedback
const setupViewToggle = () => {
  toggle?.addEventListener('click', () => {
    // Add loading state during view switch
    const currentContent = content.innerHTML;
    content.style.opacity = '0.5';
    
    setTimeout(() => {
      isGrid = !isGrid;
      if (positionOrb) positionOrb.style.display = isGrid ? 'none' : 'block';
      
      // Clean up search controls when switching views
      document.querySelector('.search-container')?.remove();
      
      renderProjects(projectsData);
      content.style.opacity = '1';
    }, 150);
  });
};

// Theme toggle with system preference detection
const setupThemeToggle = () => {
  // Detect system preference on load
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('portfolio-theme');
  
  if (savedTheme) {
    document.body.className = savedTheme;
  } else {
    document.body.className = prefersDark ? 'dark' : 'light';
  }
  
  modeBtn?.addEventListener('click', () => {
    const newTheme = document.body.classList.contains('dark') ? 'light' : 'dark';
    document.body.className = newTheme;
    localStorage.setItem('portfolio-theme', newTheme);
  });
  
  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (!localStorage.getItem('portfolio-theme')) {
      document.body.className = e.matches ? 'dark' : 'light';
    }
  });
};

// Performance monitoring
const setupPerformanceMonitoring = () => {
  // Monitor render performance
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.entryType === 'measure' && entry.name.startsWith('portfolio-')) {
        console.log(`${entry.name}: ${entry.duration.toFixed(2)}ms`);
      }
    }
  });
  observer.observe({ entryTypes: ['measure'] });
  
  // Memory usage warning (development only)
  if (performance.memory) {
    setInterval(() => {
      const memoryUsage = performance.memory.usedJSHeapSize / 1048576; // MB
      if (memoryUsage > 50) {
        console.warn(`High memory usage detected: ${memoryUsage.toFixed(2)}MB`);
      }
    }, 30000);
  }
};

// Enhanced error handling
const setupErrorHandling = () => {
  window.addEventListener('error', (e) => {
    console.error('Portfolio error:', e.error);
    // Could send to analytics service in production
  });
  
  window.addEventListener('unhandledrejection', (e) => {
    console.error('Unhandled promise rejection:', e.reason);
    e.preventDefault();
  });
};

// Intersection Observer for animations
const setupScrollAnimations = () => {
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);
  
  // Observe timeline items as they're created
  const observeTimelineItems = () => {
    document.querySelectorAll('.timeline-item').forEach(item => {
      item.style.opacity = '0';
      item.style.transform = 'translateY(20px)';
      item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      observer.observe(item);
    });
  };
  
  // Call after timeline renders
  setTimeout(observeTimelineItems, 100);
};

// Live time updates with better performance
const setupLiveTimeUpdates = () => {
  let timeUpdateInterval;
  
  const updateLiveTime = () => {
    const liveTimeElement = document.getElementById('live-time');
    if (liveTimeElement) {
      liveTimeElement.textContent = getCurrentDateTime();
    } else {
      // Clear interval if element doesn't exist
      if (timeUpdateInterval) {
        clearInterval(timeUpdateInterval);
        timeUpdateInterval = null;
      }
    }
  };
  
  // Update every minute
  timeUpdateInterval = setInterval(updateLiveTime, 60000);
  
  // Update immediately if present moment is visible
  updateLiveTime();
};

// Cleanup function for when leaving the page
const setupCleanup = () => {
  window.addEventListener('beforeunload', () => {
    // Clean up any intervals, observers, etc.
    document.removeEventListener('click', handleClickOutside);
    currentOverlay?.remove();
  });
};

// Analytics tracking (optional)
const setupAnalytics = () => {
  // Track view switches
  const originalRenderProjects = renderProjects;
  renderProjects = function(data) {
    performance.mark('portfolio-render-start');
    const result = originalRenderProjects.call(this, data);
    performance.mark('portfolio-render-end');
    performance.measure('portfolio-render', 'portfolio-render-start', 'portfolio-render-end');
    
    // Track which view is being used
    const viewType = isGrid ? 'vault' : 'timeline';
    console.log(`Rendered ${viewType} view with ${data.length} projects`);
    
    return result;
  };
  
  // Track project interactions
  const trackProjectView = (projectId, projectTitle) => {
    console.log(`Project viewed: ${projectTitle} (${projectId})`);
    // Could send to analytics service
  };
  
  // Add tracking to project cards
  document.addEventListener('click', (e) => {
    const projectCard = e.target.closest('.project-card, .grid-card');
    if (projectCard && projectCard.dataset.projectId) {
      const projectId = projectCard.dataset.projectId;
      const projectTitle = projectCard.querySelector('.project-title')?.textContent || 'Unknown';
      trackProjectView(projectId, projectTitle);
    }
  });
};

// Enhanced initialization
const initialize = async () => {
  try {
    performance.mark('portfolio-init-start');
    
    // Setup all enhanced features
    setupErrorHandling();
    setupKeyboardNavigation();
    setupButtonInteractions();
    setupContactButton();
    setupViewToggle();
    setupThemeToggle();
    setupPerformanceMonitoring();
    setupLiveTimeUpdates();
    setupCleanup();
    setupAnalytics();
    
    // Load projects
    await loadProjects();
    
    // Setup scroll animations after render
    setTimeout(setupScrollAnimations, 200);
    
    performance.mark('portfolio-init-end');
    performance.measure('portfolio-init', 'portfolio-init-start', 'portfolio-init-end');
    
    console.log('Portfolio initialized successfully');
  } catch (error) {
    console.error('Failed to initialize portfolio:', error);
    showErrorState(error);
  }
};

// Start the application
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}