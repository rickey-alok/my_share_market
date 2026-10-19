// Dashboard View Component (Page 1)
import { portfolioStore } from '../state/portfolioStore.js';
import { icons } from '../utils/icons.js';
import { SECTORS } from '../data/stocksDatabase.js';
import Chart from 'chart.js/auto';

export class DashboardView {
  constructor(containerElement, onNavigateToAddHolding, onNavigateToStockDetail) {
    this.container = containerElement;
    this.onNavigateToAddHolding = onNavigateToAddHolding;
    this.onNavigateToStockDetail = onNavigateToStockDetail;
    this.chartInstance = null;
    this.searchTerm = '';
    this.selectedSector = 'ALL';
    this.sortBy = 'value-desc';

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
          <h1 class="page-title">Portfolio Dashboard</h1>
          <p class="page-subtitle">Real-time wealth tracking, asset allocation, and market performance</p>
        </div>
        <div class="page-header-actions">
          <button id="btn-refresh-quotes" class="btn btn-outline btn-sm" title="Refresh Live Quotes">
            ${icons.refreshCw}
            <span>Sync Market</span>
          </button>
          <button id="btn-quick-add" class="btn btn-primary btn-sm">
            ${icons.plus}
            <span>Add Holdings</span>
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

      <!-- Holdings Section -->
      <div class="holdings-container">
        <div class="holdings-toolbar">
          <div class="toolbar-left">
            <div class="search-input-box">
              ${icons.search}
              <input type="text" id="holdings-search" class="search-input" placeholder="Search by symbol or company...">
            </div>
            <select id="sector-filter" class="filter-select">
              <option value="ALL">All Sectors</option>
              ${SECTORS.map(s => `<option value="${s}">${s}</option>`).join('')}
            </select>
          </div>
          <div class="toolbar-right">
            <select id="sort-filter" class="filter-select">
              <option value="value-desc">Sort by: Highest Value</option>
              <option value="value-asc">Sort by: Lowest Value</option>
              <option value="pnl-desc">Sort by: Highest Profit %</option>
              <option value="pnl-asc">Sort by: Lowest Profit %</option>
              <option value="day-desc">Sort by: Top Day Gainers</option>
              <option value="symbol-asc">Sort by: Symbol A-Z</option>
            </select>
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
                <th style="text-align: right;">CMP (Live)</th>
                <th style="text-align: right;">Total Invested</th>
                <th style="text-align: right;">Current Value</th>
                <th style="text-align: right;">Day's Change</th>
                <th style="text-align: right;">Total P&L</th>
                <th>Weight</th>
                <th style="text-align: center;">Actions</th>
              </tr>
            </thead>
            <tbody id="holdings-tbody">
              <!-- Dynamically injected -->
            </tbody>
          </table>
        </div>

        <!-- Mobile Card View -->
        <div class="mobile-holdings-list" id="mobile-holdings-list">
          <!-- Dynamically injected -->
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Quick Add Button
    const btnQuickAdd = this.container.querySelector('#btn-quick-add');
    if (btnQuickAdd) {
      btnQuickAdd.addEventListener('click', () => {
        if (this.onNavigateToAddHolding) this.onNavigateToAddHolding();
      });
    }

    // Refresh Quotes Button
    const btnRefresh = this.container.querySelector('#btn-refresh-quotes');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        btnRefresh.classList.add('rotating');
        portfolioStore.refreshMarketQuotes();
        setTimeout(() => btnRefresh.classList.remove('rotating'), 600);
      });
    }

    // Search Input
    const searchInput = this.container.querySelector('#holdings-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchTerm = e.target.value.toLowerCase().trim();
        this.renderHoldingsTableAndCards();
      });
    }

    // Sector Filter
    const sectorFilter = this.container.querySelector('#sector-filter');
    if (sectorFilter) {
      sectorFilter.addEventListener('change', (e) => {
        this.selectedSector = e.target.value;
        this.renderHoldingsTableAndCards();
      });
    }

    // Sort Filter
    const sortFilter = this.container.querySelector('#sort-filter');
    if (sortFilter) {
      sortFilter.addEventListener('change', (e) => {
        this.sortBy = e.target.value;
        this.renderHoldingsTableAndCards();
      });
    }

    // Delegate Table & Card Action Clicks
    this.container.addEventListener('click', (e) => {
      // Delete holding
      const deleteBtn = e.target.closest('[data-action="delete-holding"]');
      if (deleteBtn) {
        const id = deleteBtn.getAttribute('data-id');
        const symbol = deleteBtn.getAttribute('data-symbol');
        if (confirm(`Are you sure you want to remove ${symbol} from your portfolio?`)) {
          portfolioStore.deleteHolding(id);
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

    // Responsive window resize listener for chart reflow
    this.handleResize = () => {
      if (this.chartInstance) {
        const isMobileNow = window.innerWidth < 768;
        const targetPos = isMobileNow ? 'bottom' : 'right';
        let needsUpdate = false;
        if (this.chartInstance.options.plugins.legend.position !== targetPos) {
          this.chartInstance.options.plugins.legend.position = targetPos;
          this.chartInstance.options.plugins.legend.labels.boxWidth = isMobileNow ? 10 : 12;
          this.chartInstance.options.plugins.legend.labels.padding = isMobileNow ? 10 : 14;
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
    const metrics = portfolioStore.getPortfolioMetrics();
    this.renderKPIs(metrics);
    this.renderChart(metrics);
    this.renderSectorList(metrics);
    this.renderHoldingsTableAndCards(metrics, event);
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
            ${metrics.totalHoldingsCount} stocks • ${metrics.totalSharesCount.toLocaleString()} shares
          </span>
        </div>
      </div>

      <!-- Total Overall P&L -->
      <div class="kpi-card accent-pnl ${isTotalProfit ? 'bull' : 'bear'}">
        <div class="kpi-header">
          <span class="kpi-title">Total Unrealized P&L</span>
          <div class="kpi-icon-pill" style="color: ${isTotalProfit ? 'var(--bull-green)' : 'var(--bear-red)'};">
            ${isTotalProfit ? icons.trendingUp : icons.trendingDown}
          </div>
        </div>
        <div class="kpi-value" style="color: ${isTotalProfit ? 'var(--bull-green)' : 'var(--bear-red)'};">
          ${isTotalProfit ? '+' : ''}${portfolioStore.formatMoney(metrics.totalPnL)}
        </div>
        <div class="kpi-footer">
          <span class="return-badge ${isTotalProfit ? 'bull' : 'bear'}">
            ${isTotalProfit ? '+' : ''}${metrics.totalPnLPercent.toFixed(2)}%
          </span>
          <span class="kpi-subtext">net gain/loss</span>
        </div>
      </div>

      <!-- Today's P&L -->
      <div class="kpi-card accent-day ${isDayProfit ? 'bull' : 'bear'}">
        <div class="kpi-header">
          <span class="kpi-title">Today's P&L</span>
          <div class="kpi-icon-pill" style="color: ${isDayProfit ? 'var(--bull-green)' : 'var(--bear-red)'};">
            ${icons.activity}
          </div>
        </div>
        <div class="kpi-value" style="color: ${isDayProfit ? 'var(--bull-green)' : 'var(--bear-red)'};">
          ${isDayProfit ? '+' : ''}${portfolioStore.formatMoney(metrics.totalDayPnL)}
        </div>
        <div class="kpi-footer">
          <span class="return-badge ${isDayProfit ? 'bull' : 'bear'}">
            ${isDayProfit ? '+' : ''}${metrics.totalDayPnLPercent.toFixed(2)}%
          </span>
          <span class="kpi-subtext">day's fluctuation</span>
        </div>
      </div>
    `;
  }

  renderChart(metrics) {
    const canvas = this.container.querySelector('#allocation-chart');
    const badge = this.container.querySelector('#analytics-holdings-count');
    if (!canvas) return;

    if (badge) {
      badge.textContent = `${metrics.totalHoldingsCount} Assets`;
    }

    const labels = metrics.sectorBreakdown.map(s => s.sector);
    const data = metrics.sectorBreakdown.map(s => s.value);

    const palette = [
      '#6366f1', '#06b6d4', '#10b981', '#f59e0b', '#ec4899', 
      '#8b5cf6', '#3b82f6', '#14b8a6', '#f43f5e', '#a855f7'
    ];

    const isMobile = window.innerWidth < 768;
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const borderColor = isLight ? '#ffffff' : '#151c2e';
    const legendColor = isLight ? '#475569' : '#94a3b8';
    const tooltipBg = isLight ? '#ffffff' : '#1c253d';
    const tooltipTitle = isLight ? '#0f172a' : '#ffffff';
    const tooltipBody = isLight ? '#334155' : '#cbd5e1';
    const tooltipBorder = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';

    if (this.chartInstance) {
      const targetPos = isMobile ? 'bottom' : 'right';
      if (this.chartInstance.options.plugins.legend.position !== targetPos) {
        this.chartInstance.options.plugins.legend.position = targetPos;
        this.chartInstance.options.plugins.legend.labels.boxWidth = isMobile ? 10 : 12;
        this.chartInstance.options.plugins.legend.labels.padding = isMobile ? 10 : 14;
      }
      this.chartInstance.data.labels = labels;
      this.chartInstance.data.datasets[0].data = data;
      this.chartInstance.data.datasets[0].backgroundColor = palette.slice(0, labels.length);
      this.chartInstance.data.datasets[0].borderColor = borderColor;
      this.chartInstance.options.plugins.legend.labels.color = legendColor;
      this.chartInstance.resize();
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

  updateTheme() {
    if (this.chartInstance) {
      const isLight = document.documentElement.getAttribute('data-theme') === 'light';
      this.chartInstance.data.datasets[0].borderColor = isLight ? '#ffffff' : '#151c2e';
      this.chartInstance.options.plugins.legend.labels.color = isLight ? '#475569' : '#94a3b8';
      this.chartInstance.options.plugins.tooltip.backgroundColor = isLight ? '#ffffff' : '#1c253d';
      this.chartInstance.options.plugins.tooltip.titleColor = isLight ? '#0f172a' : '#ffffff';
      this.chartInstance.options.plugins.tooltip.bodyColor = isLight ? '#334155' : '#cbd5e1';
      this.chartInstance.options.plugins.tooltip.borderColor = isLight ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)';
      this.chartInstance.update();
    }
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

  renderHoldingsTableAndCards(metrics = portfolioStore.getPortfolioMetrics(), event = {}) {
    const tbody = this.container.querySelector('#holdings-tbody');
    const mobileList = this.container.querySelector('#mobile-holdings-list');
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
      tbody.innerHTML = `<tr><td colspan="11">${emptyHtml}</td></tr>`;
      mobileList.innerHTML = emptyHtml;
      return;
    }

    // Check if event was a tick to trigger pulse animation on CMP
    const tickSymbol = event.type === 'PRICE_TICK' && event.tick ? event.tick.symbol : null;
    const tickDirection = event.type === 'PRICE_TICK' && event.tick ? event.tick.direction : null;

    // Render Desktop Rows
    tbody.innerHTML = filtered.map(h => {
      const isProfit = h.pnl >= 0;
      const isDayProfit = h.dayPnL >= 0;
      const isTicking = tickSymbol === h.symbol;
      const tickClass = isTicking ? (tickDirection === 'up' ? 'tick-up' : 'tick-down') : '';

      return `
        <tr data-symbol="${h.symbol}">
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
          <td style="text-align: right;">
            <div class="num-cell cmp-cell ${tickClass}">${portfolioStore.formatMoney(h.cmp)}</div>
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
              <span style="font-family: var(--font-mono); font-size: 0.75rem; color: var(--text-secondary);">
                ${h.weight.toFixed(1)}%
              </span>
              <div class="weight-track">
                <div class="weight-fill" style="width: ${Math.min(100, Math.max(4, h.weight))}%;"></div>
              </div>
            </div>
          </td>
          <td style="text-align: center;">
            <div class="table-actions" style="justify-content: center;">
              <button class="icon-action-btn" data-action="buy-more" data-symbol="${h.symbol}" title="Open Average Price Calculator (${h.symbol})">
                ${icons.plus}
              </button>
              <button class="icon-action-btn delete-btn" data-action="delete-holding" data-id="${h.id}" data-symbol="${h.symbol}" title="Remove Holding">
                ${icons.trash2}
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');

    // Render Mobile Cards
    mobileList.innerHTML = filtered.map(h => {
      const isProfit = h.pnl >= 0;
      const isDayProfit = h.dayPnL >= 0;
      const isTicking = tickSymbol === h.symbol;
      const tickClass = isTicking ? (tickDirection === 'up' ? 'tick-up' : 'tick-down') : '';

      return `
        <div class="holding-mobile-card" data-symbol="${h.symbol}" title="Click to view ${h.symbol} transactions & details">
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
