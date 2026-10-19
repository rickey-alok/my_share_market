// Main Entry Point & Router
import './styles/main.css';
import { portfolioStore } from './state/portfolioStore.js';
import { firebaseService } from './services/firebase.js';
import { DashboardView } from './components/dashboardView.js';
import { AddHoldingView } from './components/addHoldingView.js';
import { StockDetailView } from './components/stockDetailView.js';

class App {
  constructor() {
    this.currentView = 'dashboard';
    this.dashboardView = null;
    this.addHoldingView = null;
    this.stockDetailView = null;

    this.init();
  }

  init() {
    const dashboardContainer = document.getElementById('view-dashboard');
    const addHoldingContainer = document.getElementById('view-add-holding');
    const stockDetailContainer = document.getElementById('view-stock-detail');

    // Instantiate Views
    this.dashboardView = new DashboardView(
      dashboardContainer,
      (prefillData) => this.navigateTo('add-holding', prefillData),
      (symbol) => this.navigateTo('stock', { symbol })
    );

    this.addHoldingView = new AddHoldingView(
      addHoldingContainer,
      () => this.navigateTo('dashboard')
    );

    this.stockDetailView = new StockDetailView(
      stockDetailContainer,
      () => this.navigateTo('dashboard'),
      (prefillData) => this.navigateTo('add-holding', prefillData)
    );

    this.setupNavigation();
    this.setupThemeSelector();
    this.setupLiveFeedControl();
    this.setupTickerSimulation();
    this.setupCloudSyncModal();

    // Handle browser hash navigation
    window.addEventListener('hashchange', () => this.handleHashChange());
    this.handleHashChange();
  }

  navigateTo(viewName, data = null) {
    if (viewName === 'stock' && data && data.symbol) {
      window.location.hash = `#/stock/${data.symbol}`;
    } else if (viewName === 'add-holding') {
      window.location.hash = `#/add-holding`;
      if (data && this.addHoldingView) {
        this.addHoldingView.setPrefill(data);
      }
    } else {
      window.location.hash = `#/dashboard`;
    }
  }

  handleHashChange() {
    const hash = window.location.hash.replace('#/', '').trim();
    if (hash.startsWith('stock/')) {
      const symbol = hash.replace('stock/', '').trim();
      this.switchView('stock-detail', symbol);
    } else if (hash === 'add-holding') {
      this.switchView('add-holding');
    } else {
      this.switchView('dashboard');
    }
  }

