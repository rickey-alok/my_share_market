// User Profile, Authentication, Portfolio Data & Settings Modal
import { authService } from '../services/authService.js';
import { portfolioStore } from '../state/portfolioStore.js';
import { firebaseService } from '../services/firebase.js';
import { liveMarketService } from '../services/liveMarketService.js';
import { icons } from '../utils/icons.js';

export class ProfileModal {
  constructor(modalContainerId = 'modal-user-profile') {
    this.containerId = modalContainerId;
    this.container = null;
    this.activeTab = 'profile'; // 'profile', 'data', 'settings'
    this.authMode = 'login';    // 'login', 'signup'
    this.isEditingName = false;

    this.init();
  }

  init() {
    let el = document.getElementById(this.containerId);
    if (!el) {
      el = document.createElement('div');
      el.id = this.containerId;
      el.className = 'modal-backdrop';
      el.style.display = 'none';
      document.body.appendChild(el);
    }
    this.container = el;

    // Subscribe to auth changes
    authService.subscribe(() => {
      if (this.isOpen()) {
        this.render();
      }
    });

    // Subscribe to portfolio changes for live data snapshot
    portfolioStore.subscribe(() => {
      if (this.isOpen() && this.activeTab === 'data') {
        this.render();
      }
    });

    // Close on backdrop click or ESC
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.close();
      }
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  isOpen() {
    return this.container && this.container.style.display !== 'none';
  }

  open(initialTab = 'profile') {
    this.activeTab = initialTab;
    this.isEditingName = false;
    this.render();
    this.container.style.display = 'flex';
    requestAnimationFrame(() => {
      this.container.classList.add('open');
    });
    document.body.style.overflow = 'hidden'; // prevent background scroll
  }

  close() {
    this.container.classList.remove('open');
    setTimeout(() => {
      this.container.style.display = 'none';
      document.body.style.overflow = '';
    }, 200);
  }

  getInitials(name) {
    if (!name) return 'IN';
    const parts = name.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  }

  render() {
    const user = authService.getUser();
    const prefs = authService.getPreferences();
    const metrics = portfolioStore.getPortfolioMetrics();
    const initials = this.getInitials(user.displayName);

    this.container.innerHTML = `
      <div class="modal-card profile-modal-card" role="dialog" aria-modal="true" aria-label="User Profile and Settings">
        <!-- Modal Top Bar -->
        <div class="modal-header">
          <div class="profile-header-title-box">
            <div class="profile-avatar-pill">
              ${!user.isGuest && user.photoURL ? `<img src="${user.photoURL}" alt="${user.displayName}" class="user-avatar-img">` : (!user.isGuest ? `<span>${initials}</span>` : `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`)}
            </div>
            <div>
              <h3 class="modal-title" style="margin: 0; line-height: 1.2;">${user.isGuest ? 'Investor Account' : user.displayName}</h3>
              <span class="user-tier-tag">${user.isGuest ? 'Sign in with Google' : 'Google Cloud Verified'}</span>
            </div>
          </div>
          <button type="button" class="modal-close-btn" id="btn-close-profile-modal" title="Close Modal">&times;</button>
        </div>

        <!-- Navigation Tabs: Profile / My Data / Settings -->
        <div class="profile-tabs-bar">
          <button type="button" class="profile-tab-btn ${this.activeTab === 'profile' ? 'active' : ''}" data-tab="profile">
            ${icons.user}
            <span>${user.isGuest ? 'Sign In' : 'Account & Logout'}</span>
          </button>
          <button type="button" class="profile-tab-btn ${this.activeTab === 'data' ? 'active' : ''}" data-tab="data">
            ${icons.barChart2}
            <span>His Data (${metrics.totalHoldingsCount} Stocks)</span>
          </button>
          <button type="button" class="profile-tab-btn ${this.activeTab === 'settings' ? 'active' : ''}" data-tab="settings">
            ${icons.settings}
            <span>Settings</span>
          </button>
        </div>

        <!-- Modal Body Content -->
        <div class="profile-modal-body">
          ${this.renderActiveTabContent(user, prefs, metrics, initials)}
        </div>
      </div>
    `;

    this.attachEvents();
  }

