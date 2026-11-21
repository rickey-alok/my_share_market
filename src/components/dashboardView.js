// Dashboard View Component (Executive Wealth & Performance Overview)
import { portfolioStore } from '../state/portfolioStore.js';
import { liveMarketService } from '../services/liveMarketService.js';
import { authService } from '../services/authService.js';
import { icons } from '../utils/icons.js';
import Chart from 'chart.js/auto';

// Squarified Treemap Layout Algorithm for Market Carpet
function squarify(children, rect) {
  let { x, y, w, h } = rect;
  if (!children || !children.length) return [];
  const total = children.reduce((s, c) => s + (c.value || 0), 0);
  if (total <= 0) return [];

  const validChildren = children.filter(c => (c.value || 0) > 0);
  if (!validChildren.length) return [];

  const items = validChildren
    .sort((a, b) => b.value - a.value)
    .map(c => ({ ...c, area: (c.value / total) * w * h }));

  if (items.length === 1) {
    return [{ ...items[0], x, y, w, h }];
  }

  const results = [];

  function layoutRow(row, side, isHorizontal, originX, originY) {
    const rowArea = row.reduce((s, c) => s + c.area, 0);
    const rowThickness = rowArea / side;
    let offset = 0;
    for (const item of row) {
      const itemLength = item.area / rowThickness;
      if (isHorizontal) {
        results.push({ ...item, x: originX, y: originY + offset, w: rowThickness, h: itemLength });
        offset += itemLength;
      } else {
        results.push({ ...item, x: originX + offset, y: originY, w: itemLength, h: rowThickness });
        offset += itemLength;
      }
    }
  }

  function worst(row, side) {
    const rowArea = row.reduce((s, c) => s + c.area, 0);
    const rowThickness = rowArea / side;
    if (rowThickness <= 0) return Infinity;
    let maxAspect = 0;
    for (const item of row) {
      const itemLength = item.area / rowThickness;
      if (itemLength <= 0) return Infinity;
      const aspect = Math.max(rowThickness / itemLength, itemLength / rowThickness);
      if (aspect > maxAspect) maxAspect = aspect;
    }
    return maxAspect;
  }

  let remaining = [...items];
  let curRect = { x, y, w, h };

  while (remaining.length > 0) {
    const isHorizontal = curRect.w >= curRect.h;
    const side = isHorizontal ? curRect.h : curRect.w;
    let row = [remaining[0]];
    let i = 1;

    while (i < remaining.length) {
      const next = remaining[i];
      const withNext = [...row, next];
      if (worst(withNext, side) <= worst(row, side)) {
        row = withNext;
        i++;
      } else {
        break;
      }
    }

    layoutRow(row, side, isHorizontal, curRect.x, curRect.y);
    const rowArea = row.reduce((s, c) => s + c.area, 0);
    const rowThickness = rowArea / side;

    if (isHorizontal) {
      curRect.x += rowThickness;
      curRect.w -= rowThickness;
    } else {
      curRect.y += rowThickness;
      curRect.h -= rowThickness;
    }

    remaining = remaining.slice(row.length);
  }

  return results;
}

function getCarpetColor(returnPct) {
  if (returnPct === undefined || returnPct === null || isNaN(returnPct)) return '#475569';
  if (returnPct >= 100) return '#064e3b';
  if (returnPct >= 50) return '#047857';
  if (returnPct >= 20) return '#059669';
  if (returnPct >= 5) return '#10b981';
  if (returnPct > 0) return '#16a34a';
  if (returnPct === 0) return '#475569';
  if (returnPct > -5) return '#ef4444';
  if (returnPct > -20) return '#dc2626';
  return '#991b1b';
}