  switchView(viewName, param = null) {
    this.currentView = viewName;

    // View containers
    const dashboardContainer = document.getElementById('view-dashboard');
    const addHoldingContainer = document.getElementById('view-add-holding');
    const stockDetailContainer = document.getElementById('view-stock-detail');

    if (viewName === 'dashboard') {
      dashboardContainer.classList.add('active');
      addHoldingContainer.classList.remove('active');
      if (stockDetailContainer) stockDetailContainer.classList.remove('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else if (viewName === 'stock-detail') {
      dashboardContainer.classList.remove('active');
      addHoldingContainer.classList.remove('active');
      if (stockDetailContainer) {
        stockDetailContainer.classList.add('active');
        if (param && this.stockDetailView) {
          this.stockDetailView.setStock(param);
        }
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      dashboardContainer.classList.remove('active');
      if (stockDetailContainer) stockDetailContainer.classList.remove('active');
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

  setupCloudSyncModal() {
    const btnSync = document.getElementById('btn-cloud-sync');
    const labelSync = document.getElementById('cloud-sync-label');
    const modal = document.getElementById('modal-cloud-setup');
    const btnClose = document.getElementById('btn-close-modal');
    const btnCancel = document.getElementById('btn-cancel-modal');
    const form = document.getElementById('form-firebase-config');
    const inputApiKey = document.getElementById('cfg-api-key');
    const inputAppId = document.getElementById('cfg-app-id');
    const inputRawJson = document.getElementById('cfg-raw-json');

    const updateSyncStatusUI = () => {
      const isConnected = firebaseService.isConfigured && portfolioStore.isCloudSyncing;
      if (isConnected) {
        btnSync.classList.add('connected');
        labelSync.textContent = 'Cloud Active';
        btnSync.setAttribute('title', 'Firestore Cloud Connected & Syncing');
      } else {
        btnSync.classList.remove('connected');
        labelSync.textContent = 'Cloud Sync';
        btnSync.setAttribute('title', 'Connect Firestore Database');
      }
    };

    updateSyncStatusUI();

    // Listen to portfolioStore sync notifications
    portfolioStore.subscribe((event) => {
      if (event.type === 'FIREBASE_CONNECTED' || event.type === 'CLOUD_SYNC_UPDATED') {
        updateSyncStatusUI();
      }
    });

    const openModal = () => {
      // Prefill if config already exists
      if (firebaseService.config) {
        if (firebaseService.config.apiKey) inputApiKey.value = firebaseService.config.apiKey;
        if (firebaseService.config.appId) inputAppId.value = firebaseService.config.appId;
      }
      modal.style.display = 'flex';
      // Trigger transition next frame
      requestAnimationFrame(() => {
        modal.classList.add('open');
      });
    };

    const closeModal = () => {
      modal.classList.remove('open');
      setTimeout(() => {
        modal.style.display = 'none';
      }, 250);
    };

    if (btnSync) btnSync.addEventListener('click', openModal);
    if (btnClose) btnClose.addEventListener('click', closeModal);
    if (btnCancel) btnCancel.addEventListener('click', closeModal);

    // Close on backdrop click
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) closeModal();
      });
    }

    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();

        let config = {};
        const rawText = (inputRawJson ? inputRawJson.value : '').trim();

        if (rawText) {
          try {
            // Check if valid JSON directly
            if (rawText.startsWith('{') && rawText.endsWith('}')) {
              config = JSON.parse(rawText);
            } else {
              // Extract using regex for JS object format
              const extract = (key) => {
                const match = rawText.match(new RegExp(`${key}\\s*:\\s*["']([^"']+)["']`));
                return match ? match[1] : '';
              };
              config = {
                apiKey: extract('apiKey'),
                authDomain: extract('authDomain') || 'apna-share-calculator.firebaseapp.com',
                projectId: extract('projectId') || 'apna-share-calculator',
                storageBucket: extract('storageBucket') || 'apna-share-calculator.firebasestorage.app',
                messagingSenderId: extract('messagingSenderId') || '700356064450',
                appId: extract('appId')
              };
            }
          } catch (err) {
            console.warn('Could not parse raw snippet, falling back to form fields', err);
          }
        }

        // Fallback / complement from input fields
        if (!config.apiKey && inputApiKey.value) {
          config.apiKey = inputApiKey.value.trim();
        }
        if (!config.appId && inputAppId.value) {
          config.appId = inputAppId.value.trim();
        }
        if (!config.projectId) config.projectId = 'apna-share-calculator';
        if (!config.messagingSenderId) config.messagingSenderId = '700356064450';
        if (!config.authDomain) config.authDomain = `${config.projectId}.firebaseapp.com`;
        if (!config.storageBucket) config.storageBucket = `${config.projectId}.firebasestorage.app`;

        if (!config.apiKey || !config.appId) {
          alert('Please enter at least the API Key and App ID from your Firebase Console.');
          return;
        }

        const success = portfolioStore.connectFirebase(config);
        if (success) {
          updateSyncStatusUI();
          closeModal();
          alert('🎉 Firestore connected successfully! Your holdings and transactions are now syncing to the cloud.');
        } else {
          alert('Failed to connect to Firebase. Please verify your API Key and Project ID.');
        }
      });
    }
  }
}

// Initialize Application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.apnaShareApp = new App();
});
