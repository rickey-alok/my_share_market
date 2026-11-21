// Holdings View - Dedicated Page for Portfolio Stock Holdings List
import { portfolioStore } from '../state/portfolioStore.js';
import { authService } from '../services/authService.js';
import { liveMarketService } from '../services/liveMarketService.js';
import { calculateStockRSI, calculateStockVolumeMetrics } from '../data/stocksDatabase.js';

import { icons } from '../utils/icons.js';
import { AverageCalculatorModal } from './averageCalculatorModal.js';

export class HoldingsView {
  constructor(container, onNavigateToAddHolding) {
    this.container = container;
    this.onNavigateToAddHolding = onNavigateToAddHolding;
    this.averageModal = new AverageCalculatorModal();
    this.searchTerm = '';
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
        </div>
        <div class="page-header-actions">
          <button id="btn-holdings-add" class="btn btn-primary btn-sm">
            ${icons.plus}
            <span>Add Holdings</span>
          </button>
          <button id="btn-holdings-clear-all" class="btn btn-outline btn-sm btn-clear-all" title="Delete all shares from portfolio and database">
            ${icons.trash2}
            <span>Delete All</span>
          </button>
          <button id="btn-holdings-sync-market" class="dashboard-sync-btn" title="Refresh Live Quotes" aria-label="Refresh Live Quotes">
            ${icons.refreshCw}
          </button>
        </div>
      </div>

      <!-- Holdings Container -->
      <div class="holdings-container">
        <div class="holdings-toolbar">
          <div class="holdings-toolbar-row holdings-toolbar-primary">
            <div class="search-input-box">
              ${icons.search}
              <input type="text" id="holdings-page-search" class="search-input" placeholder="Search stocks by symbol, company...">
            </div>
            <div class="holdings-sort-box" id="holdings-sort-box" title="Sort holdings">
              <button type="button" id="btn-holdings-sort" class="btn-sort-icon" aria-label="Sort Holdings" title="Sort Holdings" aria-expanded="false" aria-haspopup="true">
                ${icons.arrowUpDown}
              </button>
              <div id="holdings-sort-menu" class="custom-sort-dropdown" style="display: none;" role="menu"></div>
            </div>
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
                <th style="min-width: 260px; width: 300px;">Ranges & Indicators (Day, 52W, RSI, Vol)</th>
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
    this.renderSortMenu();
  }

