// Add / Edit Watchlist Stock Modal Component
import { portfolioStore } from '../state/portfolioStore.js';
import { POPULAR_STOCKS, SECTORS, EXCHANGES } from '../data/stocksDatabase.js';
import { icons } from '../utils/icons.js';

export class AddToWatchlistModal {
  constructor(containerId = 'modal-add-to-watchlist') {
    this.containerId = containerId;
    this.container = null;
    this.editingId = null;
    this.selectedStock = null;
    this.onSavedCallback = null;

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

    // Close on backdrop click
    this.container.addEventListener('click', (e) => {
      if (e.target === this.container) {
        this.close();
      }
    });

    // Close on Escape key
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  isOpen() {
    return this.container && this.container.classList.contains('open');
  }

  /**
   * Open the modal for a new stock or existing watchlist item
   * @param {string|Object} prefill - Either a symbol string (e.g. 'RELIANCE') or existing watchlist item object
   * @param {Function} onSaved - Callback fired when saved
   */
  open(prefill = null, onSaved = null) {
    this.onSavedCallback = onSaved;
    this.editingId = null;
    this.selectedStock = null;

    if (typeof prefill === 'string') {
      const sym = prefill.toUpperCase().trim();
      const existing = portfolioStore.getWatchlistStockBySymbol(sym);
      if (existing) {
        this.editingId = existing.id;
        this.selectedStock = existing;
      } else {
        const ref = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === sym);
        this.selectedStock = ref ? { ...ref } : { symbol: sym, name: sym, exchange: 'NSE', sector: 'General / Equity', cmp: 100 };
      }
    } else if (prefill && typeof prefill === 'object') {
      if (prefill.id) {
        this.editingId = prefill.id;
      }
      this.selectedStock = { ...prefill };
    }

    this.render();
    this.container.style.display = 'flex';
    requestAnimationFrame(() => {
      this.container.classList.add('open');
      const searchInput = this.container.querySelector('#watchlist-stock-search');
      if (searchInput && !this.selectedStock) {
        searchInput.focus();
      } else {
        const targetInput = this.container.querySelector('#watchlist-input-target');
        if (targetInput) targetInput.focus();
      }
    });
  }

  close() {
    if (!this.container) return;
    this.container.classList.remove('open');
    setTimeout(() => {
      if (!this.isOpen()) {
        this.container.style.display = 'none';
        this.container.innerHTML = '';
        this.editingId = null;
        this.selectedStock = null;
      }
    }, 250);
  }

