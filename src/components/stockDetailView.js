// Stock Detail View - Dedicated transaction history, position metrics & averaging calculator
import { portfolioStore } from '../state/portfolioStore.js';

const icons = {
  arrowLeft: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>`,
  plus: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
  trash: `<svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>`,
  history: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 14 14"></polyline></svg>`,
  calculator: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="2" width="16" height="20" rx="2"></rect><line x1="8" y1="6" x2="16" y2="6"></line><line x1="16" y1="14" x2="16" y2="18"></line><path d="M16 10h.01"></path><path d="M12 10h.01"></path><path d="M8 10h.01"></path><path d="M12 14h.01"></path><path d="M8 14h.01"></path><path d="M12 18h.01"></path><path d="M8 18h.01"></path></svg>`,
  trendingUp: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>`,
  trendingDown: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>`,
  checkCircle: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`
};

export class StockDetailView {
  constructor(container, onNavigateBack, onNavigateToAddHolding) {
    this.container = container;
    this.onNavigateBack = onNavigateBack;
    this.onNavigateToAddHolding = onNavigateToAddHolding;
    this.currentSymbol = null;
    this.renderedSymbol = null;

    // Listen to store updates with surgical targeted DOM updates
    this.unsubscribe = portfolioStore.subscribe((event) => {
      if (!this.currentSymbol || !this.container.classList.contains('active')) return;

      if (event.type === 'PRICE_TICK') {
        this.handlePriceTick(event.tick);
      } else if (event.type === 'HOLDING_DELETED') {
        if (event.holding && event.holding.symbol === this.currentSymbol) {
          this.renderNotFound();
        }
      } else {
        // Holding updated, trade added, or cloud sync
        this.updateFinancialMetrics();
        this.updateTransactionTable();
        this.updateProjectedImpact();
      }
    });
  }

  setStock(symbol) {
    if (!symbol) return;
    const cleanSym = symbol.toUpperCase().trim();
    this.currentSymbol = cleanSym;

    const holding = portfolioStore.getHoldingBySymbol(this.currentSymbol);
    if (!holding) {
      this.renderNotFound();
      return;
    }

    // Render skeleton if navigating to a different stock
    if (this.renderedSymbol !== cleanSym) {
      this.renderFullSkeleton(holding);
      this.renderedSymbol = cleanSym;
    } else {
      this.updateFinancialMetrics();
      this.updateTransactionTable();
      this.updateProjectedImpact();
    }
  }

