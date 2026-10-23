// Add Holdings View Component (Page 2) with Single Entry and Bulk Import Modes
import { portfolioStore } from '../state/portfolioStore.js';
import { liveMarketService } from '../services/liveMarketService.js';
import { POPULAR_STOCKS, SECTORS, EXCHANGES } from '../data/stocksDatabase.js';
import { icons } from '../utils/icons.js';
import {
  parseImportFile,
  downloadSampleExcel,
  downloadSampleCsv,
  downloadSampleJson
} from '../utils/fileImporter.js';

export class AddHoldingView {
  constructor(containerElement, onNavigateToDashboard, onNavigateToStockDetail, onNavigateToHoldings) {
    this.container = containerElement;
    this.onNavigateToDashboard = onNavigateToDashboard;
    this.onNavigateToStockDetail = onNavigateToStockDetail;
    this.onNavigateToHoldings = onNavigateToHoldings;
    this.preselectedSymbol = null;

    // View mode: 'single' | 'bulk'
    this.mode = 'single';
    this.parsedImport = null;
    this.importMode = 'merge'; // 'merge' | 'replace'
    this.isImporting = false;
    this.importError = null;

    this.init();
  }

  setPrefill(data = {}) {
    if (data.mode === 'bulk') {
      this.mode = 'bulk';
      this.render();
      return;
    }
    if (data.mode === 'single') {
      this.mode = 'single';
    }
    if (data.symbol) {
      this.mode = 'single';
      this.render();
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

    this.unsubscribe = portfolioStore.subscribe((event) => {
      if (event.type === 'HOLDING_ADDED' || event.type === 'TRANSACTION_RECORDED') {
        if (this.mode === 'single') {
          this.updateRecentTransactions();
        }
      }
    });
  }

  render() {
    this.container.innerHTML = `
      <!-- Page Title -->
      <div class="page-title-row">
        <div>
          <h1 class="page-title">Add Holdings</h1>
          <p class="page-subtitle">Add individual stock positions or bulk import from Excel / CSV / JSON spreadsheets</p>
        </div>
        <div class="page-header-actions">
          <button id="btn-back-dashboard" class="btn btn-outline btn-sm">
            ${icons.layoutDashboard}
            <span>Back to Dashboard</span>
          </button>
        </div>
      </div>

      <!-- Mode Switcher Tabs: Single Stock vs Bulk Import -->
      <div class="add-holding-mode-tabs">
        <button type="button" class="mode-tab-btn ${this.mode === 'single' ? 'active' : ''}" data-mode="single">
          ${icons.plus}
          <span>Single Stock Entry</span>
        </button>
        <button type="button" class="mode-tab-btn ${this.mode === 'bulk' ? 'active' : ''}" data-mode="bulk">
          ${icons.upload}
          <span>Bulk Import (Excel / CSV / JSON)</span>
        </button>
      </div>

      <!-- Active Mode Section -->
      ${this.mode === 'bulk' ? this.renderBulkImportSection() : this.renderSingleHoldingSection()}
    `;

    this.attachEventListeners();
    if (this.mode === 'single') {
      this.updateRecentTransactions();
    }
  }

  // 1. Single Stock Entry Form & Right Rail Calculator
  renderSingleHoldingSection() {
    const today = new Date().toISOString().split('T')[0];

    return `
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
                  placeholder="e.g. RELIANCE, TCS, INFY" 
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

  // 2. Bulk Import Section (Excel, CSV & JSON)
  renderBulkImportSection() {
    return `
      <div class="bulk-import-card" style="margin-top: 0;">
        <!-- Header & Template Download Bar -->
        <div class="bulk-import-header">
          <div class="bulk-import-title-group">
            <h3 class="bulk-title" style="margin: 0 0 0.4rem 0; font-size: 1.15rem; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 0.5rem;">
              ${icons.upload} Bulk Import Stocks (Excel, CSV & JSON)
            </h3>
            <p class="bulk-subtitle" style="margin: 0; font-size: 0.85rem; color: var(--text-secondary); line-height: 1.5;">
              Quickly populate or append multiple stock holdings into your portfolio by importing an Excel spreadsheet (<strong>.xlsx</strong>, <strong>.xls</strong>), CSV (<strong>.csv</strong>), or JSON file (<strong>.json</strong>).
            </p>
          </div>

          <div class="template-downloads-row">
            <span class="template-label">Sample Templates:</span>
            <button type="button" class="btn-template-pill" id="btn-download-sample-excel" title="Download sample Excel template (.xlsx)">
              📊 Excel (.xlsx)
            </button>
            <button type="button" class="btn-template-pill" id="btn-download-sample-csv" title="Download sample CSV template (.csv)">
              📄 CSV (.csv)
            </button>
            <button type="button" class="btn-template-pill" id="btn-download-sample-json" title="Download sample JSON template (.json)">
              📦 JSON (.json)
            </button>
          </div>
        </div>

        ${this.importError ? `
          <div class="alert-error-chip" style="margin-bottom: 0.5rem; display: block; background: rgba(244, 63, 94, 0.15); color: #fb7185; padding: 0.75rem 1rem; border-radius: var(--radius-md); border: 1px solid rgba(244, 63, 94, 0.3);">
            ❌ ${this.importError}
          </div>
        ` : ''}

        <!-- Upload Dropzone (hidden if preview is active) -->
        ${!this.parsedImport ? `
          <div class="bulk-dropzone" id="bulk-dropzone">
            <input type="file" id="input-bulk-file" accept=".xlsx,.xls,.csv,.json" style="display: none;" />
            <div class="dropzone-content">
              <div class="dropzone-icon-box">
                ${icons.upload}
              </div>
              <h4 class="dropzone-title">Click to upload or drag & drop your file</h4>
              <p class="dropzone-desc">
                Supports Excel (.xlsx, .xls), CSV (.csv), or JSON (.json) files from Invest Right, Zerodha Kite, Groww, AngelOne, Upstox, or custom spreadsheet.
              </p>
              <button type="button" class="btn btn-primary btn-sm" id="btn-browse-bulk-file">
                Select File from Device
              </button>
            </div>
          </div>
        ` : ''}

        <!-- Import Mode Bar -->
        <div class="import-options-bar">
          <span class="import-options-label">Import Action:</span>
          <div class="radio-pill-group">
            <label class="radio-pill ${this.importMode === 'merge' ? 'active' : ''}">
              <input type="radio" name="bulk_import_mode" value="merge" ${this.importMode === 'merge' ? 'checked' : ''} />
              <span>Merge & Average (Recommended)</span>
            </label>
            <label class="radio-pill ${this.importMode === 'replace' ? 'active' : ''}">
              <input type="radio" name="bulk_import_mode" value="replace" ${this.importMode === 'replace' ? 'checked' : ''} />
              <span>Replace Portfolio</span>
            </label>
          </div>
        </div>

        <!-- Pre-Import Preview Card -->
        ${this.parsedImport ? `
          <div class="bulk-preview-card">
            <div class="preview-header">
              <div class="preview-file-badge">
                <span class="file-icon">📊</span>
                <div>
                  <div class="preview-filename">
                    ${this.parsedImport.fileName} 
                    <span class="profile-chip badge-member" style="margin-left: 0.5rem;">${this.parsedImport.fileType}</span>
                  </div>
                  <div class="preview-meta">
                    ${this.parsedImport.validItems.length} valid stocks found • Total Invested: ${portfolioStore.formatMoney(this.parsedImport.totalInvested)}
                  </div>
                </div>
              </div>
              <button type="button" class="btn btn-ghost btn-sm" id="btn-cancel-preview">
                Clear & Choose Another File
              </button>
            </div>

            ${this.parsedImport.invalidRows.length > 0 ? `
              <div style="font-size: 0.78rem; color: var(--accent-amber); background: rgba(245, 158, 11, 0.1); padding: 0.5rem 0.85rem; border-radius: var(--radius-sm); border: 1px solid rgba(245, 158, 11, 0.25);">
                ⚠️ Skipped ${this.parsedImport.invalidRows.length} invalid or empty row(s) missing required symbol, quantity, or buy price.
              </div>
            ` : ''}

            <!-- Table Preview -->
            <div class="preview-table-box">
              <table class="preview-table">
                <thead>
                  <tr>
                    <th>Symbol</th>
                    <th>Company Name</th>
                    <th>Exch</th>
                    <th style="text-align: right;">Qty</th>
                    <th style="text-align: right;">Buy Price</th>
                    <th style="text-align: right;">LTP / CMP</th>
                    <th style="text-align: right;">Total Amount</th>
                    <th style="text-align: center;">Action</th>
                  </tr>
                </thead>
                <tbody>
                  ${this.parsedImport.validItems.slice(0, 30).map(item => {
                    const isExisting = portfolioStore.holdings.some(h => h.symbol.toUpperCase() === item.symbol);
                    return `
                      <tr>
                        <td class="mono font-bold" style="color: var(--brand-indigo-light);">${item.symbol}</td>
                        <td style="color: var(--text-primary); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${item.name}">${item.name}</td>
                        <td><span class="exchange-tag">${item.exchange}</span></td>
                        <td class="mono text-right">${item.quantity.toLocaleString()}</td>
                        <td class="mono text-right">${portfolioStore.formatMoney(item.buyPrice)}</td>
                        <td class="mono text-right" style="color: var(--accent-gold);">${portfolioStore.formatMoney(item.cmp)}</td>
                        <td class="mono text-right" style="font-weight: 700;">${portfolioStore.formatMoney(item.quantity * item.buyPrice)}</td>
                        <td style="text-align: center;">
                          <span class="badge-action ${isExisting && this.importMode === 'merge' ? 'action-average' : 'action-new'}">
                            ${isExisting && this.importMode === 'merge' ? 'Will Average' : 'New Stock'}
                          </span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
              ${this.parsedImport.validItems.length > 30 ? `
                <div class="preview-more-hint">...and ${this.parsedImport.validItems.length - 30} more stocks will be imported</div>
              ` : ''}
            </div>

            <!-- Commit Button -->
            <div class="preview-commit-bar">
              <div class="preview-summary-text">
                Ready to ${this.importMode === 'replace' ? 'replace portfolio with' : 'import and merge'} <strong>${this.parsedImport.validItems.length} stocks</strong>.
              </div>
              <button type="button" class="btn btn-primary" id="btn-commit-bulk-import" ${this.isImporting ? 'disabled' : ''}>
                ${this.isImporting ? 'Importing Stocks...' : `${icons.plus} Confirm & Add All ${this.parsedImport.validItems.length} Stocks`}
              </button>
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  async processBulkFile(file) {
    this.importError = null;
    try {
      const parsed = await parseImportFile(file);
      if (parsed.validItems.length === 0) {
        throw new Error('No valid stock rows found in the uploaded file. Please check column headers (Symbol, Quantity, Buy Price).');
      }
      this.parsedImport = parsed;
      this.render();
    } catch (err) {
      this.importError = err.message || 'Failed to parse file';
      this.render();
    }
  }

  attachEventListeners() {
    // Back to dashboard
    const btnBack = this.container.querySelector('#btn-back-dashboard');
    if (btnBack) {
      btnBack.addEventListener('click', () => {
        if (this.onNavigateToDashboard) this.onNavigateToDashboard();
      });
    }

    // Mode Switcher Tabs (Single vs Bulk)
    const modeTabs = this.container.querySelectorAll('.mode-tab-btn');
    modeTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const targetMode = tab.getAttribute('data-mode');
        if (this.mode !== targetMode) {
          this.mode = targetMode;
          this.render();
        }
      });
    });

