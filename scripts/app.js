// Portfolio Timeline App - Refined Version
let isGrid = false, expandedCard = null, projectsData = [], currentOverlay = null, 
    positionOrb = null, filterTypes = [], itemSize = 220;

const content = document.getElementById('content'),
      toggle = document.getElementById('toggleView'),
      modeBtn = document.getElementById('toggleMode');

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

// Data Loading
const loadProjects = async () => {
  try {
    const response = await fetch('data/projects.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    projectsData = await response.json();
    renderProjects(projectsData);
  } catch (error) {
    content.innerHTML = `<div class="error-message">
      <p>Error loading projects: ${error.message}</p>
      <p>Make sure your Google Sheet is set up and the GitHub Action has run successfully.</p>
    </div>`;
  }
};

const getUniqueTypes = () => [...new Set(projectsData.map(p => p.type).filter(Boolean))];

const renderProjects = data => {
  if (!data?.length) {
    content.innerHTML = '<div class="error-message"><p>No projects found. Add data to your Google Sheet and run the GitHub Action!</p></div>';
    return;
  }
  isGrid ? renderGridView(data) : renderTimelineView(data);
};

// Timeline View
const renderTimelineView = data => {
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

  // Dynamically adjust timeline line to start at top of first marker and end at bottom of last marker
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
};

// Grid View
const renderGridView = data => {
  content.className = 'grid-container';
  content.innerHTML = '';
  positionOrb && (positionOrb.style.display = 'none');
  updateViewIndicator('Vault');
  
  const controls = document.createElement('div');
  controls.className = 'grid-controls';
  
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
  
  controls.append(filterContainer, sliderLabel);
  content.appendChild(controls);
  
  // Grid items
  const datedProjects = data.filter(p => p.date && !isNaN(new Date(p.date).getTime()))
                           .sort((a, b) => new Date(b.date) - new Date(a.date)),
        undatedProjects = data.filter(p => !p.date || isNaN(new Date(p.date).getTime()))
                             .sort((a, b) => a.title.localeCompare(b.title)),
        filteredData = [...datedProjects, ...undatedProjects]
                       .filter(p => filterTypes.length === 0 || filterTypes.includes(p.type));
  
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
    content.appendChild(card);
  });
};

// Overlays and Media
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
  
  // Links handling
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
      // Parse names and URLs with comprehensive handling
      let names = [], urls = [];
      
      if (Array.isArray(proj.external_link_names)) {
        names = proj.external_link_names.map(n => String(n || ''));
      } else if (typeof proj.external_link_names === 'string') {
        names = proj.external_link_names.includes('|') ? 
               proj.external_link_names.split('|') : 
               proj.external_link_names.split(',');
        names = names.map(n => n.trim());
      }
      
      if (Array.isArray(proj.external_link_urls)) {
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
        urls = urls.map(u => u.trim());
      }
      
      const maxLength = Math.max(names.length, urls.length);
      for (let i = 0; i < maxLength; i++) {
        links.push({ name: names[i] || urls[i] || 'Link', url: urls[i] || '#' });
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
    if (!['id', 'title', 'type', 'date', 'status', 'description', 'story', 'links', 'media', 'external_link_names', 'external_link_urls', 'isPresentMoment'].includes(key)) {
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
  if (type === 'image') content = `<img src="${url}" alt="Media">`;
  else if (type === 'video') content = `<video src="${url}" controls autoplay loop></video>`;
  else if (type === 'youtube') {
    const videoId = extractYoutubeId(url);
    content = videoId ? 
      `<iframe src="https://www.youtube.com/embed/${videoId}" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>` :
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
  }
};

const handleClickOutside = e => {
  if (expandedCard && !expandedCard.contains(e.target)) {
    const marker = document.querySelector(`.timeline-marker[data-project-id="${expandedCard.dataset.projectId}"]`);
    if (marker) toggleExpanded(expandedCard, marker, false);
  }
};

// Event Listeners
document.querySelectorAll('button').forEach(btn => {
  btn.onclick = () => {
    btn.classList.add('flash');
    setTimeout(() => btn.classList.remove('flash'), 100);
  };
});

toggle?.addEventListener('click', () => {
  isGrid = !isGrid;
  if (positionOrb) positionOrb.style.display = isGrid ? 'none' : 'block';
  renderProjects(projectsData);
});

modeBtn?.addEventListener('click', () => {
  document.body.classList.toggle('light');
  document.body.classList.toggle('dark');
});

// Update live time
setInterval(() => {
  const liveTimeElement = document.getElementById('live-time');
  if (liveTimeElement) liveTimeElement.textContent = getCurrentDateTime();
}, 60000);

// Initialize
loadProjects();