export class DashboardView {
  constructor(containerElement, onNavigateToAddHolding, onNavigateToHoldings) {
    this.container = containerElement;
    this.onNavigateToAddHolding = onNavigateToAddHolding;
    this.onNavigateToHoldings = onNavigateToHoldings;
    this.chartInstance = null;
    this.performanceTab = 'profit-pct';
    this.pnlBreakdownTab = 'profit';
    this.carpetMode = 'stock'; // 'stock' | 'sector'
    this.carpetMetric = 'pnl'; // 'pnl' | 'day'

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
          <div class="page-title-with-action">
            <h1 class="page-title">Portfolio Dashboard</h1>
            <button id="btn-refresh-quotes" class="dashboard-sync-btn" title="Refresh Live Quotes" aria-label="Refresh Live Quotes">
              ${icons.refreshCw}
            </button>
          </div>
          <p class="page-subtitle">Executive wealth overview, asset allocation, and market performance</p>
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

      <!-- Analytics Breakdown (Market Carpet & Sectors) -->
      <div class="analytics-section">
        <div class="analytics-card" id="market-carpet-card">
          <div class="card-title-row" style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 0.5rem;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <h2 class="card-title" style="display: flex; align-items: center; gap: 0.45rem;">
                ${icons.layoutDashboard} Market Carpet
              </h2>
              <span class="brand-badge" id="carpet-assets-count">0 Assets</span>
            </div>
            
            <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
              <!-- Group Switcher (Stock vs Sector) -->
              <div class="perf-tab-group" role="tablist">
                <button type="button" class="perf-tab-btn active" id="btn-carpet-mode-stock" data-carpet-mode="stock" title="View Stocks Carpet">
                  <span>Stocks</span>
                </button>
                <button type="button" class="perf-tab-btn" id="btn-carpet-mode-sector" data-carpet-mode="sector" title="View Sectors Carpet">
                  <span>Sectors</span>
                </button>
              </div>

              <!-- Metric Switcher (All-Time vs Today) -->
              <div class="perf-tab-group" role="tablist">
                <button type="button" class="perf-tab-btn active" id="btn-carpet-metric-pnl" data-carpet-metric="pnl" title="Color by All-Time Return %">
                  <span>All-Time</span>
                </button>
                <button type="button" class="perf-tab-btn" id="btn-carpet-metric-day" data-carpet-metric="day" title="Color by Today's Return %">
                  <span>Today</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Market Carpet Treemap Container -->
          <div id="market-carpet-container" class="market-carpet-container">
            <!-- Treemap tiles dynamically injected -->
          </div>

          <!-- Carpet Color Legend Bar -->
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.75rem; font-size: 0.7rem; color: var(--text-muted); flex-wrap: wrap; gap: 0.4rem;">
            <div style="display: flex; align-items: center; gap: 0.35rem;">
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background: #991b1b;"></span>
              <span>&lt; -20%</span>
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background: #ef4444; margin-left: 0.15rem;"></span>
              <span>-5%</span>
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background: #475569; margin-left: 0.15rem;"></span>
              <span>0%</span>
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background: #10b981; margin-left: 0.15rem;"></span>
              <span>+5%</span>
              <span style="display: inline-block; width: 10px; height: 10px; border-radius: 2px; background: #047857; margin-left: 0.15rem;"></span>
              <span>&gt; +50%</span>
            </div>
            <span style="font-family: var(--font-mono); font-size: 0.68rem;">Tile Area = Valuation Weight</span>
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

    // Refresh Quotes Button
    const btnRefresh = this.container.querySelector('#btn-refresh-quotes');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', async () => {
        btnRefresh.classList.add('rotating');
        btnRefresh.disabled = true;
        const syncResult = await portfolioStore.refreshMarketQuotes(false);
        btnRefresh.classList.remove('rotating');
        btnRefresh.disabled = false;
        const syncTime = liveMarketService.getLastSyncFormatted() || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        btnRefresh.setAttribute('title', `Synced at ${syncTime} - Click to Refresh`);

        // Visual toast feedback
        const count = syncResult?.totalCount || portfolioStore.holdings?.length || 0;
        const meta = syncResult?.meta;
        const isClosed = meta?.marketState === 'CLOSED' || !liveMarketService.isMarketOpen();
        const msg = isClosed
          ? `Synced ${count} stocks with today's closing market data (LTP • NSE/BSE)`
          : `Live Market Synced: Updated ${count} stocks with real-time quotes (${syncTime})`;
        this.showToast(msg, 'success');
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

    // Carpet Card Controls and Tooltip
    const carpetCard = this.container.querySelector('#market-carpet-card');
    if (carpetCard) {
      carpetCard.addEventListener('click', (e) => {
        const modeBtn = e.target.closest('[data-carpet-mode]');
        if (modeBtn) {
          const mode = modeBtn.dataset.carpetMode;
          if (mode && mode !== this.carpetMode) {
            this.carpetMode = mode;
            const metrics = portfolioStore.getPortfolioMetrics();
            this.renderMarketCarpet(metrics);
          }
          return;
        }

        const metricBtn = e.target.closest('[data-carpet-metric]');
        if (metricBtn) {
          const metric = metricBtn.dataset.carpetMetric;
          if (metric && metric !== this.carpetMetric) {
            this.carpetMetric = metric;
            const metrics = portfolioStore.getPortfolioMetrics();
            this.renderMarketCarpet(metrics);
          }
          return;
        }

        const tile = e.target.closest('.carpet-tile');
        if (tile) {
          if (this.onNavigateToHoldings) this.onNavigateToHoldings();
        }
      });

      // Tooltip handling
      let carpetTooltip = document.getElementById('market-carpet-tooltip');
      if (!carpetTooltip) {
        carpetTooltip = document.createElement('div');
        carpetTooltip.id = 'market-carpet-tooltip';
        carpetTooltip.className = 'market-carpet-tooltip';
        document.body.appendChild(carpetTooltip);
      }

      const showTooltip = (e, tile) => {
        const infoStr = tile.dataset.carpetInfo;
        if (!infoStr) return;
        try {
          const d = JSON.parse(decodeURIComponent(infoStr));
          const pnlSign = d.pnl >= 0 ? '+' : '';
          const daySign = d.dayPnL >= 0 ? '+' : '';
          const isProfit = d.pnl >= 0;
          const isDayProfit = d.dayPnL >= 0;

          carpetTooltip.innerHTML = `
            <div style="font-weight: 800; font-size: 0.88rem; display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; border-bottom: 1px solid var(--border-subtle); padding-bottom: 0.35rem;">
              <span>${d.title}</span>
              <span style="font-family: var(--font-mono); font-size: 0.78rem; color: ${isProfit ? 'var(--bull-green)' : 'var(--bear-red)'};">${d.returnText}</span>
            </div>
            ${d.subtitle ? `<div style="font-size: 0.72rem; color: var(--text-secondary); margin-bottom: 0.45rem;">${d.subtitle}</div>` : ''}
            <div style="display: flex; justify-content: space-between; font-size: 0.74rem; margin-bottom: 0.2rem;">
              <span style="color: var(--text-muted);">Current Value:</span>
              <strong style="font-family: var(--font-mono);">${d.valueText} (${d.weightText})</strong>
            </div>
            ${d.investedText ? `
              <div style="display: flex; justify-content: space-between; font-size: 0.74rem; margin-bottom: 0.2rem;">
                <span style="color: var(--text-muted);">Invested:</span>
                <span style="font-family: var(--font-mono);">${d.investedText}</span>
              </div>
            ` : ''}
            <div style="display: flex; justify-content: space-between; font-size: 0.74rem; margin-bottom: 0.2rem;">
              <span style="color: var(--text-muted);">Total P&L:</span>
              <strong style="font-family: var(--font-mono); color: ${isProfit ? 'var(--bull-green)' : 'var(--bear-red)'};">${pnlSign}${d.pnlText} (${pnlSign}${d.pnlPctText})</strong>
            </div>
            <div style="display: flex; justify-content: space-between; font-size: 0.74rem;">
              <span style="color: var(--text-muted);">Today's Move:</span>
              <span style="font-family: var(--font-mono); color: ${isDayProfit ? 'var(--bull-green)' : 'var(--bear-red)'};">${daySign}${d.dayText} (${daySign}${d.dayPctText})</span>
            </div>
          `;

          const x = e.clientX + 14;
          const y = e.clientY + 14;
          const tooltipWidth = 260;
          const tooltipHeight = 160;
          const finalX = (x + tooltipWidth > window.innerWidth) ? (e.clientX - tooltipWidth - 10) : x;
          const finalY = (y + tooltipHeight > window.innerHeight) ? (e.clientY - tooltipHeight - 10) : y;

          carpetTooltip.style.left = `${Math.max(10, finalX)}px`;
          carpetTooltip.style.top = `${Math.max(10, finalY)}px`;
          carpetTooltip.style.display = 'block';
        } catch (err) {}
      };

      carpetCard.addEventListener('mousemove', (e) => {
        const tile = e.target.closest('.carpet-tile');
        if (tile) {
          showTooltip(e, tile);
        } else {
          carpetTooltip.style.display = 'none';
        }
      });

      carpetCard.addEventListener('mouseleave', () => {
        carpetTooltip.style.display = 'none';
      });
    }

    // Responsiveness resize listener
    this.handleResize = () => {
      const metrics = portfolioStore.getPortfolioMetrics();
      this.renderMarketCarpet(metrics);
    };
    window.addEventListener('resize', this.handleResize);
  }

