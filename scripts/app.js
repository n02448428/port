// Portfolio Timeline App - Complete Final Version with Static View Indicators
let isGrid = false, expandedCard = null, projectsData = [], currentOverlay = null, 
    positionOrb = null, filterTypes = [], itemSize = 220, isLoading = false, searchQuery = '',
    splashShown = true;

const content = document.getElementById('content'),
      toggle = document.getElementById('toggleView'),
      modeBtn = document.getElementById('toggleMode'),
      contactBtn = document.getElementById('contactBtn'),
      splashOverlay = document.getElementById('splashOverlay');

// SPLASH SCREEN FUNCTIONS - Make them global so HTML can access them
window.toggleLinks = function() {
  const dropdown = document.getElementById('linksDropdown');
  if (dropdown) {
    dropdown.classList.toggle('open');
  }
};

window.enterPortfolio = function() {
  if (splashOverlay) {
    splashOverlay.classList.add('hidden');
    splashShown = false;
    
    // Load portfolio if not already loaded
    if (projectsData.length === 0) {
      loadProjects();
    }
  }
};

function showSplash() {
  if (splashOverlay) {
    splashOverlay.classList.remove('hidden');
    splashShown = true;
  }
}

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

// UPDATED: Static view indicator that stays within content containers
const updateViewIndicator = viewName => {
  // Remove any existing indicators
  document.querySelectorAll('.view-indicator-static, .view-indicator-fixed').forEach(el => el.remove());
  
  // Add indicator to the appropriate container after a brief delay to ensure container exists
  setTimeout(() => {
    let container;
    if (viewName === 'Timeline') {
      container = document.querySelector('.timeline-container');
    } else if (viewName === 'Vault') {
      container = document.querySelector('.grid-container');
    }
    
    if (container) {
      const indicator = Object.assign(document.createElement('div'), {
        className: 'view-indicator-static', 
        textContent: viewName.toLowerCase()
      });
      container.appendChild(indicator);
    }
  }, 100);
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

// Search and Filter Functions
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

const filterProjects = (data) => {
  let filtered = data;
  
  // Apply search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(p => 
      p.title.toLowerCase().includes(query) ||
      p.description.toLowerCase().includes(query) ||
      p.type.toLowerCase().includes(query) ||
      p.medium.toLowerCase().includes(query) ||
      (p.story && p.story.toLowerCase().includes(query))
    );
  }
  
  // Apply type filter
  if (filterTypes.length > 0) {
    filtered = filtered.filter(p => filterTypes.includes(p.type));
  }
  
  return filtered;
};