  render() {
    const isEdit = Boolean(this.editingId);
    const stock = this.selectedStock || {};
    const names = portfolioStore.getWatchlistNames();
    const counts = portfolioStore.getWatchlistCounts();
    const activeWlId = portfolioStore.getActiveWatchlistId();
    const targetWlId = stock.watchlistId ? Number(stock.watchlistId) : activeWlId;
    const symbol = stock.symbol || '';
    const name = stock.name || '';
    const exchange = stock.exchange || 'NSE';
    const sector = stock.sector || 'General / Equity';
    const cmp = Number(stock.cmp || 0);
    const targetPrice = stock.targetPrice !== undefined && stock.targetPrice !== null ? stock.targetPrice : (cmp > 0 ? parseFloat((cmp * 0.97).toFixed(2)) : '');
    const notes = stock.notes || '';

    this.container.innerHTML = `
      <div class="modal-card modal-watchlist-card" style="max-width: 520px; width: 95%;">
        <!-- Header -->
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 0.65rem;">
            <div class="modal-icon-badge" style="background: rgba(99, 102, 241, 0.15); color: #818cf8; width: 38px; height: 38px; border-radius: 10px; display: flex; align-items: center; justify-content: center;">
              ${icons.bookmark || icons.star}
            </div>
            <div>
              <h3 class="modal-title" style="margin: 0; font-size: 1.15rem;">
                ${isEdit ? 'Edit Watchlist Stock' : 'Save Stock to Watchlist'}
              </h3>
              <p style="margin: 0.15rem 0 0 0; font-size: 0.78rem; color: var(--text-secondary);">
                Set a target buy price and monitor real-time dips & breakouts
              </p>
            </div>
          </div>
          <button type="button" class="modal-close-btn" id="btn-close-watchlist-modal">&times;</button>
        </div>

        <form id="form-add-watchlist" style="display: flex; flex-direction: column; gap: 1rem; margin-top: 0.5rem;">
          <!-- Stock Search / Autocomplete Box -->
          <div class="form-group" style="position: relative;">
            <label class="form-label" for="watchlist-stock-search">
              Stock Symbol or Company Name *
            </label>
            <div style="position: relative;">
              <input
                type="text"
                id="watchlist-stock-search"
                class="form-control"
                placeholder="Search Indian stocks (e.g. RELIANCE, TCS, INFY)..."
                value="${symbol ? (name ? `${symbol} - ${name}` : symbol) : ''}"
                autocomplete="off"
                required
              />
              <span style="position: absolute; right: 12px; top: 50%; transform: translateY(-50%); color: var(--text-muted); pointer-events: none;">
                ${icons.search}
              </span>
            </div>
            <!-- Autocomplete Results Dropdown -->
            <div id="watchlist-search-dropdown" class="stock-search-dropdown" style="display: none;"></div>
          </div>

          <!-- Selected Stock Badge / Live Price Preview -->
          <div id="watchlist-selected-preview" class="watchlist-stock-preview ${symbol ? '' : 'is-hidden'}">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 0.6rem;">
                <div class="stock-symbol-chip" id="preview-chip">${symbol ? symbol.substring(0, 3) : '--'}</div>
                <div>
                  <div style="font-weight: 700; font-size: 0.95rem; display: flex; align-items: center; gap: 0.4rem;">
                    <span id="preview-symbol">${symbol || '--'}</span>
                    <span class="exchange-tag" id="preview-exchange">${exchange}</span>
                  </div>
                  <div style="font-size: 0.74rem; color: var(--text-secondary);" id="preview-name">${name || '--'}</div>
                </div>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 0.72rem; color: var(--text-muted);">Current Market Price</div>
                <div style="font-size: 1.1rem; font-weight: 800; font-family: var(--font-mono); color: var(--text-primary);" id="preview-cmp">
                  ${cmp > 0 ? portfolioStore.formatMoney(cmp) : '₹--'}
                </div>
              </div>
            </div>
          </div>

          <!-- Hidden inputs for exchange and sector -->
          <input type="hidden" id="watchlist-hidden-symbol" value="${symbol}">
          <input type="hidden" id="watchlist-hidden-name" value="${name}">
          <input type="hidden" id="watchlist-hidden-exchange" value="${exchange}">
          <input type="hidden" id="watchlist-hidden-sector" value="${sector}">
          <input type="hidden" id="watchlist-hidden-cmp" value="${cmp}">

          <!-- Choose Watchlist Destination (3 Watchlists, Up to 50 shares each) -->
          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label class="form-label" for="watchlist-select-id" style="margin-bottom: 0;">
                Destination Watchlist (Max 50 Stocks Each) *
              </label>
            </div>
            <select id="watchlist-select-id" class="form-control">
              <option value="1" ${targetWlId === 1 ? 'selected' : ''}>
                ${names[1]} (${counts[1]}/50 Stocks)${counts[1] >= 50 && targetWlId !== 1 ? ' - Full' : ''}
              </option>
              <option value="2" ${targetWlId === 2 ? 'selected' : ''}>
                ${names[2]} (${counts[2]}/50 Stocks)${counts[2] >= 50 && targetWlId !== 2 ? ' - Full' : ''}
              </option>
              <option value="3" ${targetWlId === 3 ? 'selected' : ''}>
                ${names[3]} (${counts[3]}/50 Stocks)${counts[3] >= 50 && targetWlId !== 3 ? ' - Full' : ''}
              </option>
            </select>
          </div>

          <!-- Target Buy Price & Presets -->
          <div class="form-group">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem;">
              <label class="form-label" for="watchlist-input-target" style="margin-bottom: 0;">
                Target Buy Price (₹)
              </label>
              <span style="font-size: 0.72rem; color: var(--text-muted);">Alert triggers when CMP &le; Target</span>
            </div>
            <input
              type="number"
              id="watchlist-input-target"
              class="form-control mono"
              placeholder="0.00"
              step="0.05"
              min="0.01"
              value="${targetPrice}"
            />

            <!-- Quick Target Presets -->
            <div class="watchlist-target-presets" id="watchlist-target-presets" style="margin-top: 0.5rem; display: flex; gap: 0.4rem; flex-wrap: wrap;">
              <button type="button" class="btn btn-outline btn-xs btn-preset" data-discount="0">At CMP</button>
              <button type="button" class="btn btn-outline btn-xs btn-preset" data-discount="2">-2% Dip</button>
              <button type="button" class="btn btn-outline btn-xs btn-preset" data-discount="5">-5% Pullback</button>
              <button type="button" class="btn btn-outline btn-xs btn-preset" data-discount="10">-10% Value</button>
            </div>
          </div>

          <!-- Notes / Buy Rationale -->
          <div class="form-group">
            <label class="form-label" for="watchlist-input-notes">Notes / Buy Rationale (Optional)</label>
            <input
              type="text"
              id="watchlist-input-notes"
              class="form-control"
              placeholder="e.g. Buy on breakout, RSI oversold, earnings turnaround"
              value="${notes}"
            />
          </div>

          <!-- Form Actions -->
          <div style="display: flex; justify-content: flex-end; gap: 0.65rem; margin-top: 0.5rem;">
            <button type="button" class="btn btn-outline btn-sm" id="btn-cancel-watchlist">Cancel</button>
            <button type="submit" class="btn btn-primary btn-sm" id="btn-save-watchlist" style="min-width: 130px; justify-content: center;">
              ${icons.checkCircle || '✓'}
              <span>${isEdit ? 'Update Watchlist' : 'Save to Watchlist'}</span>
            </button>
          </div>
        </form>
      </div>
    `;

    this.attachEventListeners();
  }