    if (this.mode === 'bulk') {
      this.attachBulkImportEvents();
    } else {
      this.attachSingleHoldingEvents();
    }
  }

  attachBulkImportEvents() {
    // Sample Template Download Buttons
    const btnSampleXlsx = this.container.querySelector('#btn-download-sample-excel');
    if (btnSampleXlsx) {
      btnSampleXlsx.addEventListener('click', () => downloadSampleExcel());
    }
    const btnSampleCsv = this.container.querySelector('#btn-download-sample-csv');
    if (btnSampleCsv) {
      btnSampleCsv.addEventListener('click', () => downloadSampleCsv());
    }
    const btnSampleJson = this.container.querySelector('#btn-download-sample-json');
    if (btnSampleJson) {
      btnSampleJson.addEventListener('click', () => downloadSampleJson());
    }

    // Dropzone & File Input
    const dropzone = this.container.querySelector('#bulk-dropzone');
    const inputBulkFile = this.container.querySelector('#input-bulk-file');
    const btnBrowse = this.container.querySelector('#btn-browse-bulk-file');

    if (btnBrowse && inputBulkFile) {
      btnBrowse.addEventListener('click', (e) => {
        e.stopPropagation();
        inputBulkFile.click();
      });
    }

    if (dropzone && inputBulkFile) {
      dropzone.addEventListener('click', () => {
        inputBulkFile.click();
      });

      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'dragend'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('dragover');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.processBulkFile(e.dataTransfer.files[0]);
        }
      });

      inputBulkFile.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.processBulkFile(e.target.files[0]);
        }
      });
    }

    // Mode Radios (Merge vs Replace)
    const modeRadios = this.container.querySelectorAll('input[name="bulk_import_mode"]');
    modeRadios.forEach(radio => {
      radio.addEventListener('change', () => {
        this.importMode = radio.value;
        this.render();
      });
    });

    // Cancel Preview
    const btnCancelPreview = this.container.querySelector('#btn-cancel-preview');
    if (btnCancelPreview) {
      btnCancelPreview.addEventListener('click', () => {
        this.parsedImport = null;
        this.importError = null;
        this.render();
      });
    }

    // Commit Bulk Import
    const btnCommit = this.container.querySelector('#btn-commit-bulk-import');
    if (btnCommit && this.parsedImport && this.parsedImport.validItems) {
      btnCommit.addEventListener('click', async () => {
        if (this.isImporting) return;
        try {
          this.isImporting = true;
          this.render();

          const itemsToImport = this.parsedImport.validItems;
          const res = await portfolioStore.bulkImportHoldings(itemsToImport, this.importMode);

          const count = res.totalImported || itemsToImport.length;
          const avgMsg = res.averaged > 0 ? ` (${res.averaged} averaged with existing holdings, ${res.added} newly added)` : '';
          this.showToast(`✅ Successfully imported ${count} stocks${avgMsg}!`, 'success');

          this.parsedImport = null;
          this.isImporting = false;

          // Navigate to Holdings page after short delay
          setTimeout(() => {
            if (this.onNavigateToHoldings) {
              this.onNavigateToHoldings();
            } else {
              window.location.hash = '#/holdings';
            }
          }, 800);
        } catch (err) {
          this.isImporting = false;
          this.importError = err.message || 'Failed to import stocks';
          this.render();
        }
      });
    }
  }

  attachSingleHoldingEvents() {
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
    if (qtyInput) {
      qtyInput.addEventListener('input', () => this.recalculateImpact());
    }

    const priceInput = this.container.querySelector('#input-buy-price');
    if (priceInput) {
      priceInput.addEventListener('input', () => this.recalculateImpact());
    }

    // "Use Current Market Price" button
    const btnUseCmp = this.container.querySelector('#btn-use-cmp');
    if (btnUseCmp && symbolInput && priceInput) {
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
        const symInput = this.container.querySelector('#input-symbol');
        const symbol = symInput ? symInput.value.toUpperCase().trim() : '';
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

    let cmpVal = (matchedStock && matchedStock.cmp) || (existingHolding && existingHolding.cmp) || null;

    if (existingHolding) {
      if (companyInput && !companyInput.value) companyInput.value = existingHolding.name;
      if (sectorSelect) sectorSelect.value = existingHolding.sector || 'Others';
      if (exchangeSelect) exchangeSelect.value = existingHolding.exchange || 'NSE';
    } else if (matchedStock) {
      if (companyInput) companyInput.value = matchedStock.name;
      if (sectorSelect) sectorSelect.value = matchedStock.sector || 'Others';
      if (exchangeSelect) exchangeSelect.value = matchedStock.exchange || 'NSE';
    }

    if (cmpVal && cmpBadge) {
      cmpBadge.textContent = `CMP: ${portfolioStore.formatMoney(cmpVal)}`;
    } else if (cmpBadge) {
      cmpBadge.textContent = '';
    }

    // Auto-fill buy price if empty
    if (cmpVal && priceInput && !priceInput.value) {
      priceInput.value = cmpVal;
    }

    this.recalculateImpact();
  }

  recalculateImpact() {
    const symbolInput = this.container.querySelector('#input-symbol');
    const qtyInput = this.container.querySelector('#input-quantity');
    const priceInput = this.container.querySelector('#input-buy-price');

    if (!symbolInput || !qtyInput || !priceInput) return;

    const symbol = symbolInput.value.toUpperCase().trim();
    const qty = parseInt(qtyInput.value, 10) || 0;
    const price = parseFloat(priceInput.value) || 0;

    const totalOutlay = qty * price;

    // Update impact cards
    const outlayEl = this.container.querySelector('#impact-total-outlay');
    const sharesEl = this.container.querySelector('#impact-shares-val');
    const priceEl = this.container.querySelector('#impact-price-val');
    const cmpEl = this.container.querySelector('#impact-cmp-val');
    const statusBadge = this.container.querySelector('#holding-status-badge');
    const existingNotice = this.container.querySelector('#existing-holding-notice');
    const submitBtnLabel = this.container.querySelector('#submit-btn-label');

    if (outlayEl) outlayEl.textContent = portfolioStore.formatMoney(totalOutlay);
    if (sharesEl) sharesEl.textContent = qty.toLocaleString();
    if (priceEl) priceEl.textContent = portfolioStore.formatMoney(price);

    // Check existing
    const existingHolding = symbol ? portfolioStore.getHoldingBySymbol(symbol) : null;
    const refStock = symbol ? POPULAR_STOCKS.find(s => s.symbol.toUpperCase() === symbol) : null;
    const cmpVal = (existingHolding && existingHolding.cmp) || (refStock && refStock.cmp) || null;

    if (cmpEl) {
      cmpEl.textContent = cmpVal ? portfolioStore.formatMoney(cmpVal) : '--';
    }

    if (existingHolding) {
      if (statusBadge) {
        statusBadge.textContent = 'Existing Holding';
        statusBadge.classList.add('existing');
      }
      if (submitBtnLabel) {
        submitBtnLabel.textContent = `Average Position (${existingHolding.quantity} + ${qty} shares)`;
      }

      // Show notice
      if (existingNotice) {
        existingNotice.classList.remove('is-hidden');
        const noticeSym = this.container.querySelector('#existing-notice-symbol');
        const noticeQty = this.container.querySelector('#existing-notice-qty');
        if (noticeSym) noticeSym.textContent = existingHolding.symbol;
        if (noticeQty) noticeQty.textContent = existingHolding.quantity.toLocaleString();
      }
    } else {
      if (statusBadge) {
        statusBadge.textContent = 'New Holding';
        statusBadge.classList.remove('existing');
      }
      if (submitBtnLabel) {
        submitBtnLabel.textContent = 'Confirm & Add to Portfolio';
      }
      if (existingNotice) {
        existingNotice.classList.add('is-hidden');
      }
    }

    // Estimate portfolio change percentage
    const changeEl = this.container.querySelector('#impact-portfolio-change');
    if (changeEl) {
      const metrics = portfolioStore.getPortfolioMetrics();
      const newTotal = metrics.totalInvested + totalOutlay;
      const pctIncrease = metrics.totalInvested > 0 ? (totalOutlay / metrics.totalInvested) * 100 : 100;
      changeEl.textContent = totalOutlay > 0 ? `+${pctIncrease.toFixed(1)}% portfolio size` : '+0.00%';
    }
  }

  handleSubmit() {
    const symbolInput = this.container.querySelector('#input-symbol');
    const exchangeSelect = this.container.querySelector('#select-exchange');
    const companyInput = this.container.querySelector('#input-company-name');
    const sectorSelect = this.container.querySelector('#select-sector');
    const qtyInput = this.container.querySelector('#input-quantity');
    const priceInput = this.container.querySelector('#input-buy-price');
    const dateInput = this.container.querySelector('#input-buy-date');
    const notesInput = this.container.querySelector('#input-notes');

    const symbol = symbolInput.value.toUpperCase().trim();
    const exchange = exchangeSelect.value;
    const name = companyInput.value.trim();
    const sector = sectorSelect.value;
    const quantity = parseInt(qtyInput.value, 10);
    const buyPrice = parseFloat(priceInput.value);
    const buyDate = dateInput.value;
    const notes = notesInput.value.trim();

    if (!symbol) {
      symbolInput.focus();
      this.showToast('Please enter a valid stock symbol.', 'error');
      return;
    }

    if (isNaN(quantity) || quantity <= 0) {
      qtyInput.focus();
      this.showToast('Please enter a valid number of shares.', 'error');
      return;
    }

    if (isNaN(buyPrice) || buyPrice <= 0) {
      priceInput.focus();
      this.showToast('Please enter a valid purchase price.', 'error');
      return;
    }

    try {
      const result = portfolioStore.addOrUpdateHolding({
        symbol,
        exchange,
        name,
        sector,
        quantity,
        buyPrice,
        buyDate,
        notes
      });

      if (result.isAveraged) {
        this.showToast(`Averaged ${symbol}! New Avg Price: ${portfolioStore.formatMoney(result.newAvgPrice)}`, 'success');
      } else {
        this.showToast(`Added ${quantity} shares of ${symbol} to your portfolio!`, 'success');
      }

      // Reset form
      symbolInput.value = '';
      companyInput.value = '';
      qtyInput.value = '';
      priceInput.value = '';
      notesInput.value = '';
      const cmpBadge = this.container.querySelector('#cmp-display-badge');
      if (cmpBadge) cmpBadge.textContent = '';

      const pills = this.container.querySelectorAll('.stock-pill');
      pills.forEach(p => p.classList.remove('active'));

      this.recalculateImpact();
      this.updateRecentTransactions();

      // Trigger background quote update for newly added stock
      portfolioStore.refreshMarketQuotes(true);

    } catch (err) {
      this.showToast(err.message || 'Failed to add holding.', 'error');
    }
  }

  updateRecentTransactions() {
    const list = this.container.querySelector('#recent-tx-list');
    const badge = this.container.querySelector('#recent-count-badge');
    if (!list) return;

    const txs = portfolioStore.transactions.slice(0, 5);

    if (badge) {
      badge.textContent = `${portfolioStore.transactions.length} trades recorded`;
    }

    if (txs.length === 0) {
      list.innerHTML = `<div style="padding: 1rem 0; color: var(--text-muted); font-size: 0.85rem; text-align: center;">No transaction history yet.</div>`;
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