  renderActiveTabContent(user, prefs, metrics, initials) {
    if (this.activeTab === 'data') {
      return this.renderDataTab(metrics);
    } else if (this.activeTab === 'settings') {
      return this.renderSettingsTab(user, prefs);
    }
    return this.renderProfileTab(user, initials);
  }

  // 1. Profile & Login Tab (Google Sign-In as only option & Logout for registered user)
  renderProfileTab(user, initials) {
    if (user.isGuest) {
      // Guest / Not Logged In State: ONLY ONE option -> Continue with Google
      return `
        <!-- Guest Overview Card -->
        <div class="user-profile-overview-card" style="margin-bottom: 1.25rem;">
          <div class="user-overview-avatar-large" style="background: rgba(255, 255, 255, 0.08); color: var(--text-secondary); box-shadow: none;">
            <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
          </div>
          <div class="user-overview-details">
            <h4 class="user-overview-name">Guest Investor</h4>
            <div class="user-overview-email">Sign in with Google to sync your portfolio</div>
            <div class="user-meta-chips">
              <span class="profile-chip badge-member">Local Session</span>
              <span class="profile-chip badge-role" style="background: rgba(245, 158, 11, 0.15); color: var(--accent-amber); border-color: rgba(245, 158, 11, 0.3);">
                Not Signed In
              </span>
            </div>
          </div>
        </div>

        <!-- Google-Only Authentication Section -->
        <div class="auth-section-card" style="text-align: center; padding: 2rem 1.5rem;">
          <div class="auth-section-heading" style="margin-bottom: 1.5rem;">
            <h5 style="font-size: 1.2rem; font-weight: 800; color: var(--text-primary); margin-bottom: 0.4rem;">
              Sign In to Apna Share
            </h5>
            <p style="font-size: 0.88rem; color: var(--text-secondary); max-width: 420px; margin: 0 auto; line-height: 1.5;">
              Sign in with your Google account to automatically synchronize your holdings, transactions, and live stock analytics across all your devices.
            </p>
          </div>

          <div id="auth-error-alert" class="alert-error-chip" style="display: none; margin-bottom: 1.25rem; text-align: left;"></div>

          <!-- The ONLY sign in button: Continue with Google -->
          <div style="display: flex; justify-content: center;">
            <button type="button" class="btn-google-signin" id="btn-login-google" style="max-width: 320px; width: 100%; padding: 0.85rem 1.5rem; font-size: 0.95rem; cursor: pointer;">
              <svg width="20" height="20" viewBox="0 0 24 24" class="google-svg-icon">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
              </svg>
              <span style="font-weight: 700;">Continue with Google</span>
            </button>
          </div>
        </div>
      `;
    }

    // Registered User State (Logged in with Google): Shows Profile and prominent Log Out button
    return `
      <!-- User Overview Banner for Registered Google User -->
      <div class="user-profile-overview-card" style="margin-bottom: 1.25rem;">
        <div class="user-overview-avatar-large">
          ${user.photoURL ? `<img src="${user.photoURL}" alt="${user.displayName}">` : `<span>${initials}</span>`}
          <span class="online-indicator-dot" title="Account Active"></span>
        </div>
        <div class="user-overview-details">
          <div class="user-overview-name-row">
            <h4 class="user-overview-name">${user.displayName}</h4>
          </div>
          <div class="user-overview-email">${user.email}</div>
          <div class="user-meta-chips">
            <span class="profile-chip badge-role">${user.isAdmin ? `${icons.shield} Master Administrator` : `${icons.shield} Google Investor`}</span>
            <span class="profile-chip badge-provider">${user.isAdmin ? 'Admin Superuser' : 'Google Verified'}</span>
            <span class="profile-chip badge-member">Member since ${user.joinedDate}</span>
          </div>
        </div>
      </div>

      <!-- Account Management & Logout Section -->
      <div class="auth-section-card">
        <div class="logged-in-state-box">
          <div class="auth-status-pill success">
            <span class="status-dot"></span>
            <span>Signed In as <strong>${user.email}</strong> ${user.isAdmin ? '<span style="color: var(--accent-amber); font-weight: 800; margin-left: 4px;">(Admin)</span>' : ''}</span>
          </div>
          <p class="auth-desc-subtle" style="margin-top: 0.65rem; color: var(--text-secondary); font-size: 0.85rem; line-height: 1.5;">
            ${user.isAdmin 
              ? 'You have master administrative access across the platform. You can inspect any user\'s portfolio or manage your own data.' 
              : 'Your portfolio holdings, buy/sell transactions, and customized settings are securely isolated and linked only to your Google account.'}
          </p>
          <div style="display: flex; gap: 0.75rem; margin-top: 1.5rem; flex-wrap: wrap;">
            <!-- Force Cloud Sync Button -->
            <button type="button" class="btn btn-primary btn-sm" id="btn-force-cloud-sync" style="display: inline-flex; align-items: center; gap: 0.55rem; padding: 0.65rem 1.25rem; font-weight: 700; font-size: 0.9rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></svg>
              <span>Sync All to Cloud Now</span>
            </button>
            <!-- Prominent Log Out Button for Registered User -->
            <button type="button" class="btn btn-outline btn-sm btn-danger-soft" id="btn-auth-logout" style="display: inline-flex; align-items: center; gap: 0.55rem; padding: 0.65rem 1.5rem; font-weight: 700; font-size: 0.9rem;">
              ${icons.logOut}
              <span>Log Out</span>
            </button>
          </div>
        </div>
      </div>

      ${authService.isAdmin() ? `
        <!-- Administrator Tools: Inspect Platform Users -->
        <div class="auth-section-card" style="margin-top: 1.25rem; border-color: rgba(99, 102, 241, 0.4); background: linear-gradient(145deg, rgba(99, 102, 241, 0.08), rgba(21, 28, 46, 0.85));">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.5rem;">
            <div>
              <div style="display: inline-flex; align-items: center; gap: 0.45rem; font-weight: 800; font-size: 0.95rem; color: var(--brand-indigo-light);">
                ${icons.shield}
                <span>Administrator Console: Investor Access</span>
              </div>
              <p style="margin: 0.2rem 0 0 0; font-size: 0.8rem; color: var(--text-secondary);">
                As administrator, you can inspect any registered investor's portfolio and transaction records.
              </p>
            </div>
            <button type="button" class="btn-chip-demo" id="btn-admin-fetch-users" style="padding: 0.45rem 0.9rem; font-size: 0.8rem; font-weight: 700; cursor: pointer;">
              <span>Refresh Users</span>
            </button>
          </div>

          <div id="admin-users-list-container" style="margin-top: 0.75rem;">
            <div style="padding: 0.85rem; text-align: center; color: var(--text-muted); font-size: 0.82rem; background: rgba(0,0,0,0.25); border-radius: var(--radius-md);">
              Click "Refresh Users" to view all registered investors from Firestore.
            </div>
          </div>
        </div>
      ` : ''}
    `;
  }