  attachEventListeners() {
    const closeBtn = this.container.querySelector('#btn-close-watchlist-modal');
    if (closeBtn) closeBtn.addEventListener('click', () => this.close());

    const cancelBtn = this.container.querySelector('#btn-cancel-watchlist');
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.close());

    const searchInput = this.container.querySelector('#watchlist-stock-search');
    const dropdown = this.container.querySelector('#watchlist-search-dropdown');

    if (searchInput && dropdown) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.trim().toUpperCase();
        if (q.length < 1) {
          dropdown.style.display = 'none';
          return;
        }

        const matches = POPULAR_STOCKS.filter(s =>
          s.symbol.toUpperCase().includes(q) ||
          s.name.toUpperCase().includes(q) ||
          (s.isin && s.isin.toUpperCase().includes(q))
        ).slice(0, 8);

        if (matches.length === 0) {
          dropdown.innerHTML = `
            <div class="search-drop-item" data-custom="${q}">
              <div style="font-weight: 700;">+ Use custom symbol "${q}"</div>
              <div style="font-size: 0.75rem; color: var(--text-secondary);">NSE / BSE Custom Stock</div>
            </div>
          `;
        } else {
          dropdown.innerHTML = matches.map(s => `
            <div class="search-drop-item" data-symbol="${s.symbol}">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <div style="font-weight: 700;">
                  ${s.symbol}
                  <span class="exchange-tag">${s.exchange || 'NSE'}</span>
                </div>
                <div style="font-family: var(--font-mono); font-weight: 600;">
                  ${portfolioStore.formatMoney(s.cmp)}
                </div>
              </div>
              <div style="font-size: 0.75rem; color: var(--text-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                ${s.name} • ${s.sector || 'Equity'}
              </div>
            </div>
          `).join('');
        }

