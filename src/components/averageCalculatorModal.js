// Average Calculator & Transactions Pop-up Modal
import { portfolioStore } from '../state/portfolioStore.js';
import { POPULAR_STOCKS } from '../data/stocksDatabase.js';

const modalIcons = {
  calculator: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="14" x2="16" y2="18"></line><path d="M16 10h.01"></path><path d="M12 10h.01"></path><path d="M8 10h.01"></path><path d="M12 14h.01"></path><path d="M8 14h.01"></path><path d="M12 18h.01"></path><path d="M8 18h.01"></path></svg>`,
  history: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  trendingDown: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>`,
  checkCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
  close: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`
};

export class AverageCalculatorModal {
  constructor(containerId = 'modal-average-calculator') {
    this.containerId = containerId;
    this.container = null;
    this.currentSymbol = null;
    this.tradeMode = 'BUY'; // 'BUY' or 'SELL'
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

    // Close on Escape
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });
  }

  isOpen() {
    return this.container && this.container.classList.contains('open');
  }

  open(symbol) {
    if (!symbol) return;
    this.currentSymbol = symbol.toUpperCase().trim();
    this.tradeMode = 'BUY';

    const holding = portfolioStore.getHoldingBySymbol(this.currentSymbol);
    if (!holding) {
      alert(`Holding not found for ${this.currentSymbol}`);
      return;
    }

    this.render();
    this.container.style.display = 'flex';
    requestAnimationFrame(() => {
      this.container.classList.add('open');
    });
  }

  close() {
    if (!this.container) return;
    this.container.classList.remove('open');
    setTimeout(() => {
      if (!this.isOpen()) {
        this.container.style.display = 'none';
        this.container.innerHTML = '';
      }
    }, 250);
  }

  render() {
    const holding = portfolioStore.getHoldingBySymbol(this.currentSymbol);
    if (!holding) return;

    const transactions = portfolioStore.getTransactionsForStock(this.currentSymbol);
    const refStock = POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === (this.currentSymbol || '').toUpperCase());
    const currentCmp = holding && !isNaN(parseFloat(holding.cmp)) && parseFloat(holding.cmp) > 0
      ? parseFloat(holding.cmp)
      : (refStock ? refStock.cmp : (holding ? parseFloat(holding.avgPrice) : 0));

    this.container.innerHTML = `
      <div class="avg-calculator-modal-card" role="dialog" aria-modal="true">
        <!-- Modal Header -->
        <div class="avg-modal-header">
          <div class="avg-modal-title-wrap">
            <div class="avg-modal-icon-badge">
              ${modalIcons.calculator}
            </div>
            <div>
              <div style="display: flex; align-items: center; gap: 0.5rem;">
                <h3 class="avg-modal-symbol">${holding.symbol}</h3>
                <span class="compact-exchange-pill">${holding.exchange || 'NSE'}</span>
                <span class="avg-modal-cmp-pill">CMP: ${portfolioStore.formatMoney(currentCmp)}</span>
              </div>
              <div class="avg-modal-name">${holding.name || holding.symbol}</div>
            </div>
          </div>
          <button type="button" class="modal-close-btn" id="btn-close-avg-modal" aria-label="Close dialog">
            ${modalIcons.close}
          </button>
        </div>

        <!-- Modal Body (Two Columns: Calculator + Transaction Details) -->
        <div class="avg-modal-body">
          <!-- Left Column: Average Calculator Form -->
          <div class="avg-modal-col">
            <div class="avg-modal-section-title">
              ${modalIcons.calculator}
              <span id="avg-modal-calc-title">Average Down / Buy Calculator</span>
            </div>

            <!-- Segmented Trade Mode Toggle: BUY vs SELL -->
            <div class="trade-mode-toggle" id="avg-modal-trade-toggle">
              <button type="button" class="trade-mode-btn buy ${this.tradeMode === 'BUY' ? 'active' : ''}" data-mode="BUY">
                ${modalIcons.plus} Buy / Average
              </button>
              <button type="button" class="trade-mode-btn sell ${this.tradeMode === 'SELL' ? 'active' : ''}" data-mode="SELL">
                ${modalIcons.trendingDown} Sell / Book Profit
              </button>
            </div>

            <p class="averaging-tool-desc" id="avg-modal-tool-desc" style="font-size: 0.82rem; margin: 0.5rem 0 0.85rem 0; color: var(--text-secondary);">
              Calculate how buying more shares of <strong>${holding.symbol}</strong> adjusts your weighted average price:
            </p>

            <form id="avg-modal-form" class="quick-avg-form">
              <div class="form-group" style="margin-bottom: 0.85rem;">
                <div class="avg-label-row">
                  <label for="avg-modal-input-qty" id="avg-modal-label-qty" class="avg-field-title">Additional Shares to Buy</label>
                  <span id="avg-modal-avail-hint" class="avg-avail-badge" style="display: none;">
                    Available: <strong class="mono" style="color: var(--text-primary); margin: 0 0.2rem;">${holding.quantity.toLocaleString()}</strong> shares
                  </span>
                </div>

                <div class="quick-pills" id="avg-modal-qty-pills" style="margin-bottom: 0.55rem;">
                  <!-- Dynamically populated -->
                </div>

                <input type="number" id="avg-modal-input-qty" class="form-control mono" min="1" step="1" value="10" required />
                <div id="avg-modal-qty-warning" class="calc-warning-banner" style="display: none; margin-top: 0.4rem;"></div>
              </div>

              <div class="form-group" style="margin-bottom: 0.85rem;">
                <div class="avg-label-row">
                  <label for="avg-modal-input-price" id="avg-modal-label-price" class="avg-field-title">Expected Purchase Price (₹)</label>
                  <button type="button" class="avg-use-cmp-btn" id="avg-modal-btn-use-cmp">
                    Use CMP (${portfolioStore.formatMoney(currentCmp)})
                  </button>
                </div>
                <input type="number" id="avg-modal-input-price" class="form-control mono" min="0.05" step="0.05" value="${(currentCmp || holding.avgPrice).toFixed(2)}" required />
              </div>

              <!-- Live Projected Result Box -->
              <div class="projected-impact-box" id="avg-modal-projected-box" style="margin-bottom: 1rem;">
                <!-- Dynamically populated -->
              </div>

              <button type="submit" class="btn btn-primary" id="avg-modal-submit-btn" style="width: 100%; justify-content: center;">
                ${modalIcons.checkCircle} <span id="avg-modal-submit-label">Execute Buy & Update Average</span>
              </button>
            </form>
          </div>

          <!-- Right Column: Transaction History Details -->
          <div class="avg-modal-col">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.85rem;">
              <div class="avg-modal-section-title" style="margin-bottom: 0;">
                ${modalIcons.history}
                <span>Transaction History</span>
              </div>
              <span class="badge-count" id="avg-modal-tx-count">${transactions.length} ${transactions.length === 1 ? 'Trade' : 'Trades'}</span>
            </div>

            <div class="avg-tx-scroll-box" id="avg-modal-tx-wrapper">
              ${this.renderTransactionsHtml(transactions, currentCmp)}
            </div>

            <!-- Position Overview Footer Summary -->
            <div style="margin-top: 0.75rem; padding: 0.65rem 0.85rem; background: var(--bg-surface-elevated, rgba(255, 255, 255, 0.03)); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); display: flex; justify-content: space-between; align-items: center; font-size: 0.82rem;">
              <span style="color: var(--text-muted);">Current Position:</span>
              <span class="mono" style="font-weight: 700; color: var(--text-primary);">
                ${holding.quantity.toLocaleString()} shares @ ${portfolioStore.formatMoney(holding.avgPrice)}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.attachEvents(holding, currentCmp);
    this.renderPillsForMode(holding);
    this.updateProjectedImpact();
  }

  attachEvents(holding, currentCmp) {
    const btnClose = this.container.querySelector('#btn-close-avg-modal');
    if (btnClose) {
      btnClose.addEventListener('click', () => this.close());
    }

    // Toggle BUY vs SELL modes
    const modeBtns = this.container.querySelectorAll('#avg-modal-trade-toggle .trade-mode-btn');
    modeBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.getAttribute('data-mode');
        this.setTradeMode(mode);
      });
    });

    // "Use CMP" helper button
    const btnUseCmp = this.container.querySelector('#avg-modal-btn-use-cmp');
    if (btnUseCmp) {
      btnUseCmp.addEventListener('click', () => {
        const h = portfolioStore.getHoldingBySymbol(this.currentSymbol) || holding;
        const inputPrice = this.container.querySelector('#avg-modal-input-price');
        if (inputPrice) {
          inputPrice.value = (h.cmp || h.avgPrice).toFixed(2);
          this.updateProjectedImpact();
        }
      });
    }

    // Input listeners
    const inputQty = this.container.querySelector('#avg-modal-input-qty');
    const inputPrice = this.container.querySelector('#avg-modal-input-price');
    const form = this.container.querySelector('#avg-modal-form');

    if (inputQty) {
      inputQty.addEventListener('input', () => {
        const pills = this.container.querySelectorAll('#avg-modal-qty-pills .quick-pill');
        pills.forEach(p => {
          if (parseInt(p.getAttribute('data-qty'), 10) === parseInt(inputQty.value, 10)) {
            p.classList.add('active');
          } else {
            p.classList.remove('active');
          }
        });
        this.updateProjectedImpact();
      });
    }

    if (inputPrice) {
      inputPrice.addEventListener('input', () => {
        this.updateProjectedImpact();
      });
    }

    // Form submit
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const currentHolding = portfolioStore.getHoldingBySymbol(this.currentSymbol) || holding;
        const qty = parseFloat(inputQty.value);
        const price = parseFloat(inputPrice.value);

        if (!qty || qty <= 0 || !price || price <= 0) {
          alert('Please enter a valid quantity and price greater than 0');
          return;
        }

        if (this.tradeMode === 'BUY') {
          portfolioStore.addOrUpdateHolding({
            symbol: currentHolding.symbol,
            name: currentHolding.name,
            exchange: currentHolding.exchange,
            sector: currentHolding.sector,
            quantity: qty,
            buyPrice: price,
            cmp: currentHolding.cmp,
            buyDate: new Date().toISOString().split('T')[0],
            notes: `Averaged down: +${qty} shares @ ₹${price}`
          });

          alert(`🎉 Buy order executed! Added ${qty} shares of ${currentHolding.symbol} @ ₹${price}. Average price updated.`);
        } else {
          // SELL Mode
          if (qty > currentHolding.quantity) {
            alert(`Cannot sell ${qty} shares. You only own ${currentHolding.quantity} shares.`);
            return;
          }

          portfolioStore.sellHolding(
            currentHolding.id,
            qty,
            price,
            `Sold ${qty} shares @ ₹${price}`
          );

          alert(`✅ Sell order executed! Sold ${qty} shares of ${currentHolding.symbol} @ ₹${price}.`);
        }

        // Re-render modal data
        const updatedHolding = portfolioStore.getHoldingBySymbol(this.currentSymbol);
        if (updatedHolding && updatedHolding.quantity > 0) {
          this.render();
        } else {
          this.close();
        }
      });
    }
  }

  setTradeMode(mode) {
    this.tradeMode = mode;
    const holding = portfolioStore.getHoldingBySymbol(this.currentSymbol);
    if (!holding) return;

    const modeBtns = this.container.querySelectorAll('#avg-modal-trade-toggle .trade-mode-btn');
    modeBtns.forEach(b => {
      if (b.getAttribute('data-mode') === mode) {
        b.classList.add('active');
      } else {
        b.classList.remove('active');
      }
    });

    const cardTitle = this.container.querySelector('#avg-modal-calc-title');
    const toolDesc = this.container.querySelector('#avg-modal-tool-desc');
    const labelQty = this.container.querySelector('#avg-modal-label-qty');
    const availHint = this.container.querySelector('#avg-modal-avail-hint');
    const labelPrice = this.container.querySelector('#avg-modal-label-price');
    const submitBtn = this.container.querySelector('#avg-modal-submit-btn');
    const submitLabel = this.container.querySelector('#avg-modal-submit-label');
    const inputQty = this.container.querySelector('#avg-modal-input-qty');
    const inputPrice = this.container.querySelector('#avg-modal-input-price');

    if (mode === 'BUY') {
      if (cardTitle) cardTitle.textContent = 'Average Down / Buy Calculator';
      if (toolDesc) toolDesc.innerHTML = `Calculate how buying more shares of <strong>${holding.symbol}</strong> adjusts your weighted average price:`;
      if (labelQty) labelQty.textContent = 'Additional Shares to Buy';
      if (availHint) availHint.style.display = 'none';
      if (labelPrice) labelPrice.textContent = 'Expected Purchase Price (₹)';
      if (submitBtn) {
        submitBtn.className = 'btn btn-primary';
        submitBtn.style.marginTop = '0.5rem';
      }
      if (submitLabel) submitLabel.textContent = 'Execute Buy & Update Average';
      if (inputQty && (parseInt(inputQty.value, 10) <= 0 || parseInt(inputQty.value, 10) > holding.quantity)) {
        inputQty.value = 10;
      }
    } else {
      if (cardTitle) cardTitle.textContent = 'Profit Booking / Sell Calculator';
      if (toolDesc) toolDesc.innerHTML = `Calculate your realized profit/loss and capital released by selling shares of <strong>${holding.symbol}</strong>:`;
      if (labelQty) labelQty.textContent = 'Shares to Sell';
      if (availHint) {
        availHint.style.display = 'inline-flex';
        availHint.innerHTML = `Available: <strong class="mono" style="color: var(--text-primary); margin: 0 0.2rem;">${holding.quantity.toLocaleString()}</strong> shares`;
      }
      if (labelPrice) labelPrice.textContent = 'Expected Selling Price (₹)';
      if (submitBtn) {
        submitBtn.className = 'btn btn-danger btn-sell-action';
        submitBtn.style.marginTop = '0.5rem';
      }
      if (submitLabel) submitLabel.textContent = 'Execute Sell & Book P&L';
      if (inputQty) {
        const defaultSellQty = Math.max(1, Math.round(holding.quantity * 0.5));
        inputQty.value = defaultSellQty;
      }
    }

    if (inputPrice) {
      inputPrice.value = (holding.cmp || holding.avgPrice).toFixed(2);
    }

    this.renderPillsForMode(holding);
    this.updateProjectedImpact();
  }

  renderPillsForMode(holding) {
    const pillsContainer = this.container.querySelector('#avg-modal-qty-pills');
    const inputQty = this.container.querySelector('#avg-modal-input-qty');
    if (!pillsContainer || !holding) return;

    if (this.tradeMode === 'BUY') {
      const buyAmounts = [5, 10, 25, 50, 100];
      const curQty = inputQty ? parseInt(inputQty.value, 10) : 10;
      pillsContainer.innerHTML = buyAmounts.map(val => `
        <button type="button" class="quick-pill buy-pill ${val === curQty ? 'active' : ''}" data-qty="${val}">
          +${val}
        </button>
      `).join('');
    } else {
      const q = holding.quantity || 1;
      const p25 = Math.max(1, Math.round(q * 0.25));
      const p50 = Math.max(1, Math.round(q * 0.5));
      const p75 = Math.max(1, Math.round(q * 0.75));
      const p100 = q;
      const curQty = inputQty ? parseInt(inputQty.value, 10) : p50;

      pillsContainer.innerHTML = `
        <button type="button" class="quick-pill sell-pill ${curQty === p25 ? 'active' : ''}" data-qty="${p25}" title="Sell 25% (${p25} shares)">
          <span>25%</span>
          <span class="pill-sub">(${p25.toLocaleString()})</span>
        </button>
        <button type="button" class="quick-pill sell-pill ${curQty === p50 ? 'active' : ''}" data-qty="${p50}" title="Sell 50% (${p50} shares)">
          <span>50%</span>
          <span class="pill-sub">(${p50.toLocaleString()})</span>
        </button>
        <button type="button" class="quick-pill sell-pill ${curQty === p75 ? 'active' : ''}" data-qty="${p75}" title="Sell 75% (${p75} shares)">
          <span>75%</span>
          <span class="pill-sub">(${p75.toLocaleString()})</span>
        </button>
        <button type="button" class="quick-pill sell-pill ${curQty === p100 ? 'active' : ''}" data-qty="${p100}" title="Sell 100% (All ${p100} shares)">
          <span>100%</span>
          <span class="pill-sub">(All ${p100.toLocaleString()})</span>
        </button>
      `;
    }

    const pills = pillsContainer.querySelectorAll('.quick-pill');
    pills.forEach(p => {
      p.addEventListener('click', () => {
        pills.forEach(x => x.classList.remove('active'));
        p.classList.add('active');
        const qty = p.getAttribute('data-qty');
        if (inputQty) {
          inputQty.value = qty;
          this.updateProjectedImpact();
        }
      });
    });
  }

  updateProjectedImpact() {
    const holding = portfolioStore.getHoldingBySymbol(this.currentSymbol);
    if (!holding) return;

    const inputQty = this.container.querySelector('#avg-modal-input-qty');
    const inputPrice = this.container.querySelector('#avg-modal-input-price');
    const projectedBox = this.container.querySelector('#avg-modal-projected-box');
    const warningBanner = this.container.querySelector('#avg-modal-qty-warning');
    const submitBtn = this.container.querySelector('#avg-modal-submit-btn');
    if (!inputQty || !inputPrice || !projectedBox) return;

    const tradeQty = Math.max(0, parseFloat(inputQty.value) || 0);
    const tradePrice = Math.max(0, parseFloat(inputPrice.value) || 0);
    const currentQty = holding.quantity;
    const currentAvgPrice = holding.avgPrice;

    if (this.tradeMode === 'BUY') {
      if (warningBanner) warningBanner.style.display = 'none';
      if (submitBtn) submitBtn.disabled = false;

      const newTotalQty = currentQty + tradeQty;
      let newAvgPrice = currentAvgPrice;
      if (newTotalQty > 0) {
        const newTotalCost = (currentQty * currentAvgPrice) + (tradeQty * tradePrice);
        newAvgPrice = newTotalCost / newTotalQty;
      }
      const priceDiff = newAvgPrice - currentAvgPrice;
      const capitalReq = tradeQty * tradePrice;

      let impactText = 'Unchanged';
      let impactColor = 'var(--text-secondary)';
      if (tradeQty === 0) {
        impactText = 'No change';
      } else if (priceDiff < 0) {
        impactText = `▼ Decreases by ${portfolioStore.formatMoney(Math.abs(priceDiff))}`;
        impactColor = 'var(--bull-green)';
      } else if (priceDiff > 0) {
        impactText = `▲ Increases by ${portfolioStore.formatMoney(priceDiff)}`;
        impactColor = 'var(--bear-red)';
      }

      projectedBox.innerHTML = `
        <div class="projected-row">
          <span class="projected-label">Current Avg Price:</span>
          <span class="projected-val mono">${portfolioStore.formatMoney(currentAvgPrice)}</span>
        </div>
        <div class="projected-row highlight">
          <span class="projected-label">New Weighted Avg Price:</span>
          <span class="projected-val mono" style="color: var(--brand-indigo-light); font-weight: 700;">${portfolioStore.formatMoney(newAvgPrice)}</span>
        </div>
        <div class="projected-row">
          <span class="projected-label">Impact on Avg Cost:</span>
          <span class="projected-val mono" style="font-weight: 600; color: ${impactColor};">${impactText}</span>
        </div>
        <div class="projected-row">
          <span class="projected-label">New Total Shares:</span>
          <span class="projected-val mono">${newTotalQty.toLocaleString()} shares</span>
        </div>
        <div class="projected-row">
          <span class="projected-label">Capital Required:</span>
          <span class="projected-val mono">${portfolioStore.formatMoney(capitalReq)}</span>
        </div>
      `;
    } else {
      // SELL Mode Calculations
      const isExceeding = tradeQty > currentQty;
      const isFullExit = tradeQty === currentQty;

      if (isExceeding) {
        if (warningBanner) {
          warningBanner.style.display = 'flex';
          warningBanner.innerHTML = `⚠️ Cannot sell ${tradeQty} shares. You currently only hold ${currentQty} shares.`;
        }
        if (submitBtn) submitBtn.disabled = true;
      } else if (isFullExit && tradeQty > 0) {
        if (warningBanner) {
          warningBanner.style.display = 'flex';
          warningBanner.style.background = 'rgba(234, 179, 8, 0.12)';
          warningBanner.style.borderColor = 'rgba(234, 179, 8, 0.4)';
          warningBanner.style.color = '#eab308';
          warningBanner.innerHTML = `ℹ️ This will completely exit your position in ${holding.symbol}.`;
        }
        if (submitBtn) submitBtn.disabled = false;
      } else {
        if (warningBanner) warningBanner.style.display = 'none';
        if (submitBtn) submitBtn.disabled = false;
      }

      const costBasis = tradeQty * currentAvgPrice;
      const saleProceeds = tradeQty * tradePrice;
      const realizedPnL = saleProceeds - costBasis;
      const realizedPnLPercent = costBasis > 0 ? (realizedPnL / costBasis) * 100 : 0;
      const remainingQty = Math.max(0, currentQty - tradeQty);

      projectedBox.innerHTML = `
        <div class="projected-row">
          <span class="projected-label">Current Holdings:</span>
          <span class="projected-val mono">${currentQty.toLocaleString()} shares</span>
        </div>
        <div class="projected-row">
          <span class="projected-label">Shares After Sale:</span>
          <span class="projected-val mono" style="font-weight: 700;">${remainingQty.toLocaleString()} shares</span>
        </div>
        <div class="projected-row highlight">
          <span class="projected-label">Cash Inflow (Proceeds):</span>
          <span class="projected-val mono" style="color: var(--brand-indigo-light); font-weight: 700;">${portfolioStore.formatMoney(saleProceeds)}</span>
        </div>
        <div class="projected-row">
          <span class="projected-label">Booked Profit/Loss:</span>
          <span class="projected-val mono" style="font-weight: 700; color: ${realizedPnL >= 0 ? 'var(--bull-green)' : 'var(--bear-red)'};">
            ${realizedPnL >= 0 ? '+' : ''}${portfolioStore.formatMoney(realizedPnL)} (${realizedPnL >= 0 ? '+' : ''}${realizedPnLPercent.toFixed(2)}%)
          </span>
        </div>
      `;
    }
  }

  renderTransactionsHtml(transactions, currentCmp) {
    if (!transactions || transactions.length === 0) {
      return `
        <div class="empty-state" style="padding: 2.5rem 1rem; text-align: center; color: var(--text-muted);">
          <p>No transactions recorded yet for ${this.currentSymbol}.</p>
        </div>
      `;
    }

    return `
      <!-- Desktop Table View -->
      <div class="avg-modal-tx-table-wrap">
        <table class="avg-modal-tx-table">
          <thead>
            <tr>
              <th style="text-align: left;">Date</th>
              <th style="text-align: center;">Type</th>
              <th style="text-align: right;">Qty</th>
              <th style="text-align: right;">Price</th>
              <th style="text-align: right;">Amount</th>
              <th style="text-align: right;">P&L</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(tx => {
              const isBuy = (tx.type || 'BUY').toUpperCase() === 'BUY';
              const execPrice = Number(tx.price) || 0;
              const qty = Number(tx.quantity) || 0;
              const totalCost = Number(tx.totalAmount) || (qty * execPrice);
              const orderCurrentVal = qty * currentCmp;
              const orderPnl = currentCmp > 0 ? (orderCurrentVal - totalCost) : 0;
              const orderPnlPercent = (currentCmp > 0 && execPrice > 0) ? (((currentCmp - execPrice) / execPrice) * 100) : 0;
              const isOrderProfit = orderPnl >= 0;

              return `
                <tr>
                  <td>
                    <span class="mono" style="font-size: 0.78rem; color: var(--text-primary);">
                      ${tx.date || new Date(tx.timestamp || Date.now()).toISOString().split('T')[0]}
                    </span>
                  </td>
                  <td style="text-align: center;">
                    <span class="trade-type-pill ${isBuy ? 'buy' : 'sell'}" style="font-size: 0.68rem; padding: 0.1rem 0.35rem;">
                      ${tx.type || 'BUY'}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <span class="mono" style="font-weight: 600; color: ${isBuy ? 'var(--text-primary)' : 'var(--bear-red)'}; font-size: 0.8rem;">
                      ${isBuy ? '+' : '-'}${qty.toLocaleString()}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <span class="mono" style="font-size: 0.8rem;">${portfolioStore.formatMoney(execPrice)}</span>
                  </td>
                  <td style="text-align: right;">
                    <span class="mono" style="font-weight: 700; color: var(--text-primary); font-size: 0.8rem;">
                      ${portfolioStore.formatMoney(totalCost)}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    ${isBuy ? `
                      <span class="mono" style="font-weight: 700; color: ${isOrderProfit ? 'var(--bull-green)' : 'var(--bear-red)'}; font-size: 0.78rem;">
                        ${isOrderProfit ? '+' : ''}${portfolioStore.formatMoney(orderPnl)}
                      </span>
                    ` : (tx.realizedPnL !== undefined ? `
                      <span class="mono" style="font-weight: 700; color: ${tx.realizedPnL >= 0 ? 'var(--bull-green)' : 'var(--bear-red)'}; font-size: 0.78rem;">
                        ${tx.realizedPnL >= 0 ? '+' : ''}${portfolioStore.formatMoney(tx.realizedPnL)}
                      </span>
                    ` : `<span class="mono" style="color: var(--text-muted);">-</span>`)}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Mobile Cards View -->
      <div class="avg-modal-tx-cards">
        ${transactions.map(tx => {
          const isBuy = (tx.type || 'BUY').toUpperCase() === 'BUY';
          const execPrice = Number(tx.price) || 0;
          const qty = Number(tx.quantity) || 0;
          const totalCost = Number(tx.totalAmount) || (qty * execPrice);
          const orderCurrentVal = qty * currentCmp;
          const orderPnl = currentCmp > 0 ? (orderCurrentVal - totalCost) : 0;
          const orderPnlPercent = (currentCmp > 0 && execPrice > 0) ? (((currentCmp - execPrice) / execPrice) * 100) : 0;
          const isOrderProfit = orderPnl >= 0;

          return `
            <div class="avg-modal-tx-card">
              <div class="avg-modal-tx-card-head">
                <div style="display: flex; align-items: center; gap: 0.45rem;">
                  <span class="trade-type-pill ${isBuy ? 'buy' : 'sell'}" style="font-size: 0.68rem; padding: 0.1rem 0.35rem;">
                    ${tx.type || 'BUY'}
                  </span>
                  <span class="mono" style="font-size: 0.78rem; color: var(--text-muted);">
                    ${tx.date || new Date(tx.timestamp || Date.now()).toISOString().split('T')[0]}
                  </span>
                </div>
                <span class="mono" style="font-weight: 700; color: var(--text-primary); font-size: 0.88rem;">
                  ${portfolioStore.formatMoney(totalCost)}
                </span>
              </div>

              <div class="avg-modal-tx-card-body">
                <div>
                  <span class="mono" style="font-weight: 700; font-size: 0.92rem; color: ${isBuy ? 'var(--text-primary)' : 'var(--bear-red)'};">
                    ${isBuy ? '+' : '-'}${qty.toLocaleString()} shares
                  </span>
                  <span class="mono" style="font-size: 0.74rem; color: var(--text-muted); margin-left: 0.25rem;">
                    @ ${portfolioStore.formatMoney(execPrice)}
                  </span>
                </div>
                <div style="text-align: right;">
                  ${isBuy && currentCmp > 0 ? `
                    <div class="mono" style="font-weight: 700; font-size: 0.82rem; color: ${isOrderProfit ? 'var(--bull-green)' : 'var(--bear-red)'};">
                      P&L: ${isOrderProfit ? '+' : ''}${portfolioStore.formatMoney(orderPnl)}
                    </div>
                    <div class="mono" style="font-size: 0.72rem; color: ${isOrderProfit ? 'var(--bull-green)' : 'var(--bear-red)'};">
                      (${isOrderProfit ? '+' : ''}${orderPnlPercent.toFixed(2)}%)
                    </div>
                  ` : (tx.realizedPnL !== undefined ? `
                    <div class="mono" style="font-weight: 700; font-size: 0.82rem; color: ${tx.realizedPnL >= 0 ? 'var(--bull-green)' : 'var(--bear-red)'};">
                      Realized: ${tx.realizedPnL >= 0 ? '+' : ''}${portfolioStore.formatMoney(tx.realizedPnL)}
                    </div>
                  ` : '')}
                </div>
              </div>

              ${tx.notes ? `
                <div class="avg-modal-tx-card-meta">
                  <span>${tx.notes}</span>
                </div>
              ` : ''}
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
}