  update(event = {}) {
    this.updateGuestBanner();
    const metrics = portfolioStore.getPortfolioMetrics();
    this.renderKPIs(metrics);
    this.renderMarketCarpet(metrics);
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
        <div class="kpi-dual-col kpi-dual-col-right">
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
              ${isTotalProfit ? '+' : ''}${metrics.totalPnLPercent.toFixed(2)}%
            </span>
          </div>
        </div>

        <div class="kpi-dual-divider"></div>

        <!-- Right Side: Today's P&L -->
        <div class="kpi-dual-col kpi-dual-col-right">
          <div class="kpi-mini-header">
            <span class="kpi-mini-title">${isDayProfit ? icons.arrowUpRight : icons.arrowDownRight} Today's P&L</span>
          </div>
          <div class="kpi-mini-value ${isDayProfit ? 'bull' : 'bear'}">
            ${isDayProfit ? '+' : ''}${portfolioStore.formatMoney(metrics.totalDayPnL)}
          </div>
          <div class="kpi-mini-footer">
            <span class="return-badge-sm ${isDayProfit ? 'bull' : 'bear'}">
              ${isDayProfit ? '+' : ''}${metrics.totalDayPnLPercent.toFixed(2)}%
            </span>
          </div>
        </div>
      </div>
    `;
  }

  renderMarketCarpet(metrics) {
    const container = this.container.querySelector('#market-carpet-container');
    const countBadge = this.container.querySelector('#carpet-assets-count');
    if (!container) return;

    if (countBadge) {
      countBadge.textContent = `${metrics.totalHoldingsCount} Assets`;
    }

    // Update active tab buttons
    const btnStock = this.container.querySelector('#btn-carpet-mode-stock');
    const btnSector = this.container.querySelector('#btn-carpet-mode-sector');
    if (btnStock && btnSector) {
      btnStock.classList.toggle('active', this.carpetMode !== 'sector');
      btnSector.classList.toggle('active', this.carpetMode === 'sector');
    }

    const btnPnl = this.container.querySelector('#btn-carpet-metric-pnl');
    const btnDay = this.container.querySelector('#btn-carpet-metric-day');
    if (btnPnl && btnDay) {
      btnPnl.classList.toggle('active', this.carpetMetric !== 'day');
      btnDay.classList.toggle('active', this.carpetMetric === 'day');
    }

    if (metrics.totalHoldingsCount === 0 || !metrics.holdings || metrics.holdings.length === 0) {
      container.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); font-size: 0.85rem;">
          No active assets in portfolio yet
        </div>
      `;
      return;
    }

