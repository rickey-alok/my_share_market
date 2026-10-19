// Market & Portfolio Analysis View Component (Page 4)
import { portfolioStore } from '../state/portfolioStore.js';
import { icons } from '../utils/icons.js';
import { getFiiDiiMetrics, INDICES_DATA, getStockAnalysisData } from '../data/marketAnalysisData.js';
import Chart from 'chart.js/auto';

export class AnalysisView {
  constructor(containerElement, onNavigateToStockDetail) {
    this.container = containerElement;
    this.onNavigateToStockDetail = onNavigateToStockDetail;

    // View State
    this.fiiDiiTimeframe = 'week';
    this.indexTimeframe = 'week';
    this.selectedIndex = 'nifty';
    this.stockTimeframe = 'month';
    this.selectedSymbol = null;

    // Technical Indicator / Overlay States (all 4 requested features)
    this.showVolume = true;
    this.showRsi = true;
    this.showBenchmark = true;
    this.showIndustry = true;

    // Chart instances
    this.fiiDiiChart = null;
    this.indexChart = null;
    this.stockChart = null;
    this.volumeChart = null;
    this.rsiChart = null;

    this.init();
  }

  init() {
    this.renderSkeleton();
    this.attachEventListeners();
    this.updateAll();

    // Subscribe to store updates (e.g. price ticks, added/sold holdings)
    this.unsubscribe = portfolioStore.subscribe((event) => {
      if (!this.container.classList.contains('active')) return;
      if (event.type === 'HOLDING_ADDED' || event.type === 'HOLDING_SOLD' || event.type === 'HOLDING_DELETED') {
        this.updateStockSelector();
        this.renderStockAnalysis();
      } else if (event.type === 'PRICE_TICK') {
        this.updateOnPriceTick(event.tick);
      }
    });
  }

  renderSkeleton() {
    this.container.innerHTML = `
      <!-- Page Title -->
      <div class="page-title-row">
        <div>
          <h1 class="page-title">Market & Holdings Analysis</h1>
          <p class="page-subtitle">FII / DII institutional flow sentiment, benchmark indices, and portfolio range positions</p>
        </div>
        <div class="page-header-actions">
          <button id="btn-analysis-sync" class="btn btn-outline btn-sm" title="Refresh Live Market Data">
            ${icons.refreshCw}
            <span>Refresh Analysis</span>
          </button>
        </div>
      </div>

      <!-- Section 1: FII & DII Institutional Inflow / Outflow -->
      <div class="analysis-card mb-6">
        <div class="card-header-with-actions">
          <div class="card-title-row" style="margin-bottom: 0;">
            <h2 class="card-title">${icons.barChart2} Institutional Flow (FII vs DII)</h2>
            <span class="badge-sentiment" id="fii-dii-sentiment-badge">Bullish Accumulation</span>
          </div>
          <!-- Timeframe Filter for FII/DII -->
          <div class="filter-pills-group" id="fii-dii-timeframe-pills">
            <button type="button" class="filter-pill active" data-timeframe="week">1W</button>
            <button type="button" class="filter-pill" data-timeframe="month">1M</button>
            <button type="button" class="filter-pill" data-timeframe="year">1Y</button>
            <button type="button" class="filter-pill" data-timeframe="3year">3Y</button>
            <button type="button" class="filter-pill" data-timeframe="5year">5Y</button>
          </div>
        </div>

        <!-- 3 KPI Cards for FII / DII -->
        <div class="fii-dii-kpi-grid" id="fii-dii-kpis-container">
          <!-- Dynamically populated -->
        </div>

        <!-- FII / DII Net Bar Chart -->
        <div class="chart-wrapper-analysis">
          <canvas id="fii-dii-chart"></canvas>
        </div>
      </div>

      <!-- Section 2: Major Benchmark Indices (NIFTY 50 & SENSEX) with High/Low Pointer -->
      <div class="analysis-card mb-6">
        <div class="card-header-with-actions">
          <div class="card-title-row" style="margin-bottom: 0;">
            <h2 class="card-title">${icons.lineChart} Benchmark Indices Trajectory</h2>
          </div>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
            <!-- Index Switcher (NIFTY 50 vs SENSEX) -->
            <div class="trade-mode-toggle" style="margin-bottom: 0; padding: 0.2rem;" id="index-switch-toggle">
              <button type="button" class="trade-mode-btn buy active" data-index="nifty">NIFTY 50</button>
              <button type="button" class="trade-mode-btn buy" data-index="sensex">SENSEX</button>
            </div>
            <!-- Timeframe Filter -->
            <div class="filter-pills-group" id="index-timeframe-pills">
              <button type="button" class="filter-pill active" data-timeframe="week">1W</button>
              <button type="button" class="filter-pill" data-timeframe="month">1M</button>
              <button type="button" class="filter-pill" data-timeframe="year">1Y</button>
              <button type="button" class="filter-pill" data-timeframe="3year">3Y</button>
              <button type="button" class="filter-pill" data-timeframe="5year">5Y</button>
            </div>
          </div>
        </div>

        <!-- Index Level Summary & High-Low Range Bar -->
        <div class="index-summary-box" id="index-summary-container">
          <!-- Dynamically populated -->
        </div>

        <!-- Index Chart -->
        <div class="chart-wrapper-analysis">
          <canvas id="index-chart"></canvas>
        </div>
      </div>

      <!-- Section 3: User Held Stock Auto-Analysis & 52-Week High/Low Pointer Bar -->
      <div class="analysis-card">
        <div class="card-header-with-actions">
          <div class="card-title-row" style="margin-bottom: 0;">
            <h2 class="card-title">${icons.layers} Your Holdings Range & Price Position</h2>
          </div>
          <div style="display: flex; gap: 0.75rem; flex-wrap: wrap; align-items: center;">
            <!-- Timeframe Filter for Stock -->
            <div class="filter-pills-group" id="stock-timeframe-pills">
              <button type="button" class="filter-pill" data-timeframe="week">1W</button>
              <button type="button" class="filter-pill active" data-timeframe="month">1M</button>
              <button type="button" class="filter-pill" data-timeframe="year">1Y</button>
              <button type="button" class="filter-pill" data-timeframe="3year">3Y</button>
              <button type="button" class="filter-pill" data-timeframe="5year">5Y</button>
            </div>
          </div>
        </div>

        <!-- Stock Selector Pills (Auto-populated from User's Holdings) -->
        <div class="holdings-stock-selector" id="holdings-stock-selector">
          <!-- Dynamically populated from portfolioStore.holdings -->
        </div>

        <!-- Stock Detail & High-Low Pointer Gauge -->
        <div id="stock-analysis-content">
          <!-- Dynamically populated -->
        </div>
      </div>
    `;
  }

