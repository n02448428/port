console.log('🚀 Script loaded successfully');

// Simple diagnostic version
let projectsData = [];
const content = document.getElementById('content');

// Test if basic elements exist
console.log('Content element:', content);
console.log('Current URL:', window.location.href);

// Simple project loading with detailed logging
async function loadProjects() {
  console.log('🔍 Starting to load projects...');
  
  try {
    console.log('📡 Fetching data/projects.json...');
    const response = await fetch('data/projects.json');
    console.log('📡 Response status:', response.status);
    console.log('📡 Response ok:', response.ok);
    
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
    
    // Show error on page
    if (content) {
      content.innerHTML = `
        <div style="padding: 2rem; color: red; border: 1px solid red; margin: 2rem;">
          <h3>🚨 Debug Info:</h3>
          <p><strong>Error:</strong> ${error.message}</p>
          <p><strong>URL:</strong> ${window.location.href}</p>
          <p><strong>Trying to fetch:</strong> ${window.location.origin}/data/projects.json</p>
          <p>Check browser console for more details.</p>
        </div>
      `;
    }
  }
}

function renderProjects(data) {
  console.log('🎨 Rendering projects...', data);
  
  if (!content) {
    console.error('❌ Content element not found!');
    return;
  }
  
  if (!data || data.length === 0) {
    content.innerHTML = '<div style="padding: 2rem;">❌ No projects found or data is empty</div>';
    return;
  }
  
  // Simple rendering for testing
  let html = '<div style="padding: 2rem;"><h2>🎯 Projects Found:</h2>';
  
  data.forEach((proj, index) => {
    html += `
      <div style="border: 1px solid #ccc; padding: 1rem; margin: 1rem 0;">
        <h3>${proj.title || 'No title'}</h3>
        <p>Type: ${proj.type || 'No type'}</p>
        <p>Date: ${proj.date || 'No date'}</p>
        <p>Status: ${proj.status || 'No status'}</p>
        <p>ID: ${proj.id || 'No ID'}</p>
      </div>
    `;
  });
  
  html += '</div>';
  content.innerHTML = html;
  
  console.log('✅ Projects rendered successfully');
}

// Test the basic functionality
console.log('🧪 Testing basic functionality...');

// Initialize immediately
loadProjects();

// Also try after DOM loads
document.addEventListener('DOMContentLoaded', () => {
  console.log('📄 DOM loaded, trying again...');
  loadProjects();
});

// Test after a delay
setTimeout(() => {
  console.log('⏰ Delayed test...');
  loadProjects();
}, 1000);
