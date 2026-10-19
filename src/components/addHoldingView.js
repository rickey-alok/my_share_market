// Add Holdings View Component (Page 2)
import { portfolioStore } from '../state/portfolioStore.js';
import { POPULAR_STOCKS, SECTORS, EXCHANGES } from '../data/stocksDatabase.js';
import { icons } from '../utils/icons.js';

export class AddHoldingView {
  constructor(containerElement, onNavigateToDashboard, onNavigateToStockDetail) {
    this.container = containerElement;
    this.onNavigateToDashboard = onNavigateToDashboard;
    this.onNavigateToStockDetail = onNavigateToStockDetail;
    this.preselectedSymbol = null;

    this.init();
  }

  setPrefill(data = {}) {
    if (data.symbol) {
      this.preselectedSymbol = data.symbol;
      const symbolInput = this.container.querySelector('#input-symbol');
      if (symbolInput) {
        symbolInput.value = data.symbol;
        this.handleSymbolSelected(data.symbol);
      }
    }
  }

  init() {
    this.render();
    this.attachEventListeners();
    this.updateRecentTransactions();

    this.unsubscribe = portfolioStore.subscribe((event) => {
      if (event.type === 'HOLDING_ADDED' || event.type === 'TRANSACTION_RECORDED') {
        this.updateRecentTransactions();
      }
    });
  }

