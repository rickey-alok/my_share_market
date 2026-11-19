// Dashboard View Component (Executive Wealth & Performance Overview)
import { portfolioStore } from '../state/portfolioStore.js';
import { liveMarketService } from '../services/liveMarketService.js';
import { authService } from '../services/authService.js';
import { icons } from '../utils/icons.js';
import Chart from 'chart.js/auto';

export class DashboardView {
  constructor(containerElement, onNavigateToAddHolding, onNavigateToHoldings) {
    this.container = containerElement;
    this.onNavigateToAddHolding = onNavigateToAddHolding;
    this.onNavigateToHoldings = onNavigateToHoldings;
    this.chartInstance = null;
    this.performanceTab = 'top';
    this.pnlBreakdownTab = 'profit';

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
        // Tab button for Top 5 / Bottom 5
        const tabBtn = e.target.closest('[data-perf-tab]');
        if (tabBtn) {
          const tab = tabBtn.dataset.perfTab;
          if (tab && tab !== this.performanceTab) {
            this.performanceTab = tab;
            const metrics = portfolioStore.getPortfolioMetrics();
            this.renderHighlights(metrics);
          }
          return;
        }

        // Tab button for Profit vs Loss Breakdown
        const pnlTabBtn = e.target.closest('[data-pnl-tab]');
        if (pnlTabBtn) {
          const tab = pnlTabBtn.dataset.pnlTab;
          if (tab && tab !== this.pnlBreakdownTab) {
            this.pnlBreakdownTab = tab;
            const metrics = portfolioStore.getPortfolioMetrics();
            this.renderHighlights(metrics);
          }
          return;
        }

        // View all holdings button
        if (e.target.closest('#btn-dashboard-view-all-holdings') || 
            e.target.closest('#btn-dashboard-header-view-holdings') ||
            e.target.closest('#btn-dashboard-pnl-view-holdings')) {
          if (this.onNavigateToHoldings) this.onNavigateToHoldings();
          return;
        }

        // Add first stock button
        if (e.target.closest('#btn-dashboard-add-first')) {
          if (this.onNavigateToAddHolding) this.onNavigateToAddHolding();
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
    const isRealizedProfit = (metrics.totalRealizedPnL || 0) >= 0;

    kpiContainer.innerHTML = `
      <!-- Card 1: Combined Portfolio Capital & Valuation (Invested on Left, Current Value on Right) -->
      <div class="kpi-card kpi-card-dual">
        <!-- Left Side: Total Invested -->
        <div class="kpi-dual-col">
          <div class="kpi-mini-header">
            <span class="kpi-mini-title">${icons.wallet} Total Invested</span>
          </div>
          <div class="kpi-mini-value">${portfolioStore.formatMoney(metrics.totalInvested)}</div>
          <div class="kpi-mini-footer">
            <span class="kpi-mini-subtext">${metrics.totalHoldingsCount} Assets (${metrics.totalSharesCount.toLocaleString()} Shares)</span>
          </div>
        </div>

        <div class="kpi-dual-divider"></div>

        <!-- Right Side: Current Portfolio Value -->
        <div class="kpi-dual-col">
          <div class="kpi-mini-header">
            <span class="kpi-mini-title">${icons.sparkles} Current Value</span>
          </div>
          <div class="kpi-mini-value">${portfolioStore.formatMoney(metrics.totalCurrentValue)}</div>
          <div class="kpi-mini-footer"></div>
        </div>
      </div>

      <!-- Card 2: Combined Unrealized P&L (Total P&L on Left, Today's Movement on Right) -->
      <div class="kpi-card kpi-card-dual ${isTotalProfit ? 'bull' : 'bear'}">
        <!-- Left Side: Total P&L -->
        <div class="kpi-dual-col">
          <div class="kpi-mini-header">
            <span class="kpi-mini-title">${isTotalProfit ? icons.trendingUp : icons.trendingDown} Total P&L</span>
          </div>
          <div class="kpi-mini-value ${isTotalProfit ? 'bull' : 'bear'}">
            ${isTotalProfit ? '+' : ''}${portfolioStore.formatMoney(metrics.totalPnL)}
          </div>
          <div class="kpi-mini-footer">
            <span class="return-badge-sm ${isTotalProfit ? 'bull' : 'bear'}">
              ${isTotalProfit ? '+' : ''}${metrics.totalPnLPercent.toFixed(2)}% all-time
            </span>
          </div>
        </div>

        <div class="kpi-dual-divider"></div>

        <!-- Right Side: Today's P&L -->
        <div class="kpi-dual-col">
          <div class="kpi-mini-header">
            <span class="kpi-mini-title">${isDayProfit ? icons.arrowUpRight : icons.arrowDownRight} Today's P&L</span>
          </div>
          <div class="kpi-mini-value ${isDayProfit ? 'bull' : 'bear'}">
            ${isDayProfit ? '+' : ''}${portfolioStore.formatMoney(metrics.totalDayPnL)}
          </div>
          <div class="kpi-mini-footer">
            <span class="return-badge-sm ${isDayProfit ? 'bull' : 'bear'}">
              ${isDayProfit ? '+' : ''}${metrics.totalDayPnLPercent.toFixed(2)}% session
            </span>
          </div>
        </div>
      </div>

      <!-- Card 3: Dedicated Realized Profit Card -->
      <div class="kpi-card kpi-card-realized">
        <div class="kpi-realized-content">
          <div class="kpi-realized-meta">
            <div class="kpi-mini-header">
              <span class="kpi-mini-title" style="color: #a855f7;">${icons.pieChart} Realized Profits</span>
              <span class="kpi-subtext-pill">Booked</span>
            </div>
            <div class="kpi-mini-footer">
              <span class="kpi-mini-subtext">
                ${metrics.totalRealizedPnL !== 0 ? 'Closed trades exit gains' : 'No booked sales yet'}
              </span>
            </div>
          </div>
          <div class="kpi-mini-value ${isRealizedProfit ? 'bull' : 'bear'}">
            ${isRealizedProfit ? '+' : ''}${portfolioStore.formatMoney(metrics.totalRealizedPnL)}
          </div>
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

    // Top 5 Gainers (by pnlPercent descending)
    const top5Gainers = [...metrics.holdings]
      .sort((a, b) => b.pnlPercent - a.pnlPercent)
      .slice(0, 5);

    // Bottom 5 Losers/Drawdowns (by pnlPercent ascending)
    const bottom5Losers = [...metrics.holdings]
      .sort((a, b) => a.pnlPercent - b.pnlPercent)
      .slice(0, 5);

    // Active tab list
    const isTopTab = this.performanceTab !== 'bottom';
    const activeList = isTopTab ? top5Gainers : bottom5Losers;
    const activeTotalInvested = activeList.reduce((sum, h) => sum + (h.invested || 0), 0);
    const activeTotalCurrent = activeList.reduce((sum, h) => sum + (h.current || 0), 0);

    // Top 4 largest holdings by current value
    const topHoldings = [...metrics.holdings]
      .sort((a, b) => b.current - a.current)
      .slice(0, 4);

    // All Stocks Profit vs Loss Breakdown
    const profitStocks = [...metrics.holdings]
      .filter(h => h.pnl >= 0)
      .sort((a, b) => b.pnlPercent - a.pnlPercent);

    const lossStocks = [...metrics.holdings]
      .filter(h => h.pnl < 0)
      .sort((a, b) => a.pnlPercent - b.pnlPercent);

    const profitCount = profitStocks.length;
    const lossCount = lossStocks.length;
    const totalCount = metrics.totalHoldingsCount || (profitCount + lossCount);

    const profitInvested = profitStocks.reduce((sum, h) => sum + (h.invested || 0), 0);
    const profitCurrent = profitStocks.reduce((sum, h) => sum + (h.current || 0), 0);
    const profitNet = profitCurrent - profitInvested;
    const profitNetPct = profitInvested > 0 ? (profitNet / profitInvested) * 100 : 0;

    const lossInvested = lossStocks.reduce((sum, h) => sum + (h.invested || 0), 0);
    const lossCurrent = lossStocks.reduce((sum, h) => sum + (h.current || 0), 0);
    const lossNet = lossCurrent - lossInvested;
    const lossNetPct = lossInvested > 0 ? (lossNet / lossInvested) * 100 : 0;

    const profitSharePct = totalCount > 0 ? ((profitCount / totalCount) * 100).toFixed(1) : '0.0';
    const lossSharePct = totalCount > 0 ? ((lossCount / totalCount) * 100).toFixed(1) : '0.0';

    // Active Tab for Profit vs Loss Breakdown Card
    const isProfitTab = (this.pnlBreakdownTab || 'profit') !== 'loss';
    const activePnlList = isProfitTab ? profitStocks : lossStocks;

    container.innerHTML = `
      <!-- Card 1: Top 5 and Bottom 5 Movers in Tabbed Button Form -->
      <div class="analytics-card">
        <div class="card-title-row" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <h2 class="card-title">${icons.trendingUp} Performance Highlights</h2>
          
          <!-- Tabbed Buttons for Top 5 / Bottom 5 -->
          <div class="perf-tab-group" role="tablist">
            <button type="button" class="perf-tab-btn ${isTopTab ? 'active tab-top' : ''}" data-perf-tab="top" title="Show Top 5 Gainers">
              <span class="perf-dot bull">●</span>
              <span>Top 5</span>
            </button>
            <button type="button" class="perf-tab-btn ${!isTopTab ? 'active tab-bottom' : ''}" data-perf-tab="bottom" title="Show Bottom 5 Drawdowns">
              <span class="perf-dot bear">●</span>
              <span>Bottom 5</span>
            </button>
          </div>
        </div>

        <!-- Total Invested & Current Value Summary for Selected Group -->
        ${activeList.length > 0 ? `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.8rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); font-size: 0.76rem; color: var(--text-secondary); margin-top: 0.65rem; gap: 0.5rem; flex-wrap: wrap;">
            <div>
              <span>Invested (${isTopTab ? 'Top 5' : 'Bottom 5'}): </span>
              <strong style="font-family: var(--font-mono); color: var(--text-primary); font-size: 0.82rem;">${portfolioStore.formatMoney(activeTotalInvested)}</strong>
            </div>
            <div>
              <span>Current Value: </span>
              <strong style="font-family: var(--font-mono); color: var(--text-primary); font-size: 0.82rem;">${portfolioStore.formatMoney(activeTotalCurrent)}</strong>
            </div>
          </div>
        ` : ''}

        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.65rem;">
          ${activeList.length > 0 ? activeList.map((h, idx) => {
            const isProfit = h.pnlPercent >= 0;
            return `
              <div class="highlight-stock-row" style="padding: 0.65rem 0.85rem;">
                <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0;">
                  <span class="perf-rank-badge ${isTopTab ? 'bull' : 'bear'}">#${idx + 1}</span>
                  <div class="stock-symbol-chip" style="width: 32px; height: 32px; font-size: 0.72rem;">${h.symbol.substring(0, 3)}</div>
                  <div style="min-width: 0;">
                    <div style="font-weight: 700; font-size: 0.92rem; display: flex; align-items: center; gap: 0.35rem;">
                      <span class="text-truncate" style="max-width: 140px;">${h.symbol}</span>
                      <span class="exchange-tag" style="font-size: 0.65rem; padding: 0.1rem 0.35rem;">${h.exchange || 'NSE'}</span>
                    </div>
                    <div class="text-truncate" style="font-size: 0.74rem; color: var(--text-secondary); max-width: 160px;" title="${h.name || h.sector}">${h.name || h.sector || 'Equity'}</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.08rem;">${h.quantity.toLocaleString()} shares</div>
                  </div>
                </div>
                <div style="text-align: right; white-space: nowrap; flex-shrink: 0;">
                  <div style="font-weight: 700; font-family: var(--font-mono); font-size: 0.95rem; color: ${isProfit ? 'var(--bull-green)' : 'var(--bear-red)'};">
                    ${isProfit ? '+' : ''}${h.pnlPercent.toFixed(2)}%
                  </div>
                  <div style="font-size: 0.74rem; font-family: var(--font-mono); color: var(--text-secondary); margin-top: 0.12rem;">
                    <span style="color: var(--text-muted); font-size: 0.68rem;">Inv:</span> <span>${portfolioStore.formatMoney(h.invested)}</span>
                  </div>
                  <div style="font-size: 0.76rem; font-family: var(--font-mono); color: var(--text-primary); margin-top: 0.06rem;">
                    <span style="color: var(--text-muted); font-size: 0.68rem;">Current:</span> <strong>${portfolioStore.formatMoney(h.current)}</strong>
                  </div>
                </div>
              </div>
            `;
          }).join('') : `
            <div style="padding: 1.5rem; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
              No ${isTopTab ? 'gainers' : 'drawdown stocks'} in portfolio yet.
            </div>
          `}

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
              <div class="highlight-stock-row">
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

      <!-- Card 3: All Stocks Profit vs Loss Breakdown -->
      <div class="analytics-card pnl-breakdown-card">
        <div class="card-title-row" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
          <div>
            <h2 class="card-title" style="display: flex; align-items: center; gap: 0.45rem;">
              ${icons.barChart2} All Stocks: Profit vs Loss Overview
            </h2>
            <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 0.15rem;">
              Full portfolio breakdown across all ${totalCount} active stocks
            </div>
          </div>

          <!-- Tabbed Buttons for In Profit / In Loss -->
          <div class="perf-tab-group" role="tablist">
            <button type="button" class="perf-tab-btn ${isProfitTab ? 'active tab-top' : ''}" data-pnl-tab="profit" title="Show All In-Profit Stocks">
              <span class="perf-dot bull">●</span>
              <span>In Profit (${profitCount})</span>
            </button>
            <button type="button" class="perf-tab-btn ${!isProfitTab ? 'active tab-bottom' : ''}" data-pnl-tab="loss" title="Show All In-Loss Stocks">
              <span class="perf-dot bear">●</span>
              <span>In Loss (${lossCount})</span>
            </button>
          </div>
        </div>

        <!-- Win/Loss Ratio Progress Bar -->
        <div style="margin-top: 0.85rem; margin-bottom: 0.85rem;">
          <div style="display: flex; justify-content: space-between; font-size: 0.76rem; margin-bottom: 0.4rem; font-weight: 600;">
            <span style="color: var(--bull-green); display: flex; align-items: center; gap: 0.35rem;">
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--bull-green);"></span>
              ${profitCount} in Profit (${profitSharePct}%)
            </span>
            <span style="color: var(--bear-red); display: flex; align-items: center; gap: 0.35rem;">
              ${lossCount} in Loss (${lossSharePct}%)
              <span style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: var(--bear-red);"></span>
            </span>
          </div>
          <div style="display: flex; height: 8px; border-radius: var(--radius-full); overflow: hidden; background: var(--border-subtle); width: 100%;">
            <div style="width: ${profitSharePct}%; background: linear-gradient(90deg, #10b981, #059669); transition: width 0.3s ease;" title="${profitCount} stocks in profit (${profitSharePct}%)"></div>
            <div style="width: ${lossSharePct}%; background: linear-gradient(90deg, #f87171, #ef4444); transition: width 0.3s ease;" title="${lossCount} stocks in loss (${lossSharePct}%)"></div>
          </div>
        </div>

        <!-- Dual Comparison Metric Cards -->
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0.85rem; margin-bottom: 1rem;">
          <!-- Left: Stocks in Profit Summary -->
          <div style="padding: 0.85rem 1rem; background: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.22); border-radius: var(--radius-md);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
              <span style="font-weight: 700; font-size: 0.86rem; color: var(--bull-green); display: flex; align-items: center; gap: 0.35rem;">
                <span class="perf-dot bull">●</span>
                Stocks in Profit
              </span>
              <span style="font-size: 0.74rem; font-weight: 700; background: rgba(16, 185, 129, 0.15); color: var(--bull-green); padding: 0.15rem 0.5rem; border-radius: var(--radius-full);">
                ${profitCount} Stocks (${profitSharePct}%)
              </span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; font-family: var(--font-mono);">
              <div>
                <div style="font-size: 0.68rem; color: var(--text-muted); font-family: var(--font-heading); margin-bottom: 0.12rem;">TOTAL INVESTED</div>
                <strong style="color: var(--text-primary); font-size: 0.86rem;">${portfolioStore.formatMoney(profitInvested)}</strong>
              </div>
              <div>
                <div style="font-size: 0.68rem; color: var(--text-muted); font-family: var(--font-heading); margin-bottom: 0.12rem;">CURRENT VALUE</div>
                <strong style="color: var(--bull-green); font-size: 0.86rem;">${portfolioStore.formatMoney(profitCurrent)}</strong>
              </div>
            </div>
            <div style="margin-top: 0.6rem; padding-top: 0.5rem; border-top: 1px solid rgba(16, 185, 129, 0.15); display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem;">
              <span style="color: var(--text-secondary);">Unrealized Gain:</span>
              <strong style="font-family: var(--font-mono); color: var(--bull-green); font-size: 0.84rem;">
                +${portfolioStore.formatMoney(profitNet)} (+${profitNetPct.toFixed(2)}%)
              </strong>
            </div>
          </div>

          <!-- Right: Stocks in Loss Summary -->
          <div style="padding: 0.85rem 1rem; background: rgba(239, 68, 68, 0.05); border: 1px solid rgba(239, 68, 68, 0.22); border-radius: var(--radius-md);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.6rem;">
              <span style="font-weight: 700; font-size: 0.86rem; color: var(--bear-red); display: flex; align-items: center; gap: 0.35rem;">
                <span class="perf-dot bear">●</span>
                Stocks in Loss
              </span>
              <span style="font-size: 0.74rem; font-weight: 700; background: rgba(239, 68, 68, 0.15); color: var(--bear-red); padding: 0.15rem 0.5rem; border-radius: var(--radius-full);">
                ${lossCount} Stocks (${lossSharePct}%)
              </span>
            </div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.6rem; font-family: var(--font-mono);">
              <div>
                <div style="font-size: 0.68rem; color: var(--text-muted); font-family: var(--font-heading); margin-bottom: 0.12rem;">TOTAL INVESTED</div>
                <strong style="color: var(--text-primary); font-size: 0.86rem;">${portfolioStore.formatMoney(lossInvested)}</strong>
              </div>
              <div>
                <div style="font-size: 0.68rem; color: var(--text-muted); font-family: var(--font-heading); margin-bottom: 0.12rem;">CURRENT VALUE</div>
                <strong style="color: var(--bear-red); font-size: 0.86rem;">${portfolioStore.formatMoney(lossCurrent)}</strong>
              </div>
            </div>
            <div style="margin-top: 0.6rem; padding-top: 0.5rem; border-top: 1px solid rgba(239, 68, 68, 0.15); display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem;">
              <span style="color: var(--text-secondary);">Unrealized Loss:</span>
              <strong style="font-family: var(--font-mono); color: var(--bear-red); font-size: 0.84rem;">
                ${portfolioStore.formatMoney(lossNet)} (${lossNetPct.toFixed(2)}%)
              </strong>
            </div>
          </div>
        </div>

        <!-- Section Label for Selected Tab List -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.55rem; padding: 0 0.15rem;">
          <span style="font-size: 0.78rem; font-weight: 600; color: var(--text-secondary);">
            All ${activePnlList.length} ${isProfitTab ? 'Stocks in Profit (Gainers)' : 'Stocks in Loss (Drawdowns)'}:
          </span>
          <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);">
            ${activePnlList.length} of ${totalCount}
          </span>
        </div>