    const totalPortfolioVal = metrics.totalCurrentValue || 1;
    const isDay = this.carpetMetric === 'day';
    let rawItems = [];

    if (this.carpetMode === 'sector') {
      // By Sector Mode
      rawItems = (metrics.sectorBreakdown || []).map(s => {
        const sectorHoldings = metrics.holdings.filter(h => (h.sector || 'General / Equity') === s.sector);
        const sectorInvested = sectorHoldings.reduce((sum, h) => sum + (h.invested || 0), 0);
        const sectorPnL = s.value - sectorInvested;
        const sectorPnLPct = sectorInvested > 0 ? (sectorPnL / sectorInvested) * 100 : 0;
        const sectorDayPnL = sectorHoldings.reduce((sum, h) => sum + (h.dayPnL || 0), 0);
        const sectorPrevVal = s.value - sectorDayPnL;
        const sectorDayPct = sectorPrevVal > 0 ? (sectorDayPnL / sectorPrevVal) * 100 : 0;
        const returnPct = isDay ? sectorDayPct : sectorPnLPct;

        return {
          id: s.sector,
          label: s.sector,
          value: s.value,
          returnPct,
          dataInfo: {
            title: s.sector,
            subtitle: `${sectorHoldings.length} Holdings • ${s.percentage.toFixed(1)}% Weight`,
            valueText: portfolioStore.formatMoney(s.value),
            weightText: `${s.percentage.toFixed(1)}%`,
            investedText: portfolioStore.formatMoney(sectorInvested),
            pnl: sectorPnL,
            pnlText: portfolioStore.formatMoney(sectorPnL),
            pnlPctText: `${sectorPnLPct.toFixed(2)}%`,
            dayPnL: sectorDayPnL,
            dayText: portfolioStore.formatMoney(sectorDayPnL),
            dayPctText: `${sectorDayPct.toFixed(2)}%`,
            returnText: `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`
          }
        };
      });
    } else {
      // By Stock Mode
      const validHoldings = [...metrics.holdings]
        .filter(h => (h.current || 0) > 0)
        .sort((a, b) => b.current - a.current);

      let displayHoldings = validHoldings;
      let othersTile = null;

      if (validHoldings.length > 36) {
        displayHoldings = validHoldings.slice(0, 32);
        const remaining = validHoldings.slice(32);
        const remValue = remaining.reduce((sum, h) => sum + (h.current || 0), 0);
        const remInvested = remaining.reduce((sum, h) => sum + (h.invested || 0), 0);
        const remPnL = remValue - remInvested;
        const remPnLPct = remInvested > 0 ? (remPnL / remInvested) * 100 : 0;
        const remDayPnL = remaining.reduce((sum, h) => sum + (h.dayPnL || 0), 0);
        const remPrevVal = remValue - remDayPnL;
        const remDayPct = remPrevVal > 0 ? (remDayPnL / remPrevVal) * 100 : 0;
        const remReturnPct = isDay ? remDayPct : remPnLPct;
        const remWeight = ((remValue / totalPortfolioVal) * 100).toFixed(1);

        othersTile = {
          id: '__OTHERS__',
          label: `Others (${remaining.length})`,
          value: remValue,
          returnPct: remReturnPct,
          dataInfo: {
            title: `Others (${remaining.length} Stocks)`,
            subtitle: `Combined smaller holdings`,
            valueText: portfolioStore.formatMoney(remValue),
            weightText: `${remWeight}%`,
            investedText: portfolioStore.formatMoney(remInvested),
            pnl: remPnL,
            pnlText: portfolioStore.formatMoney(remPnL),
            pnlPctText: `${remPnLPct.toFixed(2)}%`,
            dayPnL: remDayPnL,
            dayText: portfolioStore.formatMoney(remDayPnL),
            dayPctText: `${remDayPct.toFixed(2)}%`,
            returnText: `${remReturnPct >= 0 ? '+' : ''}${remReturnPct.toFixed(2)}%`
          }
        };
      }

      rawItems = displayHoldings.map(h => {
        const returnPct = isDay ? (h.dayChangePercent || 0) : (h.pnlPercent || 0);
        const weightPct = ((h.current / totalPortfolioVal) * 100).toFixed(1);

        return {
          id: h.symbol,
          label: h.symbol,
          value: h.current,
          returnPct,
          dataInfo: {
            title: `${h.symbol} (${h.exchange || 'NSE'})`,
            subtitle: `${h.name || h.sector || 'Equity'} • ${h.quantity.toLocaleString()} shares`,
            valueText: portfolioStore.formatMoney(h.current),
            weightText: `${weightPct}%`,
            investedText: portfolioStore.formatMoney(h.invested),
            pnl: h.pnl,
            pnlText: portfolioStore.formatMoney(h.pnl),
            pnlPctText: `${h.pnlPercent.toFixed(2)}%`,
            dayPnL: h.dayPnL || 0,
            dayText: portfolioStore.formatMoney(h.dayPnL || 0),
            dayPctText: `${(h.dayChangePercent || 0).toFixed(2)}%`,
            returnText: `${returnPct >= 0 ? '+' : ''}${returnPct.toFixed(2)}%`
          }
        };
      });

      if (othersTile) {
        rawItems.push(othersTile);
      }
    }