        dropdown.style.display = 'block';
      });

      dropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.search-drop-item');
        if (!item) return;

        const sym = item.getAttribute('data-symbol');
        const custom = item.getAttribute('data-custom');

        if (sym) {
          const matched = POPULAR_STOCKS.find(s => s.symbol === sym);
          if (matched) this.selectStock(matched);
        } else if (custom) {
          this.selectStock({
            symbol: custom,
            name: custom,
            exchange: 'NSE',
            sector: 'General / Equity',
            cmp: 100
          });
        }
        dropdown.style.display = 'none';
      });

      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.style.display = 'none';
        }
      });
    }

    // Preset Target Buttons
    const presetButtons = this.container.querySelectorAll('.btn-preset');
    presetButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const discount = parseFloat(btn.getAttribute('data-discount') || '0');
        const hiddenCmp = this.container.querySelector('#watchlist-hidden-cmp');
        const targetInput = this.container.querySelector('#watchlist-input-target');
        const cmpVal = parseFloat(hiddenCmp?.value || '0');

        if (cmpVal > 0 && targetInput) {
          const calculated = discount === 0 ? cmpVal : cmpVal * (1 - discount / 100);
          targetInput.value = parseFloat(calculated.toFixed(2));
          targetInput.classList.add('flash-input');
          setTimeout(() => targetInput.classList.remove('flash-input'), 400);
        }
      });
    });

    // Form Submission
    const form = this.container.querySelector('#form-add-watchlist');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const hiddenSym = this.container.querySelector('#watchlist-hidden-symbol');
        const hiddenName = this.container.querySelector('#watchlist-hidden-name');
        const hiddenExchange = this.container.querySelector('#watchlist-hidden-exchange');
        const hiddenSector = this.container.querySelector('#watchlist-hidden-sector');
        const targetInput = this.container.querySelector('#watchlist-input-target');
        const notesInput = this.container.querySelector('#watchlist-input-notes');

        let symbol = hiddenSym?.value?.trim()?.toUpperCase();
        if (!symbol) {
          const searchVal = searchInput?.value?.trim()?.toUpperCase() || '';
          symbol = searchVal.split(' - ')[0].trim();
        }

        if (!symbol) {
          alert('Please enter or select a valid stock symbol.');
          return;
        }

        const name = hiddenName?.value || symbol;
        const exchange = hiddenExchange?.value || 'NSE';
        const sector = hiddenSector?.value || 'General / Equity';
        const targetPrice = targetInput?.value ? parseFloat(targetInput.value) : null;
        const notes = notesInput?.value?.trim() || '';

        const saveBtn = this.container.querySelector('#btn-save-watchlist');
        if (saveBtn) {
          saveBtn.disabled = true;
          saveBtn.innerHTML = `<span>Saving...</span>`;
        }

        const wlSelect = this.container.querySelector('#watchlist-select-id');
        const chosenWlId = wlSelect ? parseInt(wlSelect.value, 10) : portfolioStore.getActiveWatchlistId();
        const wlName = portfolioStore.getWatchlistName(chosenWlId);

        try {
          if (this.editingId) {
            await portfolioStore.updateWatchlistItem(this.editingId, {
              targetPrice,
              notes,
              watchlistId: chosenWlId
            });
            this.showToast(`Updated ${symbol} in "${wlName}"!`, 'success');
          } else {
            await portfolioStore.addToWatchlist({
              symbol,
              name,
              exchange,
              sector,
              targetPrice,
              notes,
              watchlistId: chosenWlId
            });
            this.showToast(`Saved ${symbol} to "${wlName}"!`, 'success');
          }

          if (typeof this.onSavedCallback === 'function') {
            this.onSavedCallback({ symbol, targetPrice, notes });
          }
          this.close();
        } catch (err) {
          alert(`Error saving watchlist stock: ${err.message}`);
          if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = `${icons.checkCircle || '✓'} <span>Save to Watchlist</span>`;
          }
        }
      });
    }
  }

  selectStock(stock) {
    this.selectedStock = stock;
    const searchInput = this.container.querySelector('#watchlist-stock-search');
    const preview = this.container.querySelector('#watchlist-selected-preview');
    const previewChip = this.container.querySelector('#preview-chip');
    const previewSym = this.container.querySelector('#preview-symbol');
    const previewEx = this.container.querySelector('#preview-exchange');
    const previewName = this.container.querySelector('#preview-name');
    const previewCmp = this.container.querySelector('#preview-cmp');

    const hiddenSym = this.container.querySelector('#watchlist-hidden-symbol');
    const hiddenName = this.container.querySelector('#watchlist-hidden-name');
    const hiddenEx = this.container.querySelector('#watchlist-hidden-exchange');
    const hiddenSec = this.container.querySelector('#watchlist-hidden-sector');
    const hiddenCmp = this.container.querySelector('#watchlist-hidden-cmp');
    const targetInput = this.container.querySelector('#watchlist-input-target');

    if (searchInput) searchInput.value = `${stock.symbol} - ${stock.name}`;
    if (previewChip) previewChip.textContent = stock.symbol.substring(0, 3);
    if (previewSym) previewSym.textContent = stock.symbol;
    if (previewEx) previewEx.textContent = stock.exchange || 'NSE';
    if (previewName) previewName.textContent = stock.name;
    if (previewCmp) previewCmp.textContent = portfolioStore.formatMoney(stock.cmp);

    if (hiddenSym) hiddenSym.value = stock.symbol;
    if (hiddenName) hiddenName.value = stock.name;
    if (hiddenEx) hiddenEx.value = stock.exchange || 'NSE';
    if (hiddenSec) hiddenSec.value = stock.sector || 'General / Equity';
    if (hiddenCmp) hiddenCmp.value = stock.cmp;

    if (targetInput && (!targetInput.value || parseFloat(targetInput.value) <= 0)) {
      targetInput.value = parseFloat((stock.cmp * 0.97).toFixed(2));
    }

    if (preview) preview.classList.remove('is-hidden');
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
    }, 3500);
  }
}
