// Main Entry Point & Router
import './styles/main.css';
import { portfolioStore } from './state/portfolioStore.js';
import { DashboardView } from './components/dashboardView.js';
import { AddHoldingView } from './components/addHoldingView.js';

class App {
  constructor() {
    this.currentView = 'dashboard';
    this.dashboardView = null;
    this.addHoldingView = null;

    this.init();
  }

  init() {
    const dashboardContainer = document.getElementById('view-dashboard');
    const addHoldingContainer = document.getElementById('view-add-holding');

    // Instantiate Views
    this.dashboardView = new DashboardView(
      dashboardContainer,
      (prefillData) => this.navigateTo('add-holding', prefillData)
    );

    this.addHoldingView = new AddHoldingView(
      addHoldingContainer,
      () => this.navigateTo('dashboard')
    );

    this.setupNavigation();
    this.setupThemeSelector();
    this.setupLiveFeedControl();
    this.setupTickerSimulation();

    // Handle browser hash navigation
    window.addEventListener('hashchange', () => this.handleHashChange());
    this.handleHashChange();
  }

  navigateTo(viewName, prefillData = null) {
    window.location.hash = `#/${viewName}`;
    if (viewName === 'add-holding' && prefillData && this.addHoldingView) {
      this.addHoldingView.setPrefill(prefillData);
    }
  }

  handleHashChange() {
    const hash = window.location.hash.replace('#/', '').trim();
    if (hash === 'add-holding') {
      this.switchView('add-holding');
    } else {
      this.switchView('dashboard');
    }
  }

  switchView(viewName) {
    this.currentView = viewName;

    // View containers
    const dashboardContainer = document.getElementById('view-dashboard');
    const addHoldingContainer = document.getElementById('view-add-holding');

    if (viewName === 'dashboard') {
      dashboardContainer.classList.add('active');
      addHoldingContainer.classList.remove('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      dashboardContainer.classList.remove('active');
      addHoldingContainer.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Update Desktop Nav Tabs
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      const target = btn.getAttribute('data-view');
      if (target === viewName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Update Mobile Nav
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      const target = btn.getAttribute('data-view');
      if (target === viewName) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  setupNavigation() {
    // Desktop Nav Buttons
    document.querySelectorAll('.nav-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-view');
        this.navigateTo(target);
      });
    });

    // Mobile Bottom Nav Buttons
    document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-view');
        this.navigateTo(target);
      });
    });

    // Brand Link
    const brandLink = document.getElementById('brand-link');
    if (brandLink) {
      brandLink.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigateTo('dashboard');
      });
    }
  }

  setupThemeSelector() {
    const btnDark = document.getElementById('theme-btn-dark');
    const btnLight = document.getElementById('theme-btn-light');

    const applyTheme = (theme) => {
      document.documentElement.setAttribute('data-theme', theme);
      try {
        localStorage.setItem('apna_share_theme', theme);
      } catch (e) {}

      if (theme === 'light') {
        if (btnLight) btnLight.classList.add('active');
        if (btnDark) btnDark.classList.remove('active');
      } else {
        if (btnDark) btnDark.classList.add('active');
        if (btnLight) btnLight.classList.remove('active');
      }

      if (this.dashboardView && typeof this.dashboardView.updateTheme === 'function') {
        this.dashboardView.updateTheme();
      }
    };

    const currentTheme = localStorage.getItem('apna_share_theme') || 'dark';
    applyTheme(currentTheme);

    if (btnDark) {
      btnDark.addEventListener('click', () => applyTheme('dark'));
    }
    if (btnLight) {
      btnLight.addEventListener('click', () => applyTheme('light'));
    }
  }

  setupLiveFeedControl() {
    const btnToggle = document.getElementById('btn-toggle-live');
    const textLabel = document.getElementById('live-feed-text');

    const updateLiveUI = (isActive) => {
      if (isActive) {
        btnToggle.classList.remove('inactive');
        textLabel.textContent = 'LIVE';
      } else {
        btnToggle.classList.add('inactive');
        textLabel.textContent = 'PAUSED';
      }
    };

    updateLiveUI(portfolioStore.isLiveFeedActive);

    if (btnToggle) {
      btnToggle.addEventListener('click', () => {
        const active = portfolioStore.toggleLiveFeed();
        updateLiveUI(active);
      });
    }
  }

  setupTickerSimulation() {
    // Subtle ticker fluctuation for market atmosphere
    setInterval(() => {
      const tickerTrack = document.getElementById('global-ticker-track');
      if (!tickerTrack) return;
      const items = tickerTrack.querySelectorAll('.ticker-item');
      if (items.length === 0) return;

      const randomIdx = Math.floor(Math.random() * items.length);
      const target = items[randomIdx];
      const chgEl = target.querySelector('.ticker-chg');
      if (!chgEl) return;

      // Small random delta
      const isUp = Math.random() > 0.45;
      const delta = (Math.random() * 0.15).toFixed(2);
      if (isUp) {
        chgEl.className = 'ticker-chg pos';
        chgEl.textContent = `▲ +${delta}%`;
      } else {
        chgEl.className = 'ticker-chg neg';
        chgEl.textContent = `▼ -${delta}%`;
      }
    }, 4500);
  }
}

// Initialize Application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.apnaShareApp = new App();
});
