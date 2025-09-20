// Portfolio Animations Controller - Phase 3 Enhanced
class PortfolioAnimations {
  constructor() {
    this.enabled = true;
    this.intersectionObserver = null;
    this.init();
  }

  init() {
    this.setupScrollObserver();
    this.setupSplashAnimations();
    this.enhanceViewTransitions();
    console.log('Phase 3 animations initialized');
  }

  // 1. Enhanced View Transitions
  enhanceViewTransitions() {
    const originalToggle = window.toggleView;
    window.toggleView = () => {
      this.animateViewChange();
      if (originalToggle) originalToggle();
    };
  }

  animateViewChange() {
    const content = document.getElementById('content');
    if (!content || !this.enabled) return;

    content.style.opacity = '0.7';
    content.style.transform = 'translateY(10px)';
    
    setTimeout(() => {
      content.style.opacity = '1';
      content.style.transform = 'translateY(0)';
    }, 150);
  }

  // 2. Timeline Cascade - Opt-in
  triggerTimelineCascade() {
    if (!this.enabled) return;
    
    const items = document.querySelectorAll('.timeline-item');
    items.forEach((item, index) => {
      setTimeout(() => {
        item.classList.add('cascade-in');
      }, index * 50);
    });
  }

  // 3. Enhanced Orb Movement
  enhanceOrbMovement(orb, marker) {
    if (!this.enabled || !orb) return;
    
    orb.classList.add('moving');
    setTimeout(() => {
      orb.classList.remove('moving');
    }, 600);
  }

  // 4. Loading States
  showSkeletonLoader() {
    if (!this.enabled) return;
    
    const content = document.getElementById('content');
    if (!content) return;

    content.innerHTML = `
      <div class="timeline-skeleton">
        ${Array.from({length: 5}, (_, i) => `
          <div class="timeline-item">
            <div class="project-card loading-skeleton" style="height: 60px; margin-bottom: 2rem;">
              <div style="height: 20px; background: rgba(255,255,255,0.1); margin-bottom: 10px; border-radius: 2px;"></div>
              <div style="height: 15px; background: rgba(255,255,255,0.05); width: 70%; border-radius: 2px;"></div>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  // 5. Scroll-Triggered Animations
  setupScrollObserver() {
    if (!this.enabled || !window.IntersectionObserver) return;

    this.intersectionObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          this.intersectionObserver.unobserve(entry.target);
        }
      });
    }, {
      threshold: 0.2,
      rootMargin: '0px 0px -100px 0px'
    });
  }

  observeTimelineItems() {
    if (!this.intersectionObserver) return;
    
    document.querySelectorAll('.timeline-item').forEach(item => {
      this.intersectionObserver.observe(item);
    });
  }

  // 6. Present Moment Enhancement
  enhancePresentMoment() {
    const presentCard = document.querySelector('.project-card.present-moment');
    if (presentCard && this.enabled) {
      // Breathing effect is now handled by CSS
      // Add subtle glow on hover
      presentCard.addEventListener('mouseenter', () => {
        presentCard.style.boxShadow = '0 0 30px rgba(128,128,128,0.4)';
      });
      presentCard.addEventListener('mouseleave', () => {
        presentCard.style.boxShadow = '';
      });
    }
  }

  // Enhanced Splash Animations
  setupSplashAnimations() {
    const splash = document.getElementById('splashOverlay');
    if (!splash) return;

    splash.addEventListener('click', (e) => {
      if (e.target === splash) this.closeSplash();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !splash.classList.contains('hidden')) {
        this.closeSplash();
      }
    });
  }

  closeSplash() {
    const splash = document.getElementById('splashOverlay');
    if (!splash) return;

    splash.style.animation = 'overlayIn 0.3s ease-out reverse';
    setTimeout(() => {
      splash.classList.add('hidden');
      splash.style.animation = '';
      if (typeof window.enterPortfolio === 'function') {
        window.enterPortfolio();
      }
    }, 300);
  }

  // Enhanced Marker Activation
  activateMarker(marker) {
    if (!this.enabled || !marker) return;
    
    marker.classList.add('active');
    // Trigger pulse animation
    marker.style.animation = 'markerPulse 0.6s cubic-bezier(0.22, 1, 0.36, 1)';
    setTimeout(() => {
      marker.style.animation = '';
    }, 600);
  }

  // Enhanced Card Expansion
  expandCard(card) {
    if (!this.enabled || !card) return;
    
    card.style.animation = 'cardExpand 0.5s cubic-bezier(0.22, 1, 0.36, 1)';
    setTimeout(() => {
      card.style.animation = '';
    }, 500);
  }

  // Trigger all Phase 3 effects for timeline
  enhanceTimeline() {
    if (!this.enabled) return;
    
    setTimeout(() => {
      this.observeTimelineItems();
      this.enhancePresentMoment();
      // Optionally trigger cascade on load
      // this.triggerTimelineCascade();
    }, 100);
  }

  // Trigger all Phase 3 effects for grid
  enhanceGrid() {
    if (!this.enabled) return;
    
    const gridCards = document.querySelectorAll('.grid-card');
    gridCards.forEach((card, index) => {
      setTimeout(() => {
        card.classList.add('in-view');
      }, index * 30);
    });
  }

  // Public Methods
  toggle(enabled = !this.enabled) {
    this.enabled = enabled;
    document.body.classList.toggle('animations-disabled', !enabled);
    console.log(`Phase 3 animations ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Method to trigger cascade manually
  cascadeTimeline() {
    this.triggerTimelineCascade();
  }

  // Method to show loading
  showLoading() {
    this.showSkeletonLoader();
  }

  // Performance monitoring
  checkPerformance() {
    if (window.performance && window.performance.memory) {
      const memory = window.performance.memory.usedJSHeapSize / 1048576;
      if (memory > 100) { // Over 100MB
        console.warn('High memory usage, consider disabling complex animations');
        return false;
      }
    }
    return true;
  }
}

// Global initialization
let portfolioAnimations;

function initializeAnimations() {
  portfolioAnimations = new PortfolioAnimations();
  window.portfolioAnimations = portfolioAnimations;
  
  // Hook into existing app functions
  const originalRenderTimeline = window.renderTimelineView;
  if (originalRenderTimeline) {
    window.renderTimelineView = function(...args) {
      const result = originalRenderTimeline.apply(this, args);
      portfolioAnimations.enhanceTimeline();
      return result;
    };
  }

  const originalRenderGrid = window.renderGridView;
  if (originalRenderGrid) {
    window.renderGridView = function(...args) {
      const result = originalRenderGrid.apply(this, args);
      portfolioAnimations.enhanceGrid();
      return result;
    };
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey) {
      switch(e.key) {
        case 'A': portfolioAnimations.toggle(); break;
        case 'C': portfolioAnimations.cascadeTimeline(); break;
        case 'L': portfolioAnimations.showLoading(); break;
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAnimations);
} else {
  initializeAnimations();
}