// Keyboard Navigation
const setupKeyboardNavigation = () => {
  document.addEventListener('keydown', (e) => {
    // Splash screen shortcuts
    if (splashShown && splashOverlay && !splashOverlay.classList.contains('hidden')) {
      switch(e.key.toLowerCase()) {
        case '1':
        case 'c':
          const contactLink = document.querySelector('.splash-actions a');
          if (contactLink) contactLink.click();
          break;
        case '2':
        case 'p':
        case 'enter':
          window.enterPortfolio();
          break;
        case 'l':
          window.toggleLinks();
          break;
        case 'escape':
          window.enterPortfolio();
          break;
      }
      return;
    }
    
    // Don't interfere with typing in inputs
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    
    // ESC to close overlays or expanded cards
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
    
    // Global shortcuts
    if (e.key.toLowerCase() === 'v') {
      if (toggle) toggle.click();
      return;
    }
    
    if (e.key.toLowerCase() === 't') {
      if (modeBtn) modeBtn.click();
      return;
    }
    
    if (e.key.toLowerCase() === 'c') {
      if (contactBtn) contactBtn.click();
      return;
    }
    
    // Timeline navigation (only in timeline view)
    if (!isGrid && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault();
      const cards = Array.from(document.querySelectorAll('.project-card:not(.present-moment)'));
      if (cards.length === 0) return;
      
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
          // Close current if open
          if (expandedCard) {
            const currentMarker = document.querySelector(`.timeline-marker[data-project-id="${expandedCard.dataset.projectId}"]`);
            if (currentMarker) toggleExpanded(expandedCard, currentMarker, false);
          }
          // Open new card
          toggleExpanded(cards[targetIndex], marker, true);
          cards[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  });
};

// Loading and Error States
const showLoadingState = () => {
  if (!content) return;
  content.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; text-align: center;">
      <div style="width: 40px; height: 40px; border: 2px solid var(--fg); border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-bottom: 1rem;"></div>
      <p style="color: var(--fg); opacity: 0.7;">Loading projects...</p>
    </div>
    <style>
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
  `;
};

const showErrorState = (error) => {
  if (!content) return;
  content.innerHTML = `
    <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; text-align: center; max-width: 500px; margin: 0 auto; padding: 2rem;">
      <div style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.3;">⚠</div>
      <h3 style="margin-bottom: 1rem; color: var(--fg);">Unable to load projects</h3>
      <p style="color: var(--fg); opacity: 0.7; line-height: 1.5; margin-bottom: 1.5rem;">${error.message}</p>
      <button onclick="loadProjects()" style="background: var(--bg); border: 1px solid var(--fg); color: var(--fg); padding: 0.5rem 1rem; cursor: pointer; font-family: inherit;">Retry</button>
    </div>
  `;
};

// Enhanced Input Validation
const validateAndProcessProject = (project) => {
  if (!project || typeof project !== 'object') return null;
  
  const validated = {
    id: project.id || Math.random().toString(36).substr(2, 9),
    title: project.title || 'Untitled Project',
    type: project.type || 'misc',
    status: project.status || 'unknown',
    description: project.description || '',
    date: project.date || null,
    medium: project.medium || '',
    story: project.story || '',
    tags: project.tags || [],
    video_urls: project.video_urls || [],
    external_link_names: project.external_link_names || [],
    external_link_urls: project.external_link_urls || []
  };

  // Handle links: Python script might send either format
  if (project.external_links && Array.isArray(project.external_links)) {
    // Already processed by Python script (new format)
    validated.processedLinks = project.external_links;
  } else if (validated.external_link_names && validated.external_link_urls) {
    // Raw data that needs processing (old format)
    validated.processedLinks = safeProcessLinks(validated.external_link_names, validated.external_link_urls);
  }

  return validated;
};

const safeProcessLinks = (names, urls) => {
  try {
    let nameArray = [], urlArray = [];
    
    if (Array.isArray(names)) {
      nameArray = names.map(n => String(n || '').trim()).filter(Boolean);
    } else if (typeof names === 'string' && names.trim()) {
      nameArray = names.includes('|') ? 
                 names.split('|').map(n => n.trim()).filter(Boolean) : 
                 names.split(',').map(n => n.trim()).filter(Boolean);
    }
    
    if (Array.isArray(urls)) {
      urls.forEach(urlItem => {
        if (typeof urlItem === 'string' && urlItem.trim()) {
          if (urlItem.includes('|')) {
            urlArray.push(...urlItem.split('|').map(u => u.trim()).filter(Boolean));
          } else {
            urlArray.push(urlItem.trim());
          }
        }
      });
    } else if (typeof urls === 'string' && urls.trim()) {
      urlArray = urls.includes('|') ? 
                urls.split('|').map(u => u.trim()).filter(Boolean) : 
                urls.split(',').map(u => u.trim()).filter(Boolean);
    }
    
    const links = [];
    const maxLength = Math.max(nameArray.length, urlArray.length);
    for (let i = 0; i < maxLength; i++) {
      const url = urlArray[i] || '#';
      const name = nameArray[i] || url || 'Link';
      if (url && url !== '#') {
        const safeUrl = url.startsWith('http') ? url : `https://${url}`;
        links.push({ name, url: safeUrl });
      }
    }
    
    return links;
  } catch (error) {
    console.warn('Error processing links:', error);
    return [];
  }
};

// Enhanced Data Loading
const loadProjects = async () => {
  if (isLoading) return;
  isLoading = true;
  showLoadingState();
  
  try {
    const response = await fetch('data/projects.json');
    
    if (!response.ok) {
      throw new Error(`Failed to load projects (${response.status}). Please check that your Google Sheet is set up correctly and the GitHub Action has run.`);
    }
    
    const rawData = await response.json();
    
    if (!Array.isArray(rawData)) {
      throw new Error('Invalid data format. Expected an array of projects.');
    }
    
    if (rawData.length === 0) {
      throw new Error('No projects found. Add projects to your Google Sheet and run the GitHub Action.');
    }
    
    projectsData = rawData.map(validateAndProcessProject).filter(Boolean);

  }};

// Make loadProjects global so retry button can access it
window.loadProjects = loadProjects;

const getUniqueTypes = () => [...new Set(projectsData.map(p => p.type).filter(Boolean))];

const renderProjects = data => {
  if (!data?.length) {
    showErrorState(new Error('No projects to display'));
    return;
  }
  isGrid ? renderGridView(data) : renderTimelineView(data);
};