    const tiles = squarify(rawItems, { x: 0, y: 0, w: 100, h: 100 });

    container.innerHTML = tiles.map(t => {
      const bgColor = getCarpetColor(t.returnPct);
      const isLarge = t.w >= 10 && t.h >= 10;
      const isMedium = t.w >= 6 && t.h >= 6;
      const isCompact = t.w >= 4 && t.h >= 4;
      const returnFormatted = `${t.returnPct >= 0 ? '+' : ''}${t.returnPct.toFixed(1)}%`;
      const encodedInfo = encodeURIComponent(JSON.stringify(t.dataInfo));

      return `
        <div class="carpet-tile" 
             data-carpet-info="${encodedInfo}"
             style="left: ${t.x}%; top: ${t.y}%; width: ${t.w}%; height: ${t.h}%; background: ${bgColor};" 
             title="${t.label}: ${returnFormatted}">
          ${isLarge ? `
            <div style="font-weight: 800; font-size: clamp(0.74rem, 1vw, 0.94rem); line-height: 1.1; text-shadow: 0 1px 3px rgba(0,0,0,0.85);">${t.label}</div>
            <div style="font-family: var(--font-mono); font-weight: 700; font-size: clamp(0.68rem, 0.85vw, 0.8rem); margin-top: 2px; text-shadow: 0 1px 3px rgba(0,0,0,0.85);">${returnFormatted}</div>
            <div style="font-size: clamp(0.62rem, 0.72vw, 0.7rem); opacity: 0.92; margin-top: 1px; text-shadow: 0 1px 3px rgba(0,0,0,0.85);">${portfolioStore.formatMoney(t.value)}</div>
          ` : isMedium ? `
            <div style="font-weight: 800; font-size: 0.74rem; line-height: 1.1; text-shadow: 0 1px 2px rgba(0,0,0,0.85);">${t.label}</div>
            <div style="font-family: var(--font-mono); font-weight: 700; font-size: 0.68rem; margin-top: 1px; text-shadow: 0 1px 2px rgba(0,0,0,0.85);">${returnFormatted}</div>
          ` : isCompact ? `
            <div style="font-weight: 700; font-size: 0.64rem; line-height: 1; text-shadow: 0 1px 2px rgba(0,0,0,0.85);">${t.label.substring(0, 4)}</div>
          ` : ''}
        </div>
      `;
    }).join('');
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

    // Top 5 Gainers by % (pnlPercent descending)
    const profit5ByPct = [...metrics.holdings]
      .sort((a, b) => b.pnlPercent - a.pnlPercent)
      .slice(0, 5);

    // Top 5 Drawdowns by % (pnlPercent ascending)
    const loss5ByPct = [...metrics.holdings]
      .sort((a, b) => a.pnlPercent - b.pnlPercent)
      .slice(0, 5);