  renderFullSkeleton(holding) {
    const transactions = portfolioStore.getTransactionsForStock(this.currentSymbol);
    const metrics = portfolioStore.getPortfolioMetrics();
    const enrichedHolding = metrics.holdings.find(h => h.symbol === this.currentSymbol) || holding;

    const isProfit = (enrichedHolding.pnl || 0) >= 0;
    const isDayProfit = (enrichedHolding.dayPnL || 0) >= 0;

    this.container.innerHTML = `
      <div class="stock-detail-page">
        <!-- Top Navigation / Breadcrumb Bar -->
        <div class="detail-header-nav">
          <button type="button" class="btn btn-outline btn-sm" id="btn-back-to-dashboard">
            ${icons.arrowLeft} Back to Dashboard
          </button>
          
          <div class="detail-breadcrumbs">
            <span class="crumb-link" id="crumb-dashboard">Dashboard</span>
            <span class="crumb-sep">/</span>
            <span class="crumb-current">${enrichedHolding.name} (${enrichedHolding.symbol})</span>
          </div>

          <div class="detail-top-actions">
            <button type="button" class="btn btn-primary btn-sm" id="btn-quick-average">
              ${icons.plus} Buy / Average
            </button>
            <button type="button" class="btn btn-danger btn-sm" id="btn-exit-position" title="Exit / Delete this holding">
              ${icons.trash} Exit Position
            </button>
          </div>
        </div>

        <!-- Stock Hero Banner -->
        <div class="stock-hero-card">
          <div class="stock-hero-left">
            <div class="stock-hero-identity">
              <div class="stock-symbol-chip large">${enrichedHolding.symbol.substring(0, 3)}</div>
              <div>
                <div class="stock-hero-title">
                  <h2>${enrichedHolding.name}</h2>
                  <span class="stock-hero-badge">${enrichedHolding.symbol}</span>
                  <span class="exchange-tag">${enrichedHolding.exchange || 'NSE'}</span>
                </div>
                <div class="stock-hero-meta">
                  <span class="sector-tag">${enrichedHolding.sector || 'Equity'}</span>
                  <span class="meta-dot">•</span>
                  <span class="meta-date">Since: ${enrichedHolding.buyDate || 'Active'}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="stock-hero-right">
            <div class="hero-price-label">Current Market Price (CMP)</div>
            <div class="hero-cmp-row">
              <span id="hero-cmp-val" class="hero-cmp-val">${portfolioStore.formatMoney(enrichedHolding.cmp)}</span>
            </div>
            <div id="hero-day-change" class="hero-day-change ${isDayProfit ? 'bull' : 'bear'}">
              ${isDayProfit ? icons.trendingUp : icons.trendingDown}
              <span id="hero-day-change-text">
                ${isDayProfit ? '+' : ''}${portfolioStore.formatMoney(enrichedHolding.dayPnL || 0)}
                (${isDayProfit ? '+' : ''}${(enrichedHolding.dayChangePercent || 0).toFixed(2)}%) Today
              </span>
            </div>
          </div>
        </div>

        <!-- 4 Key Financial Metric Cards -->
        <div class="detail-kpi-grid">
          <div class="kpi-card accent-portfolio">
            <div class="kpi-header">
              <span class="kpi-title">Total Shares Held</span>
              <span class="kpi-icon-pill" id="kpi-weight-badge">${enrichedHolding.weight ? enrichedHolding.weight.toFixed(1) + '% Weight' : ''}</span>
            </div>
            <div class="kpi-value" id="kpi-shares-held">
              ${enrichedHolding.quantity.toLocaleString()} <span style="font-size: 0.9rem; color: var(--text-secondary); font-weight: 500;">shares</span>
            </div>
            <div class="kpi-footer">
              <span class="kpi-subtext">Portfolio allocation</span>
            </div>
          </div>

          <div class="kpi-card accent-invested">
            <div class="kpi-header">
              <span class="kpi-title">Average Buy Price</span>
            </div>
            <div class="kpi-value" id="kpi-avg-price">${portfolioStore.formatMoney(enrichedHolding.avgPrice)}</div>
            <div class="kpi-footer">
              <span class="kpi-subtext">Weighted cost per share</span>
            </div>
          </div>

          <div class="kpi-card">
            <div class="kpi-header">
              <span class="kpi-title">Current vs Invested Value</span>
            </div>
            <div class="kpi-value" id="kpi-current-val" style="font-size: 1.45rem;">
              ${portfolioStore.formatMoney(enrichedHolding.current || (enrichedHolding.quantity * enrichedHolding.cmp))}
            </div>
            <div class="kpi-footer">
              <span class="kpi-subtext" id="kpi-invested-sub">
                Invested: ${portfolioStore.formatMoney(enrichedHolding.invested || (enrichedHolding.quantity * enrichedHolding.avgPrice))}
              </span>
            </div>
          </div>

          <div class="kpi-card accent-pnl ${isProfit ? 'bull' : 'bear'}" id="kpi-pnl-card">
            <div class="kpi-header">
              <span class="kpi-title">Total Unrealized P&L</span>
              <div class="kpi-icon-pill" id="kpi-pnl-icon" style="color: ${isProfit ? 'var(--bull-green)' : 'var(--bear-red)'};">
                ${isProfit ? icons.trendingUp : icons.trendingDown}
              </div>
            </div>
            <div class="kpi-value" id="kpi-pnl-val" style="color: ${isProfit ? 'var(--bull-green)' : 'var(--bear-red)'};">
              ${isProfit ? '+' : ''}${portfolioStore.formatMoney(enrichedHolding.pnl || 0)}
            </div>
            <div class="kpi-footer">
              <span class="return-badge ${isProfit ? 'bull' : 'bear'}" id="kpi-pnl-badge">
                ${isProfit ? '+' : ''}${(enrichedHolding.pnlPercent || 0).toFixed(2)}%
              </span>
              <span class="kpi-subtext">overall position return</span>
            </div>
          </div>
        </div>

        <!-- Split Grid: Transactions History (Left/Main) & Quick Averaging Tool (Right) -->
        <div class="stock-detail-layout">
          <!-- Left: Transaction History -->
          <div class="detail-card transactions-card">
            <div class="detail-card-header">
              <div class="detail-card-title">
                ${icons.history}
                <h3>Transaction History & Orders</h3>
                <span class="badge-count" id="tx-badge-count">${transactions.length} ${transactions.length === 1 ? 'Trade' : 'Trades'}</span>
              </div>
            </div>

            <div id="tx-content-wrapper">
              <!-- Dynamically populated without touching right column -->
            </div>
          </div>

          <!-- Right: Instant Averaging Calculator for this stock -->
          <div class="detail-card averaging-tool-card">
            <div class="detail-card-header">
              <div class="detail-card-title">
                ${icons.calculator}
                <h3>Average Down Calculator</h3>
              </div>
            </div>
            <p class="averaging-tool-desc">
              Calculate how buying more shares of <strong>${enrichedHolding.symbol}</strong> adjusts your weighted average price:
            </p>

            <form id="form-quick-average" class="quick-avg-form">
              <div class="form-group">
                <label class="form-label" for="detail-add-qty">Additional Shares to Buy</label>
                <div class="quick-pills" id="detail-qty-pills" style="margin-bottom: 0.5rem;">
                  <button type="button" class="quick-pill" data-qty="5">+5</button>
                  <button type="button" class="quick-pill active" data-qty="10">+10</button>
                  <button type="button" class="quick-pill" data-qty="25">+25</button>
                  <button type="button" class="quick-pill" data-qty="50">+50</button>
                  <button type="button" class="quick-pill" data-qty="100">+100</button>
                </div>
                <input type="number" id="detail-add-qty" class="form-control mono" min="1" step="1" value="10" required />
              </div>

              <div class="form-group">
                <label class="form-label" for="detail-add-price">Expected Purchase Price (₹)</label>
                <input type="number" id="detail-add-price" class="form-control mono" min="0.05" step="0.05" value="${(enrichedHolding.cmp || enrichedHolding.avgPrice).toFixed(2)}" required />
              </div>

              <!-- Live Projected Result Box (Only these text nodes update on typing!) -->
              <div class="projected-impact-box">
                <div class="projected-row">
                  <span class="projected-label">Current Avg Price:</span>
                  <span class="projected-val mono" id="proj-current-avg">${portfolioStore.formatMoney(enrichedHolding.avgPrice)}</span>
                </div>
                <div class="projected-row highlight">
                  <span class="projected-label">New Weighted Avg Price:</span>
                  <span class="projected-val mono" id="proj-new-avg" style="color: var(--brand-indigo-light); font-weight: 700;">₹ 0.00</span>
                </div>
                <div class="projected-row">
                  <span class="projected-label">Impact on Avg Cost:</span>
                  <span class="projected-val mono" id="proj-impact-diff" style="font-weight: 600;">--</span>
                </div>
                <div class="projected-row">
                  <span class="projected-label">New Total Shares:</span>
                  <span class="projected-val mono" id="proj-total-shares">0 shares</span>
                </div>
                <div class="projected-row">
                  <span class="projected-label">Capital Required:</span>
                  <span class="projected-val mono" id="proj-capital-req">₹ 0.00</span>
                </div>
              </div>

              <button type="submit" class="btn btn-primary" id="btn-submit-quick-avg" style="width: 100%; justify-content: center; margin-top: 1rem;">
                ${icons.checkCircle} Execute Trade & Update Average
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    this.attachEvents(enrichedHolding);
    this.updateTransactionTable();
    this.updateProjectedImpact();
  }

  attachEvents(holding) {
    // Back to dashboard
    const btnBack = this.container.querySelector('#btn-back-to-dashboard');
    const crumbDashboard = this.container.querySelector('#crumb-dashboard');
    const handleBack = () => {
      if (this.onNavigateBack) this.onNavigateBack();
    };
    if (btnBack) btnBack.addEventListener('click', handleBack);
    if (crumbDashboard) crumbDashboard.addEventListener('click', handleBack);

    // Quick Average / Buy more navigation
    const btnQuickAvg = this.container.querySelector('#btn-quick-average');
    if (btnQuickAvg) {
      btnQuickAvg.addEventListener('click', () => {
        if (this.onNavigateToAddHolding) {
          this.onNavigateToAddHolding({ symbol: holding.symbol });
        }
      });
    }

    // Exit Position / Delete
    const btnExit = this.container.querySelector('#btn-exit-position');
    if (btnExit) {
      btnExit.addEventListener('click', () => {
        if (confirm(`Are you sure you want to completely exit your position in ${holding.symbol} (${holding.name})?`)) {
          portfolioStore.deleteHolding(holding.id);
          alert(`Successfully removed ${holding.symbol} from portfolio.`);
          if (this.onNavigateBack) this.onNavigateBack();
        }
      });
    }

    // Averaging Calculator inputs - fluid typing WITHOUT full re-renders
    const inputQty = this.container.querySelector('#detail-add-qty');
    const inputPrice = this.container.querySelector('#detail-add-price');
    const pills = this.container.querySelectorAll('#detail-qty-pills .quick-pill');
    const formAvg = this.container.querySelector('#form-quick-average');

    if (pills) {
      pills.forEach(pill => {
        pill.addEventListener('click', () => {
          pills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          const add = parseInt(pill.getAttribute('data-qty'), 10) || 10;
          if (inputQty) {
            inputQty.value = add;
            this.updateProjectedImpact();
          }
        });
      });
    }

    if (inputQty) {
      inputQty.addEventListener('input', () => {
        // Clear active pill if custom value typed
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

    // Form submit: Execute trade
    if (formAvg) {
      formAvg.addEventListener('submit', (e) => {
        e.preventDefault();
        const currentHolding = portfolioStore.getHoldingBySymbol(this.currentSymbol) || holding;
        const qty = parseFloat(inputQty.value);
        const price = parseFloat(inputPrice.value);

        if (!qty || qty <= 0 || !price || price <= 0) {
          alert('Please enter valid quantity and price');
          return;
        }

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

        alert(`🎉 Trade executed! Added ${qty} shares of ${currentHolding.symbol} @ ₹${price}. Your average price has been updated.`);
        this.updateFinancialMetrics();
        this.updateTransactionTable();
        this.updateProjectedImpact();
      });
    }
  }

  // Smoothly recalculates only the live preview numbers
  updateProjectedImpact() {
    const holding = portfolioStore.getHoldingBySymbol(this.currentSymbol);
    if (!holding) return;

    const inputQty = this.container.querySelector('#detail-add-qty');
    const inputPrice = this.container.querySelector('#detail-add-price');
    if (!inputQty || !inputPrice) return;

    const additionalQty = Math.max(0, parseFloat(inputQty.value) || 0);
    const addPrice = Math.max(0, parseFloat(inputPrice.value) || 0);

    const currentQty = holding.quantity;
    const currentAvgPrice = holding.avgPrice;
    const newTotalQty = currentQty + additionalQty;

    let newAvgPrice = currentAvgPrice;
    if (newTotalQty > 0) {
      const newTotalCost = (currentQty * currentAvgPrice) + (additionalQty * addPrice);
      newAvgPrice = newTotalCost / newTotalQty;
    }

    const priceDiff = newAvgPrice - currentAvgPrice;
    const capitalReq = additionalQty * addPrice;

    // Surgical DOM text updates
    const elCurrentAvg = this.container.querySelector('#proj-current-avg');
    const elNewAvg = this.container.querySelector('#proj-new-avg');
    const elImpactDiff = this.container.querySelector('#proj-impact-diff');
    const elTotalShares = this.container.querySelector('#proj-total-shares');
    const elCapitalReq = this.container.querySelector('#proj-capital-req');

    if (elCurrentAvg) elCurrentAvg.textContent = portfolioStore.formatMoney(currentAvgPrice);
    if (elNewAvg) elNewAvg.textContent = portfolioStore.formatMoney(newAvgPrice);
    if (elTotalShares) elTotalShares.textContent = `${newTotalQty.toLocaleString()} shares`;
    if (elCapitalReq) elCapitalReq.textContent = portfolioStore.formatMoney(capitalReq);

    if (elImpactDiff) {
      if (additionalQty === 0) {
        elImpactDiff.textContent = 'No change';
        elImpactDiff.style.color = 'var(--text-secondary)';
      } else if (priceDiff < 0) {
        elImpactDiff.textContent = `▼ Decreases by ${portfolioStore.formatMoney(Math.abs(priceDiff))}`;
        elImpactDiff.style.color = 'var(--bull-green)';
      } else if (priceDiff > 0) {
        elImpactDiff.textContent = `▲ Increases by ${portfolioStore.formatMoney(priceDiff)}`;
        elImpactDiff.style.color = 'var(--bear-red)';
      } else {
        elImpactDiff.textContent = 'Unchanged';
        elImpactDiff.style.color = 'var(--text-secondary)';
      }
    }
  }

  // Surgical update on price tick
  handlePriceTick(tick) {
    if (!tick || tick.symbol !== this.currentSymbol) return;

    const holding = portfolioStore.getHoldingBySymbol(this.currentSymbol);
    if (!holding) return;

    const elCmp = this.container.querySelector('#hero-cmp-val');
    const elDayChg = this.container.querySelector('#hero-day-change');
    const elDayChgText = this.container.querySelector('#hero-day-change-text');

    if (elCmp) {
      elCmp.textContent = portfolioStore.formatMoney(holding.cmp);
      elCmp.className = `hero-cmp-val ${tick.direction === 'up' ? 'tick-up' : 'tick-down'}`;
      setTimeout(() => {
        if (elCmp) elCmp.className = 'hero-cmp-val';
      }, 600);
    }

    const prevClose = holding.prevClose || holding.cmp;
    const dayChangePerShare = holding.cmp - prevClose;
    const dayPnL = dayChangePerShare * holding.quantity;
    const dayChangePercent = prevClose > 0 ? (dayChangePerShare / prevClose) * 100 : 0;
    const isDayProfit = dayPnL >= 0;

    if (elDayChg && elDayChgText) {
      elDayChg.className = `hero-day-change ${isDayProfit ? 'bull' : 'bear'}`;
      elDayChgText.textContent = `${isDayProfit ? '+' : ''}${portfolioStore.formatMoney(dayPnL)} (${isDayProfit ? '+' : ''}${dayChangePercent.toFixed(2)}%) Today`;
    }

    // Update current value & unrealized P&L
    this.updateFinancialMetrics();
  }

  // Updates KPI metric cards without touching form inputs
  updateFinancialMetrics() {
    const metrics = portfolioStore.getPortfolioMetrics();
    const holding = metrics.holdings.find(h => h.symbol === this.currentSymbol);
    if (!holding) return;

    const elShares = this.container.querySelector('#kpi-shares-held');
    const elWeight = this.container.querySelector('#kpi-weight-badge');
    const elAvg = this.container.querySelector('#kpi-avg-price');
    const elCur = this.container.querySelector('#kpi-current-val');
    const elInvSub = this.container.querySelector('#kpi-invested-sub');
    const elPnlCard = this.container.querySelector('#kpi-pnl-card');
    const elPnlIcon = this.container.querySelector('#kpi-pnl-icon');
    const elPnlVal = this.container.querySelector('#kpi-pnl-val');
    const elPnlBadge = this.container.querySelector('#kpi-pnl-badge');

    if (elShares) elShares.innerHTML = `${holding.quantity.toLocaleString()} <span style="font-size: 0.9rem; color: var(--text-secondary); font-weight: 500;">shares</span>`;
    if (elWeight) elWeight.textContent = `${(holding.weight || 0).toFixed(1)}% Weight`;
    if (elAvg) elAvg.textContent = portfolioStore.formatMoney(holding.avgPrice);
    if (elCur) elCur.textContent = portfolioStore.formatMoney(holding.current);
    if (elInvSub) elInvSub.textContent = `Invested: ${portfolioStore.formatMoney(holding.invested)}`;

    const isProfit = (holding.pnl || 0) >= 0;
    if (elPnlCard) elPnlCard.className = `kpi-card accent-pnl ${isProfit ? 'bull' : 'bear'}`;
    if (elPnlIcon) {
      elPnlIcon.innerHTML = isProfit ? icons.trendingUp : icons.trendingDown;
      elPnlIcon.style.color = isProfit ? 'var(--bull-green)' : 'var(--bear-red)';
    }
    if (elPnlVal) {
      elPnlVal.textContent = `${isProfit ? '+' : ''}${portfolioStore.formatMoney(holding.pnl || 0)}`;
      elPnlVal.style.color = isProfit ? 'var(--bull-green)' : 'var(--bear-red)';
    }
    if (elPnlBadge) {
      elPnlBadge.className = `return-badge ${isProfit ? 'bull' : 'bear'}`;
      elPnlBadge.textContent = `${isProfit ? '+' : ''}${(holding.pnlPercent || 0).toFixed(2)}%`;
    }
  }

  // Updates only the transaction list
  updateTransactionTable() {
    const wrapper = this.container.querySelector('#tx-content-wrapper');
    const badgeCount = this.container.querySelector('#tx-badge-count');
    if (!wrapper) return;

    const transactions = portfolioStore.getTransactionsForStock(this.currentSymbol);
    if (badgeCount) {
      badgeCount.textContent = `${transactions.length} ${transactions.length === 1 ? 'Trade' : 'Trades'}`;
    }

    if (transactions.length === 0) {
      wrapper.innerHTML = `
        <div class="empty-state" style="padding: 2.5rem 1rem;">
          <p>No transactions recorded yet for ${this.currentSymbol}.</p>
        </div>
      `;
      return;
    }

    wrapper.innerHTML = `
      <div class="table-responsive">
        <table class="holdings-table detail-tx-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Type</th>
              <th style="text-align: right;">Quantity</th>
              <th style="text-align: right;">Execution Price</th>
              <th style="text-align: right;">Total Amount</th>
              <th>Notes / Reason</th>
            </tr>
          </thead>
          <tbody>
            ${transactions.map(tx => {
              const isBuy = (tx.type || 'BUY').toUpperCase() === 'BUY';
              return `
                <tr>
                  <td>
                    <span class="mono" style="font-size: 0.82rem; color: var(--text-primary);">
                      ${tx.date || new Date(tx.timestamp || Date.now()).toISOString().split('T')[0]}
                    </span>
                  </td>
                  <td>
                    <span class="trade-type-pill ${isBuy ? 'buy' : 'sell'}">
                      ${tx.type || 'BUY'}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <span class="mono" style="font-weight: 600; color: var(--text-primary);">
                      +${Number(tx.quantity).toLocaleString()}
                    </span>
                  </td>
                  <td style="text-align: right;">
                    <span class="mono">${portfolioStore.formatMoney(tx.price)}</span>
                  </td>
                  <td style="text-align: right;">
                    <span class="mono" style="font-weight: 700; color: var(--text-primary);">
                      ${portfolioStore.formatMoney(tx.totalAmount || (tx.quantity * tx.price))}
                    </span>
                  </td>
                  <td>
                    <span style="font-size: 0.8rem; color: var(--text-secondary);">
                      ${tx.notes || 'Portfolio trade'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>

      <!-- Mobile Transaction Cards -->
      <div class="mobile-tx-list">
        ${transactions.map(tx => `
          <div class="mobile-tx-card">
            <div class="mobile-tx-header">
              <span class="trade-type-pill buy">${tx.type || 'BUY'}</span>
              <span class="mono" style="font-size: 0.8rem; color: var(--text-muted);">${tx.date || 'Today'}</span>
            </div>
            <div class="mobile-tx-body">
              <div>
                <div class="num-cell" style="font-size: 1rem; font-weight: 700;">+${Number(tx.quantity).toLocaleString()} shares</div>
                <div class="num-cell sub">@ ${portfolioStore.formatMoney(tx.price)}</div>
              </div>
              <div style="text-align: right;">
                <div class="num-cell" style="font-size: 1rem; font-weight: 700; color: var(--text-primary);">
                  ${portfolioStore.formatMoney(tx.totalAmount || (tx.quantity * tx.price))}
                </div>
                <div class="num-cell sub">Total Amount</div>
              </div>
            </div>
            ${tx.notes ? `<div class="mobile-tx-notes">${tx.notes}</div>` : ''}
          </div>
        `).join('')}
      </div>
    `;
  }

  renderNotFound() {
    this.renderedSymbol = null;
    this.container.innerHTML = `
      <div class="empty-state" style="padding: 4rem 1.5rem; text-align: center;">
        <h2>Stock Not Found in Portfolio</h2>
        <p style="margin: 0.75rem 0 1.5rem 0; color: var(--text-secondary);">
          The stock "${this.currentSymbol}" does not exist in your holdings or may have been deleted.
        </p>
        <button type="button" class="btn btn-primary" id="btn-nf-back">
          ${icons.arrowLeft} Return to Dashboard
        </button>
      </div>
    `;

    const btnBack = this.container.querySelector('#btn-nf-back');
    if (btnBack && this.onNavigateBack) {
      btnBack.addEventListener('click', () => this.onNavigateBack());
    }
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
