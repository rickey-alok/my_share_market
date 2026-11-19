// Watchlist View Component - Track, Monitor, and Save Target Shares
import { portfolioStore } from '../state/portfolioStore.js';
import { liveMarketService } from '../services/liveMarketService.js';
import { SECTORS, POPULAR_STOCKS } from '../data/stocksDatabase.js';
import { icons } from '../utils/icons.js';
import { AddToWatchlistModal } from './addToWatchlistModal.js';
import { AverageCalculatorModal } from './averageCalculatorModal.js';

export class WatchlistView {
  constructor(container, onNavigateToAddHolding, onNavigateToHoldings) {
    this.container = container;
    this.onNavigateToAddHolding = onNavigateToAddHolding;
    this.onNavigateToHoldings = onNavigateToHoldings;
    this.addToWatchlistModal = new AddToWatchlistModal();
    this.averageModal = new AverageCalculatorModal();

    this.searchTerm = '';
    this.selectedSector = 'ALL';
    this.activeFilterTab = 'all'; // 'all' | 'target-met' | 'near-target' | 'gainers' | 'losers'
    this.sortBy = 'target-distance'; // 'target-distance' | 'day-desc' | 'day-asc' | 'cmp-desc' | 'cmp-asc' | 'symbol-asc'

    this.init();
  }

  init() {
    this.renderSkeleton();
    this.attachEventListeners();
    this.update();

    // Subscribe to portfolioStore updates
    this.unsubscribe = portfolioStore.subscribe((event) => {
      this.update(event);
    });
  }