    // Top 5 Gainers by Profit Amount in ₹ (pnl descending)
    const profit5ByAmt = [...metrics.holdings]
      .sort((a, b) => b.pnl - a.pnl)
      .slice(0, 5);

    // Top 5 Losers by Loss Amount in ₹ (pnl ascending)
    const loss5ByAmt = [...metrics.holdings]
      .sort((a, b) => a.pnl - b.pnl)
      .slice(0, 5);

    // Active tab selection for Performance Highlights
    const currentTab = this.performanceTab || 'profit-pct';
    let activeList = profit5ByPct;
    let groupLabel = 'Profit (%)';

    if (currentTab === 'loss-pct' || currentTab === 'bottom') {
      activeList = loss5ByPct;
      groupLabel = 'Loss (%)';
    } else if (currentTab === 'profit-amt' || currentTab === 'weight' || currentTab === 'weight-top') {
      activeList = profit5ByAmt;
      groupLabel = 'Profit (Amt)';
    } else if (currentTab === 'loss-amt' || currentTab === 'weight-bottom') {
      activeList = loss5ByAmt;
      groupLabel = 'Loss (Amt)';
    }

    const activeTotalInvested = activeList.reduce((sum, h) => sum + (h.invested || 0), 0);
    const activeTotalCurrent = activeList.reduce((sum, h) => sum + (h.current || 0), 0);
    const activeTotalPnl = activeTotalCurrent - activeTotalInvested;
    const activeTotalPnlPercent = activeTotalInvested > 0 ? (activeTotalPnl / activeTotalInvested) * 100 : 0;

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
      <!-- Card 1: Performance Highlights (Merged Top 5 %, Bottom 5 %, and Top 5 Val) -->
      <div class="analytics-card">
        <div class="card-title-row" style="display: flex; flex-direction: column; gap: 0.65rem;">
          <div style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
            <h2 class="card-title" style="display: flex; align-items: center; gap: 0.45rem;">
              ${icons.trendingUp} Performance Highlights
            </h2>
            <span class="brand-badge" style="font-size: 0.7rem;">Profit & Loss 5</span>
          </div>
          
          <!-- Full-width Single-Line Segmented Control for Profit/Loss % and Profit/Loss Amt -->
          <div class="perf-tab-group" role="tablist" style="width: 100%; display: flex;">
            <button type="button" class="perf-tab-btn ${(currentTab === 'profit-pct' || currentTab === 'top') ? 'active tab-profit-pct' : ''}" data-perf-tab="profit-pct" title="Show Top 5 Gainers by % Return" style="flex: 1; justify-content: center;">
              <span class="perf-dot bull">●</span>
              <span>Profit (%)</span>
            </button>
            <button type="button" class="perf-tab-btn ${(currentTab === 'loss-pct' || currentTab === 'bottom') ? 'active tab-loss-pct' : ''}" data-perf-tab="loss-pct" title="Show Top 5 Drawdowns by % Return" style="flex: 1; justify-content: center;">
              <span class="perf-dot bear">●</span>
              <span>Loss (%)</span>
            </button>
            <button type="button" class="perf-tab-btn ${(currentTab === 'profit-amt' || currentTab === 'weight') ? 'active tab-profit-amt' : ''}" data-perf-tab="profit-amt" title="Show Top 5 Gainers by Profit Amount (₹)" style="flex: 1; justify-content: center;">
              <span class="perf-dot bull">●</span>
              <span>Profit (Amt)</span>
            </button>
            <button type="button" class="perf-tab-btn ${(currentTab === 'loss-amt' || currentTab === 'weight-bottom') ? 'active tab-loss-amt' : ''}" data-perf-tab="loss-amt" title="Show Top 5 Losers by Loss Amount (₹)" style="flex: 1; justify-content: center;">
              <span class="perf-dot bear">●</span>
              <span>Loss (Amt)</span>
            </button>
          </div>
        </div>