  renderSortMenu() {
    const menu = this.container.querySelector('#holdings-sort-menu');
    if (!menu) return;

    const options = [
      { value: 'value-desc', label: 'Highest Value' },
      { value: 'value-asc', label: 'Lowest Value' },
      { value: 'pnl-desc', label: 'Highest Profit %' },
      { value: 'pnl-asc', label: 'Lowest Profit %' },
      { value: 'day-desc', label: 'Top Day Gainers' },
      { value: 'day-asc', label: 'Top Day Losers' },
      { value: 'symbol-asc', label: 'Symbol A-Z' }
    ];

    menu.innerHTML = `
      <div class="custom-sort-header">Sort By</div>
      ${options.map(opt => `
        <button type="button" class="custom-sort-item ${this.sortBy === opt.value ? 'active' : ''}" data-sort="${opt.value}" role="menuitem">
          <span>${opt.label}</span>
          ${this.sortBy === opt.value ? `<svg class="sort-check" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>` : ''}
        </button>
      `).join('')}
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

    // Refresh Quotes Button
    const btnRefresh = this.container.querySelector('#btn-holdings-sync-market');
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

    // Search Input
    const searchInput = this.container.querySelector('#holdings-page-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.toLowerCase().trim();
        this.currentPage = 1;
        this.renderHoldingsTableAndCards();
      });
    }

    // Custom Sort Dropdown
    const sortBox = this.container.querySelector('#holdings-sort-box');
    const sortBtn = this.container.querySelector('#btn-holdings-sort');
    const sortMenu = this.container.querySelector('#holdings-sort-menu');

    if (sortBtn && sortMenu) {
      sortBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = sortMenu.style.display !== 'none';
        if (isOpen) {
          sortMenu.style.display = 'none';
          sortBtn.setAttribute('aria-expanded', 'false');
          sortBtn.classList.remove('active');
        } else {
          this.renderSortMenu();
          sortMenu.style.display = 'block';
          sortBtn.setAttribute('aria-expanded', 'true');
          sortBtn.classList.add('active');
        }
      });

      sortMenu.addEventListener('click', (e) => {
        const item = e.target.closest('.custom-sort-item');
        if (!item) return;
        const sortVal = item.dataset.sort;
        if (sortVal) {
          this.sortBy = sortVal;
          this.currentPage = 1;
          this.renderSortMenu();
          sortMenu.style.display = 'none';
          sortBtn.setAttribute('aria-expanded', 'false');
          sortBtn.classList.remove('active');
          const optLabel = item.querySelector('span')?.textContent || 'Sort Holdings';
          sortBtn.setAttribute('title', `Sorted by: ${optLabel}`);
          this.renderHoldingsTableAndCards();
        }
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (sortBox && !sortBox.contains(e.target)) {
          sortMenu.style.display = 'none';
          sortBtn.setAttribute('aria-expanded', 'false');
          sortBtn.classList.remove('active');
        }
      });

      // Close dropdown on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sortMenu.style.display !== 'none') {
          sortMenu.style.display = 'none';
          sortBtn.setAttribute('aria-expanded', 'false');
          sortBtn.classList.remove('active');
        }
      });
    }

    // Delete All Holdings Button
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
        btnClearAll.textContent = 'Deleting...';

        try {
          if (typeof portfolioStore.clearAllHoldings === 'function') {
            await portfolioStore.clearAllHoldings();
          } else if (typeof portfolioStore.clearAllData === 'function') {
            await portfolioStore.clearAllData();
          } else {
            throw new Error('Clear holdings method is not available in portfolio store.');
          }
          this.showToast('All holdings, transaction history, and orders deleted successfully.', 'info');
        } catch (err) {
          console.error('Error deleting holdings:', err);
          alert('Failed to delete holdings: ' + err.message);
        } finally {
          btnClearAll.disabled = false;
          btnClearAll.innerHTML = `${icons.trash2} <span>Delete All</span>`;
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
          window.scrollTo({ top: 0, behavior: 'smooth' });
          document.documentElement.scrollTo({ top: 0, behavior: 'smooth' });
          document.body.scrollTo({ top: 0, behavior: 'smooth' });
          const tableWrap = this.container.querySelector('.holdings-table-wrap');
          if (tableWrap) {
            tableWrap.scrollLeft = 0;
          }
          requestAnimationFrame(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          });
        }
        return;
      }

      // Toggle Watchlist
      const watchlistBtn = e.target.closest('[data-action="toggle-watchlist"]');
      if (watchlistBtn) {
        const symbol = watchlistBtn.getAttribute('data-symbol');
        if (symbol) {
          if (portfolioStore.isInWatchlist(symbol)) {
            await portfolioStore.removeFromWatchlist(symbol);
            this.showToast(`Removed ${symbol} from Watchlist.`, 'info');
          } else {
            try {
              const h = portfolioStore.getHoldingBySymbol(symbol);
              const activeWlName = portfolioStore.getWatchlistName(portfolioStore.getActiveWatchlistId());
              await portfolioStore.addToWatchlist({
                symbol: h?.symbol || symbol,
                name: h?.name || symbol,
                exchange: h?.exchange || 'NSE',
                sector: h?.sector || 'General / Equity',
                targetPrice: h?.avgPrice || (h?.cmp ? parseFloat((h.cmp * 0.97).toFixed(2)) : null),
                notes: h?.notes || 'Saved from portfolio holdings'
              });
              this.showToast(`Saved ${symbol} to "${activeWlName}"!`, 'success');
            } catch (err) {
              alert(err.message);
            }
          }
          this.update();
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

      // Buy more / Average Price Calculator for this stock -> Open in-screen pop-up modal
      const buyMoreBtn = e.target.closest('[data-action="buy-more"]');
      if (buyMoreBtn) {
        const symbol = buyMoreBtn.getAttribute('data-symbol');
        if (symbol) {
          this.averageModal.open(symbol);
        }
        return;
      }

      // Only buttons (like [data-action="buy-more"] for average modal) handle click actions
    });
  }

  update(event = {}) {
    const metrics = portfolioStore.getPortfolioMetrics();
    this.renderHeaderCount(metrics);
    this.renderHoldingsTableAndCards(metrics, event);
  }

  renderHeaderCount(metrics) {
    const countEl = this.container.querySelector('#holdings-header-count');
    if (countEl) {
      countEl.textContent = `${metrics.totalHoldingsCount} Assets`;
    }
  }

  renderRangeIndicator(h) {
    const cmp = Number(h.cmp) || 0;
    const myPrice = Number(h.avgPrice) || 0;

    // Day Range
    let dayLow = Number(h.dayLow) || Number(h.low) || (cmp * 0.985);
    let dayHigh = Number(h.dayHigh) || Number(h.high) || (cmp * 1.015);

    // Enforce market invariants: Day High must be >= CMP, Day Low must be <= CMP
    if (cmp > 0) {
      dayHigh = Math.max(dayHigh, cmp);
      dayLow = Math.min(dayLow, cmp);
    }
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

    // Enforce market invariants: 52W High must bound Day High & CMP, 52W Low must bound Day Low & CMP
    if (cmp > 0) {
      w52High = Math.max(w52High, dayHigh, cmp);
      w52Low = Math.min(w52Low, dayLow, cmp);
    }
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

    // 4. Volume Indicator (Day Volume vs 52-Week Average Benchmark)
    const vol = calculateStockVolumeMetrics(h);

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
      <div class="range-dual-widget" title="${h.symbol}: Day Range, 52-Week Range, RSI & Volume">
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

        <!-- 4. Volume Indicator Row -->
        <div class="range-sub-row range-vol-row">
          <div class="range-header-line">
            <div class="range-header-left">
              <span class="range-badge badge-vol">VOL</span>
            </div>
            <div class="range-header-right">
              <span class="range-vol-pill ${vol.statusClass}" title="Today's Traded Volume: ${vol.dayVolumeFormatted} (${vol.dayVolumeShares} shares) | ${vol.volumeRatio}x of 52W Avg (${vol.avgVolumeShares} shares)">
                <span class="vol-dot ${vol.statusClass}"></span>
                <span class="vol-num">${vol.dayVolumeFormatted}</span>
                <span class="vol-text">${vol.status}</span>
              </span>
            </div>
          </div>

          <div class="range-bar-track" title="Traded Volume: ${vol.dayVolumeFormatted} (${vol.dayVolumeShares} shares) | 52W Average: ${vol.avgVolumeFormatted} (${vol.avgVolumeShares} shares) [${vol.volumeRatio}x]">
            <div class="range-track-inner">
              <div class="range-track-rail range-track-rail-vol">
                <div class="vol-zone-divider" style="left: 50%;" title="52-Week Average Benchmark (1.0x): ${vol.avgVolumeShares} shares"></div>
                <div class="range-track-fill fill-vol ${vol.statusClass}" style="left: 0; width: ${vol.percent}%;"></div>
              </div>
              <div class="range-pin pin-vol ${vol.statusClass}" style="left: ${vol.percent}%;" title="Day Volume: ${vol.dayVolumeFormatted} (${vol.dayVolumeShares} shares) [${vol.status}]">
                <span class="pin-marker-vol"></span>
              </div>
            </div>
          </div>

          <div class="range-bounds-line">
            <span class="range-bound-val bound-low" title="Day's Traded Volume: ${vol.dayVolumeShares} shares">
              <span class="bound-tag">Day</span>${vol.dayVolumeFormatted}
            </span>
            <span class="range-bound-val bound-high" title="52-Week Average Benchmark Volume (1.0x): ${vol.avgVolumeShares} shares">
              <span class="bound-tag">52W Avg</span>${vol.avgVolumeFormatted}
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
      return this.searchTerm === '' || 
        h.symbol.toLowerCase().includes(this.searchTerm) || 
        h.name.toLowerCase().includes(this.searchTerm);
    });

    // Sort
    filtered.sort((a, b) => {
      switch (this.sortBy) {
        case 'value-desc': return b.current - a.current;
        case 'value-asc': return a.current - b.current;
        case 'pnl-desc': return b.pnlPercent - a.pnlPercent;
        case 'pnl-asc': return a.pnlPercent - b.pnlPercent;
        case 'day-desc': return b.dayChangePercent - a.dayChangePercent;
        case 'day-asc': return a.dayChangePercent - b.dayChangePercent;
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
      const isInWatchlist = portfolioStore.isInWatchlist(h.symbol);

      return `
        <tr data-symbol="${h.symbol}" class="${rowSyncClass}">
          <td>
            <div class="stock-identity">
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
            <div class="table-actions" style="justify-content: center; gap: 0.35rem;">
              <button class="icon-action-btn watchlist-toggle-btn ${isInWatchlist ? 'active' : ''}" data-action="toggle-watchlist" data-symbol="${h.symbol}" title="${isInWatchlist ? 'Remove from Watchlist' : 'Save to Watchlist'}">
                ${isInWatchlist ? icons.starFilled : icons.star}
              </button>
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
      const isInWatchlist = portfolioStore.isInWatchlist(h.symbol);
      const dayDiff = h.dayChangePerShare !== undefined ? h.dayChangePerShare : (h.cmp - (h.prevClose || h.cmp));

      return `
        <div class="holding-mobile-card ${cardSyncClass}" data-symbol="${h.symbol}" title="Click to view ${h.symbol} transactions & details">
          <!-- Zerodha Kite-style 3-row Holding Layout -->
          <div class="kite-holding-view">
            <!-- Row 1: Qty | Avg on Left, LTP + Day Change on Right -->
            <div class="kite-row kite-row-top">
              <div class="kite-col-left">
                <span class="kite-dim-label">Qty</span>
                <span class="kite-val">${h.quantity.toLocaleString()}</span>
                <span class="kite-divider" aria-hidden="true"></span>
                <span class="kite-dim-label">Avg</span>
                <span class="kite-val">${portfolioStore.formatMoney(h.avgPrice, 2).replace('₹ ', '')}</span>
              </div>
              <div class="kite-col-right">
                <span class="kite-dim-label">LTP</span>
                <span class="kite-val cmp-val ${tickClass}">${portfolioStore.formatMoney(h.cmp, 2).replace('₹ ', '')}</span>
                <span class="kite-day-chg ${isDayProfit ? 'bull' : 'bear'}">
                  ${isDayProfit ? '↑' : '↓'} ${Math.abs(dayDiff).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${Math.abs(h.dayChangePercent || 0).toFixed(2)}%)
                </span>
              </div>
            </div>

            <!-- Row 2: Symbol on Left, P/L on Right -->
            <div class="kite-row kite-row-mid">
              <div class="kite-col-left">
                <strong class="kite-symbol">${h.symbol}</strong>
                ${h.exchange && h.exchange !== 'NSE' ? `<span class="kite-exchange">${h.exchange}</span>` : ''}
              </div>
              <div class="kite-col-right">
                <span class="kite-dim-label">P/L</span>
                <strong class="kite-pnl-val ${isProfit ? 'bull' : 'bear'}">
                  ${isProfit ? '' : '-'}${portfolioStore.formatMoney(Math.abs(h.pnl), 2).replace('₹ ', '')} (${isProfit ? '' : '-'}${Math.abs(h.pnlPercent).toFixed(2)}%)
                </strong>
              </div>
            </div>

            <!-- Row 3: Invested on Left, Current on Right -->
            <div class="kite-row kite-row-bottom">
              <div class="kite-col-left">
                <span class="kite-dim-label">Invested</span>
                <span class="kite-money">${portfolioStore.formatMoney(h.invested, 2).replace('₹ ', '₹')}</span>
              </div>
              <div class="kite-col-right">
                <span class="kite-dim-label">Current</span>
                <span class="kite-money current-highlight">${portfolioStore.formatMoney(h.current, 2).replace('₹ ', '₹')}</span>
              </div>
            </div>
          </div>

          <!-- Collapsible Technical Indicators & Price Range Section -->
          <details class="mobile-card-details">
            <summary class="mobile-details-summary">
              <span>Day & 52-Week Range, RSI, Volume</span>
              <span class="summary-chevron">▾</span>
            </summary>
            <div class="mobile-range-card-section" style="margin-top: 0.45rem; margin-bottom: 0;">
              ${this.renderRangeIndicator(h)}
            </div>
          </details>

          <!-- Action Buttons Bar -->
          <div class="mobile-card-bottom">
            <button class="btn btn-outline btn-sm watchlist-toggle-btn ${isInWatchlist ? 'active' : ''}" data-action="toggle-watchlist" data-symbol="${h.symbol}" title="${isInWatchlist ? 'Remove from Watchlist' : 'Save to Watchlist'}">
              ${isInWatchlist ? icons.starFilled : icons.star}
              <span>${isInWatchlist ? 'Saved' : 'Watchlist'}</span>
            </button>
            <button class="btn btn-outline btn-sm btn-avg-calc" data-action="buy-more" data-symbol="${h.symbol}" title="Open Average Price Calculator (${h.symbol})" style="flex: 1;">
              ${icons.calculator || icons.plus}
              <span>Avg Calculator</span>
            </button>
            <button class="icon-action-btn delete-btn" data-action="delete-holding" data-id="${h.id}" data-symbol="${h.symbol}" title="Delete ${h.symbol}">
              ${icons.trash2}
            </button>
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
      toast.style.transform = 'translateY(-10px)';
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
