// Holdings View - Dedicated Page for Portfolio Stock Holdings List
import { portfolioStore } from '../state/portfolioStore.js';
import { authService } from '../services/authService.js';
import { liveMarketService } from '../services/liveMarketService.js';
import { SECTORS, calculateStockRSI } from '../data/stocksDatabase.js';

const icons = {
  refreshCw: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"></path><path d="M16 21h5v-5"></path></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  trash2: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
  search: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>`,
  layers: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>`,
  checkCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  chevronDown: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>`,
  chevronLeft: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>`,
  chevronRight: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>`
};

export class HoldingsView {
  constructor(container, onNavigateToAddHolding, onNavigateToStockDetail) {
    this.container = container;
    this.onNavigateToAddHolding = onNavigateToAddHolding;
    this.onNavigateToStockDetail = onNavigateToStockDetail;
    this.searchTerm = '';
    this.selectedSector = 'ALL';
    this.sortBy = 'value-desc';
    this.pageSize = 10;
    this.currentPage = 1;

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
  }

  renderSkeleton() {
    this.container.innerHTML = `
      <!-- Page Header -->
      <div class="page-title-row">
        <div>
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <h1 class="page-title">My Stock Holdings</h1>
            <span class="brand-badge" id="holdings-header-count">0 Assets</span>
          </div>
          <p class="page-subtitle">Real-time market valuation, average buy prices, live CMP, and profit/loss breakdown</p>
        </div>
        <div class="page-header-actions">
          <button id="btn-holdings-auto-refresh" class="btn btn-outline btn-sm ${liveMarketService.isAutoRefreshActive ? 'active-pulse' : ''}" title="Toggle 30s Auto Refresh during market hours" style="gap: 6px;">
            <span class="live-dot ${liveMarketService.isAutoRefreshActive ? 'pulse-green' : 'dim'}" style="font-size: 0.75rem;">●</span>
            <span id="holdings-auto-refresh-label">Auto-Sync: ${liveMarketService.isAutoRefreshActive ? 'ON' : 'OFF'}</span>
          </button>
          <button id="btn-holdings-sync-market" class="btn btn-outline btn-sm" title="Refresh Live Quotes">
            ${icons.refreshCw}
            <span id="holdings-sync-market-label">Sync Market</span>
          </button>
          <button id="btn-holdings-add" class="btn btn-primary btn-sm">
            ${icons.plus}
            <span>Add Holdings</span>
          </button>
        </div>
      </div>

      <!-- Quick Summary Pills -->
      <div class="holdings-summary-banner" id="holdings-summary-banner">
        <!-- Dynamically injected -->
      </div>

      <!-- Holdings Container -->
      <div class="holdings-container">
        <div class="holdings-toolbar">
          <div class="toolbar-left">
            <div class="search-input-box">
              ${icons.search}
              <input type="text" id="holdings-page-search" class="search-input" placeholder="Search by symbol or company...">
            </div>
            <select id="holdings-page-sector-filter" class="filter-select">
              <option value="ALL">All Sectors</option>
              ${SECTORS.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div class="toolbar-right" style="display: flex; gap: 0.5rem; align-items: center;">
            <select id="holdings-page-sort-filter" class="filter-select">
              <option value="value-desc">Sort by: Highest Value</option>
              <option value="value-asc">Sort by: Lowest Value</option>
              <option value="pnl-desc">Sort by: Highest Profit %</option>
              <option value="pnl-asc">Sort by: Lowest Profit %</option>
              <option value="day-desc">Sort by: Top Day Gainers</option>
              <option value="symbol-asc">Sort by: Symbol A-Z</option>
            </select>
            <button id="btn-holdings-clear-all" class="btn btn-outline btn-sm" style="color: var(--bear-red); border-color: rgba(239, 68, 68, 0.35); font-size: 0.8rem; padding: 0.35rem 0.65rem;" title="Delete all shares from portfolio and database">
              ${icons.trash2}
              <span>Clear All</span>
            </button>
          </div>
        </div>

        <!-- Desktop Table View -->
        <div class="table-responsive">
          <table class="holdings-table">
            <thead>
              <tr>
                <th>Stock / Company</th>
                <th>Exchange</th>
                <th style="text-align: right;">Shares (Qty)</th>
                <th style="text-align: right;">Avg. Price</th>
                <th style="text-align: right; white-space: nowrap;">CMP (Live)</th>
                <th style="min-width: 260px; width: 290px;">Ranges & RSI (Day, 52W, RSI)</th>
                <th style="text-align: right;">Total Invested</th>
                <th style="text-align: right;">Current Value</th>
                <th style="text-align: right;">Day's Change</th>
                <th style="text-align: right;">Total P&L</th>
                <th>Weight</th>
                <th style="text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody id="holdings-page-tbody">
              <!-- Dynamically injected -->
            </tbody>
          </table>
        </div>

        <!-- Mobile Card View -->
        <div class="mobile-holdings-list" id="holdings-page-mobile-list">
          <!-- Dynamically injected -->
        </div>

        <!-- Progressive Pagination / Load More Bar -->
        <div class="holdings-pagination-bar" id="holdings-pagination-bar">
          <!-- Dynamically injected -->
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Add Holdings Button
    const btnAdd = this.container.querySelector('#btn-holdings-add');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        if (this.onNavigateToAddHolding) this.onNavigateToAddHolding();
      });
    }

    // Auto Refresh Toggle Button
    const btnAutoRefresh = this.container.querySelector('#btn-holdings-auto-refresh');
    const autoLabel = this.container.querySelector('#holdings-auto-refresh-label');
    const dot = btnAutoRefresh?.querySelector('.live-dot');
    if (btnAutoRefresh) {
      btnAutoRefresh.addEventListener('click', () => {
        const isActive = liveMarketService.toggleAutoRefresh();
        if (isActive) {
          btnAutoRefresh.classList.add('active-pulse');
          if (autoLabel) autoLabel.textContent = 'Auto-Sync: ON';
          if (dot) { dot.classList.add('pulse-green'); dot.classList.remove('dim'); }
          portfolioStore.refreshMarketQuotes();
        } else {
          btnAutoRefresh.classList.remove('active-pulse');
          if (autoLabel) autoLabel.textContent = 'Auto-Sync: OFF';
          if (dot) { dot.classList.remove('pulse-green'); dot.classList.add('dim'); }
        }
      });
    }

    // Refresh Quotes Button
    const btnRefresh = this.container.querySelector('#btn-holdings-sync-market');
    const syncLabel = this.container.querySelector('#holdings-sync-market-label');
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

    // Search Input
    const searchInput = this.container.querySelector('#holdings-page-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.toLowerCase().trim();
        this.currentPage = 1;
        this.renderHoldingsTableAndCards();
      });
    }

    // Sector Filter
    const sectorFilter = this.container.querySelector('#holdings-page-sector-filter');
    if (sectorFilter) {
      sectorFilter.addEventListener('change', (e) => {
        this.selectedSector = e.target.value;
        this.currentPage = 1;
        this.renderHoldingsTableAndCards();
      });
    }

    // Sort Filter
    const sortFilter = this.container.querySelector('#holdings-page-sort-filter');
    if (sortFilter) {
      sortFilter.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this.currentPage = 1;
        this.renderHoldingsTableAndCards();
      });
    }

    // Clear All Holdings Button
    const btnClearAll = this.container.querySelector('#btn-holdings-clear-all');
    if (btnClearAll) {
      btnClearAll.addEventListener('click', async () => {
        if (!portfolioStore.holdings || portfolioStore.holdings.length === 0) {
          alert('Your portfolio is already empty.');
          return;
        }

        const count = portfolioStore.holdings.length;
        const txCount = portfolioStore.transactions ? portfolioStore.transactions.length : 0;
        const txInfo = txCount > 0 ? ` and all ${txCount} transaction history & order records` : ' and all order history';
        const confirmed = confirm(
          `WARNING: This will permanently delete all ${count} holdings${txInfo} from your portfolio.\n\nAre you sure you want to proceed?`
        );

        if (!confirmed) return;

        btnClearAll.disabled = true;
        btnClearAll.textContent = 'Clearing...';

        try {
          if (typeof portfolioStore.clearAllHoldings === 'function') {
            await portfolioStore.clearAllHoldings();
          } else if (typeof portfolioStore.clearAllData === 'function') {
            await portfolioStore.clearAllData();
          } else {
            throw new Error('Clear holdings method is not available in portfolio store.');
          }
          this.showToast('All holdings, transaction history, and orders cleared successfully.', 'info');
        } catch (err) {
          console.error('Error clearing holdings:', err);
          alert('Failed to clear holdings: ' + err.message);
        } finally {
          btnClearAll.disabled = false;
          btnClearAll.innerHTML = `${icons.trash2} <span>Clear All</span>`;
        }
      });
    }

    // Delegate Table & Card Action Clicks
    this.container.addEventListener('click', async (e) => {
      // Pagination page navigation click
      const pageBtn = e.target.closest('[data-page]');
      if (pageBtn && !pageBtn.disabled) {
        const targetPage = parseInt(pageBtn.getAttribute('data-page'), 10);
        if (!isNaN(targetPage) && targetPage >= 1 && targetPage !== this.currentPage) {
          this.currentPage = targetPage;
          this.renderHoldingsTableAndCards();
          const tableWrap = this.container.querySelector('.holdings-table-wrap');
          if (tableWrap) {
            tableWrap.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
        return;
      }

      // Delete holding
      const deleteBtn = e.target.closest('[data-action="delete-holding"]');
      if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-id');
        const symbol = deleteBtn.getAttribute('data-symbol');
        if (confirm(`Are you sure you want to remove ${symbol} from your portfolio?`)) {
          deleteBtn.disabled = true;
          await portfolioStore.deleteHolding(id, symbol);
        }
        return;
      }

      // Buy more / Average Price Calculator for this stock
      const buyMoreBtn = e.target.closest('[data-action="buy-more"]');
      if (buyMoreBtn) {
        const symbol = buyMoreBtn.getAttribute('data-symbol');
        if (symbol && this.onNavigateToStockDetail) {
          this.onNavigateToStockDetail(symbol);
        }
        return;
      }

      // Click on Stock row or mobile card to view dedicated Stock Detail page
      const row = e.target.closest('tr[data-symbol]');
      const card = e.target.closest('.holding-mobile-card[data-symbol]');
      const targetEl = row || card;
      if (targetEl && !e.target.closest('button')) {
        const symbol = targetEl.getAttribute('data-symbol');
        if (symbol && this.onNavigateToStockDetail) {
          this.onNavigateToStockDetail(symbol);
        }
      }
    });
  }

  update(event = {}) {
    const metrics = portfolioStore.getPortfolioMetrics();
    this.renderHeaderCount(metrics);
    this.renderSummaryBanner(metrics);
    this.renderHoldingsTableAndCards(metrics, event);
  }

  renderHeaderCount(metrics) {
    const countEl = this.container.querySelector('#holdings-header-count');
    if (countEl) {
      countEl.textContent = `${metrics.totalHoldingsCount} Assets`;
    }
  }

  renderSummaryBanner(metrics) {
    const banner = this.container.querySelector('#holdings-summary-banner');
    if (!banner) return;

    if (metrics.totalHoldingsCount === 0) {
      banner.style.display = 'none';
      return;
    }

    banner.style.display = 'flex';
    const isTotalProfit = metrics.totalPnL >= 0;
    const isDayProfit = metrics.totalDayPnL >= 0;

    banner.innerHTML = `
      <div class="summary-pill-item">
        <span class="pill-label">Total Value</span>
        <span class="pill-val">${portfolioStore.formatMoney(metrics.totalCurrentValue)}</span>
      </div>
      <div class="summary-pill-item">
        <span class="pill-label">Total Invested</span>
        <span class="pill-val">${portfolioStore.formatMoney(metrics.totalInvested)}</span>
      </div>
      <div class="summary-pill-item">
        <span class="pill-label">Total P&L</span>
        <span class="pill-val ${isTotalProfit ? 'bull' : 'bear'}">
          ${isTotalProfit ? '+' : ''}${portfolioStore.formatMoney(metrics.totalPnL)} (${isTotalProfit ? '+' : ''}${metrics.totalPnLPercent.toFixed(2)}%)
        </span>
      </div>
      <div class="summary-pill-item">
        <span class="pill-label">Day's P&L</span>
        <span class="pill-val ${isDayProfit ? 'bull' : 'bear'}">
          ${isDayProfit ? '+' : ''}${portfolioStore.formatMoney(metrics.totalDayPnL)} (${isDayProfit ? '+' : ''}${metrics.totalDayPnLPercent.toFixed(2)}%)
        </span>
      </div>
    `;
  }

  renderRangeIndicator(h) {
    const cmp = Number(h.cmp) || 0;
    const myPrice = Number(h.avgPrice) || 0;

    // Day Range
    let dayLow = Number(h.dayLow) || Number(h.low) || (cmp * 0.985);
    let dayHigh = Number(h.dayHigh) || Number(h.high) || (cmp * 1.015);
    if (dayHigh <= dayLow) dayHigh = dayLow + (dayLow * 0.02 || 1);

    const daySpan = dayHigh - dayLow;
    const dayCmpPct = Math.max(3, Math.min(97, ((cmp - dayLow) / daySpan) * 100));
    const dayMyPct = ((myPrice - dayLow) / daySpan) * 100;
    const isDayMyBelow = myPrice < dayLow;
    const isDayMyAbove = myPrice > dayHigh;
    const dayClampedMyPct = Math.max(3, Math.min(97, dayMyPct));
    const dayFillLeft = Math.min(dayCmpPct, dayClampedMyPct);
    const dayFillWidth = Math.max(1, Math.abs(dayCmpPct - dayClampedMyPct));

    // 52-Week Range
    let w52Low = Number(h.week52Low) || (cmp * 0.75);
    let w52High = Number(h.week52High) || (cmp * 1.25);
    if (w52High <= w52Low) w52High = w52Low + (w52Low * 0.1 || 1);

    const w52Span = w52High - w52Low;
    const w52CmpPct = Math.max(0, Math.min(100, ((cmp - w52Low) / w52Span) * 100));
    const w52MyPct = ((myPrice - w52Low) / w52Span) * 100;
    const isW52MyBelow = myPrice < w52Low;
    const isW52MyAbove = myPrice > w52High;
    const isW52MyOutside = isW52MyBelow || isW52MyAbove;
    const isProfit = cmp >= myPrice;

    // Fill calculation on the 52W line
    let w52FillLeft = 0;
    let w52FillWidth = 0;
    if (isW52MyBelow) {
      // Below 52W Low: stock has been in profit across the entire 52W range from Low (0%) to CMP
      w52FillLeft = 0;
      w52FillWidth = Math.max(1, w52CmpPct);
    } else if (isW52MyAbove) {
      // Above 52W High: stock has been in loss across the entire 52W range from CMP to High (100%)
      w52FillLeft = w52CmpPct;
      w52FillWidth = Math.max(1, 100 - w52CmpPct);
    } else {
      // In range: fill between My Price and CMP
      const clampedMy = Math.max(0, Math.min(100, w52MyPct));
      w52FillLeft = Math.min(w52CmpPct, clampedMy);
      w52FillWidth = Math.max(1, Math.abs(w52CmpPct - clampedMy));
    }
    const w52InRailMyPct = Math.max(2, Math.min(98, w52MyPct));

    // 3. 14-Period Relative Strength Index (RSI)
    const rsi = calculateStockRSI(h);
    const clampedRsiPct = Math.max(3, Math.min(97, rsi));

    let rsiSentiment = 'Neutral';
    let rsiClass = 'rsi-neutral';
    if (rsi >= 70) {
      rsiSentiment = 'Overbought';
      rsiClass = 'rsi-overbought';
    } else if (rsi <= 30) {
      rsiSentiment = 'Oversold';
      rsiClass = 'rsi-oversold';
    } else if (rsi >= 58) {
      rsiSentiment = 'Bullish';
      rsiClass = 'rsi-bullish';
    } else if (rsi < 42) {
      rsiSentiment = 'Weak';
      rsiClass = 'rsi-bearish';
    }

    const is52wClose = !isW52MyOutside && myPrice > 0 && Math.abs(w52CmpPct - w52InRailMyPct) < 18;

    const getPinLabelTransform = (pct) => {
      if (pct < 20) return 'translateX(0%)';
      if (pct > 80) return 'translateX(-100%)';
      return 'translateX(-50%)';
    };

    const dayCmpTransform = getPinLabelTransform(dayCmpPct);
    const w52CmpTransform = getPinLabelTransform(w52CmpPct);
    const w52MyTransform = getPinLabelTransform(w52InRailMyPct);
    const rsiTransform = getPinLabelTransform(clampedRsiPct);

    return `
      <div class="range-dual-widget" title="${h.symbol}: Day Range, 52-Week Range & RSI (14)">
        <!-- 1. Day Range Row -->
        <div class="range-sub-row range-day-row">
          <div class="range-header-line">
            <div class="range-header-left">
              <span class="range-badge badge-day">DAY</span>
            </div>
            <div class="range-header-right">
              <span class="range-live-val val-cmp" title="Current Market Price (CMP): ${portfolioStore.formatMoney(cmp)}">
                <span class="val-dot dot-cmp"></span>
                <span class="val-label">CMP</span>
                <span class="val-num">${portfolioStore.formatMoney(cmp)}</span>
              </span>
            </div>
          </div>
          <div class="range-bar-track" title="Today's Range: Low ${portfolioStore.formatMoney(dayLow)} — High ${portfolioStore.formatMoney(dayHigh)} | CMP: ${portfolioStore.formatMoney(cmp)}">
            <div class="range-track-inner">
              <div class="range-track-rail">
                <div class="range-track-fill fill-day-cmp" style="left: 0; width: ${dayCmpPct.toFixed(1)}%;"></div>
              </div>
              <div class="range-pin pin-cmp" style="left: ${dayCmpPct.toFixed(1)}%;" title="Current Price (CMP): ${portfolioStore.formatMoney(cmp)}">
                <span class="pin-marker-circle"></span>
              </div>
            </div>
          </div>
          <div class="range-bounds-line">
            <span class="range-bound-val bound-low" title="Today's Low">
              <span class="bound-tag">L</span>${portfolioStore.formatMoney(dayLow)}
            </span>
            <span class="range-bound-val bound-high" title="Today's High">
              <span class="bound-tag">H</span>${portfolioStore.formatMoney(dayHigh)}
            </span>
          </div>
        </div>

        <!-- 2. 52-Week Range Row -->
        <div class="range-sub-row range-52w-row">
          <div class="range-header-line">
            <div class="range-header-left">
              <span class="range-badge badge-52w">52W</span>
              ${myPrice > 0 ? `
                <span class="range-pill-mini ${isProfit ? 'pill-profit' : 'pill-loss'}" title="My Avg Buy Price: ${portfolioStore.formatMoney(myPrice)} ${isW52MyBelow ? '(Below 52W Low)' : (isW52MyAbove ? '(Above 52W High)' : '')}">
                  <span class="val-dot"></span>
                  Avg ${portfolioStore.formatMoney(myPrice)}
                  ${isW52MyBelow ? '<span class="outside-chevron-mini">◀</span>' : (isW52MyAbove ? '<span class="outside-chevron-mini">▶</span>' : '')}
                </span>
              ` : ''}
            </div>
            <div class="range-header-right">
              <span class="range-live-val val-cmp" title="Current Market Price (CMP): ${portfolioStore.formatMoney(cmp)}">
                <span class="val-dot dot-cmp"></span>
                <span class="val-label">CMP</span>
                <span class="val-num">${portfolioStore.formatMoney(cmp)}</span>
              </span>
            </div>
          </div>

          <div class="range-bar-track ${isW52MyBelow && myPrice > 0 ? 'has-outside-left' : ''} ${isW52MyAbove && myPrice > 0 ? 'has-outside-right' : ''}" title="52W Low: ${portfolioStore.formatMoney(w52Low)} | CMP: ${portfolioStore.formatMoney(cmp)} | 52W High: ${portfolioStore.formatMoney(w52High)} | My Price: ${portfolioStore.formatMoney(myPrice)}">
            ${isW52MyBelow && myPrice > 0 ? `
              <div class="range-outside-slot slot-left" title="Avg Price (${portfolioStore.formatMoney(myPrice)}) is below 52-Week Low (${portfolioStore.formatMoney(w52Low)})">
                <div class="range-pin pin-my pin-my-outside pin-my-below ${isProfit ? 'profit-pin' : 'loss-pin'}">
                  <span class="outside-chevron">◀</span>
                  <span class="pin-marker-diamond"></span>
                </div>
                <div class="outside-connector connector-left ${isProfit ? 'profit' : 'loss'}"></div>
              </div>
            ` : ''}

            <div class="range-track-inner">
              <div class="range-track-rail">
                <div class="range-track-fill ${isProfit ? 'fill-profit' : 'fill-loss'}" style="left: ${w52FillLeft.toFixed(1)}%; width: ${w52FillWidth.toFixed(1)}%;"></div>
              </div>
              ${!isW52MyOutside && myPrice > 0 ? `
                <div class="range-pin pin-my ${isProfit ? 'profit-pin' : 'loss-pin'}" 
                     style="left: ${w52InRailMyPct.toFixed(1)}%;" 
                     title="My Avg Price: ${portfolioStore.formatMoney(myPrice)}">
                  <span class="pin-marker-diamond"></span>
                </div>
              ` : ''}
              <div class="range-pin pin-cmp" style="left: ${w52CmpPct.toFixed(1)}%;" title="CMP: ${portfolioStore.formatMoney(cmp)}">
                <span class="pin-marker-circle"></span>
              </div>
            </div>

            ${isW52MyAbove && myPrice > 0 ? `
              <div class="range-outside-slot slot-right" title="Avg Price (${portfolioStore.formatMoney(myPrice)}) is above 52-Week High (${portfolioStore.formatMoney(w52High)})">
                <div class="outside-connector connector-right ${isProfit ? 'profit' : 'loss'}"></div>
                <div class="range-pin pin-my pin-my-outside pin-my-above ${isProfit ? 'profit-pin' : 'loss-pin'}">
                  <span class="pin-marker-diamond"></span>
                  <span class="outside-chevron">▶</span>
                </div>
              </div>
            ` : ''}
          </div>

          <div class="range-bounds-line">
            <span class="range-bound-val bound-low" title="52-Week Low">
              <span class="bound-tag">L</span>${portfolioStore.formatMoney(w52Low)}
            </span>
            <span class="range-bound-val bound-high" title="52-Week High">
              <span class="bound-tag">H</span>${portfolioStore.formatMoney(w52High)}
            </span>
          </div>
        </div>

        <!-- 3. RSI Row -->
        <div class="range-sub-row range-rsi-row">
          <div class="range-header-line">
            <div class="range-header-left">
              <span class="range-badge badge-rsi">RSI</span>
            </div>
            <div class="range-header-right">
              <span class="range-rsi-pill ${rsiClass}" title="RSI (14-Period): ${rsi.toFixed(1)} (${rsiSentiment})">
                <span class="rsi-dot ${rsiClass}"></span>
                <span class="rsi-num">${rsi.toFixed(1)}</span>
                <span class="rsi-text">${rsiSentiment}</span>
              </span>
            </div>
          </div>

          <div class="range-bar-track" title="14-Period RSI: ${rsi.toFixed(1)} | Sentiment: ${rsiSentiment} | Oversold: <=30 | Overbought: >=70">
            <div class="range-track-inner">
              <div class="range-track-rail range-track-rail-rsi">
                <div class="rsi-zone-divider" style="left: 30%;" title="Oversold (30)"></div>
                <div class="rsi-zone-divider" style="left: 70%;" title="Overbought (70)"></div>
                <div class="range-track-fill fill-rsi ${rsiClass}" style="left: 0; width: ${clampedRsiPct.toFixed(1)}%;"></div>
              </div>
              <div class="range-pin pin-rsi ${rsiClass}" style="left: ${clampedRsiPct.toFixed(1)}%;" title="RSI (14): ${rsi.toFixed(1)} (${rsiSentiment})">
                <span class="pin-marker-rsi"></span>
              </div>
            </div>
          </div>

          <div class="range-bounds-line">
            <span class="range-bound-val bound-low" title="Oversold Threshold (<=30)">
              <span class="bound-tag">OS</span>30
            </span>
            <span class="range-bound-val bound-high" title="Overbought Threshold (>=70)">
              <span class="bound-tag">OB</span>70
            </span>
          </div>
        </div>
      </div>
    `;
  }

  renderHoldingsTableAndCards(metrics = portfolioStore.getPortfolioMetrics(), event = {}) {
    const tbody = this.container.querySelector('#holdings-page-tbody');
    const mobileList = this.container.querySelector('#holdings-page-mobile-list');
    const paginationBar = this.container.querySelector('#holdings-pagination-bar');
    if (!tbody || !mobileList) return;

    // Filter
    let filtered = metrics.holdings.filter(h => {
      const matchSearch = this.searchTerm === '' || 
        h.symbol.toLowerCase().includes(this.searchTerm) || 
        h.name.toLowerCase().includes(this.searchTerm);
      const matchSector = this.selectedSector === 'ALL' || h.sector === this.selectedSector;
      return matchSearch && matchSector;
    });

    // Sort
    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'value-desc': return b.current - a.current;
        case 'value-asc': return a.current - b.current;
        case 'pnl-desc': return b.pnlPercent - a.pnlPercent;
        case 'pnl-asc': return a.pnlPercent - b.pnlPercent;
        case 'day-desc': return b.dayChangePercent - a.dayChangePercent;
        case 'symbol-asc': return a.symbol.localeCompare(b.symbol);
        default: return 0;
      }
    });

    if (filtered.length === 0) {
      const emptyHtml = `
        <div class="empty-state">
          <div class="empty-state-icon">${icons.layers}</div>
          <h3>No matching holdings found</h3>
          <p style="margin-top: 0.35rem; font-size: 0.85rem;">Try modifying your search or click "Add Holdings" to add stocks to your portfolio.</p>
        </div>
      `;
      tbody.innerHTML = `<tr><td colspan="12">${emptyHtml}</td></tr>`;
      mobileList.innerHTML = emptyHtml;
      if (paginationBar) paginationBar.innerHTML = '';
      return;
    }

    const totalCount = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalCount / this.pageSize));
    if (this.currentPage > totalPages) this.currentPage = totalPages;
    if (this.currentPage < 1) this.currentPage = 1;

    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, totalCount);
    const displayedHoldings = filtered.slice(startIndex, endIndex);

    // Check if event was a tick or sync to trigger pulse animation on CMP
    const tickSymbol = event.type === 'PRICE_TICK' && event.tick ? event.tick.symbol : null;
    const tickDirection = event.type === 'PRICE_TICK' && event.tick ? event.tick.direction : null;
    const isMarketSynced = event.type === 'MARKET_QUOTES_UPDATED';

    // Render Desktop Rows (paginated)
    tbody.innerHTML = displayedHoldings.map(h => {
      const isProfit = h.pnl >= 0;
      const isDayProfit = h.dayPnL >= 0;
      const isTicking = tickSymbol === h.symbol;
      const isSynced = isMarketSynced && event.quotes && event.quotes[h.symbol];
      const tickClass = isTicking ? (tickDirection === 'up' ? 'tick-up' : 'tick-down') : (isSynced ? 'tick-up' : '');
      const rowSyncClass = isSynced ? 'row-synced' : '';

      return `
        <tr data-symbol="${h.symbol}" class="${rowSyncClass}">
          <td>
            <div class="stock-identity">
              <div class="stock-symbol-chip">${h.symbol.substring(0, 3)}</div>
              <div class="stock-names">
                <span class="stock-sym">
                  ${h.symbol}
                  <span class="exchange-tag">${h.exchange || 'NSE'}</span>
                </span>
                <span class="stock-full-name" title="${h.name}">${h.name}</span>
              </div>
            </div>
          </td>
          <td>
            <span style="color: var(--text-secondary); font-size: 0.82rem;">${h.sector || 'Equity'}</span>
          </td>
          <td style="text-align: right;">
            <div class="num-cell">${h.quantity.toLocaleString()}</div>
            <div class="num-cell sub">shares</div>
          </td>
          <td style="text-align: right;">
            <div class="num-cell">${portfolioStore.formatMoney(h.avgPrice)}</div>
          </td>
          <td style="text-align: right; white-space: nowrap;">
            <div class="num-cell cmp-cell ${tickClass}">${portfolioStore.formatMoney(h.cmp)}</div>
          </td>
          <td style="min-width: 260px; width: 290px; vertical-align: middle;">
            ${this.renderRangeIndicator(h)}
          </td>
          <td style="text-align: right;">
            <div class="num-cell">${portfolioStore.formatMoney(h.invested)}</div>
          </td>
          <td style="text-align: right;">
            <div class="num-cell" style="font-weight: 700;">${portfolioStore.formatMoney(h.current)}</div>
          </td>
          <td style="text-align: right;">
            <div class="num-cell" style="color: ${isDayProfit ? 'var(--bull-green)' : 'var(--bear-red)'}; font-size: 0.84rem;">
              ${isDayProfit ? '+' : ''}${h.dayChangePercent.toFixed(2)}%
            </div>
            <div class="num-cell sub" style="color: ${isDayProfit ? 'var(--bull-green)' : 'var(--bear-red)'};">
              ${isDayProfit ? '+' : ''}${portfolioStore.formatMoney(h.dayPnL)}
            </div>
          </td>
          <td style="text-align: right;">
            <div class="return-badge ${isProfit ? 'bull' : 'bear'}">
              ${isProfit ? '+' : ''}${portfolioStore.formatMoney(h.pnl)}
              (${isProfit ? '+' : ''}${h.pnlPercent.toFixed(2)}%)
            </div>
          </td>
          <td>
            <div class="weight-bar-box">
              <div style="font-size: 0.8rem; font-family: var(--font-mono); text-align: right; color: var(--text-secondary);">
                ${h.weight.toFixed(1)}%
              </div>
              <div class="weight-track">
                <div class="weight-fill" style="width: ${Math.min(100, Math.max(3, h.weight))}%;"></div>
              </div>
            </div>
          </td>
          <td style="text-align: center;">
            <div class="table-actions" style="justify-content: center;">
              <button class="btn btn-outline btn-sm" data-action="buy-more" data-symbol="${h.symbol}" title="Open Average Price Calculator (${h.symbol})">
                ${icons.plus} Average
              </button>
              <button class="icon-action-btn delete-btn" data-action="delete-holding" data-id="${h.id}" data-symbol="${h.symbol}" title="Delete ${h.symbol}">
                ${icons.trash2}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Render Mobile Cards (paginated)
    mobileList.innerHTML = displayedHoldings.map(h => {
      const isProfit = h.pnl >= 0;
      const isDayProfit = h.dayPnL >= 0;
      const isTicking = tickSymbol === h.symbol;
      const isSynced = isMarketSynced && event.quotes && event.quotes[h.symbol];
      const tickClass = isTicking ? (tickDirection === 'up' ? 'tick-up' : 'tick-down') : (isSynced ? 'tick-up' : '');
      const cardSyncClass = isSynced ? 'card-synced' : '';

      return `
        <div class="holding-mobile-card ${cardSyncClass}" data-symbol="${h.symbol}" title="Click to view ${h.symbol} transactions & details">
          <div class="mobile-card-top">
            <div class="stock-identity">
              <div class="stock-symbol-chip">${h.symbol.substring(0, 3)}</div>
              <div class="stock-names">
                <div class="stock-sym">
                  ${h.symbol}
                  <span class="exchange-tag">${h.exchange || 'NSE'}</span>
                </div>
                <span class="stock-full-name">${h.name}</span>
              </div>
            </div>
            <div style="text-align: right;">
              <div class="num-cell cmp-cell ${tickClass}" style="font-size: 1.05rem;">
                ${portfolioStore.formatMoney(h.cmp)}
              </div>
              <div style="font-size: 0.75rem; font-family: var(--font-mono); color: ${isDayProfit ? 'var(--bull-green)' : 'var(--bear-red)'};">
                ${isDayProfit ? '+' : ''}${h.dayChangePercent.toFixed(2)}%
              </div>
            </div>
          </div>

          <div class="mobile-card-metrics">
            <div class="mobile-metric-item">
              <span class="mobile-metric-label">Shares Held</span>
              <span class="mobile-metric-value">${h.quantity.toLocaleString()}</span>
            </div>
            <div class="mobile-metric-item">
              <span class="mobile-metric-label">Avg. Buy Price</span>
              <span class="mobile-metric-value">${portfolioStore.formatMoney(h.avgPrice)}</span>
            </div>
            <div class="mobile-metric-item">
              <span class="mobile-metric-label">Total Invested</span>
              <span class="mobile-metric-value">${portfolioStore.formatMoney(h.invested)}</span>
            </div>
            <div class="mobile-metric-item">
              <span class="mobile-metric-label">Current Value</span>
              <span class="mobile-metric-value" style="color: var(--text-primary);">${portfolioStore.formatMoney(h.current)}</span>
            </div>
          </div>

          <!-- Price Ranges Indicator Section (Day, 52-Week & RSI) -->
          <div class="mobile-range-card-section">
            <div class="mobile-range-title">
              <span>Day, 52-Week & RSI Ranges</span>
              <span class="range-pin-legend">
                <span class="legend-chip legend-cmp">● CMP</span>
                <span class="legend-chip legend-my">◆ My Avg</span>
                <span class="legend-chip legend-rsi">● RSI</span>
              </span>
            </div>
            ${this.renderRangeIndicator(h)}
          </div>

          <div class="mobile-card-bottom">
            <div class="return-badge ${isProfit ? 'bull' : 'bear'}">
              P&L: ${isProfit ? '+' : ''}${portfolioStore.formatMoney(h.pnl)} (${isProfit ? '+' : ''}${h.pnlPercent.toFixed(2)}%)
            </div>
            <div class="table-actions">
              <button class="btn btn-outline btn-sm" data-action="buy-more" data-symbol="${h.symbol}" title="Open Average Price Calculator (${h.symbol})">
                ${icons.plus} Average Calculator
              </button>
              <button class="icon-action-btn delete-btn" data-action="delete-holding" data-id="${h.id}" data-symbol="${h.symbol}">
                ${icons.trash2}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Render Page-Based Pagination Bar (Max 10 shares per page)
    if (paginationBar) {
      if (totalCount > this.pageSize) {
        // Build page buttons array (with ellipsis for large counts)
        const pages = [];
        for (let p = 1; p <= totalPages; p++) {
          if (
            p === 1 || 
            p === totalPages || 
            (p >= this.currentPage - 1 && p <= this.currentPage + 1)
          ) {
            pages.push(p);
          } else if (pages[pages.length - 1] !== '...') {
            pages.push('...');
          }
        }

        const pagesHtml = pages.map(p => {
          if (p === '...') {
            return `<span class="pagination-ellipsis">…</span>`;
          }
          const isActive = p === this.currentPage;
          return `
            <button 
              type="button" 
              class="pagination-page-pill ${isActive ? 'active' : ''}" 
              data-page="${p}" 
              ${isActive ? 'aria-current="page"' : ''}
              title="Page ${p}"
            >
              ${p}
            </button>
          `;
        }).join('');

        paginationBar.innerHTML = `
          <div class="pagination-status-text">
            Showing <strong>${startIndex + 1}–${endIndex}</strong> of <strong>${totalCount}</strong> shares (Page ${this.currentPage} of ${totalPages})
          </div>
          <div class="pagination-controls-row">
            <button 
              type="button" 
              class="pagination-nav-btn" 
              data-page="${this.currentPage - 1}" 
              ${this.currentPage <= 1 ? 'disabled' : ''} 
              title="Previous 10 Shares"
            >
              ${icons.chevronLeft}
              <span>Prev</span>
            </button>
            <div class="pagination-pages-list">
              ${pagesHtml}
            </div>
            <button 
              type="button" 
              class="pagination-nav-btn" 
              data-page="${this.currentPage + 1}" 
              ${this.currentPage >= totalPages ? 'disabled' : ''} 
              title="Next 10 Shares"
            >
              <span>Next</span>
              ${icons.chevronRight}
            </button>
          </div>
        `;
      } else {
        paginationBar.innerHTML = `
          <div class="pagination-status-text">
            Showing all <strong>${totalCount}</strong> shares
          </div>
        `;
      }
    }
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
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