        <!-- Total Invested & Current Value Summary for Selected Group -->
        ${activeList.length > 0 ? `
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.85rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); margin-top: 0.65rem; gap: 0.5rem;">
            <div style="text-align: left; flex-shrink: 0;">
              <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; font-family: var(--font-heading);">Invested (${groupLabel})</div>
              <div style="font-family: var(--font-mono); color: var(--text-primary); font-weight: 700; font-size: 0.88rem; margin-top: 0.12rem;">
                ${portfolioStore.formatMoney(activeTotalInvested, 0)}
              </div>
            </div>
            <div style="text-align: right; margin-left: auto;">
              <div style="font-size: 0.68rem; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.03em; font-family: var(--font-heading);">Current Value</div>
              <div style="display: flex; align-items: center; justify-content: flex-end; gap: 0.4rem; margin-top: 0.12rem; flex-wrap: wrap;">
                <span style="font-family: var(--font-mono); color: ${activeTotalPnl >= 0 ? 'var(--bull-green)' : 'var(--bear-red)'}; font-weight: 700; font-size: 0.88rem;">
                  ${portfolioStore.formatMoney(activeTotalCurrent, 0)}
                </span>
                <span style="font-family: var(--font-mono); font-weight: 700; font-size: 0.72rem; padding: 0.08rem 0.38rem; border-radius: 4px; background: ${activeTotalPnl >= 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}; color: ${activeTotalPnl >= 0 ? 'var(--bull-green)' : 'var(--bear-red)'}; white-space: nowrap;" title="Net P&L: ${activeTotalPnl >= 0 ? '+' : '-'}${portfolioStore.formatMoney(Math.abs(activeTotalPnl), 0)}">
                  ${activeTotalPnl >= 0 ? '+' : ''}${activeTotalPnlPercent.toFixed(2)}% (${activeTotalPnl >= 0 ? '+' : '-'}${portfolioStore.formatMoney(Math.abs(activeTotalPnl), 0)})
                </span>
              </div>
            </div>
          </div>
        ` : ''}

        <div style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 0.65rem;">
          ${activeList.length > 0 ? activeList.map(h => {
            const isProfit = h.pnlPercent >= 0;
            return `
              <div class="highlight-stock-row" style="padding: 0.65rem 0.85rem;">
                <div style="min-width: 0;">
                  <div style="font-weight: 700; font-size: 0.92rem; display: flex; align-items: center; gap: 0.35rem;">
                    <span class="text-truncate" style="max-width: 150px;">${h.symbol}</span>
                    <span class="exchange-tag" style="font-size: 0.65rem; padding: 0.1rem 0.35rem;">${h.exchange || 'NSE'}</span>
                  </div>
                  <div style="font-size: 0.72rem; margin-top: 0.18rem; font-family: var(--font-mono); display: flex; align-items: center; gap: 0.35rem; color: var(--text-muted);">
                    <span>${h.quantity.toLocaleString()}</span>
                    <span style="opacity: 0.4;">|</span>
                    <span>Inv: <span style="color: var(--text-secondary);">${portfolioStore.formatMoney(h.invested, 0)}</span></span>
                  </div>
                </div>
                <div style="text-align: right; white-space: nowrap; flex-shrink: 0;">
                  <div style="font-weight: 700; font-family: var(--font-mono); font-size: 0.90rem; color: ${isProfit ? 'var(--bull-green)' : 'var(--bear-red)'}; display: flex; align-items: baseline; justify-content: flex-end; gap: 0.35rem;">
                    <span>${isProfit ? '+' : ''}${h.pnlPercent.toFixed(2)}%</span>
                    <span style="font-size: 0.78rem; font-weight: 600; opacity: 0.92;">(${isProfit ? '+' : '-'}${portfolioStore.formatMoney(Math.abs(h.pnl), 0)})</span>
                  </div>
                  <div style="font-size: 0.76rem; font-family: var(--font-mono); color: var(--text-primary); margin-top: 0.1rem;">
                    <span style="color: var(--text-muted); font-size: 0.68rem;">Current:</span> <strong>${portfolioStore.formatMoney(h.current, 0)}</strong>
                  </div>
                </div>
              </div>
            `;
          }).join('') : `
            <div style="padding: 1.5rem; text-align: center; color: var(--text-secondary); font-size: 0.85rem;">
              No ${currentTab === 'top' ? 'gainers' : currentTab === 'bottom' ? 'drawdown stocks' : 'holdings'} in portfolio yet.
            </div>
          `}

          <!-- Quick Navigation Link to Holdings -->
          <button id="btn-dashboard-header-view-holdings" class="btn btn-outline btn-sm" style="width: 100%; justify-content: center; margin-top: 0.5rem; gap: 0.4rem;">
            ${icons.layers}
            <span>View All ${totalCount} Holdings in Table</span>
            <span>→</span>
          </button>
        </div>
      </div>

      <!-- Card 2: All Stocks Profit vs Loss Breakdown -->
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

