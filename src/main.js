// Main Entry Point & Router
import './styles/main.css';
import { portfolioStore } from './state/portfolioStore.js';
import { firebaseService } from './services/firebase.js';
import { DashboardView } from './components/dashboardView.js';
import { HoldingsView } from './components/holdingsView.js';
import { AddHoldingView } from './components/addHoldingView.js';
import { StockDetailView } from './components/stockDetailView.js';
import { AnalysisView } from './components/analysisView.js';
import { ProfileModal } from './components/profileModal.js';
import { authService } from './services/authService.js';
import { liveMarketService } from './services/liveMarketService.js';

if (typeof window !== 'undefined') {
  window.authService = authService;
  window.portfolioStore = portfolioStore;
}

class App {
  constructor() {
    this.currentView = 'dashboard';
    this.dashboardView = null;
    this.holdingsView = null;
    this.addHoldingView = null;
    this.stockDetailView = null;
    this.analysisView = null;
    this.profileModal = null;

    this.init();
  }

  init() {
    const dashboardContainer = document.getElementById('view-dashboard');
    const holdingsContainer = document.getElementById('view-holdings');
    const addHoldingContainer = document.getElementById('view-add-holding');
    const stockDetailContainer = document.getElementById('view-stock-detail');
    const analysisContainer = document.getElementById('view-analysis');

    // Instantiate Views
    this.dashboardView = new DashboardView(
      dashboardContainer,
      (prefillData) => this.navigateTo('add-holding', prefillData),
      (symbol) => this.navigateTo('stock', { symbol }),
      () => this.navigateTo('holdings')
    );

    if (holdingsContainer) {
      this.holdingsView = new HoldingsView(
        holdingsContainer,
        (prefillData) => this.navigateTo('add-holding', prefillData),
        (symbol) => this.navigateTo('stock', { symbol })
      );
    }

    this.addHoldingView = new AddHoldingView(
      addHoldingContainer,
      () => this.navigateTo('dashboard'),
      (symbol) => this.navigateTo('stock', { symbol }),
      () => this.navigateTo('holdings')
    );
    window.app = this;

    this.stockDetailView = new StockDetailView(
      stockDetailContainer,
      () => this.navigateTo('holdings'),
      (prefillData) => this.navigateTo('add-holding', prefillData)
    );

    if (analysisContainer) {
      this.analysisView = new AnalysisView(
        analysisContainer,
        (symbol) => this.navigateTo('stock', { symbol })
      );
    }

    // User Profile, Login, Data & Settings Modal
    this.profileModal = new ProfileModal('modal-user-profile');
    this.setupUserProfile();

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
    } else if (viewName === 'holdings') {
      window.location.hash = `#/holdings`;
    } else if (viewName === 'add-holding') {
      window.location.hash = `#/add-holding`;
      if (data && this.addHoldingView) {
        this.addHoldingView.setPrefill(data);
      }
    } else if (viewName === 'analysis') {
      window.location.hash = `#/analysis`;
    } else {
      window.location.hash = `#/dashboard`;
    }
  }

  handleHashChange() {
    const hash = window.location.hash.replace('#/', '').trim();
    if (hash.startsWith('stock/')) {
      const symbol = hash.replace('stock/', '').trim();
      this.switchView('stock-detail', symbol);
    } else if (hash === 'holdings') {
      this.switchView('holdings');
    } else if (hash.startsWith('add-holding')) {
      const isBulk = hash.includes('mode=bulk');
      this.switchView('add-holding', isBulk ? { mode: 'bulk' } : null);
    } else if (hash === 'analysis') {
      this.switchView('analysis');
    } else {
      this.switchView('dashboard');
    }
  }

  switchView(viewName, param = null) {
    this.currentView = viewName;

    // View containers
    const dashboardContainer = document.getElementById('view-dashboard');
    const holdingsContainer = document.getElementById('view-holdings');
    const addHoldingContainer = document.getElementById('view-add-holding');
    const stockDetailContainer = document.getElementById('view-stock-detail');
    const analysisContainer = document.getElementById('view-analysis');

    if (dashboardContainer) dashboardContainer.classList.remove('active');
    if (holdingsContainer) holdingsContainer.classList.remove('active');
    if (addHoldingContainer) addHoldingContainer.classList.remove('active');
    if (stockDetailContainer) stockDetailContainer.classList.remove('active');
    if (analysisContainer) analysisContainer.classList.remove('active');

    if (viewName === 'dashboard') {
      if (dashboardContainer) dashboardContainer.classList.add('active');
    } else if (viewName === 'holdings') {
      if (holdingsContainer) {
        holdingsContainer.classList.add('active');
        if (this.holdingsView) {
          this.holdingsView.update();
        }
      }
    } else if (viewName === 'stock-detail') {
      if (stockDetailContainer) {
        stockDetailContainer.classList.add('active');
        if (param && this.stockDetailView) {
          this.stockDetailView.setStock(param);
        }
      }
    } else if (viewName === 'analysis') {
      if (analysisContainer) {
        analysisContainer.classList.add('active');
        if (this.analysisView) {
          this.analysisView.updateAll();
        }
      }
    } else {
      if (addHoldingContainer) {
        addHoldingContainer.classList.add('active');
        if (param && this.addHoldingView) {
          this.addHoldingView.setPrefill(param);
        }
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });

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
      btn.addEventListener('click', (e) => {
        const target = btn.getAttribute('data-view');
        if (target === 'profile') {
          e.preventDefault();
          if (this.profileModal) {
            this.profileModal.open('profile');
          }
          return;
        }
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
      if (this.analysisView && typeof this.analysisView.updateTheme === 'function') {
        this.analysisView.updateTheme();
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
      if (!btnToggle) return;
      const isOpen = liveMarketService.isMarketOpen();
      if (!isOpen) {
        btnToggle.classList.add('inactive');
        btnToggle.setAttribute('title', 'Market is currently closed (Mon–Fri 9:15 AM – 3:30 PM IST). Prices are stable.');
        if (textLabel) textLabel.textContent = 'CLOSED';
        return;
      }
      if (isActive) {
        btnToggle.classList.remove('inactive');
        btnToggle.setAttribute('title', 'Live Market Feed Active');
        if (textLabel) textLabel.textContent = 'LIVE';
      } else {
        btnToggle.classList.add('inactive');
        btnToggle.setAttribute('title', 'Market Feed Paused');
        if (textLabel) textLabel.textContent = 'PAUSED';
      }
    };

    if (btnToggle) {
      updateLiveUI(portfolioStore.isLiveFeedActive);
      btnToggle.addEventListener('click', () => {
        const active = portfolioStore.toggleLiveFeed();
        updateLiveUI(active);
      });
    }

    // Refresh status every minute in case market session opens or closes
    setInterval(() => {
      updateLiveUI(portfolioStore.isLiveFeedActive);
    }, 60000);
  }

  setupTickerSimulation() {
    // Only fluctuate during active market trading hours; NEVER outside market hours / nights / weekends
    setInterval(() => {
      if (!liveMarketService.isMarketOpen()) return;

      const tickerTrack = document.getElementById('global-ticker-track');
      if (!tickerTrack) return;
      const items = tickerTrack.querySelectorAll('.ticker-item');
      if (items.length === 0) return;

      const randomIdx = Math.floor(Math.random() * items.length);
      const target = items[randomIdx];
      const chgEl = target.querySelector('.ticker-chg');
      if (!chgEl) return;

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

  setupUserProfile() {
    const btnProfile = document.getElementById('btn-user-profile');
    const mobBtnProfile = document.getElementById('mob-nav-profile');
    const avatarEl = document.getElementById('header-user-avatar');
    const nameEl = document.getElementById('header-user-name');
    const badgeEl = document.getElementById('header-user-badge');

    const mobProfileLabel = document.getElementById('mob-profile-label');

    const updateHeaderUser = (user) => {
      if (!user) user = authService.getUser();
      const isGuest = !user || user.isGuest;

      if (isGuest) {
        if (nameEl) nameEl.textContent = 'Guest Trader';
        if (badgeEl) {
          badgeEl.textContent = 'Sign In';
          badgeEl.style.background = 'rgba(245, 158, 11, 0.15)';
          badgeEl.style.color = 'var(--accent-amber)';
          badgeEl.style.borderColor = 'rgba(245, 158, 11, 0.35)';
        }
        if (avatarEl) {
          avatarEl.innerHTML = `<span style="font-size: 0.7rem; font-weight: 700;">GUEST</span>`;
        }
        if (mobProfileLabel) {
          mobProfileLabel.textContent = 'Sign In';
        }
      } else {
        if (nameEl) nameEl.textContent = user.displayName || (user.email ? user.email.split('@')[0] : 'Investor');
        if (badgeEl) {
          if (user.isAdmin) {
            badgeEl.textContent = 'Admin';
            badgeEl.style.background = 'rgba(245, 158, 11, 0.2)';
            badgeEl.style.color = 'var(--accent-amber)';
            badgeEl.style.borderColor = 'rgba(245, 158, 11, 0.4)';
          } else {
            badgeEl.textContent = 'Cloud Synced';
            badgeEl.style.background = 'rgba(16, 185, 129, 0.15)';
            badgeEl.style.color = 'var(--bull-green)';
            badgeEl.style.borderColor = 'rgba(16, 185, 129, 0.35)';
          }
        }
        if (avatarEl) {
          if (user.photoURL) {
            avatarEl.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName}" class="user-avatar-mini-img">`;
          } else {
            const parts = (user.displayName || 'IN').trim().split(' ');
            const initials = parts.length >= 2 
              ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
              : (user.displayName || 'IN').slice(0, 2).toUpperCase();
            avatarEl.innerHTML = `<span>${initials}</span>`;
          }
        }
        if (mobProfileLabel) {
          mobProfileLabel.textContent = 'Profile';
        }
      }
    };

    updateHeaderUser();
    authService.subscribe((event) => {
      if (event && event.user) {
        updateHeaderUser(event.user);
      } else {
        updateHeaderUser();
      }
    });

    // Admin Inspection Banner logic
    const adminBanner = document.getElementById('admin-inspect-banner');
    const adminUserName = document.getElementById('admin-inspect-user-name');
    const adminUserEmail = document.getElementById('admin-inspect-user-email');
    const btnExitInspect = document.getElementById('btn-admin-exit-inspect');

    portfolioStore.subscribe((event) => {
      if (event.type === 'ADMIN_INSPECT_USER') {
        if (adminBanner) {
          if (adminUserName) adminUserName.textContent = event.user.name || 'Investor';
          if (adminUserEmail) adminUserEmail.textContent = event.user.email || '';
          adminBanner.style.display = 'block';
        }
      } else if (event.type === 'ADMIN_EXIT_INSPECT' || event.type === 'PORTFOLIO_RESET') {
        if (adminBanner) {
          adminBanner.style.display = 'none';
        }
      }
    });

    if (btnExitInspect) {
      btnExitInspect.addEventListener('click', () => {
        portfolioStore.exitInspectionMode();
      });
    }

    const openProfile = () => {
      if (this.profileModal) {
        this.profileModal.open('profile');
      }
    };

    if (btnProfile) btnProfile.addEventListener('click', openProfile);
    if (mobBtnProfile) {
      mobBtnProfile.addEventListener('click', (e) => {
        e.preventDefault();
        openProfile();
      });
    }
  }
}

// Initialize Application robustly when DOM is ready
const startApp = () => {
  if (!window.apnaShareApp) {
    window.apnaShareApp = new App();
  }
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', startApp);
} else {
  startApp();
}