// Timeline View
const renderTimelineView = data => {
  if (!content) return;
  
  content.className = 'timeline-container';
  content.innerHTML = '';
  createPositionOrb();
  updateViewIndicator('Timeline');
  
  const datedProjects = data.filter(p => p.date && !isNaN(new Date(p.date).getTime()))
                          .sort((a, b) => new Date(b.date) - new Date(a.date)),
        undatedProjects = data.filter(p => !p.date || isNaN(new Date(p.date).getTime())),
        finalData = [createPresentMoment(), ...datedProjects, ...undatedProjects];
  
  let lastYear = null, isFirstItem = true;
  
  finalData.forEach(proj => {
    if (!proj.isPresentMoment) {
      const projectYear = proj.date ? new Date(proj.date).getFullYear() : 'Undated';
      if (projectYear !== lastYear) {
        const yearLabel = Object.assign(document.createElement('div'), {
          className: 'year-label', innerText: projectYear
        });
        content.appendChild(yearLabel);
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
    content.appendChild(item);
  });

  // Adjust timeline line positioning
  setTimeout(() => {
    const timelineContainer = document.querySelector('.timeline-container');
    const timelineMarkers = document.querySelectorAll('.timeline-marker');
    if (timelineContainer && timelineMarkers.length > 0) {
      const firstMarkerRect = timelineMarkers[0].getBoundingClientRect();
      const lastMarkerRect = timelineMarkers[timelineMarkers.length - 1].getBoundingClientRect();
      const containerRect = timelineContainer.getBoundingClientRect();
      const topOffset = firstMarkerRect.top - containerRect.top;
      const height = lastMarkerRect.bottom - firstMarkerRect.top;
      timelineContainer.style.setProperty('--timeline-top', `${topOffset}px`);
      timelineContainer.style.setProperty('--timeline-height', `${height}px`);
    }
  }, 100);
};

// Enhanced Grid View with Search Focus Fix
const renderGridView = data => {
  if (!content) return;
  
  // Store current search focus state BEFORE DOM manipulation
  const currentSearchValue = searchQuery;
  const activeElement = document.activeElement;
  const wasSearchFocused = activeElement && activeElement.type === 'text' && activeElement.placeholder === 'Filter projects...';
  const cursorPosition = wasSearchFocused ? activeElement.selectionStart : 0;
  
  content.className = 'grid-container';
  content.innerHTML = '';
  if (positionOrb) positionOrb.style.display = 'none';
  updateViewIndicator('Vault');
  
  const controls = document.createElement('div');
  controls.className = 'grid-controls';
  
  // Search Input
  const searchContainer = document.createElement('div');
  searchContainer.style.cssText = 'display: flex; align-items: center; gap: 0.5rem;';
  
  const searchLabel = document.createElement('label');
  searchLabel.textContent = 'Search:';
  searchLabel.style.fontSize = '0.8rem';
  
  const searchInput = document.createElement('input');
  searchInput.type = 'text';
  searchInput.placeholder = 'Filter projects...';
  searchInput.value = currentSearchValue;
  searchInput.style.cssText = `
    background: var(--bg); border: 1px solid var(--fg); color: var(--fg);
    padding: 4px 8px; font-size: 0.8rem; width: 200px; font-family: inherit;
  `;
  
  const debouncedSearch = debounce((query) => {
    searchQuery = query;
    renderGridView(projectsData);
  }, 300);
  
  searchInput.addEventListener('input', (e) => {
    debouncedSearch(e.target.value);
  });
  
  searchContainer.append(searchLabel, searchInput);
  
  // Filter dropdown
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
  sizeSlider.oninput = e => {
    itemSize = parseInt(e.target.value);
    document.documentElement.style.setProperty('--grid-item-size', `${itemSize}px`);
  };
  sliderLabel.appendChild(sizeSlider);
  
  controls.append(searchContainer, filterContainer, sliderLabel);
  content.appendChild(controls);
  
  // CRITICAL: Restore search focus AFTER DOM is built but BEFORE rendering items
  if (wasSearchFocused) {
    setTimeout(() => {
      searchInput.focus();
      searchInput.setSelectionRange(cursorPosition, cursorPosition);
    }, 0);
  }
  
  // Apply filters and search
  const filteredData = filterProjects(data);
  
  // Grid items
  const datedProjects = filteredData.filter(p => p.date && !isNaN(new Date(p.date).getTime()))
                           .sort((a, b) => new Date(b.date) - new Date(a.date)),
        undatedProjects = filteredData.filter(p => !p.date || isNaN(new Date(p.date).getTime()))
                             .sort((a, b) => a.title.localeCompare(b.title)),
        finalFilteredData = [...datedProjects, ...undatedProjects];
  
  // Show count
  if (filteredData.length !== data.length) {
    const countInfo = document.createElement('div');
    countInfo.style.cssText = `
      text-align: center; padding: 1rem; font-size: 0.8rem; opacity: 0.7;
      grid-column: 1 / -1;
    `;
    countInfo.textContent = `Showing ${filteredData.length} of ${data.length} projects`;
    content.appendChild(countInfo);
  }
  
  finalFilteredData.forEach(proj => {
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
    content.appendChild(card);
  });
  
  // No results message
  if (finalFilteredData.length === 0) {
    const noResults = document.createElement('div');
    noResults.style.cssText = `
      grid-column: 1 / -1; text-align: center; padding: 3rem; opacity: 0.5;
    `;
    noResults.innerHTML = `
      <div style="font-size: 2rem; margin-bottom: 1rem;">🔍</div>
      <p>No projects found</p>
      <p style="font-size: 0.8rem; margin-top: 0.5rem;">Try adjusting your search or filters</p>
    `;
    content.appendChild(noResults);
  }
};

// Media and overlay functions with enhanced close buttons
const openGridOverlay = proj => {
  currentOverlay?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'grid-overlay';
  
  const overlayCard = Object.assign(document.createElement('div'), {
    className: 'overlay-card expanded', innerHTML: createExpandedContent(proj)
  });
  
  // Add standardized close button
  const closeBtn = Object.assign(document.createElement('button'), {
    className: 'overlay-close-btn', innerHTML: '×'
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

// Replace your createExpandedContent function with this version
// Find it around line 500-600 in app.js

const createExpandedContent = proj => {
  if (!proj) return '';
  
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
  
  // Only show Description if it exists and has content
  if (proj.description && proj.description.trim()) {
    html += `<div class="content-section"><h4>Description</h4><p>${proj.description}</p></div>`;
  }
  
  // Only show Story if it exists and has content
  if (proj.story && proj.story.trim()) {
    html += `<div class="content-section"><h4>Story</h4><p>${proj.story}</p></div>`;
  }
  
  // Render links - only if they exist
  const linksToRender = proj.external_links || proj.processedLinks;
  
  if (linksToRender && linksToRender.length > 0) {
    html += `<div class="content-section"><h4>Links</h4><ul>`;
    linksToRender.forEach(link => {
      html += `<li><a href="${link.url}" class="external-link" target="_blank" rel="noopener noreferrer">${link.name}</a></li>`;
    });
    html += `</ul></div>`;
  }
  
  // Only show Media if it exists and has content
  if (proj.media) {
    const mediaItems = Array.isArray(proj.media) ? proj.media.filter(url => url && url.trim()) : [proj.media];
    
    if (mediaItems.length > 0 && mediaItems.some(url => url && url.trim())) {
      html += `<div class="content-section"><h4>Media</h4><div class="media-gallery">`;
      mediaItems.forEach(url => {
        if (!url || !url.trim()) return; // Skip empty items
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
  }
  
  // Collect other fields that have actual content
  let otherHtml = '';
  const skipFields = [
    'id', 'title', 'type', 'date', 'status', 'description', 'story', 
    'links', 'media', 'external_link_names', 'external_link_urls', 
    'isPresentMoment', 'processedLinks', 'external_links', 
    'image_urls', 'audio_urls', 'video_urls'
  ];
  
  Object.entries(proj).forEach(([key, value]) => {
    if (skipFields.includes(key)) return;
    
    // Check if value has actual content
    let hasContent = false;
    if (Array.isArray(value)) {
      hasContent = value.length > 0 && value.some(item => item && String(item).trim());
    } else if (typeof value === 'string') {
      hasContent = value.trim().length > 0;
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      hasContent = true;
    }
    
    if (hasContent) {
      const displayValue = Array.isArray(value) ? value.join(', ') : value;
      const formattedKey = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' ');
      otherHtml += `<p><strong>${formattedKey}:</strong> ${displayValue}</p>`;
    }
  });
  
  // Only show Other Details section if there's content
  if (otherHtml) {
    html += `<div class="content-section"><h4>Other Details</h4>${otherHtml}</div>`;
  }
  
  return html + '</div>';
};

const extractYoutubeId = url => {
  if (typeof url !== 'string') return null;
  const match = url.match(/^.*(youtu\.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/);
  return (match && match[2].length === 11) ? match[2] : null;
};

const openMediaOverlay = (url, type) => {
  if (!url || !type) return;
  
  currentOverlay?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'media-overlay';
  
  let content = '';
  if (type === 'image') {
    content = `<img src="${url}" alt="Media">`;
  } else if (type === 'video') {
    content = `<video src="${url}" controls autoplay loop></video>`;
  } else if (type === 'youtube') {
    const videoId = extractYoutubeId(url);
    content = videoId ? 
      `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>` :
      `<p>Invalid YouTube URL</p>`;
  }

  overlay.innerHTML = `
    <div class="overlay-content">
      ${content}
      <button class="fullscreen-btn">⛶ Fullscreen</button>
      <button class="overlay-close-btn">×</button>
    </div>
  `;
  
  document.body.appendChild(overlay);
  currentOverlay = overlay;

  // Enhanced close button functionality
  const closeBtn = overlay.querySelector('.overlay-close-btn');
  if (closeBtn) {
    closeBtn.onclick = () => {
      overlay.remove(); 
      currentOverlay = null;
    };
  }
  
  overlay.onclick = e => {
    if (e.target === overlay) { 
      overlay.remove(); 
      currentOverlay = null; 
    }
  };

  const fullscreenBtn = overlay.querySelector('.fullscreen-btn'),
        mediaElem = overlay.querySelector('img, video, iframe');
  if (fullscreenBtn && mediaElem) {
    fullscreenBtn.onclick = () => {
      if (mediaElem.requestFullscreen) {
        mediaElem.requestFullscreen();
      } else if (mediaElem.webkitRequestFullscreen) {
        mediaElem.webkitRequestFullscreen();
      } else if (mediaElem.msRequestFullscreen) {
        mediaElem.msRequestFullscreen();
      }
    };
  }
};

const toggleExpanded = (card, marker, forceState = null) => {
  if (!card || !marker) return;
  
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
    snapOrbToMarker(marker);
    setTimeout(() => document.addEventListener('click', handleClickOutside), 100);
  } else {
    card.classList.remove('expanded');
    marker.classList.remove('active');
    expandedCard = null;
    document.removeEventListener('click', handleClickOutside);
  }
};

const handleClickOutside = e => {
  if (expandedCard && !expandedCard.contains(e.target)) {
    const marker = document.querySelector(`.timeline-marker[data-project-id="${expandedCard.dataset.projectId}"]`);
    if (marker) toggleExpanded(expandedCard, marker, false);
  }
};

// Event Listeners and Button Setup
const setupEventListeners = () => {
  // Button flash effect
  document.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', function() {
      this.classList.add('flash');
      setTimeout(() => this.classList.remove('flash'), 100);
    });
  });

  // View toggle
  if (toggle) {
    toggle.addEventListener('click', () => {
      isGrid = !isGrid;
      if (positionOrb) positionOrb.style.display = isGrid ? 'none' : 'block';
      renderProjects(projectsData);
    });
  }

  // Theme toggle
  if (modeBtn) {
    modeBtn.addEventListener('click', () => {
      document.body.classList.toggle('light');
      document.body.classList.toggle('dark');
    });
  }

  // Contact Button - Shows Splash
  if (contactBtn) {
    contactBtn.addEventListener('click', () => {
      showSplash();
    });
  }

  // Close links dropdown when clicking outside
  document.addEventListener('click', (e) => {
    const linksContainer = e.target.closest('.splash-links');
    if (!linksContainer) {
      const dropdown = document.getElementById('linksDropdown');
      if (dropdown) dropdown.classList.remove('open');
    }
  });
};

// Live time updates
const setupLiveTimeUpdates = () => {
  setInterval(() => {
    const liveTimeElement = document.getElementById('live-time');
    if (liveTimeElement) {
      liveTimeElement.textContent = getCurrentDateTime();
    }
  }, 60000);
};

// Enhanced View Toggle Function
window.toggleView = () => {
  isGrid = !isGrid;
  if (positionOrb) positionOrb.style.display = isGrid ? 'none' : 'block';
  renderProjects(projectsData);
};

// Initialize everything when DOM is ready
const initialize = () => {
  try {
    setupEventListeners();
    setupKeyboardNavigation();
    setupLiveTimeUpdates();
    
    console.log('Portfolio app initialized successfully');
  } catch (error) {
    console.error('Error initializing portfolio:', error);
  }
};

// Start initialization when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initialize);
} else {
  initialize();
}