          <span class="brand-badge">${totalCount} Total Stocks</span>
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
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 0.85rem; margin-bottom: 0.85rem;">
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
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.6rem; font-family: var(--font-mono);">
              <div style="text-align: left;">
                <div style="font-size: 0.68rem; color: var(--text-muted); font-family: var(--font-heading); margin-bottom: 0.12rem;">TOTAL INVESTED</div>
                <strong style="color: var(--text-primary); font-size: 0.86rem;">${portfolioStore.formatMoney(profitInvested, 0)}</strong>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 0.68rem; color: var(--text-muted); font-family: var(--font-heading); margin-bottom: 0.12rem;">CURRENT VALUE</div>
                <strong style="color: var(--bull-green); font-size: 0.86rem;">${portfolioStore.formatMoney(profitCurrent, 0)}</strong>
              </div>
            </div>
            <div style="margin-top: 0.6rem; padding-top: 0.5rem; border-top: 1px solid rgba(16, 185, 129, 0.15); display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem;">
              <span style="color: var(--text-secondary);">Unrealized Gain:</span>
              <strong style="font-family: var(--font-mono); color: var(--bull-green); font-size: 0.84rem;">
                +${portfolioStore.formatMoney(profitNet, 0)} (+${profitNetPct.toFixed(2)}%)
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
            <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 0.6rem; font-family: var(--font-mono);">
              <div style="text-align: left;">
                <div style="font-size: 0.68rem; color: var(--text-muted); font-family: var(--font-heading); margin-bottom: 0.12rem;">TOTAL INVESTED</div>
                <strong style="color: var(--text-primary); font-size: 0.86rem;">${portfolioStore.formatMoney(lossInvested, 0)}</strong>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 0.68rem; color: var(--text-muted); font-family: var(--font-heading); margin-bottom: 0.12rem;">CURRENT VALUE</div>
                <strong style="color: var(--bear-red); font-size: 0.86rem;">${portfolioStore.formatMoney(lossCurrent, 0)}</strong>
              </div>
            </div>
            <div style="margin-top: 0.6rem; padding-top: 0.5rem; border-top: 1px solid rgba(239, 68, 68, 0.15); display: flex; justify-content: space-between; align-items: center; font-size: 0.74rem;">
              <span style="color: var(--text-secondary);">Unrealized Loss:</span>
              <strong style="font-family: var(--font-mono); color: var(--bear-red); font-size: 0.84rem;">
                ${portfolioStore.formatMoney(lossNet, 0)} (${lossNetPct.toFixed(2)}%)
              </strong>
            </div>
          </div>
        </div>

        <!-- Selector Buttons for In Profit / In Loss (Moved below Stocks in Loss card) -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.35rem; margin-bottom: 0.65rem; flex-wrap: wrap; gap: 0.5rem;">
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

          <span style="font-size: 0.74rem; color: var(--text-muted); font-family: var(--font-mono);">
            Showing ${activePnlList.length} of ${totalCount} Stocks
          </span>
        </div>

        <!-- Scrollable List of All Stocks in Active Tab -->
        <div class="pnl-stocks-scroll">
          ${activePnlList.length > 0 ? activePnlList.map(h => {
            const isProfit = h.pnlPercent >= 0;
            return `
              <div class="highlight-stock-row" style="padding: 0.65rem 0.85rem;">
                <div style="min-width: 0;">
                  <div style="font-weight: 700; font-size: 0.92rem; display: flex; align-items: center; gap: 0.35rem;">
                    <span class="text-truncate" style="max-width: 150px;">${h.symbol}</span>
                    <span class="exchange-tag" style="font-size: 0.65rem; padding: 0.1rem 0.35rem;">${h.exchange || 'NSE'}</span>
                  </div>
                  <div style="font-size: 0.72rem; margin-top: 0.18rem; font-family: var(--font-mono); display: flex; align-items: center; gap: 0.35rem; color: var(--text-muted);">
                    <span>${h.quantity.toLocaleString()}</span>
                    <span style="opacity: 0.4;">|</span>
                    <span>Inv: <span style="color: var(--text-secondary);">${portfolioStore.formatMoney(h.invested, 0)}</span></span>
                  </div>
                </div>
                <div style="text-align: right; white-space: nowrap; flex-shrink: 0;">
                  <div style="font-weight: 700; font-family: var(--font-mono); font-size: 0.90rem; color: ${isProfit ? 'var(--bull-green)' : 'var(--bear-red)'}; display: flex; align-items: baseline; justify-content: flex-end; gap: 0.35rem;">
                    <span>${isProfit ? '+' : ''}${h.pnlPercent.toFixed(2)}%</span>
                    <span style="font-size: 0.78rem; font-weight: 600; opacity: 0.92;">(${isProfit ? '+' : '-'}${portfolioStore.formatMoney(Math.abs(h.pnl), 0)})</span>
                  </div>
                  <div style="font-size: 0.76rem; font-family: var(--font-mono); color: var(--text-primary); margin-top: 0.1rem;">
                    <span style="color: var(--text-muted); font-size: 0.68rem;">Current:</span> <strong>${portfolioStore.formatMoney(h.current, 0)}</strong>
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
      toast.style.transform = 'translateY(-10px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 4000);
  }

  destroy() {
    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize);
    }
    const tooltip = document.getElementById('market-carpet-tooltip');
    if (tooltip) {
      tooltip.remove();
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