  render() {
    const today = new Date().toISOString().split('T')[0];

    this.container.innerHTML = `
      <!-- Page Title -->
      <div class="page-title-row">
        <div>
          <h1 class="page-title">Add New Holding</h1>
          <p class="page-subtitle">Add a new stock position to your portfolio</p>
        </div>
        <div class="page-header-actions">
          <button id="btn-back-dashboard" class="btn btn-outline btn-sm">
            ${icons.layoutDashboard}
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      <div class="add-holding-layout">
        <!-- Main Form Column -->
        <div class="form-card">
          <h2 class="form-section-title">New Holding Details</h2>
          <p class="form-section-desc">Enter purchase parameters to add a new stock to your portfolio.</p>

          <!-- Popular Quick Picks -->
          <span class="quick-picks-label">Quick Pick Popular Stocks</span>
          <div class="stock-pills-row" id="quick-stock-pills">
            ${POPULAR_STOCKS.slice(0, 8).map(s => `
              <button type="button" class="stock-pill" data-symbol="${s.symbol}">
                ${s.symbol}
              </button>
            `).join('')}
          </div>

          <form id="holding-form" class="form-grid" novalidate>
            <!-- Row: Symbol & Exchange -->
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label" for="input-symbol">
                  <span>Stock Symbol *</span>
                  <span id="cmp-display-badge" style="font-family: var(--font-mono); color: var(--bull-green); font-size: 0.75rem;"></span>
                </label>
                <input 
                  type="text" 
                  id="input-symbol" 
                  class="form-control mono" 
                  placeholder="e.g. RELIANCE, TCS, AAPL" 
                  required 
                  autocomplete="off"
                  list="stocks-datalist"
                >
                <datalist id="stocks-datalist">
                  ${POPULAR_STOCKS.map(s => `<option value="${s.symbol}">${s.name} (${s.exchange})</option>`).join('')}
                </datalist>
              </div>

              <div class="form-group">
                <label class="form-label" for="select-exchange">Exchange</label>
                <select id="select-exchange" class="form-control">
                  ${EXCHANGES.map(ex => `<option value="${ex}">${ex}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- Row: Company Name & Sector -->
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label" for="input-company-name">Company Name</label>
                <input type="text" id="input-company-name" class="form-control" placeholder="Company full name">
              </div>

              <div class="form-group">
                <label class="form-label" for="select-sector">Sector / Industry</label>
                <select id="select-sector" class="form-control">
                  ${SECTORS.map(sec => `<option value="${sec}">${sec}</option>`).join('')}
                </select>
              </div>
            </div>

            <!-- Row: Quantity & Stepper -->
            <div class="form-group">
              <label class="form-label" for="input-quantity">Number of Shares (Quantity) *</label>
              <input 
                type="number" 
                id="input-quantity" 
                class="form-control mono" 
                placeholder="e.g. 50" 
                min="1" 
                step="1" 
                required
              >
              <div class="qty-steppers">
                <button type="button" class="stepper-chip" data-qty="10">+10</button>
                <button type="button" class="stepper-chip" data-qty="25">+25</button>
                <button type="button" class="stepper-chip" data-qty="50">+50</button>
                <button type="button" class="stepper-chip" data-qty="100">+100</button>
              </div>
            </div>

            <!-- Row: Buy Price & Market Price Helper -->
            <div class="form-group">
              <label class="form-label" for="input-buy-price">
                <span>Buy Price Per Share *</span>
                <span id="btn-use-cmp" class="helper-link">Use Current Market Price</span>
              </label>
              <div class="input-with-affix">
                <span class="input-affix" id="currency-affix-label">${portfolioStore.getCurrencySymbol()}</span>
                <input 
                  type="number" 
                  id="input-buy-price" 
                  class="form-control mono" 
                  placeholder="0.00" 
                  step="0.05" 
                  min="0.01" 
                  required
                >
              </div>
            </div>

            <!-- Row: Buy Date & Strategy Tag -->
            <div class="form-row-2">
              <div class="form-group">
                <label class="form-label" for="input-buy-date">Purchase Date</label>
                <input type="date" id="input-buy-date" class="form-control" value="${today}">
              </div>

              <div class="form-group">
                <label class="form-label" for="input-notes">Strategy / Tag</label>
                <input type="text" id="input-notes" class="form-control" placeholder="e.g. Long-term, SIP, Dividend">
              </div>
            </div>

            <!-- Submit Button -->
            <div style="margin-top: 1rem;">
              <button type="submit" id="btn-submit-holding" class="btn btn-primary" style="width: 100%; padding: 0.85rem; font-size: 1rem;">
                ${icons.plus}
                <span id="submit-btn-label">Confirm & Add to Portfolio</span>
              </button>
            </div>
          </form>
        </div>

        <!-- Right Column: Live Impact & Averaging Calculator -->
        <div class="impact-summary-rail">
          <div class="impact-card">
            <div class="impact-header">
              <h3 style="font-family: var(--font-heading); font-size: 1.05rem; font-weight: 700;">Transaction Impact</h3>
              <span class="impact-badge" id="holding-status-badge">New Holding</span>
            </div>

            <!-- Total Outlay -->
            <div class="impact-total-box">
              <div class="impact-label">Total Outlay (Capital Required)</div>
              <div class="impact-amount" id="impact-total-outlay">${portfolioStore.formatMoney(0)}</div>
            </div>

            <!-- Existing Holding Alert & Redirect Notice -->
            <div class="existing-holding-notice is-hidden" id="existing-holding-notice">
              <div class="existing-notice-title">
                ${icons.info}
                <span>Stock Already In Portfolio</span>
              </div>
              <p class="existing-notice-text">
                <strong id="existing-notice-symbol">--</strong> is already in your portfolio (<span id="existing-notice-qty">0</span> shares).
              </p>
              <p class="existing-notice-subtext">
                To average down or calculate your new weighted cost per share, please use the dedicated Average Price Calculator.
              </p>
              <button type="button" class="btn btn-primary btn-sm" id="btn-goto-stock-calc" style="width: 100%; justify-content: center; margin-top: 0.75rem;">
                ${icons.calculator} Open Average Price Calculator
              </button>
            </div>

            <!-- Summary Breakdown Rows -->
            <div class="impact-detail-row">
              <span class="impact-detail-label">Shares to Buy</span>
              <span class="impact-detail-val" id="impact-shares-val">0</span>
            </div>
            <div class="impact-detail-row">
              <span class="impact-detail-label">Execution Price</span>
              <span class="impact-detail-val" id="impact-price-val">${portfolioStore.formatMoney(0)}</span>
            </div>
            <div class="impact-detail-row">
              <span class="impact-detail-label">Current Market Price (CMP)</span>
              <span class="impact-detail-val" id="impact-cmp-val">--</span>
            </div>
            <div class="impact-detail-row">
              <span class="impact-detail-label">Estimated Portfolio Change</span>
              <span class="impact-detail-val" id="impact-portfolio-change">+0.00%</span>
            </div>
          </div>

          <!-- Recent Additions Card -->
          <div class="recent-tx-card">
            <h4 style="font-family: var(--font-heading); font-size: 0.95rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; justify-content: space-between;">
              <span>Recent Activity</span>
              <span style="font-size: 0.72rem; color: var(--text-muted); font-family: var(--font-mono);" id="recent-count-badge">0 trades</span>
            </h4>
            <div class="tx-list" id="recent-tx-list">
              <!-- Dynamically injected -->
            </div>
          </div>
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Back to dashboard
    const btnBack = this.container.querySelector('#btn-back-dashboard');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        if (this.onNavigateToDashboard) this.onNavigateToDashboard();
      });
    }

    // Quick stock pills
    const pills = this.container.querySelectorAll('.stock-pill');
    pills.forEach(pill => {
      pill.addEventListener('click', () => {
        pills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        const symbol = pill.getAttribute('data-symbol');
        const symbolInput = this.container.querySelector('#input-symbol');
        if (symbolInput) {
          symbolInput.value = symbol;
          this.handleSymbolSelected(symbol);
        }
      });
    });

    // Symbol Input change / blur
    const symbolInput = this.container.querySelector('#input-symbol');
    if (symbolInput) {
      symbolInput.addEventListener('input', (e) => {
        this.handleSymbolSelected(e.target.value);
      });
      symbolInput.addEventListener('change', (e) => {
        this.handleSymbolSelected(e.target.value);
      });
    }

    // Stepper chips
    const stepperChips = this.container.querySelectorAll('.stepper-chip');
    const qtyInput = this.container.querySelector('#input-quantity');
    stepperChips.forEach(chip => {
      chip.addEventListener('click', () => {
        const addQty = parseInt(chip.getAttribute('data-qty'), 10) || 0;
        const currentQty = parseInt(qtyInput.value, 10) || 0;
        qtyInput.value = currentQty + addQty;
        this.recalculateImpact();
      });
    });

    // Quantity & Price live recalculation
    qtyInput.addEventListener('input', () => this.recalculateImpact());

    const priceInput = this.container.querySelector('#input-buy-price');
    priceInput.addEventListener('input', () => this.recalculateImpact());

    // "Use Current Market Price" button
    const btnUseCmp = this.container.querySelector('#btn-use-cmp');
    if (btnUseCmp) {
      btnUseCmp.addEventListener('click', () => {
        const symbol = symbolInput.value.toUpperCase().trim();
        const refStock = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === symbol);
        const existingHolding = portfolioStore.getHoldingBySymbol(symbol);
        const cmp = existingHolding ? existingHolding.cmp : (refStock ? refStock.cmp : null);
        if (cmp) {
          priceInput.value = cmp;
          this.recalculateImpact();
        }
      });
    }

    // Form Submission
    const form = this.container.querySelector('#holding-form');
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSubmit();
      });
    }

    // Redirect to dedicated Average Price Calculator if user clicks button on existing stock notice
    const btnGotoCalc = this.container.querySelector('#btn-goto-stock-calc');
    if (btnGotoCalc) {
      btnGotoCalc.addEventListener('click', () => {
        const symbolInput = this.container.querySelector('#input-symbol');
        const symbol = symbolInput ? symbolInput.value.toUpperCase().trim() : '';
        if (symbol && this.onNavigateToStockDetail) {
          this.onNavigateToStockDetail(symbol);
        } else if (symbol) {
          window.location.hash = `#/stock/${symbol}`;
        }
      });
    }
  }

  handleSymbolSelected(symbolText) {
    if (!symbolText) return;
    const cleanSym = symbolText.toUpperCase().trim();

    const companyInput = this.container.querySelector('#input-company-name');
    const sectorSelect = this.container.querySelector('#select-sector');
    const exchangeSelect = this.container.querySelector('#select-exchange');
    const priceInput = this.container.querySelector('#input-buy-price');
    const cmpBadge = this.container.querySelector('#cmp-display-badge');

    // Check popular stocks database
    const matchedStock = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === cleanSym);
    const existingHolding = portfolioStore.getHoldingBySymbol(cleanSym);

    let cmpVal = null;
    if (existingHolding) {
      cmpVal = existingHolding.cmp;
      if (companyInput && !companyInput.value) companyInput.value = existingHolding.name;
      if (sectorSelect) sectorSelect.value = existingHolding.sector || 'Others';
      if (exchangeSelect) exchangeSelect.value = existingHolding.exchange || 'NSE';
    } else if (matchedStock) {
      cmpVal = matchedStock.cmp;
      if (companyInput) companyInput.value = matchedStock.name;
      if (sectorSelect) sectorSelect.value = matchedStock.sector;
      if (exchangeSelect) exchangeSelect.value = matchedStock.exchange;
    }

    if (cmpVal && (!priceInput.value || priceInput.value === '0')) {
      priceInput.value = cmpVal;
    }

    if (cmpBadge && cmpVal) {
      cmpBadge.textContent = `CMP: ${portfolioStore.formatMoney(cmpVal)}`;
    } else if (cmpBadge) {
      cmpBadge.textContent = '';
    }

    this.recalculateImpact();
  }

  recalculateImpact() {
    const symbolInput = this.container.querySelector('#input-symbol');
    const qtyInput = this.container.querySelector('#input-quantity');
    const priceInput = this.container.querySelector('#input-buy-price');

    const symbol = symbolInput ? symbolInput.value.toUpperCase().trim() : '';
    const quantity = parseFloat(qtyInput ? qtyInput.value : 0) || 0;
    const price = parseFloat(priceInput ? priceInput.value : 0) || 0;

    const totalOutlay = quantity * price;

    // Update Elements
    const outlayEl = this.container.querySelector('#impact-total-outlay');
    const sharesEl = this.container.querySelector('#impact-shares-val');
    const priceEl = this.container.querySelector('#impact-price-val');
    const cmpEl = this.container.querySelector('#impact-cmp-val');
    const statusBadge = this.container.querySelector('#holding-status-badge');
    const submitBtnLabel = this.container.querySelector('#submit-btn-label');
    const avgAlertBox = this.container.querySelector('#averaging-alert-box');

    if (outlayEl) outlayEl.textContent = portfolioStore.formatMoney(totalOutlay);
    if (sharesEl) sharesEl.textContent = quantity.toLocaleString();
    if (priceEl) priceEl.textContent = portfolioStore.formatMoney(price);

    // Check if holding already exists in portfolio
    const existingHolding = portfolioStore.getHoldingBySymbol(symbol);
    const refStock = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === symbol);
    const cmp = existingHolding ? existingHolding.cmp : (refStock ? refStock.cmp : price);

    if (cmpEl) {
      cmpEl.textContent = cmp ? portfolioStore.formatMoney(cmp) : '--';
    }

    const existingNotice = this.container.querySelector('#existing-holding-notice');
    const existingSym = this.container.querySelector('#existing-notice-symbol');
    const existingQty = this.container.querySelector('#existing-notice-qty');

    if (existingHolding && symbol) {
      statusBadge.textContent = 'Already In Portfolio';
      statusBadge.style.color = 'var(--accent-cyan)';
      statusBadge.style.background = 'rgba(6, 182, 212, 0.15)';
      statusBadge.style.borderColor = 'rgba(6, 182, 212, 0.35)';

      if (existingNotice) {
        existingNotice.classList.remove('is-hidden');
        if (existingSym) existingSym.textContent = existingHolding.symbol;
        if (existingQty) existingQty.textContent = existingHolding.quantity.toLocaleString();
      }
    } else {
      statusBadge.textContent = 'New Holding';
      statusBadge.style.color = 'var(--brand-indigo-light)';
      statusBadge.style.background = 'rgba(99, 102, 241, 0.15)';
      statusBadge.style.borderColor = 'rgba(99, 102, 241, 0.3)';

      if (existingNotice) {
        existingNotice.classList.add('is-hidden');
      }
    }

    if (submitBtnLabel) {
      submitBtnLabel.textContent = 'Confirm & Add to Portfolio';
    }

    // Portfolio change estimation
    const metrics = portfolioStore.getPortfolioMetrics();
    const portfolioChangeEl = this.container.querySelector('#impact-portfolio-change');
    if (portfolioChangeEl && metrics.totalInvested > 0) {
      const pctIncrease = (totalOutlay / metrics.totalInvested) * 100;
      portfolioChangeEl.textContent = `+${pctIncrease.toFixed(1)}% to Invested Base`;
    }
  }

  handleSubmit() {
    const symbolInput = this.container.querySelector('#input-symbol');
    const qtyInput = this.container.querySelector('#input-quantity');
    const priceInput = this.container.querySelector('#input-buy-price');
    const companyInput = this.container.querySelector('#input-company-name');
    const exchangeSelect = this.container.querySelector('#select-exchange');
    const sectorSelect = this.container.querySelector('#select-sector');
    const dateInput = this.container.querySelector('#input-buy-date');
    const notesInput = this.container.querySelector('#input-notes');

    const symbol = symbolInput.value.toUpperCase().trim();
    const quantity = parseFloat(qtyInput.value);
    const buyPrice = parseFloat(priceInput.value);

    if (!symbol) {
      alert('Please enter a valid stock symbol.');
      symbolInput.focus();
      return;
    }

    if (!quantity || quantity <= 0) {
      alert('Please enter a valid quantity of shares (must be greater than 0).');
      qtyInput.focus();
      return;
    }

    if (!buyPrice || buyPrice <= 0) {
      alert('Please enter a valid buy price per share.');
      priceInput.focus();
      return;
    }

    // Process in store
    const result = portfolioStore.addOrUpdateHolding({
      symbol: symbol,
      name: companyInput.value.trim() || symbol,
      exchange: exchangeSelect.value,
      sector: sectorSelect.value,
      quantity: quantity,
      buyPrice: buyPrice,
      buyDate: dateInput.value,
      notes: notesInput.value.trim()
    });

    // Show success notification
    this.showToast(
      result.isAveraged 
        ? `Successfully averaged ${symbol}! New weighted average: ${portfolioStore.formatMoney(result.newAvgPrice)}` 
        : `Successfully added ${quantity} shares of ${symbol} to your portfolio!`,
      'success'
    );

    // Reset Form
    symbolInput.value = '';
    qtyInput.value = '';
    priceInput.value = '';
    companyInput.value = '';
    notesInput.value = '';
    this.container.querySelectorAll('.stock-pill').forEach(p => p.classList.remove('active'));
    this.recalculateImpact();

    // After brief moment, automatically navigate to Dashboard so user sees the reflected holding!
    setTimeout(() => {
      if (this.onNavigateToDashboard) {
        this.onNavigateToDashboard();
      }
    }, 1200);
  }

  updateRecentTransactions() {
    const list = this.container.querySelector('#recent-tx-list');
    const countBadge = this.container.querySelector('#recent-count-badge');
    if (!list) return;

    const txs = portfolioStore.transactions.slice(0, 5);
    if (countBadge) {
      countBadge.textContent = `${portfolioStore.transactions.length} orders`;
    }

    if (txs.length === 0) {
      list.innerHTML = `<div style="color: var(--text-muted); font-size: 0.8rem; padding: 0.5rem;">No recent transactions</div>`;
      return;
    }

    list.innerHTML = txs.map(t => `
      <div class="tx-item">
        <div>
          <span class="tx-sym">${t.symbol}</span>
          <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary); margin-left: 0.4rem;">
            ${t.quantity} shares @ ${portfolioStore.formatMoney(t.price)}
          </span>
          <div class="tx-date">${t.date || 'Recent'} • ${t.notes || 'Buy'}</div>
        </div>
        <div style="text-align: right; font-family: var(--font-mono); font-weight: 700; color: var(--text-primary);">
          ${portfolioStore.formatMoney(t.totalAmount)}
        </div>
      </div>
    `).join('');
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
      <span style="color: ${type === 'success' ? 'var(--bull-green)' : 'var(--brand-indigo)'};">
        ${icons.checkCircle}
      </span>
      <span>${message}</span>
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