  // 2. His Data Tab (Portfolio snapshot, statistics, export & restore)
  renderDataTab(metrics) {
    const isProfit = metrics.totalPnL >= 0;

    return `
      <div class="portfolio-data-tab-content">
        <!-- Live Financial Summary Metrics -->
        <div class="data-snapshot-grid">
          <div class="data-stat-card">
            <span class="stat-label">Total Invested Capital</span>
            <span class="stat-val mono">${portfolioStore.formatMoney(metrics.totalInvested)}</span>
            <span class="stat-sub">${metrics.totalSharesCount.toLocaleString()} total shares</span>
          </div>

          <div class="data-stat-card">
            <span class="stat-label">Current Portfolio Value</span>
            <span class="stat-val mono" style="color: var(--brand-indigo-light);">${portfolioStore.formatMoney(metrics.totalCurrentValue)}</span>
            <span class="stat-sub">${metrics.totalHoldingsCount} stocks held</span>
          </div>

          <div class="data-stat-card ${isProfit ? 'bull' : 'bear'}">
            <span class="stat-label">Overall Unrealized P&L</span>
            <span class="stat-val mono" style="color: ${isProfit ? 'var(--bull-green)' : 'var(--bear-red)'};">
              ${isProfit ? '+' : ''}${portfolioStore.formatMoney(metrics.totalPnL)}
            </span>
            <span class="stat-sub ${isProfit ? 'bull-text' : 'bear-text'}">
              ${isProfit ? '+' : ''}${metrics.totalPnLPercent.toFixed(2)}% total return
            </span>
          </div>

          <div class="data-stat-card">
            <span class="stat-label">Realized Profit (From Sells)</span>
            <span class="stat-val mono" style="color: ${metrics.totalRealizedPnL >= 0 ? 'var(--bull-green)' : 'var(--bear-red)'};">
              ${metrics.totalRealizedPnL >= 0 ? '+' : ''}${portfolioStore.formatMoney(metrics.totalRealizedPnL)}
            </span>
            <span class="stat-sub">Booked profit</span>
          </div>
        </div>

        <!-- User's Holdings Quick Table -->
        <div class="data-holdings-box">
          <div class="data-holdings-header">
            <span class="data-holdings-title">Active Holdings Snapshot</span>
            <span class="data-holdings-count">${metrics.holdings.length} Positions</span>
          </div>

          ${metrics.holdings.length === 0 ? `
            <div class="empty-data-hint">No holdings found. Add stocks from the Add Holdings page.</div>
          ` : `
            <div class="profile-holdings-list">
              ${metrics.holdings.map(h => {
                const pnl = h.current - h.invested;
                const pnlPct = h.invested > 0 ? (pnl / h.invested) * 100 : 0;
                const isBull = pnl >= 0;
                return `
                  <div class="profile-holding-row">
                    <div class="row-left">
                      <span class="row-symbol">${h.symbol}</span>
                      <span class="row-name">${h.name}</span>
                    </div>
                    <div class="row-mid">
                      <span class="mono">${h.quantity} shares</span>
                      <span class="mono text-muted">@ ₹${h.avgPrice}</span>
                    </div>
                    <div class="row-right">
                      <span class="mono row-val">${portfolioStore.formatMoney(h.current)}</span>
                      <span class="row-pnl ${isBull ? 'bull' : 'bear'} mono">
                        ${isBull ? '+' : ''}${pnlPct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          `}
        </div>

        <!-- Data Management & Backup Tools -->
        <div class="data-tools-panel">
          <h5 class="tools-panel-title">Data Backup & Migration</h5>
          <p class="tools-panel-desc">Download a backup file of your entire portfolio or restore previous transactions.</p>

          <div class="tools-actions-row">
            <button type="button" class="btn btn-outline btn-sm" id="btn-export-json">
              ${icons.download}
              <span>Export Portfolio (JSON)</span>
            </button>

            <label class="btn btn-outline btn-sm" style="cursor: pointer; margin-bottom: 0;">
              ${icons.upload}
              <span>Import Portfolio (JSON)</span>
              <input type="file" id="input-import-json" accept=".json" style="display: none;" />
            </label>

            <button type="button" class="btn btn-outline btn-sm btn-danger-soft" id="btn-reset-demo-stocks">
              ${icons.refreshCw}
              <span>Reset to Default Demo Stocks</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  // 3. Settings Tab (Preferences, Currency, Exchange, Sound)
  renderSettingsTab(user, prefs) {
    return `
      <div class="settings-tab-content">
        <form id="form-user-settings">
          <!-- Currency Display Format -->
          <div class="settings-group-card">
            <div class="settings-row">
              <div>
                <label class="settings-title">Currency & Number Formatting</label>
                <div class="settings-sub">Choose between Indian Lakhs/Crores vs standard digits</div>
              </div>
              <div class="settings-control">
                <select id="pref-currency-format" class="form-control form-control-sm">
                  <option value="inr_lakhs" ${prefs.currencyFormat === 'inr_lakhs' ? 'selected' : ''}>Indian (₹ Lakhs & Crores)</option>
                  <option value="inr_full" ${prefs.currencyFormat === 'inr_full' ? 'selected' : ''}>Full Digits (₹ 1,00,000.00)</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Default Exchange -->
          <div class="settings-group-card">
            <div class="settings-row">
              <div>
                <label class="settings-title">Primary Market Exchange</label>
                <div class="settings-sub">Default exchange selected when calculating or adding stocks</div>
              </div>
              <div class="settings-control">
                <div class="radio-pill-group">
                  <label class="radio-pill ${prefs.defaultExchange === 'NSE' ? 'active' : ''}">
                    <input type="radio" name="default_exchange" value="NSE" ${prefs.defaultExchange === 'NSE' ? 'checked' : ''} />
                    <span>NSE (National)</span>
                  </label>
                  <label class="radio-pill ${prefs.defaultExchange === 'BSE' ? 'active' : ''}">
                    <input type="radio" name="default_exchange" value="BSE" ${prefs.defaultExchange === 'BSE' ? 'checked' : ''} />
                    <span>BSE (Bombay)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <!-- Market Simulation Speed -->
          <div class="settings-group-card">
            <div class="settings-row">
              <div>
                <label class="settings-title">Live Ticker Simulation Interval</label>
                <div class="settings-sub">Controls background price fluctuation frequency</div>
              </div>
              <div class="settings-control">
                <select id="pref-refresh-speed" class="form-control form-control-sm">
                  <option value="2800" ${prefs.priceUpdateSpeed === '2800' ? 'selected' : ''}>Fast (Every 2.8s)</option>
                  <option value="6000" ${prefs.priceUpdateSpeed === '6000' ? 'selected' : ''}>Standard (Every 6s)</option>
                  <option value="manual" ${prefs.priceUpdateSpeed === 'manual' ? 'selected' : ''}>Manual Refresh Only</option>
                </select>
              </div>
            </div>
          </div>

          <!-- Sound Effects -->
          <div class="settings-group-card">
            <div class="settings-row">
              <div>
                <label class="settings-title">Trade Audio FX & Haptics</label>
                <div class="settings-sub">Subtle audio cue when executing buy, sell, or averaging trades</div>
              </div>
              <div class="settings-control">
                <label class="switch-toggle">
                  <input type="checkbox" id="pref-sound-effects" ${prefs.soundEffects ? 'checked' : ''} />
                  <span class="toggle-slider"></span>
                </label>
              </div>
            </div>
          </div>

          <!-- Investor Risk Profile -->
          <div class="settings-group-card">
            <div class="settings-row">
              <div>
                <label class="settings-title">Investor Strategy Profile</label>
                <div class="settings-sub">Customizes risk warnings and return benchmark displays</div>
              </div>
              <div class="settings-control">
                <select id="pref-risk-profile" class="form-control form-control-sm">
                  <option value="Conservative Dividend" ${prefs.riskProfile === 'Conservative Dividend' ? 'selected' : ''}>Conservative (Dividends & Bluechips)</option>
                  <option value="Balanced Wealth Creation" ${prefs.riskProfile === 'Balanced Wealth Creation' ? 'selected' : ''}>Balanced (Growth + Safety)</option>
                  <option value="Aggressive Momentum" ${prefs.riskProfile === 'Aggressive Momentum' ? 'selected' : ''}>Aggressive (Midcap & High Alpha)</option>
                </select>
              </div>
            </div>
          <!-- Live Market Data Proxy (Cloudflare Worker) -->
          <div class="settings-group-card">
            <div class="settings-row" style="flex-direction: column; align-items: flex-start; gap: 0.65rem;">
              <div style="width: 100%;">
                <div style="display: flex; align-items: center; justify-content: space-between;">
                  <label class="settings-title">Live Market Proxy URL (Cloudflare Worker)</label>
                  <span style="font-size: 0.72rem; color: var(--accent-gold); font-weight: 700;">Zero Cost / Free</span>
                </div>
                <div class="settings-sub">
                  Connects to Yahoo Finance via a free Cloudflare Worker for unlimited real-time NSE/BSE stock quotes without CORS limits.
                </div>
              </div>
              <div style="width: 100%; display: flex; gap: 0.5rem; align-items: center;">
                <input 
                  type="url" 
                  id="input-market-proxy-url" 
                  class="form-control form-control-sm" 
                  placeholder="https://my-proxy.workers.dev" 
                  value="${liveMarketService.getCustomProxy()}"
                  style="font-family: var(--font-mono); font-size: 0.8rem; flex: 1;"
                >
                <button type="button" id="btn-test-market-proxy" class="btn btn-outline btn-sm" style="padding: 0.35rem 0.65rem; font-size: 0.78rem; white-space: nowrap;">
                  Test URL
                </button>
              </div>
              <div id="proxy-test-status" style="font-size: 0.75rem; display: none;"></div>
              <div style="font-size: 0.72rem; color: var(--text-muted); line-height: 1.4;">
                💡 Leave empty to use default automatic fallback (local Vite dev proxy + calibrated Indian market database).
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; margin-top: 1.5rem;">
            <button type="submit" class="btn btn-primary btn-sm">Save Preferences</button>
          </div>
        </form>
      </div>
    `;
  }

  attachEvents() {
    // Close button
    const btnClose = this.container.querySelector('#btn-close-profile-modal');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.close());
    }

    // Tabs
    const tabBtns = this.container.querySelectorAll('.profile-tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeTab = btn.getAttribute('data-tab');
        this.render();
      });
    });

    // Edit Name
    const btnTriggerEdit = this.container.querySelector('#btn-trigger-edit-name');
    if (btnTriggerEdit) {
      btnTriggerEdit.addEventListener('click', () => {
        this.isEditingName = true;
        this.render();
      });
    }

    const btnSaveName = this.container.querySelector('#btn-save-name');
    if (btnSaveName) {
      btnSaveName.addEventListener('click', () => {
        const input = this.container.querySelector('#input-edit-display-name');
        if (input && input.value.trim()) {
          authService.updateProfileDetails({ displayName: input.value.trim() });
          this.isEditingName = false;
          this.render();
        }
      });
    }

    const btnCancelName = this.container.querySelector('#btn-cancel-name');
    if (btnCancelName) {
      btnCancelName.addEventListener('click', () => {
        this.isEditingName = false;
        this.render();
      });
    }

    // Google Sign-In (The Only Sign-In Option)
    const btnGoogle = this.container.querySelector('#btn-login-google');
    if (btnGoogle) {
      btnGoogle.addEventListener('click', async () => {
        const errorAlert = this.container.querySelector('#auth-error-alert');
        btnGoogle.disabled = true;
        btnGoogle.innerHTML = `<span>Signing in with Google...</span>`;
        try {
          await authService.loginWithGoogle();
          this.render();
        } catch (err) {
          if (errorAlert) {
            errorAlert.textContent = err.message || 'Google sign-in could not be completed.';
            errorAlert.style.display = 'block';
          }
          btnGoogle.disabled = false;
          btnGoogle.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" class="google-svg-icon">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span style="font-weight: 700;">Continue with Google</span>
          `;
        }
      });
    }

    // Logout for Registered User
    const btnLogout = this.container.querySelector('#btn-auth-logout');
    if (btnLogout) {
      btnLogout.addEventListener('click', async () => {
        await authService.logout();
        this.render();
      });
    }

    // Force Cloud Sync Button
    const btnForceCloudSync = this.container.querySelector('#btn-force-cloud-sync');
    if (btnForceCloudSync) {
      btnForceCloudSync.addEventListener('click', async () => {
        try {
          btnForceCloudSync.disabled = true;
          btnForceCloudSync.textContent = 'Syncing...';
          await portfolioStore.syncHoldingsToCloud();
          const user = authService.getUser();
          alert(`✅ Successfully synced ${portfolioStore.holdings.length} stocks to your cloud account! Any device (phone or laptop) signed into ${user.email} will now display the exact same shares.`);
        } catch (err) {
          alert('Sync error: ' + err.message);
        } finally {
          btnForceCloudSync.disabled = false;
          btnForceCloudSync.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"></path></svg> <span>Sync All to Cloud Now</span>`;
        }
      });
    }

    // Admin: Fetch and inspect users
    const btnFetchUsers = this.container.querySelector('#btn-admin-fetch-users');
    const usersListContainer = this.container.querySelector('#admin-users-list-container');
    if (btnFetchUsers && usersListContainer) {
      const loadUsers = async () => {
        btnFetchUsers.disabled = true;
        btnFetchUsers.innerHTML = '<span>Loading...</span>';
        usersListContainer.innerHTML = '<div style="padding: 0.85rem; text-align: center; color: var(--text-muted); font-size: 0.82rem;">Fetching registered investors from Firestore...</div>';

        try {
          const users = await firebaseService.getAllUsers();

          if (!users || users.length === 0) {
            usersListContainer.innerHTML = '<div style="padding: 0.85rem; text-align: center; color: var(--text-muted); font-size: 0.82rem;">No other investors registered in Firestore yet. As users sign in with Google, they will appear here.</div>';
          } else {
            usersListContainer.innerHTML = `
              <div style="display: flex; flex-direction: column; gap: 0.5rem; max-height: 220px; overflow-y: auto;">
                ${users.map(u => `
                  <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.6rem 0.85rem; background: rgba(0,0,0,0.3); border-radius: var(--radius-md); border: 1px solid var(--border-subtle); gap: 0.5rem;">
                    <div style="min-width: 0; flex: 1;">
                      <div style="font-weight: 700; font-size: 0.85rem; color: var(--text-primary); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                        ${u.displayName || 'Investor'} ${u.role === 'Admin' ? '<span style="font-size: 0.65rem; background: rgba(99,102,241,0.25); color: var(--brand-indigo-light); padding: 2px 6px; border-radius: 4px; margin-left: 4px; font-weight: 800;">Admin</span>' : ''}
                      </div>
                      <div style="font-size: 0.75rem; color: var(--text-muted); text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">
                        ${u.email || u.uid}
                      </div>
                    </div>
                    <button type="button" class="btn-inspect-user" data-uid="${u.uid}" data-name="${u.displayName || 'Investor'}" data-email="${u.email || ''}" style="padding: 0.35rem 0.75rem; font-size: 0.78rem; font-weight: 700; background: rgba(99,102,241,0.18); border: 1px solid rgba(99,102,241,0.35); color: var(--brand-indigo-light); border-radius: 6px; cursor: pointer; white-space: nowrap;">
                      Inspect
                    </button>
                  </div>
                `).join('')}
              </div>
            `;

            usersListContainer.querySelectorAll('.btn-inspect-user').forEach(b => {
              b.addEventListener('click', async () => {
                const uid = b.getAttribute('data-uid');
                const name = b.getAttribute('data-name');
                const email = b.getAttribute('data-email');
                b.disabled = true;
                b.textContent = 'Opening...';
                await portfolioStore.inspectUserPortfolio(uid, name, email);
                this.close();
              });
            });
          }
        } catch (err) {
          usersListContainer.innerHTML = `<div style="padding: 0.85rem; color: var(--bear-red); font-size: 0.82rem;">Could not load investors: ${err.message}</div>`;
        } finally {
          btnFetchUsers.disabled = false;
          btnFetchUsers.innerHTML = '<span>Refresh Users</span>';
        }
      };

      btnFetchUsers.addEventListener('click', loadUsers);
    }

    // Export JSON
    const btnExport = this.container.querySelector('#btn-export-json');
    if (btnExport) {
      btnExport.addEventListener('click', () => {
        const data = portfolioStore.exportData();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `apna_share_portfolio_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    // Import JSON
    const inputImport = this.container.querySelector('#input-import-json');
    if (inputImport) {
      inputImport.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const parsed = JSON.parse(event.target.result);
            portfolioStore.importData(parsed);
            alert(`✅ Portfolio successfully restored! Loaded ${parsed.holdings?.length || 0} holdings.`);
            this.render();
          } catch (err) {
            alert('❌ Failed to import portfolio. Please check file format.');
          }
        };
        reader.readAsText(file);
      });
    }

    // Reset Demo Stocks
    const btnResetStocks = this.container.querySelector('#btn-reset-demo-stocks');
    if (btnResetStocks) {
      btnResetStocks.addEventListener('click', () => {
        if (confirm('Are you sure you want to restore the default initial stock portfolio? Any custom modifications will be reset.')) {
          portfolioStore.resetToDemo();
          this.render();
        }
      });
    }

    // Settings Form
    const settingsForm = this.container.querySelector('#form-user-settings');
    if (settingsForm) {
      // Radio pills toggle style
      const radioPills = settingsForm.querySelectorAll('.radio-pill input');
      radioPills.forEach(radio => {
        radio.addEventListener('change', () => {
          settingsForm.querySelectorAll('.radio-pill').forEach(p => p.classList.remove('active'));
          radio.closest('.radio-pill').classList.add('active');
        });
      });

      settingsForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const currencyFormat = this.container.querySelector('#pref-currency-format').value;
        const defaultExchange = settingsForm.querySelector('input[name="default_exchange"]:checked').value;
        const priceUpdateSpeed = this.container.querySelector('#pref-refresh-speed').value;
        const soundEffects = this.container.querySelector('#pref-sound-effects').checked;
        const riskProfile = this.container.querySelector('#pref-risk-profile').value;

        authService.savePreferences({
          currencyFormat,
          defaultExchange,
          priceUpdateSpeed,
          soundEffects,
          riskProfile
        });

        const inputProxy = this.container.querySelector('#input-market-proxy-url');
        if (inputProxy) {
          liveMarketService.setCustomProxy(inputProxy.value.trim());
        }

        alert('✅ Settings saved successfully!');
        this.render();
      });
    }

    // Market proxy test & save
    const btnTestProxy = this.container.querySelector('#btn-test-market-proxy');
    const inputProxy = this.container.querySelector('#input-market-proxy-url');
    const proxyStatus = this.container.querySelector('#proxy-test-status');

    if (btnTestProxy && inputProxy) {
      btnTestProxy.addEventListener('click', async () => {
        const val = inputProxy.value.trim();
        if (!val) {
          if (proxyStatus) {
            proxyStatus.style.display = 'block';
            proxyStatus.style.color = 'var(--text-muted)';
            proxyStatus.textContent = 'Cleared proxy. System will use default dev proxy and local catalog.';
          }
          liveMarketService.setCustomProxy('');
          return;
        }

        btnTestProxy.disabled = true;
        btnTestProxy.textContent = 'Testing...';
        if (proxyStatus) {
          proxyStatus.style.display = 'block';
          proxyStatus.style.color = 'var(--text-muted)';
          proxyStatus.textContent = 'Contacting worker endpoint...';
        }

        try {
          const res = await liveMarketService.testConnection(val);
          liveMarketService.setCustomProxy(val);
          if (proxyStatus) {
            proxyStatus.style.color = 'var(--bull-green)';
            proxyStatus.textContent = '✅ ' + res.message;
          }
        } catch (err) {
          if (proxyStatus) {
            proxyStatus.style.color = 'var(--bear-red)';
            proxyStatus.textContent = '❌ ' + err.message;
          }
        } finally {
          btnTestProxy.disabled = false;
          btnTestProxy.textContent = 'Test URL';
        }
      });
    }
  }
}
