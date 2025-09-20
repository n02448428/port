// Portfolio Animations Controller
class PortfolioAnimations {
  constructor() {
    this.enabled = true;
    this.setupAnimationObserver();
    this.setupSplashAnimations();
    this.init();
  }

  // Initialize all animations
  init() {
    console.log('Portfolio animations initialized');
    this.observeTimelineItems();
    this.observeGridItems();
  }

  // Toggle animations on/off
  toggle(enabled = !this.enabled) {
    this.enabled = enabled;
    document.body.classList.toggle('animations-disabled', !enabled);
    console.log(`Animations ${enabled ? 'enabled' : 'disabled'}`);
  }

  // Setup Intersection Observer for timeline items
  observeTimelineItems() {
    if (!this.enabled) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateX(0)';
          }, index * 50); // Stagger effect
        }
      });
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    // Re-observe when timeline renders
    this.observeTimeline = () => {
      document.querySelectorAll('.timeline-item').forEach(item => {
        observer.observe(item);
      });
    };
  }

  // Setup observer for grid items
  observeGridItems() {
    if (!this.enabled) return;

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry, index) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'scale(1) translateY(0)';
          }, index * 100); // Stagger effect
        }
      });
    }, {
      threshold: 0.1
    });

    // Re-observe when grid renders
    this.observeGrid = () => {
      document.querySelectorAll('.grid-card').forEach(item => {
        observer.observe(item);
      });
    };
  }

  // Setup splash screen animations
  setupSplashAnimations() {
    const splash = document.getElementById('splashOverlay');
    if (!splash) return;

    // Enhanced splash close on outside click
    splash.addEventListener('click', (e) => {
      if (e.target === splash) {
        this.closeSplash();
      }
    });

    // ESC key to close splash
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !splash.classList.contains('hidden')) {
        this.closeSplash();
      }
    });
  }

  // Animated splash close
  closeSplash() {
    const splash = document.getElementById('splashOverlay');
    if (!splash) return;

    // Add exit animation
    splash.style.animation = 'overlayFadeOut 0.3s ease-out forwards';
    
    setTimeout(() => {
      splash.classList.add('hidden');
      splash.style.animation = '';
      
      // Trigger portfolio load if needed
      if (typeof window.enterPortfolio === 'function') {
        window.enterPortfolio();
      }
    }, 300);
  }

  // Animated view transitions
  animateViewChange(newView) {
    if (!this.enabled) return;

    const content = document.getElementById('content');
    if (!content) return;

    // Fade out current view
    content.style.opacity = '0';
    content.style.transform = 'translateY(10px)';

    setTimeout(() => {
      // Fade in new view
      content.style.opacity = '1';
      content.style.transform = 'translateY(0)';
      
      // Re-observe items for animations
      if (newView === 'timeline') {
        setTimeout(() => this.observeTimeline?.(), 100);
      } else if (newView === 'grid') {
        setTimeout(() => this.observeGrid?.(), 100);
      }
    }, 250);
  }

  // Animate search results
  animateSearchResults() {
    if (!this.enabled) return;

    const cards = document.querySelectorAll('.grid-card');
    cards.forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'scale(0.9) translateY(20px)';
      
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'scale(1) translateY(0)';
      }, index * 50);
    });
  }

  // Animate orb movement
  animateOrbToMarker(orb, marker) {
    if (!this.enabled || !orb || !marker) return;

    // Add smooth trail effect
    orb.style.transition = 'all 0.4s cubic-bezier(0.22, 1, 0.36, 1)';
    
    // Add pulse effect when moving
    orb.style.animation = 'orbPulse 0.6s ease-out';
    
    setTimeout(() => {
      orb.style.animation = 'orbPulse 2s ease-in-out infinite';
    }, 600);
  }

  // Animate card expansion
  animateCardExpansion(card, isExpanding) {
    if (!this.enabled || !card) return;

    if (isExpanding) {
      // Add expansion animation
      card.style.animation = 'cardExpand 0.5s cubic-bezier(0.22, 1, 0.36, 1) forwards';
    } else {
      // Add collapse animation
      card.style.animation = 'cardCollapse 0.3s ease-out forwards';
    }
  }

  // Animate overlay entrance
  animateOverlayEntrance(overlay) {
    if (!this.enabled || !overlay) return;

    overlay.style.animation = 'overlayFadeIn 0.3s ease-out forwards';
    
    const modal = overlay.querySelector('.overlay-card, .overlay-content');
    if (modal) {
      modal.style.animation = 'modalSlideIn 0.4s cubic-bezier(0.22, 1, 0.36, 1) forwards';
    }
  }

  // Setup animation performance observer
  setupAnimationObserver() {
    if (!window.PerformanceObserver) return;

    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach(entry => {
        if (entry.duration > 16.67) { // Longer than 1 frame at 60fps
          console.warn(`Slow animation detected: ${entry.name} took ${entry.duration.toFixed(2)}ms`);
        }
      });
    });

    try {
      observer.observe({ entryTypes: ['measure'] });
    } catch (e) {
      // Ignore if not supported
    }
  }

  // Debug mode - shows animation boundaries
  enableDebugMode() {
    const style = document.createElement('style');
    style.textContent = `
      .timeline-item, .grid-card, .project-card {
        outline: 1px dashed rgba(255, 0, 0, 0.3) !important;
      }
      .timeline-position-orb {
        outline: 2px solid rgba(0, 255, 0, 0.8) !important;
      }
    `;
    document.head.appendChild(style);
    console.log('Animation debug mode enabled');
  }

  // Performance mode - reduces animations
  enablePerformanceMode() {
    this.enabled = false;
    document.body.classList.add('performance-mode');
    
    const style = document.createElement('style');
    style.textContent = `
      .performance-mode * {
        animation-duration: 0.1s !important;
        transition-duration: 0.1s !important;
      }
    `;
    document.head.appendChild(style);
    console.log('Performance mode enabled - animations reduced');
  }
}

// Initialize animations when DOM is ready
let portfolioAnimations;

function initializeAnimations() {
  portfolioAnimations = new PortfolioAnimations();
  
  // Make it globally accessible for debugging
  window.portfolioAnimations = portfolioAnimations;
  
  // Keyboard shortcut to toggle animations (Ctrl+Shift+A)
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.shiftKey && e.key === 'A') {
      portfolioAnimations.toggle();
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeAnimations);
} else {
  initializeAnimations();
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PortfolioAnimations;
}