        <!-- Scrollable List of All Stocks in Active Tab -->
        <div class="pnl-stocks-scroll">
          ${activePnlList.length > 0 ? activePnlList.map((h, idx) => {
            const isProfit = h.pnlPercent >= 0;
            return `
              <div class="highlight-stock-row" style="padding: 0.65rem 0.85rem;">
                <div style="display: flex; align-items: center; gap: 0.65rem; min-width: 0;">
                  <span class="perf-rank-badge ${isProfitTab ? 'bull' : 'bear'}">#${idx + 1}</span>
                  <div class="stock-symbol-chip" style="width: 32px; height: 32px; font-size: 0.72rem;">${h.symbol.substring(0, 3)}</div>
                  <div style="min-width: 0;">
                    <div style="font-weight: 700; font-size: 0.92rem; display: flex; align-items: center; gap: 0.35rem;">
                      <span class="text-truncate" style="max-width: 140px;">${h.symbol}</span>
                      <span class="exchange-tag" style="font-size: 0.65rem; padding: 0.1rem 0.35rem;">${h.exchange || 'NSE'}</span>
                    </div>
                    <div class="text-truncate" style="font-size: 0.74rem; color: var(--text-secondary); max-width: 160px;" title="${h.name || h.sector}">${h.name || h.sector || 'Equity'}</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); margin-top: 0.08rem;">${h.quantity.toLocaleString()} shares</div>
                  </div>
                </div>
                <div style="text-align: right; white-space: nowrap; flex-shrink: 0;">
                  <div style="font-weight: 700; font-family: var(--font-mono); font-size: 0.95rem; color: ${isProfit ? 'var(--bull-green)' : 'var(--bear-red)'};">
                    ${isProfit ? '+' : ''}${h.pnlPercent.toFixed(2)}%
                  </div>
                  <div style="font-size: 0.74rem; font-family: var(--font-mono); color: var(--text-secondary); margin-top: 0.12rem;">
                    <span style="color: var(--text-muted); font-size: 0.68rem;">Inv:</span> <span>${portfolioStore.formatMoney(h.invested)}</span>
                  </div>
                  <div style="font-size: 0.76rem; font-family: var(--font-mono); color: var(--text-primary); margin-top: 0.06rem;">
                    <span style="color: var(--text-muted); font-size: 0.68rem;">Current:</span> <strong>${portfolioStore.formatMoney(h.current)}</strong>
                  </div>
                </div>
              </div>
            `;
          }).join('') : `
            <div style="padding: 2rem 1rem; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
              No stocks found in ${isProfitTab ? 'profit' : 'loss'}.
            </div>
          `}
        </div>

        <!-- Action Button to Open Holdings Table -->
        <button id="btn-dashboard-pnl-view-holdings" class="btn btn-outline btn-sm" style="margin-top: 0.85rem; width: 100%; justify-content: center; gap: 0.5rem;">
          ${icons.layers}
          <span>View All ${totalCount} Holdings in Table</span>
          <span>→</span>
        </button>
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
