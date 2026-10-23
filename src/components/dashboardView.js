// Dashboard View Component (Executive Wealth & Performance Overview)
import { portfolioStore } from '../state/portfolioStore.js';
import { liveMarketService } from '../services/liveMarketService.js';
import { authService } from '../services/authService.js';
import { icons } from '../utils/icons.js';
import Chart from 'chart.js/auto';

export class DashboardView {
  constructor(containerElement, onNavigateToAddHolding, onNavigateToStockDetail, onNavigateToHoldings) {
    this.container = containerElement;
    this.onNavigateToAddHolding = onNavigateToAddHolding;
    this.onNavigateToStockDetail = onNavigateToStockDetail;
    this.onNavigateToHoldings = onNavigateToHoldings;
    this.chartInstance = null;

    this.init();
  }

  init() {
    this.renderSkeleton();
    this.attachEventListeners();
    this.update();

    // Subscribe to store updates
    this.unsubscribe = portfolioStore.subscribe((event) => {
      this.update(event);
    });

    // Subscribe to auth updates to toggle guest banner
    authService.subscribe(() => {
      this.updateGuestBanner();
    });
  }

  renderSkeleton() {
    this.container.innerHTML = `
      <!-- Page Header -->
      <div class="page-title-row">
        <div>
          <h1 class="page-title">Portfolio Dashboard</h1>
          <p class="page-subtitle">Executive wealth overview, asset allocation, and market performance</p>
        </div>
        <div class="page-header-actions">
          <button id="btn-auto-refresh-toggle" class="btn btn-outline btn-sm ${liveMarketService.isAutoRefreshActive ? 'active-pulse' : ''}" title="Toggle 30s Auto Refresh during market hours" style="gap: 6px;">
            <span class="live-dot ${liveMarketService.isAutoRefreshActive ? 'pulse-green' : 'dim'}" style="font-size: 0.75rem;">●</span>
            <span id="auto-refresh-label">Auto-Sync: ${liveMarketService.isAutoRefreshActive ? 'ON' : 'OFF'}</span>
          </button>
          <button id="btn-refresh-quotes" class="btn btn-outline btn-sm" title="Refresh Live Quotes">
            ${icons.refreshCw}
            <span id="sync-market-label">Sync Market</span>
          </button>
          <button id="btn-nav-to-holdings" class="btn btn-outline btn-sm" title="View Holdings Page">
            ${icons.layers}
            <span>All Holdings</span>
          </button>
          <button id="btn-quick-add" class="btn btn-primary btn-sm">
            ${icons.plus}
            <span>Add Stock</span>
          </button>
        </div>
      </div>

      <!-- Cloud Sync Notice Banner for Guest / Offline Mode -->
      <div id="guest-mode-banner" class="guest-mode-banner" style="display: none;">
        <div class="guest-banner-content">
          <div class="guest-banner-text">
            <strong>Viewing Offline / Demo Shares:</strong> Sign in with Google to synchronize your actual portfolio across your mobile phone and laptop.
          </div>
          <button type="button" class="btn btn-primary btn-sm" id="btn-banner-login-google" style="font-size: 0.82rem; padding: 0.45rem 0.95rem; white-space: nowrap;">
            Sign In with Google
          </button>
        </div>
      </div>

      <!-- KPI Grid -->
      <div class="kpi-grid" id="kpi-grid-container">
        <!-- Dynamically injected -->
      </div>

      <!-- Analytics Breakdown (Chart & Sectors) -->
      <div class="analytics-section">
        <div class="analytics-card">
          <div class="card-title-row">
            <h2 class="card-title">${icons.pieChart} Sector Allocation</h2>
            <span class="brand-badge" id="analytics-holdings-count">0 Assets</span>
          </div>
          <div class="chart-wrapper">
            <canvas id="allocation-chart"></canvas>
          </div>
        </div>

        <div class="analytics-card">
          <div class="card-title-row">
            <h2 class="card-title">${icons.layers} Sector Exposure</h2>
          </div>
          <div class="sector-list" id="sector-list-container">
            <!-- Dynamically injected -->
          </div>
        </div>
      </div>

      <!-- Portfolio Highlights & Holdings Overview Grid -->
      <div class="dashboard-highlights-grid" id="dashboard-highlights-container">
        <!-- Dynamically injected -->
      </div>
    `;
  }