  renderSkeleton() {
    this.container.innerHTML = `
      <!-- Page Title & Header Actions -->
      <div class="page-title-row">
        <div>
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <h1 class="page-title">My Watchlist</h1>
            <span class="brand-badge" id="watchlist-header-count">0 Stocks</span>
          </div>
          <p class="page-subtitle">Track potential share purchases, set target buy levels, and get alerted on price dips</p>
        </div>
        <div class="page-header-actions">
          <button id="btn-watchlist-sync-market" class="btn btn-outline btn-sm" title="Refresh Live Quotes">
            ${icons.refreshCw}
            <span id="watchlist-sync-market-label">Sync Market</span>
          </button>
          <button id="btn-watchlist-add-stock" class="btn btn-primary btn-sm">
            ${icons.plus}
            <span>Add to Watchlist</span>
          </button>
        </div>
      </div>

      <!-- 3 Watchlists Selector Tabs (Max 50 Stocks Each) -->
      <div class="watchlist-tabs-bar" id="watchlist-tabs-bar">
        <!-- Dynamically injected via renderTabs() -->
      </div>

      <!-- Main Watchlist Container -->
      <div class="holdings-container watchlist-container">
        <!-- Toolbar: Search & Filters -->
        <div class="holdings-toolbar">
          <!-- Row 1: Search & Clear Button -->
          <div class="holdings-toolbar-row holdings-toolbar-primary">
            <div class="search-input-box">
              ${icons.search}
              <input type="text" id="watchlist-page-search" class="search-input" placeholder="Search watchlist by stock symbol, company name, or sector...">
            </div>
            <button id="btn-watchlist-clear-all" class="btn btn-outline btn-clear-all" title="Clear all stocks from watchlist">
              ${icons.trash2}
              <span>Clear Watchlist</span>
            </button>
          </div>

          <!-- Row 2: Filter Tabs & Sorting Selectors -->
          <div class="holdings-toolbar-row holdings-toolbar-secondary" style="flex-wrap: wrap; gap: 0.75rem;">
            <!-- Filter Pills -->
            <div class="watchlist-filter-chips" id="watchlist-filter-chips">
              <button type="button" class="watchlist-chip active" data-filter="all">All Stocks</button>
              <button type="button" class="watchlist-chip" data-filter="target-met">🎯 In Buy Zone</button>
              <button type="button" class="watchlist-chip" data-filter="near-target">⚡ Near Target (&le; 3%)</button>
              <button type="button" class="watchlist-chip" data-filter="gainers">🟢 Today's Gainers</button>
              <button type="button" class="watchlist-chip" data-filter="losers">🔴 On Dip / Losers</button>
            </div>

            <!-- Selectors -->
            <div style="display: flex; gap: 0.5rem; margin-left: auto;">
              <div class="filter-select-wrapper">
                <select id="watchlist-sector-filter" class="filter-select">
                  <option value="ALL">All Sectors</option>
                  ${SECTORS.map(s => `<option value="${s}">${s}</option>`).join('')}
                </select>
              </div>

              <div class="filter-select-wrapper">
                <select id="watchlist-sort-filter" class="filter-select">
                  <option value="target-distance">Sort: Closest to Target</option>
                  <option value="day-desc">Sort: Top Day Gainers</option>
                  <option value="day-asc">Sort: Top Day Losers</option>
                  <option value="cmp-desc">Sort: Highest Price</option>
                  <option value="cmp-asc">Sort: Lowest Price</option>
                  <option value="symbol-asc">Sort: Symbol A-Z</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <!-- Horizontal Cards List -->
        <div class="watchlist-cards-list" id="watchlist-cards-list">
          <!-- Dynamically injected horizontal stock cards -->
        </div>

        <!-- Empty State Container -->
        <div id="watchlist-empty-state" class="empty-state" style="display: none;">
          <!-- Dynamically injected -->
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Add to Watchlist Header Button
    const btnAdd = this.container.querySelector('#btn-watchlist-add-stock');
    if (btnAdd) {
      btnAdd.addEventListener('click', () => {
        this.addToWatchlistModal.open(null, () => this.update());
      });
    }

    // Sync Market Button
    const btnSync = this.container.querySelector('#btn-watchlist-sync-market');
    const syncLabel = this.container.querySelector('#watchlist-sync-market-label');
    if (btnSync) {
      btnSync.addEventListener('click', async () => {
        btnSync.classList.add('rotating');
        if (syncLabel) syncLabel.textContent = 'Syncing...';
        await portfolioStore.refreshMarketQuotes(false);
        btnSync.classList.remove('rotating');
        if (syncLabel) syncLabel.textContent = 'Sync Market';
        this.showToast('Watchlist market quotes refreshed!', 'success');
      });
    }

    // Search Input
    const searchInput = this.container.querySelector('#watchlist-page-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.toLowerCase().trim();
        this.renderItems();
      });
    }

    // Sector Filter Dropdown
    const sectorFilter = this.container.querySelector('#watchlist-sector-filter');
    if (sectorFilter) {
      sectorFilter.addEventListener('change', (e) => {
        this.selectedSector = e.target.value;
        this.renderItems();
      });
    }

    // Sort Filter Dropdown
    const sortFilter = this.container.querySelector('#watchlist-sort-filter');
    if (sortFilter) {
      sortFilter.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this.renderItems();
      });
    }

    // Filter Chips
    const chipsContainer = this.container.querySelector('#watchlist-filter-chips');
    if (chipsContainer) {
      chipsContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.watchlist-chip');
        if (!btn) return;
        chipsContainer.querySelectorAll('.watchlist-chip').forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        this.activeFilterTab = btn.getAttribute('data-filter') || 'all';
        this.renderItems();
      });
    }

    // Watchlist Tabs Click & Rename Handling
    const tabsBar = this.container.querySelector('#watchlist-tabs-bar');
    if (tabsBar) {
      tabsBar.addEventListener('click', (e) => {
        const renameBtn = e.target.closest('[data-rename-wlid]');
        if (renameBtn) {
          e.stopPropagation();
          const wlId = parseInt(renameBtn.getAttribute('data-rename-wlid'), 10);
          const currentName = portfolioStore.getWatchlistName(wlId);
          const newName = prompt(`Enter a custom name for ${currentName} (up to 24 characters):`, currentName);
          if (newName && newName.trim()) {
            portfolioStore.setWatchlistName(wlId, newName.trim());
            this.showToast(`Watchlist renamed to "${newName.trim()}"`, 'success');
          }
          return;
        }

        const tabBtn = e.target.closest('[data-wl-tab]');
        if (tabBtn) {
          const wlId = parseInt(tabBtn.getAttribute('data-wl-tab'), 10);
          if (wlId && wlId !== portfolioStore.getActiveWatchlistId()) {
            portfolioStore.setActiveWatchlist(wlId);
          }
        }
      });
    }

    // Clear Current Watchlist Button
    const btnClear = this.container.querySelector('#btn-watchlist-clear-all');
    if (btnClear) {
      btnClear.addEventListener('click', async () => {
        const activeId = portfolioStore.getActiveWatchlistId();
        const activeName = portfolioStore.getWatchlistName(activeId);
        const list = portfolioStore.getWatchlist(activeId);
        if (list.length === 0) return;
        const confirmed = confirm(`Are you sure you want to remove all ${list.length} stocks from "${activeName}"?`);
        if (confirmed) {
          await portfolioStore.clearWatchlist(activeId);
          this.showToast(`Watchlist "${activeName}" cleared.`, 'success');
        }
      });
    }

    // Delegated actions on Horizontal Cards List
    const cardsList = this.container.querySelector('#watchlist-cards-list');
    if (cardsList) {
      cardsList.addEventListener('click', async (e) => {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        e.stopPropagation();

        const action = btn.getAttribute('data-action');
        const id = btn.getAttribute('data-id');
        const symbol = btn.getAttribute('data-symbol');

        if (action === 'buy-stock') {
          // Navigate to Add Holding prefilled with this stock
          const watchlistStock = portfolioStore.getWatchlistStockBySymbol(symbol);
          if (this.onNavigateToAddHolding) {
            this.onNavigateToAddHolding({
              symbol: symbol,
              mode: 'single',
              buyPrice: watchlistStock ? watchlistStock.cmp : null
            });
          }
        } else if (action === 'edit-stock') {
          const item = portfolioStore.getWatchlist().find(w => String(w.id) === String(id)) || portfolioStore.getWatchlistStockBySymbol(symbol);
          if (item) {
            this.addToWatchlistModal.open(item, () => this.update());
          }
        } else if (action === 'delete-stock') {
          const confirmed = confirm(`Remove ${symbol} from your watchlist?`);
          if (confirmed) {
            await portfolioStore.removeFromWatchlist(id || symbol);
            this.showToast(`Removed ${symbol} from watchlist.`, 'success');
          }
        } else if (action === 'open-calc') {
          const isHolding = portfolioStore.getHoldingBySymbol(symbol);
          if (isHolding) {
            this.averageModal.open(symbol);
          } else {
            if (confirm(`${symbol} is on your watchlist but not yet in your active holdings.\n\nWould you like to add it to your portfolio now?`)) {
              if (this.onNavigateToAddHolding) {
                this.onNavigateToAddHolding({ symbol, mode: 'single' });
              }
            }
          }
        }
      });
    }
  }

  update(event = {}) {
    this.renderTabs();
    this.renderItems(event);
  }

  renderTabs() {
    const tabsContainer = this.container.querySelector('#watchlist-tabs-bar');
    if (!tabsContainer) return;

    const activeId = portfolioStore.getActiveWatchlistId();
    const names = portfolioStore.getWatchlistNames();
    const counts = portfolioStore.getWatchlistCounts();
    const activeCount = counts[activeId] || 0;

    // Update Header Count badge: "X/50 Stocks"
    const countHeader = this.container.querySelector('#watchlist-header-count');
    if (countHeader) {
      countHeader.textContent = `${activeCount}/50 Stocks`;
    }

    tabsContainer.innerHTML = `
      <div class="wl-tabs-nav-group">
        <div class="wl-tabs-list" role="tablist">
          ${[1, 2, 3].map(id => {
            const isActive = id === activeId;
            const count = counts[id] || 0;
            const isFull = count >= 50;
            return `
              <button
                type="button"
                class="wl-tab-pill ${isActive ? 'active' : ''} ${isFull ? 'cap-full' : ''}"
                data-wl-tab="${id}"
                role="tab"
                aria-selected="${isActive}"
                title="Switch to ${names[id]} (${count}/50 stocks)"
              >
                <span class="wl-tab-dot ${isActive ? 'pulse' : ''}">●</span>
                <span class="wl-tab-name">${names[id]}</span>
                <span class="wl-tab-badge ${isFull ? 'badge-full' : ''}">${count}/50</span>
                <span class="wl-tab-rename-icon" data-rename-wlid="${id}" title="Rename ${names[id]}">
                  ${icons.edit}
                </span>
              </button>
            `;
          }).join('')}
        </div>

        <div class="wl-active-cap-meter">
          <div class="wl-cap-stats">
            <span class="cap-lbl">Capacity (${names[activeId]}):</span>
            <span class="cap-val ${activeCount >= 50 ? 'danger' : ''}">${activeCount}/50</span>
          </div>
          <div class="wl-cap-track" title="${activeCount} of 50 maximum allowed stocks in this watchlist">
            <div class="wl-cap-fill ${activeCount >= 50 ? 'danger' : activeCount >= 40 ? 'warning' : ''}" style="width: ${Math.min(100, (activeCount / 50) * 100)}%;"></div>
          </div>
        </div>
      </div>
    `;
  }

  getFilteredAndSortedWatchlist() {
    let list = portfolioStore.getWatchlist();

    // 1. Filter by Search Query
    if (this.searchTerm) {
      list = list.filter(w =>
        (w.symbol && w.symbol.toLowerCase().includes(this.searchTerm)) ||
        (w.name && w.name.toLowerCase().includes(this.searchTerm)) ||
        (w.sector && w.sector.toLowerCase().includes(this.searchTerm))
      );
    }

    // 2. Filter by Sector
    if (this.selectedSector !== 'ALL') {
      list = list.filter(w => w.sector === this.selectedSector);
    }

    // 3. Filter by Active Tab
    if (this.activeFilterTab === 'target-met') {
      list = list.filter(w => w.targetPrice && w.cmp && w.cmp <= w.targetPrice);
    } else if (this.activeFilterTab === 'near-target') {
      list = list.filter(w => {
        if (!w.targetPrice || !w.cmp) return false;
        const diff = ((w.targetPrice - w.cmp) / w.targetPrice) * 100;
        return diff >= -3.0 && diff < 0;
      });
    } else if (this.activeFilterTab === 'gainers') {
      list = list.filter(w => (Number(w.dayChangePercent) || 0) > 0);
    } else if (this.activeFilterTab === 'losers') {
      list = list.filter(w => (Number(w.dayChangePercent) || 0) < 0);
    }

    // 4. Sort
    list = [...list].sort((a, b) => {
      const cmpA = Number(a.cmp) || 0;
      const cmpB = Number(b.cmp) || 0;
      const targetA = Number(a.targetPrice) || cmpA;
      const targetB = Number(b.targetPrice) || cmpB;

      // Distance to target in %: (CMP - Target) / Target
      const distA = targetA > 0 ? ((cmpA - targetA) / targetA) * 100 : 999;
      const distB = targetB > 0 ? ((cmpB - targetB) / targetB) * 100 : 999;

      if (this.sortBy === 'target-distance') {
        return distA - distB; // Smallest / negative distance first
      } else if (this.sortBy === 'day-desc') {
        return (Number(b.dayChangePercent) || 0) - (Number(a.dayChangePercent) || 0);
      } else if (this.sortBy === 'day-asc') {
        return (Number(a.dayChangePercent) || 0) - (Number(b.dayChangePercent) || 0);
      } else if (this.sortBy === 'cmp-desc') {
        return cmpB - cmpA;
      } else if (this.sortBy === 'cmp-asc') {
        return cmpA - cmpB;
      } else if (this.sortBy === 'symbol-asc') {
        return (a.symbol || '').localeCompare(b.symbol || '');
      }
      return 0;
    });

    return list;
  }

  renderItems(event = {}) {
    const items = this.getFilteredAndSortedWatchlist();
    const allWatchlist = portfolioStore.getWatchlist();

    const cardsList = this.container.querySelector('#watchlist-cards-list');
    const emptyState = this.container.querySelector('#watchlist-empty-state');

    if (allWatchlist.length === 0) {
      if (cardsList) {
        cardsList.innerHTML = '';
        cardsList.style.display = 'none';
      }
      if (emptyState) {
        emptyState.style.display = 'block';
        emptyState.innerHTML = this.renderEmptyState(false);
        this.attachEmptyStateListeners();
      }
      return;
    }

    if (items.length === 0) {
      if (cardsList) {
        cardsList.innerHTML = '';
        cardsList.style.display = 'none';
      }
      if (emptyState) {
        emptyState.style.display = 'block';
        emptyState.innerHTML = this.renderEmptyState(true);
      }
      return;
    }

    if (cardsList) {
      cardsList.style.display = 'flex';
      cardsList.innerHTML = items.map(w => this.renderHorizontalCard(w, event)).join('');
    }
    if (emptyState) {
      emptyState.style.display = 'none';
    }
  }

  renderHorizontalCard(w, event) {
    const cmp = Number(w.cmp) || 100;
    const prevClose = Number(w.prevClose) || cmp;
    const dayChangePerShare = cmp - prevClose;
    const dayChangePercent = Number(w.dayChangePercent) || (prevClose > 0 ? (dayChangePerShare / prevClose) * 100 : 0);
    const isGain = dayChangePercent >= 0;

    // Day High and Day Low
    let dayHigh = Number(w.dayHigh);
    let dayLow = Number(w.dayLow);
    if (!dayHigh || dayHigh < cmp) {
      dayHigh = Math.max(cmp, prevClose * 1.015);
    }
    if (!dayLow || dayLow > cmp || dayLow <= 0) {
      dayLow = Math.min(cmp, prevClose * 0.985);
    }
    if (dayHigh <= dayLow) {
      dayHigh = cmp * 1.02;
      dayLow = cmp * 0.98;
    }

    // Day Range position (where CMP sits between Day Low and Day High)
    const dayRangeSpan = Math.max(0.01, dayHigh - dayLow);
    const dayRangePercent = Math.max(0, Math.min(100, ((cmp - dayLow) / dayRangeSpan) * 100));

    // Target Price & Status
    const targetPrice = Number(w.targetPrice);
    const hasTarget = targetPrice > 0;
    const isTargetMet = hasTarget && cmp <= targetPrice;
    // When target buy price is below CMP, diff is negative (-3.1%, -11.1%), representing the required dip
    const targetDiffPercent = hasTarget && targetPrice > 0 ? ((targetPrice - cmp) / targetPrice) * 100 : null;
    const isNearTarget = hasTarget && !isTargetMet && targetDiffPercent >= -3.0 && targetDiffPercent < 0;
    const targetSign = targetDiffPercent > 0 ? '+' : '';

    // User's Holdings Quantity for this stock
    const holding = portfolioStore.getHoldingBySymbol(w.symbol);
    const quantity = holding && holding.quantity != null ? Number(holding.quantity) : 0;
    const hasHolding = quantity > 0;

    // Live tick flash animation
    let tickClass = '';
    if (event && event.type === 'PRICE_TICK' && event.tick && event.tick.symbol === w.symbol) {
      tickClass = event.tick.direction === 'up' ? 'flash-green' : 'flash-red';
    }

    const formattedChangeAmt = portfolioStore.formatMoney(Math.abs(dayChangePerShare));

    return `
      <div class="watchlist-horizontal-card ${tickClass}" data-symbol="${w.symbol}" data-id="${w.id}">
        <!-- Top Primary Tier: Identity on Left, Live Price & Change on Right -->
        <div class="wcard-row-top">
          <!-- Identity: Symbol, Exchange, Sector, Company Name -->
          <div class="wcard-identity">
            <div class="wcard-identity-text">
              <div class="wcard-symbol-line">
                <span class="wcard-symbol">${w.symbol}</span>
                <span class="exchange-tag">${w.exchange || 'NSE'}</span>
                <span class="wcard-sector-tag">${w.sector || 'General Equity'}</span>
              </div>
              <div class="wcard-full-name" title="${w.name}">${w.name}</div>
            </div>
          </div>

          <!-- Price & Daily %: Top-right on mobile, 5th column on desktop -->
          <div class="wcard-price-block">
            <div class="wcard-cmp-value">${portfolioStore.formatMoney(cmp)}</div>
            <div class="wcard-day-change ${isGain ? 'bull' : 'bear'}">
              <span class="change-arrow">${isGain ? '▲' : '▼'}</span>
              <span class="change-pct">${isGain ? '+' : ''}${dayChangePercent.toFixed(2)}%</span>
              <span class="change-abs">(${isGain ? '+' : '-'}${formattedChangeAmt})</span>
            </div>
          </div>
        </div>

        <!-- Bottom Context Tier: Holdings, Target, Day Range, and Actions -->
        <div class="wcard-row-bottom">
          <!-- Holdings Quantity Badge -->
          <div class="wcard-item-holdings">
            <span class="wcard-item-label">Holdings:</span>
            ${hasHolding ? `
              <span class="watchlist-qty-pill owned" title="${quantity.toLocaleString()} shares held in active portfolio">
                <span class="qty-pulse-dot">●</span>
                <span class="qty-num">${quantity.toLocaleString()}</span>
                <span class="qty-unit">Shares</span>
              </span>
            ` : `
              <span class="watchlist-qty-pill zero" title="0 shares held in active portfolio">
                <span class="qty-num">0</span>
                <span class="qty-unit">Shares</span>
              </span>
            `}
          </div>

          <!-- Target Buy Price & Status -->
          <div class="wcard-item-target">
            <span class="wcard-item-label">Target:</span>
            ${hasTarget ? `
              <span class="wcard-target-val">${portfolioStore.formatMoney(targetPrice)}</span>
              <span class="target-badge-pill ${isTargetMet ? 'hit' : isNearTarget ? 'near' : 'far'}" title="${isTargetMet ? 'In Buy Zone' : `Target is ${targetSign}${targetDiffPercent.toFixed(1)}% from current price`}">
                ${isTargetMet ? '🎯 Buy Zone' : isNearTarget ? `⚡ ${targetSign}${targetDiffPercent.toFixed(1)}%` : `${targetSign}${targetDiffPercent.toFixed(1)}%`}
              </span>
            ` : `
              <button type="button" class="btn-set-target-hint" data-action="edit-stock" data-id="${w.id}" data-symbol="${w.symbol}">
                + Set Target
              </button>
            `}
          </div>

          <!-- Day High & Low Range Bar -->
          <div class="wcard-item-range">
            <div class="wcard-range-labels">
              <span class="range-stat low">L: ${portfolioStore.formatMoney(dayLow)}</span>
              <span class="range-stat high">H: ${portfolioStore.formatMoney(dayHigh)}</span>
            </div>
            <div class="wcard-range-track" title="CMP is at ${dayRangePercent.toFixed(0)}% of today's range">
              <div class="wcard-range-bar" style="width: ${dayRangePercent}%;"></div>
              <div class="wcard-range-thumb" style="left: ${dayRangePercent}%;"></div>
            </div>
          </div>

          <!-- Quick Actions: Buy, Edit, Delete -->
          <div class="wcard-item-actions">
            <button class="btn btn-primary btn-sm btn-wcard-buy" data-action="buy-stock" data-symbol="${w.symbol}" title="Add to Portfolio / Buy at CMP">
              ${icons.plus} <span>Buy</span>
            </button>
            <button class="icon-action-btn" data-action="edit-stock" data-id="${w.id}" data-symbol="${w.symbol}" title="Edit Target Price / Notes">
              ${icons.edit}
            </button>
            <button class="icon-action-btn delete-btn" data-action="delete-stock" data-id="${w.id}" data-symbol="${w.symbol}" title="Remove from Watchlist">
              ${icons.trash2}
            </button>
          </div>
        </div>

        <!-- Optional Strategy Note Footer -->
        ${w.notes ? `
          <div class="wcard-notes-footer">
            <span class="wcard-notes-icon">📝</span>
            <span class="wcard-notes-body">${w.notes}</span>
          </div>
        ` : ''}
      </div>
    `;
  }

    renderEmptyState(isSearchResult = false) {
    if (isSearchResult) {
      return `
        <div class="empty-state-icon" style="background: rgba(255, 255, 255, 0.05); color: var(--text-muted); display: flex; align-items: center; justify-content: center; width: 56px; height: 56px; margin: 0 auto 1rem; border-radius: 50%;">
          ${icons.search}
        </div>
        <h3 style="font-family: var(--font-heading); font-size: 1.15rem; margin-bottom: 0.5rem;">No matching stocks found</h3>
        <p style="color: var(--text-secondary); font-size: 0.88rem; max-width: 420px; margin: 0 auto 1.25rem;">
          No stocks in your watchlist match "<strong>${this.searchTerm || this.selectedSector}</strong>".
        </p>
      `;
    }

    return `
      <div class="empty-state-icon" style="background: rgba(99, 102, 241, 0.12); color: var(--brand-indigo-light); display: flex; align-items: center; justify-content: center; width: 64px; height: 64px; margin: 0 auto 1.25rem; border-radius: 50%;">
        ${icons.bookmark || icons.star}
      </div>
      <h3 style="font-family: var(--font-heading); font-size: 1.25rem; margin-bottom: 0.5rem;">Your "${portfolioStore.getWatchlistName(portfolioStore.getActiveWatchlistId())}" is Empty</h3>
      <p style="color: var(--text-secondary); font-size: 0.9rem; max-width: 480px; margin: 0 auto 1.5rem; line-height: 1.5;">
        Save Indian stocks you're interested in, configure target entry prices, and track real-time dips before investing.
      </p>

      <button type="button" class="btn btn-primary" id="btn-empty-add-watchlist" style="margin: 0 auto 1.5rem; justify-content: center;">
        ${icons.plus} Add Stock to Watchlist
      </button>

      <!-- 1-Click Quick Add Popular Stocks -->
      <div style="margin-top: 1.5rem; border-top: 1px dashed var(--border-subtle); padding-top: 1.5rem;">
        <div style="font-size: 0.82rem; font-weight: 700; color: var(--text-muted); margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">
          Quick Add Popular Indian Bluechips
        </div>
        <div class="watchlist-quick-add-grid" style="display: flex; gap: 0.5rem; justify-content: center; flex-wrap: wrap;">
          ${['RELIANCE', 'TCS', 'HDFCBANK', 'INFY', 'TATAMOTORS', 'ITC', 'SBIN', 'LT', 'BHARTIARTL'].map(sym => {
            const ref = POPULAR_STOCKS.find(s => s.symbol === sym);
            return `
              <button type="button" class="btn btn-outline btn-sm btn-quick-add-stock" data-symbol="${sym}">
                <span>+ ${sym}</span>
                <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-muted);">
                  ${ref ? portfolioStore.formatMoney(ref.cmp) : ''}
                </span>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  attachEmptyStateListeners() {
    const btnEmptyAdd = this.container.querySelector('#btn-empty-add-watchlist');
    if (btnEmptyAdd) {
      btnEmptyAdd.addEventListener('click', () => {
        this.addToWatchlistModal.open(null, () => this.update());
      });
    }

    const quickAddBtns = this.container.querySelectorAll('.btn-quick-add-stock');
    quickAddBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        const sym = btn.getAttribute('data-symbol');
        if (sym) {
          const activeId = portfolioStore.getActiveWatchlistId();
          const activeName = portfolioStore.getWatchlistName(activeId);
          try {
            btn.disabled = true;
            btn.textContent = `Adding ${sym}...`;
            await portfolioStore.addToWatchlist({ symbol: sym, watchlistId: activeId });
            this.showToast(`Added ${sym} to "${activeName}"!`, 'success');
          } catch (err) {
            alert(err.message);
          } finally {
            btn.disabled = false;
            btn.textContent = `+ ${sym}`;
          }
        }
      });
    });
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
    }, 3500);
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