  attachEventListeners() {
    // Refresh button
    const btnRefresh = this.container.querySelector('#btn-analysis-sync');
    if (btnRefresh) {
      btnRefresh.addEventListener('click', () => {
        btnRefresh.classList.add('rotating');
        portfolioStore.refreshMarketQuotes();
        setTimeout(() => {
          btnRefresh.classList.remove('rotating');
          this.updateAll();
        }, 500);
      });
    }

    // FII/DII Timeframe Pills
    const fiiPills = this.container.querySelectorAll('#fii-dii-timeframe-pills .filter-pill');
    fiiPills.forEach(pill => {
      pill.addEventListener('click', () => {
        fiiPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.fiiDiiTimeframe = pill.getAttribute('data-timeframe');
        this.renderFiiDiiSection();
      });
    });

    // Index Switcher (NIFTY vs SENSEX)
    const indexBtns = this.container.querySelectorAll('#index-switch-toggle .trade-mode-btn');
    indexBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        indexBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.selectedIndex = btn.getAttribute('data-index');
        this.renderIndexSection();
      });
    });

    // Index Timeframe Pills
    const indexPills = this.container.querySelectorAll('#index-timeframe-pills .filter-pill');
    indexPills.forEach(pill => {
      pill.addEventListener('click', () => {
        indexPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.indexTimeframe = pill.getAttribute('data-timeframe');
        this.renderIndexSection();
      });
    });

    // Stock Timeframe Pills
    const stockPills = this.container.querySelectorAll('#stock-timeframe-pills .filter-pill');
    stockPills.forEach(pill => {
      pill.addEventListener('click', () => {
        stockPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        this.stockTimeframe = pill.getAttribute('data-timeframe');
        this.renderStockAnalysis();
      });
    });

    // Delegate Stock Selector Pills
    const selectorContainer = this.container.querySelector('#holdings-stock-selector');
    if (selectorContainer) {
      selectorContainer.addEventListener('click', (e) => {
        const pill = e.target.closest('.stock-select-pill');
        if (pill) {
          const symbol = pill.getAttribute('data-symbol');
          this.selectedSymbol = symbol;
          selectorContainer.querySelectorAll('.stock-select-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          this.renderStockAnalysis();
        }
      });
    }

    // Delegate Technical Indicator & Overlay Toggles (Volume, RSI, Benchmark, Industry)
    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-indicator]');
      if (btn) {
        const indicator = btn.getAttribute('data-indicator');
        if (indicator === 'volume') this.showVolume = !this.showVolume;
        else if (indicator === 'rsi') this.showRsi = !this.showRsi;
        else if (indicator === 'benchmark') this.showBenchmark = !this.showBenchmark;
        else if (indicator === 'industry') this.showIndustry = !this.showIndustry;
        this.renderStockAnalysis();
      }
    });
  }

  updateTheme() {
    if (this.fiiDiiChart) {
      this.fiiDiiChart.destroy();
      this.fiiDiiChart = null;
    }
    if (this.indexChart) {
      this.indexChart.destroy();
      this.indexChart = null;
    }
    if (this.stockChart) {
      this.stockChart.destroy();
      this.stockChart = null;
    }
    if (this.volumeChart) {
      this.volumeChart.destroy();
      this.volumeChart = null;
    }
    if (this.rsiChart) {
      this.rsiChart.destroy();
      this.rsiChart = null;
    }
    this.updateAll();
  }

  updateAll() {
    this.renderFiiDiiSection();
    this.renderIndexSection();
    this.updateStockSelector();
    this.renderStockAnalysis();
  }

  // 1. Render FII / DII Institutional Flow Section
  renderFiiDiiSection() {
    const metrics = getFiiDiiMetrics(this.fiiDiiTimeframe);
    const kpiContainer = this.container.querySelector('#fii-dii-kpis-container');
    const sentimentBadge = this.container.querySelector('#fii-dii-sentiment-badge');

    if (sentimentBadge) {
      const isBull = metrics.combinedNet >= 0;
      sentimentBadge.textContent = metrics.sentiment;
      sentimentBadge.className = `badge-sentiment ${isBull ? 'bull' : 'bear'}`;
    }

    if (kpiContainer) {
      const isFiiNetPositive = metrics.totalFiiNet >= 0;
      const isDiiNetPositive = metrics.totalDiiNet >= 0;
      const isCombinedNetPositive = metrics.combinedNet >= 0;

      kpiContainer.innerHTML = `
        <!-- FII Net KPI -->
        <div class="analysis-kpi-card ${isFiiNetPositive ? 'bull' : 'bear'}">
          <div class="kpi-header">
            <span class="kpi-title">FII / FPI Net Investment</span>
            <span class="fii-tag">Foreign</span>
          </div>
          <div class="kpi-value" style="color: ${isFiiNetPositive ? 'var(--bull-green)' : 'var(--bear-red)'}; font-size: 1.55rem;">
            ${isFiiNetPositive ? '+' : ''}₹ ${metrics.totalFiiNet.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr
          </div>
          <div class="kpi-breakdown-row">
            <span>Buy: ₹ ${(metrics.totalFiiBuy).toLocaleString('en-IN')} Cr</span>
            <span>Sell: ₹ ${(metrics.totalFiiSell).toLocaleString('en-IN')} Cr</span>
          </div>
        </div>

        <!-- DII Net KPI -->
        <div class="analysis-kpi-card ${isDiiNetPositive ? 'bull' : 'bear'}">
          <div class="kpi-header">
            <span class="kpi-title">DII Net Investment</span>
            <span class="dii-tag">Domestic</span>
          </div>
          <div class="kpi-value" style="color: ${isDiiNetPositive ? 'var(--bull-green)' : 'var(--bear-red)'}; font-size: 1.55rem;">
            ${isDiiNetPositive ? '+' : ''}₹ ${metrics.totalDiiNet.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr
          </div>
          <div class="kpi-breakdown-row">
            <span>Buy: ₹ ${(metrics.totalDiiBuy).toLocaleString('en-IN')} Cr</span>
            <span>Sell: ₹ ${(metrics.totalDiiSell).toLocaleString('en-IN')} Cr</span>
          </div>
        </div>

        <!-- Combined Institutional Flow -->
        <div class="analysis-kpi-card ${isCombinedNetPositive ? 'bull' : 'bear'}">
          <div class="kpi-header">
            <span class="kpi-title">Combined Net Flow</span>
            <span class="kpi-title-sub">${metrics.periodName}</span>
          </div>
          <div class="kpi-value" style="color: ${isCombinedNetPositive ? 'var(--bull-green)' : 'var(--bear-red)'}; font-size: 1.55rem;">
            ${isCombinedNetPositive ? '+' : ''}₹ ${metrics.combinedNet.toLocaleString('en-IN', { maximumFractionDigits: 1 })} Cr
          </div>
          <div class="kpi-footer">
            <span class="kpi-subtext" style="color: var(--text-primary); font-weight: 600;">
              ${isCombinedNetPositive ? 'Strong buying support across domestic & foreign institutions' : 'Net institutional distribution during this period'}
            </span>
          </div>
        </div>
      `;
    }

    // Chart.js Bar Chart for FII vs DII
    const canvas = this.container.querySelector('#fii-dii-chart');
    if (!canvas) return;

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
    const textColor = isLight ? '#64748b' : '#94a3b8';

    if (this.fiiDiiChart) {
      this.fiiDiiChart.data.labels = metrics.labels;
      this.fiiDiiChart.data.datasets[0].data = metrics.fiiNet;
      this.fiiDiiChart.data.datasets[1].data = metrics.diiNet;
      this.fiiDiiChart.update();
      return;
    }

    const ctx = canvas.getContext('2d');
    this.fiiDiiChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: metrics.labels,
        datasets: [
          {
            label: 'FII Net (₹ Cr)',
            data: metrics.fiiNet,
            backgroundColor: '#06b6d4',
            borderRadius: 4,
            borderSkipped: false
          },
          {
            label: 'DII Net (₹ Cr)',
            data: metrics.diiNet,
            backgroundColor: '#6366f1',
            borderRadius: 4,
            borderSkipped: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              color: textColor,
              font: { family: "'Inter', sans-serif", size: 12, weight: '600' },
              boxWidth: 12,
              padding: 14
            }
          },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.dataset.label}: ₹ ${item.raw.toLocaleString('en-IN')} Cr`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { family: "'Inter', sans-serif", size: 11 } }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: "'JetBrains Mono', monospace", size: 11 },
              callback: (val) => `₹${val} Cr`
            }
          }
        }
      }
    });
  }

  // 2. Render Benchmark Index Section (NIFTY 50 / SENSEX) with High/Low Gauge Bar
  renderIndexSection() {
    const timeframeData = INDICES_DATA[this.indexTimeframe] || INDICES_DATA.week;
    const indexInfo = timeframeData[this.selectedIndex] || timeframeData.nifty;

    const summaryContainer = this.container.querySelector('#index-summary-container');
    if (summaryContainer) {
      const isPositive = indexInfo.changePct >= 0;
      const low = indexInfo.low;
      const high = indexInfo.high;
      const current = indexInfo.current;
      const rangeSpan = high - low || 1;
      const pointerPositionPct = Math.min(96, Math.max(4, ((current - low) / rangeSpan) * 100));

      const tfLabel = {
        week: '1W',
        month: '1M',
        year: '1Y',
        '3year': '3Y',
        '5year': '5Y'
      }[this.indexTimeframe] || this.indexTimeframe.toUpperCase();

      let indexLowTitle = 'Period Low';
      let indexHighTitle = 'Period High';
      if (this.indexTimeframe === 'year') {
        indexLowTitle = '52-Week Low';
        indexHighTitle = '52-Week High';
      } else if (this.indexTimeframe === '3year') {
        indexLowTitle = '3-Year Low';
        indexHighTitle = '3-Year High';
      } else if (this.indexTimeframe === '5year') {
        indexLowTitle = '5-Year Low';
        indexHighTitle = '5-Year High';
      }

      summaryContainer.innerHTML = `
        <div class="index-meta-row">
          <div>
            <div class="index-current-name">${indexInfo.name}</div>
            <div class="index-current-val mono">${current.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
          </div>
          <div style="text-align: right;">
            <div class="return-badge ${isPositive ? 'bull' : 'bear'}" style="font-size: 0.95rem; padding: 0.45rem 0.85rem;">
              ${isPositive ? icons.trendingUp : icons.trendingDown}
              ${isPositive ? '+' : ''}${indexInfo.changePct.toFixed(2)}% (${tfLabel})
            </div>
            <div style="font-size: 0.76rem; color: var(--text-muted); margin-top: 0.25rem;">
              Range: ${low.toLocaleString()} - ${high.toLocaleString()}
            </div>
          </div>
        </div>

        <!-- High - Low Range Bar Gauge (Feature 4 for Index) -->
        <div class="range-gauge-container">
          <div class="range-gauge-header">
            <span class="range-bound low">
              <strong>${indexLowTitle}</strong>
              <span class="mono">${low.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </span>
            <span class="range-indicator-badge">
              Trading at ${pointerPositionPct.toFixed(0)}% of Range (${pointerPositionPct > 65 ? 'Near Highs' : pointerPositionPct < 35 ? 'Near Lows' : 'Mid Range'})
            </span>
            <span class="range-bound high">
              <strong>${indexHighTitle}</strong>
              <span class="mono">${high.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </span>
          </div>

          <div class="range-gauge-track">
            <div class="range-gauge-fill" style="width: ${pointerPositionPct}%;"></div>
            <!-- Pointer needle with pulsing beacon -->
            <div class="range-pointer" style="left: ${pointerPositionPct}%;">
              <div class="pointer-needle"></div>
              <div class="pointer-bubble mono">
                CMP: ${current.toLocaleString('en-IN', { minimumFractionDigits: 1 })}
              </div>
            </div>
          </div>
        </div>
      `;
    }

    // Chart.js Line Chart for Index
    const canvas = this.container.querySelector('#index-chart');
    if (!canvas) return;

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
    const textColor = isLight ? '#64748b' : '#94a3b8';

    if (this.indexChart) {
      this.indexChart.data.labels = timeframeData.labels;
      this.indexChart.data.datasets[0].label = `${indexInfo.name} Level`;
      this.indexChart.data.datasets[0].data = indexInfo.points;
      this.indexChart.update();
      return;
    }

    const ctx = canvas.getContext('2d');
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, 'rgba(16, 185, 129, 0.28)');
    gradient.addColorStop(1, 'rgba(16, 185, 129, 0.0)');

    this.indexChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: timeframeData.labels,
        datasets: [{
          label: `${indexInfo.name} Level`,
          data: indexInfo.points,
          borderColor: '#10b981',
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#10b981',
          pointBorderColor: '#ffffff',
          pointHoverRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => ` ${indexInfo.name}: ${item.raw.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { family: "'Inter', sans-serif", size: 11 } }
          },
          y: {
            grid: { color: gridColor },
            ticks: {
              color: textColor,
              font: { family: "'JetBrains Mono', monospace", size: 11 },
              callback: (val) => val.toLocaleString('en-IN')
            }
          }
        }
      }
    });
  }

  // 3. Update User Holdings Selector (Automatically lists stocks user holds)
  updateStockSelector() {
    const selectorContainer = this.container.querySelector('#holdings-stock-selector');
    if (!selectorContainer) return;

    const holdings = portfolioStore.holdings;
    if (holdings.length === 0) {
      selectorContainer.innerHTML = `
        <div style="color: var(--text-muted); font-size: 0.85rem; padding: 0.5rem 0;">
          No active portfolio holdings found. Add stocks in the dashboard to see range analysis.
        </div>
      `;
      this.selectedSymbol = null;
      return;
    }

    // Auto-select first stock if none selected or if selected stock was deleted
    if (!this.selectedSymbol || !holdings.some(h => h.symbol === this.selectedSymbol)) {
      this.selectedSymbol = holdings[0].symbol;
    }

    selectorContainer.innerHTML = holdings.map(h => {
      const isSelected = h.symbol === this.selectedSymbol;
      return `
        <button type="button" class="stock-select-pill ${isSelected ? 'active' : ''}" data-symbol="${h.symbol}">
          <span class="pill-sym">${h.symbol}</span>
          <span class="pill-qty">${h.quantity} sh</span>
        </button>
      `;
    }).join('');
  }

  // 4. Render Selected Stock Analysis, High/Low Range Pointer, and Trajectory
  renderStockAnalysis() {
    const content = this.container.querySelector('#stock-analysis-content');
    if (!content) return;

    const holding = portfolioStore.getHoldingBySymbol(this.selectedSymbol);
    if (!holding) {
      content.innerHTML = `
        <div class="empty-state" style="padding: 2.5rem 1rem;">
          <p>Please select a stock from your holdings above to view price analysis and range position.</p>
        </div>
      `;
      if (this.stockChart) {
        this.stockChart.destroy();
        this.stockChart = null;
      }
      return;
    }

    const data = getStockAnalysisData(holding, this.stockTimeframe);
    const isAboveAvg = data.cmpVsAvgPct >= 0;

    let lowTitle = 'Period Low';
    let highTitle = 'Period High';
    if (this.stockTimeframe === 'year') {
      lowTitle = '52-Week Low';
      highTitle = '52-Week High';
    } else if (this.stockTimeframe === '3year') {
      lowTitle = '3-Year Low';
      highTitle = '3-Year High';
    } else if (this.stockTimeframe === '5year') {
      lowTitle = '5-Year Low';
      highTitle = '5-Year High';
    }

    content.innerHTML = `
      <!-- Stock Metrics Banner -->
      <div class="stock-analysis-banner">
        <div>
          <div style="display: flex; align-items: center; gap: 0.6rem;">
            <h3 style="font-size: 1.25rem; font-weight: 700; color: var(--text-primary); margin: 0;">${data.name}</h3>
            <span class="stock-hero-badge">${data.symbol}</span>
            <span class="exchange-tag">${data.exchange}</span>
          </div>
          <div style="font-size: 0.82rem; color: var(--text-secondary); margin-top: 0.25rem;">
            You own <strong>${data.quantity.toLocaleString()}</strong> shares • Avg Buy Price: <strong class="mono">${portfolioStore.formatMoney(data.avgPrice)}</strong>
          </div>
        </div>

        <div style="text-align: right;">
          <div class="mono" style="font-size: 1.4rem; font-weight: 800; color: var(--text-primary);">
            ${portfolioStore.formatMoney(data.cmp)}
          </div>
          <div class="return-badge ${isAboveAvg ? 'bull' : 'bear'}" style="margin-top: 0.25rem;">
            ${isAboveAvg ? '+' : ''}${data.cmpVsAvgPct.toFixed(2)}% vs Your Avg Cost
          </div>
        </div>
      </div>

      <!-- Feature 4: Horizontal High - Low Line & Pointer with Dual Pointers (CMP & Avg Buy Price) -->
      <div class="range-gauge-container" style="margin-top: 1.5rem; margin-bottom: 1.5rem;">
        <div class="range-gauge-header">
          <span class="range-bound low">
            <strong>${lowTitle}</strong>
            <span class="mono">${portfolioStore.formatMoney(data.periodLow)}</span>
          </span>
          <span class="range-indicator-badge">
            +${data.distFromLowPct.toFixed(1)}% from Low • -${data.distFromHighPct.toFixed(1)}% from High
          </span>
          <span class="range-bound high">
            <strong>${highTitle}</strong>
            <span class="mono">${portfolioStore.formatMoney(data.periodHigh)}</span>
          </span>
        </div>

        <!-- The Horizontal Gauge Track with CMP Pointer and Avg Price Pointer -->
        <div class="range-gauge-track stock-gauge">
          <div class="range-gauge-fill" style="width: ${data.cmpPositionPct}%;"></div>

          <!-- Pointer 1: User's Average Buy Price Marker -->
          <div class="range-pointer avg-pointer" style="left: ${data.avgPositionPct}%;" title="Your Average Acquisition Price">
            <div class="pointer-diamond"></div>
            <div class="pointer-bubble avg-bubble mono">
              Your Avg: ${portfolioStore.formatMoney(data.avgPrice)}
            </div>
          </div>

          <!-- Pointer 2: Current Market Price (CMP) Needle -->
          <div class="range-pointer cmp-pointer" style="left: ${data.cmpPositionPct}%;" title="Current Market Price">
            <div class="pointer-needle cmp-needle"></div>
            <div class="pointer-bubble cmp-bubble mono">
              CMP: ${portfolioStore.formatMoney(data.cmp)}
            </div>
          </div>
        </div>

        <!-- Gauge Legend Explaining the Pointers -->
        <div class="gauge-legend-row">
          <span class="legend-chip cmp">
            <span class="dot"></span> Current Market Price (CMP)
          </span>
          <span class="legend-chip avg">
            <span class="diamond"></span> Your Average Buy Price
          </span>
        </div>
      </div>

      <!-- Chart Layers & Technical Indicators Toolbar -->
      <div class="chart-indicators-panel">
        <div class="indicators-header-row">
          <span class="indicators-panel-title">
            ${icons.layers}
            <span>Chart Overlays & Technical Indicators</span>
          </span>
          <span class="indicators-panel-hint">Click options to toggle on/off</span>
        </div>

        <div class="indicator-chips-group">
          <!-- 1. Volume Toggle -->
          <button type="button" class="indicator-chip ${this.showVolume ? 'active' : ''}" data-indicator="volume" title="Toggle Volume Bar Sub-Chart">
            <span class="indicator-chip-dot volume"></span>
            <span>Volume</span>
            ${this.showVolume ? '<span class="chip-status-check">✓</span>' : ''}
          </button>

          <!-- 2. RSI Toggle -->
          <button type="button" class="indicator-chip ${this.showRsi ? 'active' : ''}" data-indicator="rsi" title="Toggle 14-Period RSI Indicator">
            <span class="indicator-chip-dot rsi"></span>
            <span>RSI (14)</span>
            ${this.showRsi ? '<span class="chip-status-check">✓</span>' : ''}
          </button>

          <!-- 3. Nifty / Benchmark Toggle -->
          <button type="button" class="indicator-chip ${this.showBenchmark ? 'active' : ''}" data-indicator="benchmark" title="Overlay NIFTY 50 Benchmark Line on Main Chart">
            <span class="indicator-chip-dot benchmark"></span>
            <span>NIFTY 50</span>
            ${this.showBenchmark ? '<span class="chip-status-check">✓</span>' : ''}
          </button>

          <!-- 4. Industry Specific Toggle -->
          <button type="button" class="indicator-chip ${this.showIndustry ? 'active' : ''}" data-indicator="industry" title="Overlay Industry Specific Index on Main Chart">
            <span class="indicator-chip-dot industry"></span>
            <span>Industry (${data.industry.name})</span>
            ${this.showIndustry ? '<span class="chip-status-check">✓</span>' : ''}
          </button>
        </div>
      </div>

      <!-- Main Price Chart (+ Optional Benchmark & Industry Overlays) -->
      <div class="chart-wrapper-analysis">
        <canvas id="stock-chart"></canvas>
      </div>

      <!-- Sub-Chart Pane 1: Volume Bar Chart (if active) -->
      ${this.showVolume ? `
        <div class="sub-chart-card volume-panel">
          <div class="sub-chart-header">
            <div class="sub-chart-title">
              <span class="sub-chart-indicator-tag volume">Volume</span>
              <span>Trading Volume Analysis</span>
            </div>
            <div class="sub-chart-stat mono">
              Current Volume: <strong>${data.currentVolume} Lakh Shares</strong>
            </div>
          </div>
          <div class="sub-chart-canvas-box">
            <canvas id="stock-volume-chart"></canvas>
          </div>
        </div>
      ` : ''}

      <!-- Sub-Chart Pane 2: RSI (14) Momentum Oscillator (if active) -->
      ${this.showRsi ? `
        <div class="sub-chart-card rsi-panel">
          <div class="sub-chart-header">
            <div class="sub-chart-title">
              <span class="sub-chart-indicator-tag rsi">RSI (14)</span>
              <span>Momentum Oscillator</span>
            </div>
            <div class="sub-chart-stat mono">
              Current RSI: <strong>${data.currentRsi}</strong>
              <span class="rsi-sentiment-chip">${data.rsiSentiment}</span>
            </div>
          </div>
          <div class="sub-chart-canvas-box">
            <canvas id="stock-rsi-chart"></canvas>
          </div>
        </div>
      ` : ''}
    `;

    // Destroy existing chart instances
    if (this.stockChart) {
      this.stockChart.destroy();
      this.stockChart = null;
    }
    if (this.volumeChart) {
      this.volumeChart.destroy();
      this.volumeChart = null;
    }
    if (this.rsiChart) {
      this.rsiChart.destroy();
      this.rsiChart = null;
    }

    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';
    const textColor = isLight ? '#64748b' : '#94a3b8';

    // 1. Render Main Stock Price Chart (+ Benchmark and Industry overlays if enabled)
    const canvas = this.container.querySelector('#stock-chart');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const gradient = ctx.createLinearGradient(0, 0, 0, 280);
      gradient.addColorStop(0, 'rgba(99, 102, 241, 0.28)');
      gradient.addColorStop(1, 'rgba(99, 102, 241, 0.0)');

      const datasets = [
        {
          label: `${data.symbol} Price`,
          data: data.priceHistory,
          borderColor: '#6366f1',
          backgroundColor: gradient,
          fill: true,
          tension: 0.35,
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: '#6366f1',
          pointBorderColor: '#ffffff',
          pointHoverRadius: 6,
          yAxisID: 'y'
        },
        {
          label: 'Your Avg Buy Price',
          data: data.labels.map(() => data.avgPrice),
          borderColor: '#06b6d4',
          borderDash: [5, 5],
          borderWidth: 2,
          pointRadius: 0,
          fill: false,
          yAxisID: 'y'
        }
      ];

      let hasRightAxis = false;

      if (this.showBenchmark) {
        hasRightAxis = true;
        datasets.push({
          label: `${data.benchmark.name} Benchmark`,
          data: data.benchmark.points,
          borderColor: '#f59e0b',
          backgroundColor: 'transparent',
          borderWidth: 2,
          borderDash: [4, 4],
          pointRadius: 3,
          pointBackgroundColor: '#f59e0b',
          fill: false,
          tension: 0.3,
          yAxisID: 'yRight'
        });
      }

      if (this.showIndustry) {
        hasRightAxis = true;
        datasets.push({
          label: `${data.industry.name} (Industry)`,
          data: data.industry.points,
          borderColor: '#ec4899',
          backgroundColor: 'transparent',
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: '#ec4899',
          fill: false,
          tension: 0.3,
          yAxisID: 'yRight'
        });
      }

      this.stockChart = new Chart(ctx, {
        type: 'line',
        data: {
          labels: data.labels,
          datasets
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: 'top',
              labels: {
                color: textColor,
                font: { family: "'Inter', sans-serif", size: 11, weight: '600' },
                boxWidth: 12,
                padding: 10
              }
            },
            tooltip: {
              callbacks: {
                label: (item) => {
                  if (item.dataset.yAxisID === 'yRight') {
                    return ` ${item.dataset.label}: ${item.raw.toLocaleString('en-IN')} pts`;
                  }
                  return ` ${item.dataset.label}: ${portfolioStore.formatMoney(item.raw)}`;
                }
              }
            }
          },
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: textColor, font: { family: "'Inter', sans-serif", size: 11 } }
            },
            y: {
              position: 'left',
              grid: { color: gridColor },
              ticks: {
                color: textColor,
                font: { family: "'JetBrains Mono', monospace", size: 11 },
                callback: (val) => portfolioStore.formatMoney(val)
              }
            },
            ...(hasRightAxis ? {
              yRight: {
                position: 'right',
                grid: { display: false },
                ticks: {
                  color: '#f59e0b',
                  font: { family: "'JetBrains Mono', monospace", size: 10 },
                  callback: (val) => val.toLocaleString('en-IN')
                }
              }
            } : {})
          }
        }
      });
    }

    // 2. Render Volume Bar Chart Pane
    if (this.showVolume) {
      const volCanvas = this.container.querySelector('#stock-volume-chart');
      if (volCanvas) {
        const volCtx = volCanvas.getContext('2d');
        this.volumeChart = new Chart(volCtx, {
          type: 'bar',
          data: {
            labels: data.labels,
            datasets: [{
              label: 'Trading Volume',
              data: data.volumeHistory,
              backgroundColor: data.volumeColors,
              borderRadius: 3
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: { display: false },
              tooltip: {
                callbacks: {
                  label: (item) => ` Volume: ${item.raw} Lakh Shares`
                }
              }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: textColor, font: { family: "'Inter', sans-serif", size: 10 } }
              },
              y: {
                grid: { color: gridColor },
                ticks: {
                  color: textColor,
                  font: { family: "'JetBrains Mono', monospace", size: 10 },
                  callback: (val) => `${val}L`
                }
              }
            }
          }
        });
      }
    }

    // 3. Render RSI (14) Momentum Indicator Chart Pane
    if (this.showRsi) {
      const rsiCanvas = this.container.querySelector('#stock-rsi-chart');
      if (rsiCanvas) {
        const rsiCtx = rsiCanvas.getContext('2d');
        this.rsiChart = new Chart(rsiCtx, {
          type: 'line',
          data: {
            labels: data.labels,
            datasets: [
              {
                label: 'RSI (14)',
                data: data.rsiHistory,
                borderColor: '#8b5cf6',
                borderWidth: 2,
                pointRadius: 3,
                pointBackgroundColor: '#8b5cf6',
                pointBorderColor: '#ffffff',
                fill: false,
                tension: 0.35
              },
              {
                label: 'Overbought (70)',
                data: data.labels.map(() => 70),
                borderColor: 'rgba(244, 63, 94, 0.65)',
                borderDash: [4, 4],
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false
              },
              {
                label: 'Oversold (30)',
                data: data.labels.map(() => 30),
                borderColor: 'rgba(16, 185, 129, 0.65)',
                borderDash: [4, 4],
                borderWidth: 1.5,
                pointRadius: 0,
                fill: false
              }
            ]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'top',
                labels: {
                  color: textColor,
                  font: { family: "'Inter', sans-serif", size: 10, weight: '600' },
                  boxWidth: 10,
                  padding: 8
                }
              },
              tooltip: {
                callbacks: {
                  label: (item) => ` ${item.dataset.label}: ${item.raw}`
                }
              }
            },
            scales: {
              x: {
                grid: { display: false },
                ticks: { color: textColor, font: { family: "'Inter', sans-serif", size: 10 } }
              },
              y: {
                min: 0,
                max: 100,
                grid: { color: gridColor },
                ticks: {
                  color: textColor,
                  font: { family: "'JetBrains Mono', monospace", size: 10 },
                  stepSize: 25
                }
              }
            }
          }
        });
      }
    }
  }

  updateOnPriceTick(tick) {
    if (!tick) return;
    if (this.selectedSymbol === tick.symbol) {
      this.renderStockAnalysis();
    }
  }

  destroy() {
    if (this.fiiDiiChart) {
      this.fiiDiiChart.destroy();
      this.fiiDiiChart = null;
    }
    if (this.indexChart) {
      this.indexChart.destroy();
      this.indexChart = null;
    }
    if (this.stockChart) {
      this.stockChart.destroy();
      this.stockChart = null;
    }
    if (this.volumeChart) {
      this.volumeChart.destroy();
      this.volumeChart = null;
    }
    if (this.rsiChart) {
      this.rsiChart.destroy();
      this.rsiChart = null;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