  attachEventListeners() {
    // Banner Login Button
    const btnBannerLogin = this.container.querySelector('#btn-banner-login-google');
    if (btnBannerLogin) {
      btnBannerLogin.addEventListener('click', async () => {
        try {
          btnBannerLogin.disabled = true;
          btnBannerLogin.textContent = 'Connecting...';
          await authService.loginWithGoogle();
        } catch (err) {
          alert(err.message);
        } finally {
          btnBannerLogin.disabled = false;
          btnBannerLogin.textContent = 'Sign In with Google';
        }
      });
    }

    // Quick Add Button
    const btnQuickAdd = this.container.querySelector('#btn-quick-add');
    if (btnQuickAdd) {
      btnQuickAdd.addEventListener('click', () => {
        if (this.onNavigateToAddHolding) this.onNavigateToAddHolding();
      });
    }

    // Nav to Holdings Page Button
    const btnNavHoldings = this.container.querySelector('#btn-nav-to-holdings');
    if (btnNavHoldings) {
      btnNavHoldings.addEventListener('click', () => {
        if (this.onNavigateToHoldings) this.onNavigateToHoldings();
      });
    }

    // Auto-Refresh Toggle Button
    const btnAutoRefresh = this.container.querySelector('#btn-auto-refresh-toggle');
    if (btnAutoRefresh) {
      btnAutoRefresh.addEventListener('click', () => {
        const isActive = liveMarketService.toggleAutoRefresh();
        const label = btnAutoRefresh.querySelector('#auto-refresh-label');
        const dot = btnAutoRefresh.querySelector('.live-dot');
        if (isActive) {
          btnAutoRefresh.classList.add('active-pulse');
          if (label) label.textContent = 'Auto-Sync: ON';
          if (dot) { dot.classList.add('pulse-green'); dot.classList.remove('dim'); }
          portfolioStore.refreshMarketQuotes();
        } else {
          btnAutoRefresh.classList.remove('active-pulse');
          if (label) label.textContent = 'Auto-Sync: OFF';
          if (dot) { dot.classList.remove('pulse-green'); dot.classList.add('dim'); }
        }
      });
    }

    // Refresh Quotes Button
    const btnRefresh = this.container.querySelector('#btn-refresh-quotes');
    const syncLabel = this.container.querySelector('#sync-market-label');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        btnRefresh.classList.add('rotating');
        if (syncLabel) syncLabel.textContent = 'Syncing...';
        const syncResult = await portfolioStore.refreshMarketQuotes(false);
        btnRefresh.classList.remove('rotating');
        const syncTime = liveMarketService.getLastSyncFormatted() || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        if (syncLabel) syncLabel.textContent = `Synced (${syncTime})`;

        // Visual toast feedback
        const count = syncResult?.totalCount || portfolioStore.holdings?.length || 0;
        const meta = syncResult?.meta;
        const isClosed = meta?.marketState === 'CLOSED' || !liveMarketService.isMarketOpen();
        const msg = isClosed
          ? `Synced ${count} stocks with today's closing market data (LTP • NSE/BSE)`
          : `Live Market Synced: Updated ${count} stocks with real-time quotes (${syncTime})`;
        this.showToast(msg, 'success');

        setTimeout(() => {
          if (syncLabel && syncLabel.textContent.startsWith('Synced')) {
            syncLabel.textContent = 'Sync Market';
          }
        }, 4000);
      });
    }

    // Delegate Clicks inside Highlights Container
    const highlightsContainer = this.container.querySelector('#dashboard-highlights-container');
    if (highlightsContainer) {
      highlightsContainer.addEventListener('click', (e) => {
        // View all holdings button
        if (e.target.closest('#btn-dashboard-view-all-holdings') || e.target.closest('#btn-dashboard-header-view-holdings')) {
          if (this.onNavigateToHoldings) this.onNavigateToHoldings();
          return;
        }

        // Add first stock button
        if (e.target.closest('#btn-dashboard-add-first')) {
          if (this.onNavigateToAddHolding) this.onNavigateToAddHolding();
          return;
        }

        // Click on a stock item row to view stock details
        const stockRow = e.target.closest('[data-symbol]');
        if (stockRow && !e.target.closest('button')) {
          const sym = stockRow.getAttribute('data-symbol');
          if (sym && this.onNavigateToStockDetail) {
            this.onNavigateToStockDetail(sym);
          }
        }
      });
    }

    // Chart responsiveness
    this.handleResize = () => {
      if (this.chartInstance) {
        const isMobileNow = window.innerWidth <= 768;
        let needsUpdate = false;
        if (isMobileNow && this.chartInstance.options.plugins.legend.position !== 'bottom') {
          this.chartInstance.options.plugins.legend.position = 'bottom';
          this.chartInstance.options.plugins.legend.labels.padding = 10;
          needsUpdate = true;
        } else if (!isMobileNow && this.chartInstance.options.plugins.legend.position !== 'right') {
          this.chartInstance.options.plugins.legend.position = 'right';
          this.chartInstance.options.plugins.legend.labels.padding = 14;
          needsUpdate = true;
        }
        this.chartInstance.resize();
        if (needsUpdate) {
          this.chartInstance.update();
        }
      }
    };
    window.addEventListener('resize', this.handleResize);
  }

  update(event = {}) {
    this.updateGuestBanner();
    const metrics = portfolioStore.getPortfolioMetrics();
    this.renderKPIs(metrics);
    this.renderChart(metrics);
    this.renderSectorList(metrics);
    this.renderHighlights(metrics, event);
  }

  updateGuestBanner() {
    const banner = this.container.querySelector('#guest-mode-banner');
    if (!banner) return;
    const user = authService.getUser();
    banner.style.display = (user && user.isGuest) ? 'block' : 'none';
  }

  renderKPIs(metrics) {
    const kpiContainer = this.container.querySelector('#kpi-grid-container');
    if (!kpiContainer) return;

    const isTotalProfit = metrics.totalPnL >= 0;
    const isDayProfit = metrics.totalDayPnL >= 0;

    kpiContainer.innerHTML = `
      <!-- Total Portfolio Value -->
      <div class="kpi-card accent-portfolio">
        <div class="kpi-header">
          <span class="kpi-title">Current Portfolio Value</span>
          <div class="kpi-icon-pill" style="color: var(--brand-indigo-light);">${icons.sparkles}</div>
        </div>
        <div class="kpi-value">${portfolioStore.formatMoney(metrics.totalCurrentValue)}</div>
        <div class="kpi-footer">
          <span class="return-badge ${isTotalProfit ? 'bull' : 'bear'}">
            ${isTotalProfit ? icons.arrowUpRight : icons.arrowDownRight}
            ${isTotalProfit ? '+' : ''}${metrics.totalPnLPercent.toFixed(2)}%
          </span>
          <span class="kpi-subtext">all-time net return</span>
        </div>
      </div>

      <!-- Total Invested Amount -->
      <div class="kpi-card accent-invested">
        <div class="kpi-header">
          <span class="kpi-title">Total Invested</span>
          <div class="kpi-icon-pill" style="color: #60a5fa;">${icons.wallet}</div>
        </div>
        <div class="kpi-value">${portfolioStore.formatMoney(metrics.totalInvested)}</div>
        <div class="kpi-footer">
          <span class="kpi-subtext" style="font-family: var(--font-mono); font-weight: 600;">
            ${metrics.totalHoldingsCount} Assets (${metrics.totalSharesCount.toLocaleString()} Shares)
          </span>
        </div>
      </div>

      <!-- Total All-Time Profit/Loss -->
      <div class="kpi-card accent-pnl">
        <div class="kpi-header">
          <span class="kpi-title">Total Profit / Loss</span>
          <div class="kpi-icon-pill" style="color: ${isTotalProfit ? 'var(--bull-green)' : 'var(--bear-red)'};">
            ${isTotalProfit ? icons.trendingUp : icons.trendingDown}
          </div>
        </div>
        <div class="kpi-value ${isTotalProfit ? 'bull' : 'bear'}">
          ${isTotalProfit ? '+' : ''}${portfolioStore.formatMoney(metrics.totalPnL)}
        </div>
        <div class="kpi-footer">
          <span class="return-badge ${isTotalProfit ? 'bull' : 'bear'}">
            ${isTotalProfit ? '+' : ''}${metrics.totalPnLPercent.toFixed(2)}%
          </span>
          <span class="kpi-subtext">absolute P&L</span>
        </div>
      </div>

      <!-- Today's Gain/Loss -->
      <div class="kpi-card accent-day">
        <div class="kpi-header">
          <span class="kpi-title">Today's P&L</span>
          <div class="kpi-icon-pill" style="color: ${isDayProfit ? 'var(--bull-green)' : 'var(--bear-red)'};">
            ${isDayProfit ? icons.arrowUpRight : icons.arrowDownRight}
          </div>
        </div>
        <div class="kpi-value ${isDayProfit ? 'bull' : 'bear'}">
          ${isDayProfit ? '+' : ''}${portfolioStore.formatMoney(metrics.totalDayPnL)}
        </div>
        <div class="kpi-footer">
          <span class="return-badge ${isDayProfit ? 'bull' : 'bear'}">
            ${isDayProfit ? '+' : ''}${metrics.totalDayPnLPercent.toFixed(2)}%
          </span>
          <span class="kpi-subtext">session movement</span>
        </div>
      </div>

      <!-- Realized P&L / Returns -->
      <div class="kpi-card accent-performance">
        <div class="kpi-header">
          <span class="kpi-title">Realized Profits</span>
          <div class="kpi-icon-pill" style="color: #a855f7;">${icons.pieChart}</div>
        </div>
        <div class="kpi-value ${metrics.totalRealizedPnL >= 0 ? 'bull' : 'bear'}">
          ${metrics.totalRealizedPnL >= 0 ? '+' : ''}${portfolioStore.formatMoney(metrics.totalRealizedPnL)}
        </div>
        <div class="kpi-footer">
          <span class="kpi-subtext">booked exit profits</span>
        </div>
      </div>
    `;
  }

  renderChart(metrics) {
    const canvas = this.container.querySelector('#allocation-chart');
    const countBadge = this.container.querySelector('#analytics-holdings-count');
    if (!canvas) return;

    if (countBadge) {
      countBadge.textContent = `${metrics.totalHoldingsCount} Assets`;
    }

    const labels = metrics.sectorBreakdown.map(s => s.sector);
    const data = metrics.sectorBreakdown.map(s => s.value);

    if (data.length === 0) {
      if (this.chartInstance) {
        this.chartInstance.destroy();
        this.chartInstance = null;
      }
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    const palette = [
      '#6366f1', '#06b6d4', '#10b981', '#f59e0b',
      '#ef4444', '#ec4899', '#8b5cf6', '#14b8a6',
      '#f97316', '#3b82f6', '#84cc16', '#a855f7'
    ];

    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    const legendColor = isDark ? '#94a3b8' : '#475569';
    const borderColor = isDark ? '#151c2e' : '#ffffff';
    const tooltipBg = isDark ? '#1c253d' : '#ffffff';
    const tooltipTitle = isDark ? '#ffffff' : '#0f172a';
    const tooltipBody = isDark ? '#cbd5e1' : '#334155';
    const tooltipBorder = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const isMobile = window.innerWidth <= 768;

    if (this.chartInstance) {
      this.chartInstance.data.labels = labels;
      this.chartInstance.data.datasets[0].data = data;
      this.chartInstance.data.datasets[0].backgroundColor = palette.slice(0, labels.length);
      this.chartInstance.data.datasets[0].borderColor = borderColor;
      this.chartInstance.options.plugins.legend.labels.color = legendColor;
      this.chartInstance.options.plugins.legend.position = isMobile ? 'bottom' : 'right';
      this.chartInstance.update();
      return;
    }

    const ctx = canvas.getContext('2d');
    this.chartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: palette.slice(0, labels.length),
          borderColor: borderColor,
          borderWidth: 3,
          hoverOffset: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: isMobile ? 4 : 8
        },
        plugins: {
          legend: {
            position: isMobile ? 'bottom' : 'right',
            align: 'center',
            labels: {
              color: legendColor,
              font: {
                family: "'Inter', sans-serif",
                size: isMobile ? 10 : 11,
                weight: '500'
              },
              boxWidth: isMobile ? 10 : 12,
              padding: isMobile ? 10 : 14
            }
          },
          tooltip: {
            backgroundColor: tooltipBg,
            titleColor: tooltipTitle,
            bodyColor: tooltipBody,
            borderColor: tooltipBorder,
            borderWidth: 1,
            padding: 10,
            callbacks: {
              label: (item) => {
                const val = item.raw || 0;
                const total = metrics.totalCurrentValue || 1;
                const pct = ((val / total) * 100).toFixed(1);
                return ` ${portfolioStore.formatMoney(val)} (${pct}%)`;
              }
            }
          }
        },
        cutout: '68%'
      }
    });
  }

  renderSectorList(metrics) {
    const listContainer = this.container.querySelector('#sector-list-container');
    if (!listContainer) return;

    if (metrics.sectorBreakdown.length === 0) {
      listContainer.innerHTML = `<div style="color: var(--text-muted); padding: 1rem;">No holdings available</div>`;
      return;
    }

    listContainer.innerHTML = metrics.sectorBreakdown.map(s => `
      <div class="sector-item">
        <span class="sector-name">${s.sector}</span>
        <div class="sector-meta">
          <span style="color: var(--text-primary);">${portfolioStore.formatMoney(s.value)}</span>
          <span class="sector-pct">${s.percentage.toFixed(1)}%</span>
        </div>
      </div>
    `).join('');
  }

  renderHighlights(metrics) {
    const container = this.container.querySelector('#dashboard-highlights-container');
    if (!container) return;

    if (metrics.totalHoldingsCount === 0) {
      container.innerHTML = `
        <div class="analytics-card" style="grid-column: 1 / -1; text-align: center; padding: 2.5rem 1.5rem;">
          <div class="empty-state-icon" style="margin-bottom: 0.75rem;">${icons.layers}</div>
          <h3 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 0.5rem;">Your Portfolio is Empty</h3>
          <p style="color: var(--text-secondary); max-width: 480px; margin: 0 auto 1.5rem; font-size: 0.9rem;">
            Add your purchased shares to track real-time valuations, automatic P&L calculations, and sector diversification.
          </p>
          <button id="btn-dashboard-add-first" class="btn btn-primary" style="margin: 0 auto;">
            ${icons.plus}
            <span>Add Your First Stock</span>
          </button>
        </div>
      `;
      return;
    }

    // Top 4 largest holdings by current value
    const topHoldings = [...metrics.holdings]
      .sort((a, b) => b.current - a.current)
      .slice(0, 4);

    const topGainer = metrics.topGainer;
    const topLoser = metrics.topLoser;

    container.innerHTML = `
      <!-- Card 1: Top Movers & Portfolio Performance -->
      <div class="analytics-card">
        <div class="card-title-row">
          <h2 class="card-title">${icons.trendingUp} Performance Highlights</h2>
        </div>

        <div style="display: flex; flex-direction: column; gap: 1rem; margin-top: 0.5rem;">
          <!-- Top Gainer -->
          <div style="background: rgba(16, 185, 129, 0.06); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: var(--radius-md); padding: 1rem;">
            <div style="font-size: 0.75rem; color: var(--bull-green); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.35rem;">
              Top Performing Asset
            </div>
            ${topGainer ? `
              <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" data-symbol="${topGainer.symbol}">
                <div>
                  <div style="font-weight: 700; font-size: 1.05rem; display: flex; align-items: center; gap: 0.4rem;">
                    ${topGainer.symbol}
                    <span class="exchange-tag">${topGainer.exchange || 'NSE'}</span>
                  </div>
                  <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.15rem;">${topGainer.name}</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 700; font-family: var(--font-mono); font-size: 1.05rem; color: var(--bull-green);">
                    +${topGainer.pnlPercent.toFixed(2)}%
                  </div>
                  <div style="font-size: 0.78rem; font-family: var(--font-mono); color: var(--text-secondary);">
                    CMP: ${portfolioStore.formatMoney(topGainer.cmp)}
                  </div>
                </div>
              </div>
            ` : `
              <div style="color: var(--text-muted); font-size: 0.85rem;">No profitable asset yet</div>
            `}
          </div>

          <!-- Top Decliner -->
          <div style="background: rgba(239, 68, 68, 0.06); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: var(--radius-md); padding: 1rem;">
            <div style="font-size: 0.75rem; color: var(--bear-red); font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.35rem;">
              Largest Drag / Drawdown
            </div>
            ${topLoser ? `
              <div style="display: flex; justify-content: space-between; align-items: center; cursor: pointer;" data-symbol="${topLoser.symbol}">
                <div>
                  <div style="font-weight: 700; font-size: 1.05rem; display: flex; align-items: center; gap: 0.4rem;">
                    ${topLoser.symbol}
                    <span class="exchange-tag">${topLoser.exchange || 'NSE'}</span>
                  </div>
                  <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.15rem;">${topLoser.name}</div>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 700; font-family: var(--font-mono); font-size: 1.05rem; color: var(--bear-red);">
                    ${topLoser.pnlPercent.toFixed(2)}%
                  </div>
                  <div style="font-size: 0.78rem; font-family: var(--font-mono); color: var(--text-secondary);">
                    CMP: ${portfolioStore.formatMoney(topLoser.cmp)}
                  </div>
                </div>
              </div>
            ` : `
              <div style="color: var(--text-muted); font-size: 0.85rem;">All holdings currently in profit</div>
            `}
          </div>

          <!-- Quick Navigation Link to Analysis -->
          <button id="btn-dashboard-header-view-holdings" class="btn btn-outline btn-sm" style="width: 100%; justify-content: center; margin-top: 0.5rem;">
            ${icons.layers}
            <span>Open Holdings Page</span>
          </button>
        </div>
      </div>

      <!-- Card 2: Largest Holdings Snapshot -->
      <div class="analytics-card">
        <div class="card-title-row">
          <h2 class="card-title">${icons.wallet} Top Holdings by Weight</h2>
          <span class="brand-badge">${metrics.totalHoldingsCount} Total</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.5rem;">
          ${topHoldings.map(h => {
            const isProfit = h.pnl >= 0;
            return `
              <div class="highlight-stock-row" data-symbol="${h.symbol}" title="Click to view details for ${h.symbol}">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                  <div class="stock-symbol-chip">${h.symbol.substring(0, 3)}</div>
                  <div>
                    <div style="font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; gap: 0.4rem;">
                      ${h.symbol}
                      <span class="exchange-tag">${h.exchange || 'NSE'}</span>
                    </div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${h.quantity} shares • ${h.sector || 'Equity'}</div>
                  </div>
                </div>
                <div style="text-align: right;">
                  <div style="font-weight: 700; font-family: var(--font-mono); font-size: 0.95rem;">
                    ${portfolioStore.formatMoney(h.current)}
                  </div>
                  <div class="return-badge ${isProfit ? 'bull' : 'bear'}" style="font-size: 0.72rem; padding: 0.15rem 0.45rem; margin-top: 0.15rem; display: inline-block;">
                    ${isProfit ? '+' : ''}${h.pnlPercent.toFixed(2)}%
                  </div>
                </div>
              </div>
            `;
          }).join('')}

          <button id="btn-dashboard-view-all-holdings" class="btn btn-primary" style="margin-top: 1rem; width: 100%; justify-content: center; gap: 0.5rem;">
            <span>View All ${metrics.totalHoldingsCount} Holdings in Table</span>
            <span>→</span>
          </button>
        </div>
      </div>
    `;
  }

  showToast(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <div class="toast-icon">${type === 'success' ? (icons.checkCircle || '✓') : 'ℹ'}</div>
      <div class="toast-message">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  }

  destroy() {
    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize);
    }
    if (this.chartInstance) {
      this.chartInstance.destroy();
      this.chartInstance = null;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
